import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChannelState } from '../../proxy/channels/channel-state.enum';
import {
  CreateIvrPromptInput,
  IvrBranchAction,
  IvrIssueDto,
  IvrPromptDto,
  IvrSimulationStepDto,
  SetIvrBranchInput,
  SetSoftphoneInput,
  SetVoiceAccountInput,
  SimulateIvrInput,
  UpdateIvrPromptInput,
  VoiceChannelDto,
  VoiceChannelService as VoiceApi,
  VoiceNumberSeries,
} from '../../proxy/voice';
import { readApiError } from '../util/api-error';
import { settled } from '../util/resource';

/**
 * IVR prompt store for the channel's own admin screen (M11's follow-up: a real
 * management UI over the App Service layer `VoiceChannelAppService` already
 * exposed). `useMockData` seeds one small three-prompt tree — main menu branching
 * to sales/support, support transferring to an agent — so the screen is reviewable
 * without a database, same convention as `ChannelService`/`TemplateService`.
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly api = inject(VoiceApi);

  private readonly mockChannel = signal<VoiceChannelDto>({
    id: 'voice-mock-1',
    exoPhone: '07966000000',
    accountSid: 'exotel-mock-sid',
    subdomain: 'api.in.exotel.com',
    numberSeries: VoiceNumberSeries.Transactional,
    state: ChannelState.Active,
    restrictionReason: null,
    passthruWebhookUrl: 'https://api.mniassist.com/api/voice/webhook/****/passthru',
    flowUrl: null,
    ivrSetup: {
      ready: true,
      gatherUrls: [1, 2, 3].map((l) => `https://api.mniassist.com/api/voice/ivr/****/gather/${l}`),
      routeUrls: [1, 2].map((l) => `https://api.mniassist.com/api/voice/ivr/****/route/${l}`),
      connectUrl: 'https://api.mniassist.com/api/voice/ivr/****/connect',
      statusCallbackUrl: 'https://api.mniassist.com/api/voice/webhook/****/status',
    },
    softphoneEnabled: true,
    sipDomain: 'voice.mock.local',
    sipWebSocketUrl: 'wss://voice.mock.local/ws',
    sipUsername: 'sales',
  });

  private readonly mockSales = 'prompt-sales';
  private readonly mockSupport = 'prompt-support';
  private readonly mockPrompts = signal<IvrPromptDto[]>([
    {
      id: 'prompt-main',
      name: 'Main menu',
      sayText: 'Thanks for calling Vertex Automation. Press 1 for sales, 2 for support.',
      isEntryPoint: true,
      maxDigits: 1,
      inputTimeoutSeconds: 5,
      branches: [
        { digit: '1', action: IvrBranchAction.GoToPrompt, nextPromptId: 'prompt-sales' },
        { digit: '2', action: IvrBranchAction.GoToPrompt, nextPromptId: 'prompt-support' },
      ],
      creationTime: new Date().toISOString(),
    },
    {
      id: 'prompt-sales',
      name: 'Sales',
      sayText: 'Connecting you to our sales team.',
      isEntryPoint: false,
      maxDigits: 1,
      inputTimeoutSeconds: 5,
      branches: [
        { digit: '*', action: IvrBranchAction.TransferToAgent, transferToNumber: '919000000001' },
      ],
      creationTime: new Date().toISOString(),
    },
    {
      id: 'prompt-support',
      name: 'Support',
      sayText: 'Connecting you to our support desk.',
      isEntryPoint: false,
      maxDigits: 1,
      inputTimeoutSeconds: 5,
      branches: [
        { digit: '*', action: IvrBranchAction.TransferToAgent, transferToNumber: '919000000002' },
      ],
      creationTime: new Date().toISOString(),
    },
  ]);

  private readonly channelResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.api.getOrCreate(),
  });

  private readonly promptsResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.api.getPrompts(),
    defaultValue: [] as IvrPromptDto[],
  });

  private readonly issuesResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.api.getIvrIssues(),
    defaultValue: [] as IvrIssueDto[],
  });

  /** What would go wrong for a caller in the current menu — from the same rules a live call runs. */
  readonly issues = computed<readonly IvrIssueDto[]>(() =>
    environment.useMockData ? [] : settled(this.issuesResource, [] as IvrIssueDto[]),
  );

  readonly channel = computed<VoiceChannelDto | undefined>(() =>
    environment.useMockData ? this.mockChannel() : settled(this.channelResource, undefined),
  );

  readonly prompts = computed<readonly IvrPromptDto[]>(() =>
    environment.useMockData
      ? this.mockPrompts()
      : settled(this.promptsResource, [] as IvrPromptDto[]),
  );

  readonly loading = computed(
    () =>
      !environment.useMockData &&
      (this.channelResource.isLoading() || this.promptsResource.isLoading()),
  );

  readonly entryPoint = computed(() => this.prompts().find((p) => p.isEntryPoint));

  private readonly _error = signal<string | null>(null);
  readonly error = computed(() => this._error());

  reload(): void {
    this.promptsResource.reload();
    this.issuesResource.reload();
  }

  async setAccount(input: SetVoiceAccountInput): Promise<boolean> {
    this._error.set(null);
    if (environment.useMockData) {
      const { apiCredential: _secret, ...account } = input;
      this.mockChannel.update((c) => ({ ...c, ...account }));
      return true;
    }
    try {
      await firstValueFrom(this.api.setAccount(input));
      this.channelResource.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not save the Exotel account.'));
      return false;
    }
  }

  /** Records the Exotel call-flow URL of the one-time skeleton flow. Blank clears it. */
  async setFlowUrl(flowUrl: string): Promise<boolean> {
    this._error.set(null);
    if (environment.useMockData) {
      this.mockChannel.update((c) => ({ ...c, flowUrl: flowUrl.trim() || null }));
      return true;
    }

    try {
      await firstValueFrom(this.api.setFlowUrl({ flowUrl: flowUrl.trim() || null }));
      this.channelResource.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not save the flow URL.'));
      return false;
    }
  }

  /** Turns the in-browser phone on or off and records the SIP identity reps' browsers register with. */
  async setSoftphone(input: SetSoftphoneInput): Promise<boolean> {
    this._error.set(null);
    if (environment.useMockData) {
      this.mockChannel.update((c) => ({
        ...c,
        softphoneEnabled: input.enabled,
        sipDomain: input.sipDomain ?? null,
        sipWebSocketUrl: input.sipWebSocketUrl ?? null,
        sipUsername: input.sipUsername ?? null,
      }));
      return true;
    }

    try {
      await firstValueFrom(this.api.setSoftphone(input));
      this.channelResource.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not save the in-browser phone settings.'));
      return false;
    }
  }

  /** Walks the saved menu with these key presses exactly as a live call would — the server runs the real rules. */
  async simulate(input: SimulateIvrInput): Promise<IvrSimulationStepDto[] | null> {
    this._error.set(null);
    if (environment.useMockData) {
      return simulateLocally(this.prompts(), input.keyPresses);
    }

    try {
      return await firstValueFrom(this.api.simulateIvr(input));
    } catch (e) {
      this._error.set(readApiError(e, 'Could not run the simulation.'));
      return null;
    }
  }

  async createPrompt(input: CreateIvrPromptInput): Promise<boolean> {
    this._error.set(null);
    if (environment.useMockData) {
      const id = `prompt-${Math.random().toString(36).slice(2, 8)}`;
      this.mockPrompts.update((list) => [
        ...(input.isEntryPoint ? list.map((p) => ({ ...p, isEntryPoint: false })) : list),
        {
          id,
          name: input.name,
          sayText: input.sayText,
          isEntryPoint: !!input.isEntryPoint,
          maxDigits: input.maxDigits ?? 1,
          inputTimeoutSeconds: input.inputTimeoutSeconds ?? 5,
          branches: [],
          creationTime: new Date().toISOString(),
        },
      ]);
      return true;
    }

    try {
      await firstValueFrom(this.api.createPrompt(input));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not create the prompt.'));
      return false;
    }
  }

  async updatePrompt(promptId: string, input: UpdateIvrPromptInput): Promise<boolean> {
    this._error.set(null);
    if (environment.useMockData) {
      this.mockPrompts.update((list) =>
        list.map((p) => (p.id === promptId ? { ...p, ...input } : p)),
      );
      return true;
    }

    try {
      await firstValueFrom(this.api.updatePrompt(promptId, input));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not update the prompt.'));
      return false;
    }
  }

  async setEntryPoint(promptId: string): Promise<boolean> {
    this._error.set(null);
    if (environment.useMockData) {
      this.mockPrompts.update((list) =>
        list.map((p) => ({ ...p, isEntryPoint: p.id === promptId })),
      );
      return true;
    }

    try {
      await firstValueFrom(this.api.setEntryPoint(promptId));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not set the entry point.'));
      return false;
    }
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    this._error.set(null);
    if (environment.useMockData) {
      this.mockPrompts.update((list) => list.filter((p) => p.id !== promptId));
      return true;
    }

    try {
      await firstValueFrom(this.api.deletePrompt(promptId));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not delete the prompt.'));
      return false;
    }
  }

  async setBranch(promptId: string, input: SetIvrBranchInput): Promise<boolean> {
    this._error.set(null);
    if (environment.useMockData) {
      this.mockPrompts.update((list) =>
        list.map((p) =>
          p.id === promptId
            ? { ...p, branches: [...p.branches.filter((b) => b.digit !== input.digit), input] }
            : p,
        ),
      );
      return true;
    }

    try {
      await firstValueFrom(this.api.setBranch(promptId, input));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not save the branch.'));
      return false;
    }
  }

  async removeBranch(promptId: string, digit: string): Promise<boolean> {
    this._error.set(null);
    if (environment.useMockData) {
      this.mockPrompts.update((list) =>
        list.map((p) =>
          p.id === promptId ? { ...p, branches: p.branches.filter((b) => b.digit !== digit) } : p,
        ),
      );
      return true;
    }

    try {
      await firstValueFrom(this.api.removeBranch(promptId, digit));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not remove the branch.'));
      return false;
    }
  }
}

/** Demo-build stand-in for the server's simulator: same three-level rules, no network. */
function simulateLocally(
  prompts: readonly IvrPromptDto[],
  keys: (string | null)[],
): IvrSimulationStepDto[] {
  const steps: IvrSimulationStepDto[] = [];
  let current = prompts.find((p) => p.isEntryPoint);
  for (let level = 1; level <= 3 && current; level++) {
    const key = keys[level - 1] ?? null;
    const branch = key
      ? (current.branches.find((b) => b.digit === key) ??
        current.branches.find((b) => b.digit === '*'))
      : undefined;
    const last = level === 3;
    let outcome: 0 | 1 | 2 | 3;
    let detail: string;
    let next: IvrPromptDto | undefined;

    if (!key) {
      outcome = last ? 2 : 0;
      detail = last
        ? 'No key pressed on the last level — the call ends.'
        : 'No key pressed — the prompt plays again.';
    } else if (branch?.action === IvrBranchAction.GoToPrompt && !last) {
      next = prompts.find((p) => p.id === branch.nextPromptId);
      outcome = 1;
      detail = `Goes to “${next?.name ?? '(missing prompt)'}”.`;
    } else if (branch?.action === IvrBranchAction.TransferToAgent) {
      outcome = 3;
      detail = `Transfers the caller to ${branch.transferToNumber}.`;
    } else {
      outcome = 2;
      detail = branch
        ? 'A call cannot go deeper than three levels — the call ends.'
        : `Key ${key} ends the call.`;
    }

    steps.push({
      promptId: current.id!,
      promptName: current.name,
      sayText: current.sayText,
      keyPressed: key,
      outcome,
      detail,
    });
    if (outcome === 2 || outcome === 3) break;
    current = outcome === 1 ? next : current;
  }
  return steps;
}
