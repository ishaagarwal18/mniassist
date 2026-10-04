import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import {
  Campaign,
  CampaignStore,
  CState,
  Preflight,
  Report,
  sendTimeCoverage,
} from '../../core/services/campaign.service';
import { ChannelService } from '../../core/services/channel.service';
import { count, inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ChipTone } from '../../ui/chip';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';

const STATE_TONE: Record<CState, ChipTone> = {
  draft: 'neutral',
  scheduled: 'amber',
  running: 'teal',
  paused: 'amber',
  completed: 'good',
  cancelled: 'neutral',
  suspended: 'bad',
};

/**
 * Campaigns (M05). The list, the pre-flight (which reports every gate — headroom
 * warns, the other four block), and send / pause / resume / cancel — all wired to
 * the API, which resolves the audience at dispatch and never before.
 */
@Component({
  selector: 'ar-campaign-builder',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campaign-builder.html',
  styleUrl: './campaign-builder.scss',
})
export class ArCampaignBuilder {
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(CampaignStore);
  protected readonly channels = inject(ChannelService).channels;

  protected readonly campaigns = this.store.campaigns;
  protected readonly loading = this.store.loading;

  // ---- New campaign dialog ---------------------------------------------
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly newName = signal('');
  protected readonly newChannel = signal('');

  protected openDialog(): void {
    this.newName.set('');
    this.newChannel.set(this.channels()[0]?.id ?? '');
    this.dialogOpen.set(true);
  }

  protected async createCampaign(): Promise<void> {
    if (!this.newName().trim() || !this.newChannel()) {
      this.toasts.warning('Give the campaign a name and pick a channel.', 'Campaign');
      return;
    }
    this.saving.set(true);
    try {
      await this.store.create(this.newName(), this.newChannel());
      this.dialogOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The campaign could not be created.');
    } finally {
      this.saving.set(false);
    }
  }

  protected readonly openId = signal<string | null>(null);
  protected readonly preflight = signal<Preflight | null>(null);
  protected readonly report = signal<Report | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly count = count;
  protected readonly inr = inr;

  protected tone(s: CState): ChipTone {
    return STATE_TONE[s];
  }

  protected pct(n: number): string {
    return `${(n * 100).toFixed(1)}%`;
  }

  protected when(iso?: string): string {
    return iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
  }

  protected async toggle(c: Campaign): Promise<void> {
    if (this.openId() === c.id) {
      this.openId.set(null);
      return;
    }
    this.openId.set(c.id);
    this.preflight.set(null);
    this.report.set(null);
    this.error.set(null);
    this.busy.set(true);
    try {
      if (c.state === 'draft' || c.state === 'scheduled') {
        this.preflight.set(await this.store.preflight(c.id));
      } else {
        this.report.set(await this.store.report(c.id));
      }
    } catch {
      this.error.set('Could not load campaign detail.');
    } finally {
      this.busy.set(false);
    }
  }

  protected canSend = computed(() => this.preflight()?.canSend ?? false);
  protected readonly coverage = sendTimeCoverage;

  protected readonly savingTiming = signal(false);

  /**
   * Send-time optimisation (M05-12). Saved the moment it is toggled, on its own call, so
   * it cannot disturb the rest of the campaign. If the save fails the checkbox is put back
   * — Angular will not re-apply an unchanged binding, so without this the box would show
   * a setting the server never accepted.
   */
  protected async setOptimise(c: Campaign, event: Event): Promise<void> {
    const box = event.target as HTMLInputElement;
    const wanted = box.checked;
    this.savingTiming.set(true);
    this.error.set(null);
    try {
      await this.store.setOptimiseSendTime(c.id, wanted);
    } catch (e: unknown) {
      box.checked = c.optimiseSendTime;
      this.error.set(e instanceof Error ? e.message : 'The send-time setting could not be saved.');
    } finally {
      this.savingTiming.set(false);
    }
  }

  private async act(fn: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await fn();
      this.openId.set(null);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The action failed.');
    } finally {
      this.busy.set(false);
    }
  }

  protected send(c: Campaign): Promise<void> {
    return this.act(() => this.store.sendNow(c.id));
  }
  protected pause(c: Campaign): Promise<void> {
    return this.act(() => this.store.pause(c.id));
  }
  protected resume(c: Campaign): Promise<void> {
    return this.act(() => this.store.resume(c.id));
  }
  protected async cancel(c: Campaign): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Cancel “${c.name}”?`,
        message: 'No more messages go out. Messages already dispatched are not recalled.',
        confirmText: 'Cancel campaign',
        cancelText: 'Keep it',
        tone: 'danger',
      }))
    )
      return;
    return this.act(() => this.store.cancel(c.id));
  }
}
