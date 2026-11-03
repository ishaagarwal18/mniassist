import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import {
  CallLogDto,
  CallOutcome,
  VoiceCallDirection,
  VoiceCallMode,
  VoiceCallStatus,
} from '../../proxy/voice';
import { ArButton, ArChip, ArIcon, ArSearchBox } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { errorMessage } from '../activities/activity-logic';
import { ArCallOutcomeDialog } from './call-outcome-dialog';
import { VoiceConversationSnapshotDto } from '../../proxy/messaging/whats-app-call.service';
import { CallGateway } from './call-mock';
import {
  OUTCOME_LABEL,
  STATUS_LABEL,
  callHeadline,
  displayNumber,
  isLive,
  needsOutcome,
} from './call-logic';
import { initialSearch } from '../../core/util/customer-scope';

const STATUS_TONE: Record<VoiceCallStatus, ChipTone> = {
  [VoiceCallStatus.Queued]: 'amber',
  [VoiceCallStatus.Ringing]: 'amber',
  [VoiceCallStatus.InProgress]: 'teal',
  [VoiceCallStatus.Completed]: 'good',
  [VoiceCallStatus.Busy]: 'warn',
  [VoiceCallStatus.Failed]: 'bad',
  [VoiceCallStatus.NoAnswer]: 'warn',
  [VoiceCallStatus.Canceled]: 'neutral',
};

/** The call log: who was called, how it ended, and what the rep said came of it. Calls waiting for an outcome can be listed on their own. */
@Component({
  selector: 'ar-calls',
  imports: [ArTopbar, ArButton, ArChip, ArIcon, ArSearchBox, ArCallOutcomeDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calls.html',
  styleUrl: './calls.scss',
})
export class ArCalls {
  private readonly api = inject(CallGateway).api;
  private readonly permissions = inject(PermissionService);

  protected readonly Mode = VoiceCallMode;
  protected readonly outcomeLabel = OUTCOME_LABEL;

  protected readonly canSeeAll = grantedPolicy('AutoReach.Inbox.ViewAll', this.permissions);
  protected readonly scope = signal<'mine' | 'everyone'>('mine');
  protected readonly waiting = signal(false);
  /** Starts from `?q=` (Customer 360 links here for one customer). */
  protected readonly search = signal(initialSearch());

  protected readonly calls = signal<CallLogDto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<CallLogDto | null>(null);
  protected readonly limit = signal(50);

  private readonly tick = signal(0);
  protected readonly anyLive = computed(() => this.calls().some(isLive));
  protected readonly waitingCount = computed(() => this.calls().filter(needsOutcome).length);

  protected readonly stats = computed(() => {
    const list = this.calls();
    const total = list.length;
    const inbound = list.filter((c) => c.direction === VoiceCallDirection.Inbound).length;
    const outbound = list.filter((c) => c.direction === VoiceCallDirection.Outbound).length;
    const live = list.filter(isLive).length;
    const waiting = list.filter(needsOutcome).length;
    const completed = list.filter((c) => c.status === VoiceCallStatus.Completed).length;
    return { total, inbound, outbound, live, waiting, completed };
  });

  protected readonly filteredCalls = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.calls();
    if (!q) return list;
    return list.filter(
      (c) =>
        (c.contactName?.toLowerCase().includes(q) ?? false) ||
        (c.contactNumber?.toLowerCase().includes(q) ?? false) ||
        (c.enquiryReference?.toLowerCase().includes(q) ?? false) ||
        (c.repName?.toLowerCase().includes(q) ?? false),
    );
  });

  constructor() {
    effect(() => {
      this.scope();
      this.waiting();
      this.limit();
      this.tick();
      untracked(() => void this.load());
    });

    // A call that is still ringing or in progress is checked again shortly, so its end shows without a reload.
    const timer = setInterval(() => {
      if (this.anyLive()) this.tick.update((n) => n + 1);
    }, 8000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private async load(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.getList({
          mine: this.scope() === 'mine',
          needsOutcome: this.waiting(),
          maxResultCount: this.limit(),
        }),
      );
      this.calls.set(page.items ?? []);
      this.total.set(page.totalCount ?? 0);
      this.error.set(null);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The call log could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected headline(c: CallLogDto): string {
    return callHeadline(c);
  }

  protected number(c: CallLogDto): string {
    return displayNumber(c.contactNumber);
  }

  protected statusLabel(c: CallLogDto): string {
    return c.mode === VoiceCallMode.Manual ? 'Written up' : STATUS_LABEL[c.status];
  }

  protected tone(c: CallLogDto): ChipTone {
    return c.mode === VoiceCallMode.Manual ? 'neutral' : STATUS_TONE[c.status];
  }

  protected arrow(c: CallLogDto): string {
    return c.direction === VoiceCallDirection.Inbound ? '↙' : '↗';
  }

  protected needs(c: CallLogDto): boolean {
    return needsOutcome(c);
  }

  protected hasOutcome(c: CallLogDto): boolean {
    return c.outcome !== CallOutcome.None;
  }

  protected when(c: CallLogDto): string {
    const at = c.startedAtUtc ?? c.creationTime;
    return new Date(at).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** The AI phone call whose transcript is open, and that transcript once loaded. */
  protected readonly transcriptOf = signal<string | null>(null);
  protected readonly transcript = signal<VoiceConversationSnapshotDto | null>(null);
  protected readonly transcriptNote = signal('');

  protected async toggleTranscript(c: CallLogDto): Promise<void> {
    if (this.transcriptOf() === c.id) {
      this.transcriptOf.set(null);
      return;
    }
    this.transcriptOf.set(c.id);
    this.transcript.set(null);
    this.transcriptNote.set('Loading the transcript…');
    try {
      const found = await firstValueFrom(this.api.getAiConversation(c.id));
      if (this.transcriptOf() !== c.id) return;
      this.transcript.set(found);
      if (!found) this.transcriptNote.set('No transcript was kept for this call.');
    } catch (e: unknown) {
      if (this.transcriptOf() === c.id)
        this.transcriptNote.set(errorMessage(e, 'The transcript could not be loaded.'));
    }
  }

  protected outcomeSaved(): void {
    this.editing.set(null);
    this.tick.update((n) => n + 1);
  }

  protected more(): void {
    this.limit.update((n) => n + 50);
  }
}
