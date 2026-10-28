import { firstValueFrom } from 'rxjs';
import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { RouterLink } from '@angular/router';

import { grantedPolicy } from '../../core/auth/permission';
import { VoiceService } from '../../core/services/voice.service';
import { ChannelService } from '../../proxy/channels/channel.service';
import { VoiceChannelService, VoiceLineNumberDto } from '../../proxy/voice/voice-channel.service';
import { ChannelState } from '../../proxy/channels/channel-state.enum';
import {
  IvrBranchAction,
  IvrIssueDto,
  IvrPromptDto,
  IvrSimulationStepDto,
} from '../../proxy/voice';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { ArSelect } from '../../ui/select';
import { ChipTone } from '../../ui/chip';
import { ConfirmService } from '../../core/ui/confirm.service';

interface PromptDraft {
  name: string;
  sayText: string;
  maxDigits: number;
  inputTimeoutSeconds: number;
  isEntryPoint: boolean;
}

interface BranchDraft {
  digit: string;
  action: IvrBranchAction;
  nextPromptId: string;
  transferToNumber: string;
}

const EMPTY_DRAFT: PromptDraft = {
  name: '',
  sayText: '',
  maxDigits: 1,
  inputTimeoutSeconds: 5,
  isEntryPoint: false,
};

const EMPTY_BRANCH: BranchDraft = {
  digit: '',
  action: IvrBranchAction.GoToPrompt,
  nextPromptId: '',
  transferToNumber: '',
};

const STATE_TONE: Record<ChannelState, ChipTone> = {
  [ChannelState.Onboarding]: 'neutral',
  [ChannelState.Active]: 'good',
  [ChannelState.Suspended]: 'warn',
  [ChannelState.Restricted]: 'bad',
};

/**
 * The phone menu, edited here and served to Exotel live. Exotel lets an application URL control what
 * each applet says and who Connect dials, but never which applet runs next — so its dashboard holds one
 * fixed, menu-agnostic skeleton (Gather → Passthru, three times, then Connect) built once from the URLs
 * shown in "Connect to Exotel". Everything that varies — the words, the keys, where each leads —
 * lives in the prompts below and takes effect on the very next call. "Try the menu" runs the same
 * rules a live call does.
 */
@Component({
  selector: 'ar-voice-ivr',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSelect, ArGrid, GridModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-ivr.html',
  styleUrl: './voice-ivr.scss',
})
export class ArVoiceIvr {
  private readonly permissions = inject(PermissionService);
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(VoiceService);
  private readonly channelsApi = inject(ChannelService);
  /** WhatsApp numbers on Meta's direct API: where voice agents live. */
  protected readonly agentNumbers = signal<
    { id: string; verifiedName?: string; displayPhoneNumber?: string }[]
  >([]);

  protected readonly canManage = grantedPolicy('AutoReach.Channels.Manage', this.permissions);
  protected readonly canCall = grantedPolicy('AutoReach.Inbox', this.permissions);

  protected readonly channel = this.store.channel;
  protected readonly prompts = this.store.prompts;
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly entryPoint = this.store.entryPoint;

  protected readonly busy = signal(false);
  protected readonly accountEditing = signal(false);
  protected readonly exoPhoneDraft = signal('');
  protected readonly accountSidDraft = signal('');
  protected readonly subdomainDraft = signal('api.in.exotel.com');
  protected readonly credentialDraft = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.credentialDraft.set(''));
    void this.loadAgentNumbers();
    void this.loadLineNumbers();
  }

  protected editAccount(): void {
    const ch = this.channel();
    this.exoPhoneDraft.set(ch?.exoPhone ?? '');
    this.accountSidDraft.set(ch?.accountSid ?? '');
    this.subdomainDraft.set(ch?.subdomain || 'api.in.exotel.com');
    this.credentialDraft.set('');
    this.accountEditing.set(true);
  }

  protected cancelAccount(): void {
    this.credentialDraft.set('');
    this.accountEditing.set(false);
  }

  protected async saveAccount(): Promise<void> {
    if (!this.canManage() || this.busy()) return;
    this.busy.set(true);
    const credential = this.credentialDraft().trim();
    this.credentialDraft.set('');
    try {
      if (
        await this.store.setAccount({
          exoPhone: this.exoPhoneDraft().trim(),
          accountSid: this.accountSidDraft().trim(),
          subdomain: this.subdomainDraft().trim(),
          numberSeries: this.channel()?.numberSeries,
          apiCredential: credential || null,
        })
      )
        this.accountEditing.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  protected readonly editingId = signal<string | null>(null);
  protected readonly createOpen = signal(false);
  protected readonly draft = signal<PromptDraft>({ ...EMPTY_DRAFT });

  protected readonly branchPromptId = signal<string | null>(null);
  protected readonly branchDraft = signal<BranchDraft>({ ...EMPTY_BRANCH });

  protected readonly issues = this.store.issues;

  // --- Connect to Exotel
  protected readonly flowUrlDraft = signal('');
  protected readonly aiFlowUrlDraft = signal('');
  protected readonly copied = signal<string | null>(null);

  // --- In-browser phone (softphone)
  protected readonly softphoneEnabledDraft = signal(false);
  protected readonly sipDomainDraft = signal('');
  protected readonly sipWsDraft = signal('');
  protected readonly sipUsernameDraft = signal('');
  protected readonly sipPasswordDraft = signal('');
  protected readonly softphoneEditing = signal(false);

  // --- Try the menu
  protected readonly keys = signal<string[]>(['', '', '']);
  protected readonly steps = signal<IvrSimulationStepDto[] | null>(null);
  protected readonly simulating = signal(false);

  protected readonly errors = computed(() => this.issues().filter((i) => i.severity === 2));
  protected readonly notes = computed(() => this.issues().filter((i) => i.severity < 2));

  protected readonly BranchAction = IvrBranchAction;
  protected readonly ChannelState = ChannelState;

  protected readonly canSaveDraft = computed(
    () => this.draft().name.trim().length > 0 && this.draft().sayText.trim().length > 0,
  );

  protected readonly canSaveBranch = computed(() => {
    const d = this.branchDraft();
    if (!d.digit.trim()) return false;
    if (d.action === IvrBranchAction.GoToPrompt) return !!d.nextPromptId;
    if (d.action === IvrBranchAction.TransferToAgent) return d.transferToNumber.trim().length > 0;
    return true;
  });

  protected stateTone(s?: ChannelState): ChipTone {
    return s != null ? STATE_TONE[s] : 'neutral';
  }

  protected actionLabel(a?: IvrBranchAction): string {
    switch (a) {
      case IvrBranchAction.GoToPrompt:
        return 'Go to prompt';
      case IvrBranchAction.TransferToAgent:
        return 'Transfer to agent';
      case IvrBranchAction.Hangup:
      default:
        return 'Hang up';
    }
  }

  protected branchTarget(b: {
    action?: IvrBranchAction;
    nextPromptId?: string | null;
    transferToNumber?: string | null;
  }): string {
    if (b.action === IvrBranchAction.GoToPrompt) return this.promptName(b.nextPromptId);
    if (b.action === IvrBranchAction.TransferToAgent) return b.transferToNumber ?? '—';
    return '—';
  }

  protected promptName(id?: string | null): string {
    return this.prompts().find((p) => p.id === id)?.name ?? '(deleted prompt)';
  }

  protected otherPrompts(currentId: string): readonly IvrPromptDto[] {
    return this.prompts().filter((p) => p.id !== currentId);
  }

  protected openCreate(): void {
    this.draft.set({ ...EMPTY_DRAFT, isEntryPoint: this.prompts().length === 0 });
    this.editingId.set(null);
    this.createOpen.set(true);
  }

  protected openEdit(p: IvrPromptDto): void {
    this.draft.set({
      name: p.name,
      sayText: p.sayText,
      maxDigits: p.maxDigits ?? 1,
      inputTimeoutSeconds: p.inputTimeoutSeconds ?? 5,
      isEntryPoint: !!p.isEntryPoint,
    });
    this.editingId.set(p.id!);
    this.createOpen.set(true);
  }

  protected closeDialog(): void {
    this.createOpen.set(false);
    this.editingId.set(null);
  }

  protected patchDraft<K extends keyof PromptDraft>(key: K, value: PromptDraft[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  protected async savePrompt(): Promise<void> {
    if (!this.canSaveDraft() || this.busy()) return;
    const d = this.draft();
    const id = this.editingId();

    this.busy.set(true);
    try {
      const ok = id
        ? await this.store.updatePrompt(id, {
            name: d.name.trim(),
            sayText: d.sayText.trim(),
            maxDigits: d.maxDigits,
            inputTimeoutSeconds: d.inputTimeoutSeconds,
          })
        : await this.store.createPrompt({
            name: d.name.trim(),
            sayText: d.sayText.trim(),
            maxDigits: d.maxDigits,
            inputTimeoutSeconds: d.inputTimeoutSeconds,
            isEntryPoint: d.isEntryPoint,
          });

      if (ok) {
        this.closeDialog();
        // A brand-new entry point was set inline by CreatePromptAsync; an edit
        // never touches IsEntryPoint (see savePrompt/UpdatePromptAsync's split).
        if (id && d.isEntryPoint && this.entryPoint()?.id !== id) {
          await this.store.setEntryPoint(id);
        }
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected async makeEntryPoint(p: IvrPromptDto): Promise<void> {
    if (this.busy() || p.isEntryPoint) return;
    this.busy.set(true);
    try {
      await this.store.setEntryPoint(p.id!);
    } finally {
      this.busy.set(false);
    }
  }

  protected async removePrompt(p: IvrPromptDto): Promise<void> {
    if (this.busy()) return;
    if (!(await this.dialogs.delete('this menu', p.name))) return;

    this.busy.set(true);
    try {
      await this.store.deletePrompt(p.id!);
    } finally {
      this.busy.set(false);
    }
  }

  protected openBranchForm(promptId: string): void {
    this.branchDraft.set({ ...EMPTY_BRANCH });
    this.branchPromptId.set(promptId);
  }

  protected closeBranchForm(): void {
    this.branchPromptId.set(null);
  }

  protected patchBranch<K extends keyof BranchDraft>(key: K, value: BranchDraft[K]): void {
    this.branchDraft.update((d) => ({ ...d, [key]: value }));
  }

  protected async saveBranch(): Promise<void> {
    const promptId = this.branchPromptId();
    if (!promptId || !this.canSaveBranch() || this.busy()) return;

    const d = this.branchDraft();
    this.busy.set(true);
    try {
      const ok = await this.store.setBranch(promptId, {
        digit: d.digit.trim(),
        action: d.action,
        nextPromptId: d.action === IvrBranchAction.GoToPrompt ? d.nextPromptId : null,
        transferToNumber:
          d.action === IvrBranchAction.TransferToAgent ? d.transferToNumber.trim() : null,
      });
      if (ok) this.closeBranchForm();
    } finally {
      this.busy.set(false);
    }
  }

  protected async removeBranch(promptId: string, digit: string): Promise<void> {
    if (this.busy()) return;
    if (
      !(await this.dialogs.confirm({
        title: 'Remove this branch?',
        message: `Callers pressing “${digit}” will no longer be routed by it.`,
        confirmText: 'Remove',
        tone: 'danger',
      }))
    )
      return;

    this.busy.set(true);
    try {
      await this.store.removeBranch(promptId, digit);
    } finally {
      this.busy.set(false);
    }
  }

  // ---- Connect to Exotel ----------------------------------------------------

  private readonly voiceApi = inject(VoiceChannelService);
  /** The line's other numbers, each with the agent that answers and calls from it. */
  protected readonly lineNumbers = signal<VoiceLineNumberDto[]>([]);
  protected readonly numberDraft = signal('');
  protected readonly numberNote = signal('');

  protected async loadLineNumbers(): Promise<void> {
    try {
      this.lineNumbers.set(await firstValueFrom(this.voiceApi.getNumbers()));
    } catch {
      this.lineNumbers.set([]);
    }
  }

  protected async syncNumbers(): Promise<void> {
    await this.numberAction(async () => {
      const sync = await firstValueFrom(this.voiceApi.syncNumbers());
      this.lineNumbers.set(sync.numbers);
      this.numberNote.set(
        sync.notInExotel.length
          ? `Added ${sync.added}. Exotel no longer lists: ${sync.notInExotel.join(', ')}.`
          : `Added ${sync.added}.`,
      );
    });
  }

  protected async addNumber(): Promise<void> {
    const number = this.numberDraft().trim();
    if (!number) return;
    await this.numberAction(async () => {
      await firstValueFrom(this.voiceApi.addNumber({ number }));
      this.numberDraft.set('');
      await this.loadLineNumbers();
    });
  }

  protected async setNumberAgent(n: VoiceLineNumberDto, agentChannelId: string): Promise<void> {
    await this.numberAction(async () => {
      await firstValueFrom(
        this.voiceApi.updateNumber(n.id, { name: n.name, agentChannelId: agentChannelId || null }),
      );
      await this.loadLineNumbers();
    });
  }

  protected async removeNumber(n: VoiceLineNumberDto): Promise<void> {
    await this.numberAction(async () => {
      await firstValueFrom(this.voiceApi.deleteNumber(n.id));
      await this.loadLineNumbers();
    });
  }

  private async numberAction(work: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.numberNote.set('');
    try {
      await work();
    } catch (e: unknown) {
      this.numberNote.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'The number could not be saved.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async loadAgentNumbers(): Promise<void> {
    try {
      const page = await firstValueFrom(this.channelsApi.getList({ maxResultCount: 100 } as never));
      this.agentNumbers.set(
        (page.items ?? [])
          .filter((c) => c.provider === 0 && c.id)
          .map((c) => ({
            id: c.id!,
            verifiedName: c.verifiedName,
            displayPhoneNumber: c.displayPhoneNumber,
          })),
      );
    } catch {
      this.agentNumbers.set([]);
    }
  }

  protected async saveInboundAgent(agentChannelId: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.store.setInboundAiAgent(agentChannelId || null);
    } finally {
      this.busy.set(false);
    }
  }

  protected startAiFlowUrlEdit(): void {
    this.aiFlowUrlDraft.set(this.channel()?.aiFlowUrl ?? '');
  }

  protected async saveAiFlowUrl(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      if (await this.store.setAiFlowUrl(this.aiFlowUrlDraft())) this.aiFlowUrlDraft.set('');
    } finally {
      this.busy.set(false);
    }
  }

  protected startFlowUrlEdit(): void {
    this.flowUrlDraft.set(this.channel()?.flowUrl ?? '');
  }

  protected async saveFlowUrl(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.store.setFlowUrl(this.flowUrlDraft());
    } finally {
      this.busy.set(false);
    }
  }

  // ---- In-browser phone (softphone) ------------------------------------------

  protected startSoftphoneEdit(): void {
    const ch = this.channel();
    this.softphoneEnabledDraft.set(!!ch?.softphoneEnabled);
    this.sipDomainDraft.set(ch?.sipDomain ?? '');
    this.sipWsDraft.set(ch?.sipWebSocketUrl ?? '');
    this.sipUsernameDraft.set(ch?.sipUsername ?? '');
    this.sipPasswordDraft.set('');
    this.softphoneEditing.set(true);
  }

  protected async saveSoftphone(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const ok = await this.store.setSoftphone({
        enabled: this.softphoneEnabledDraft(),
        sipDomain: this.sipDomainDraft().trim() || null,
        sipWebSocketUrl: this.sipWsDraft().trim() || null,
        sipUsername: this.sipUsernameDraft().trim() || null,
        sipPassword: this.sipPasswordDraft().trim() || null,
      });
      if (ok) this.softphoneEditing.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(text);
      setTimeout(() => this.copied.update((c) => (c === text ? null : c)), 1500);
    } catch {
      // Clipboard access can be blocked; the URL is still on screen to select by hand.
    }
  }

  // ---- Try the menu --------------------------------------------------------

  protected setKey(level: number, value: string): void {
    this.keys.update((k) => k.map((v, i) => (i === level ? value.slice(0, 1) : v)));
    this.steps.set(null);
  }

  protected async runSimulation(): Promise<void> {
    if (this.simulating()) return;
    this.simulating.set(true);
    try {
      this.steps.set(
        await this.store.simulate({
          keyPresses: this.keys().map((k) => (k.trim() ? k.trim() : null)),
        }),
      );
    } finally {
      this.simulating.set(false);
    }
  }

  protected outcomeTone(outcome: number): ChipTone {
    return outcome === 3 ? 'good' : outcome === 2 ? 'warn' : outcome === 1 ? 'teal' : 'neutral';
  }

  protected outcomeLabel(outcome: number): string {
    return ['Plays again', 'Next menu', 'Call ends', 'Transfer'][outcome] ?? '';
  }

  protected issueTone(issue: IvrIssueDto): ChipTone {
    return issue.severity === 2 ? 'bad' : issue.severity === 1 ? 'warn' : 'neutral';
  }
}
