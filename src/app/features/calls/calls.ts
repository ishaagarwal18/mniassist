import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import { CallLogDto, CallOutcome, VoiceCallDirection, VoiceCallMode, VoiceCallStatus } from '../../proxy/voice';
import { ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { errorMessage } from '../activities/activity-logic';
import { ArCallOutcomeDialog } from './call-outcome-dialog';
import { CallGateway } from './call-mock';
import { OUTCOME_LABEL, STATUS_LABEL, callHeadline, displayNumber, isLive, needsOutcome } from './call-logic';

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
  imports: [ArTopbar, ArChip, ArCallOutcomeDialog],
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

  protected readonly calls = signal<CallLogDto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<CallLogDto | null>(null);
  protected readonly limit = signal(50);

  private readonly tick = signal(0);
  protected readonly anyLive = computed(() => this.calls().some(isLive));
  protected readonly waitingCount = computed(() => this.calls().filter(needsOutcome).length);

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
        this.api.getList({ mine: this.scope() === 'mine', needsOutcome: this.waiting(), maxResultCount: this.limit() }),
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
    return new Date(at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  protected outcomeSaved(): void {
    this.editing.set(null);
    this.tick.update((n) => n + 1);
  }

  protected more(): void {
    this.limit.update((n) => n + 50);
  }
}
