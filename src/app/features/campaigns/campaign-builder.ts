import { RecurrenceKind } from '../../proxy/campaigns/recurrence-kind.enum';
import {
  ScheduleDraft,
  WEEKDAYS,
  defaultScheduleDraft,
  scheduleProblem,
  toScheduleInput,
} from './campaign-schedule.logic';
import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { readApiError } from '../../core/util/api-error';
import { TemplateService as TemplateApi } from '../../proxy/messaging/template.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import type { TemplateDto } from '../../proxy/messaging/models';

import { grantedPolicy } from '../../core/auth/permission';
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
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ChipTone } from '../../ui/chip';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArCampaignLinks } from './campaign-links';
import { ArCampaignSetup } from './campaign-setup';
import { ArCampaignRecipients } from './campaign-recipients';

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
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArSelect,
    RouterLink,
    ArCampaignSetup,
    ArCampaignLinks,
    ArCampaignRecipients,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campaign-builder.html',
  styleUrl: './campaign-builder.scss',
})
export class ArCampaignBuilder {
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(CampaignStore);
  private readonly router = inject(Router);
  private readonly cockpitOrigin = inject(CockpitOriginService);
  protected readonly channels = inject(ChannelService).channels;

  protected readonly canCreate = grantedPolicy('AutoReach.Campaigns.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Campaigns.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Campaigns.Delete', this.permissions);
  protected readonly canSendPolicy = grantedPolicy('AutoReach.Campaigns.Send', this.permissions);

  protected readonly campaigns = this.store.campaigns;
  protected readonly loading = this.store.loading;

  // ---- New campaign dialog ---------------------------------------------
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly newName = signal('');
  protected readonly newChannel = signal('');
  protected readonly newTemplate = signal('');
  protected readonly dialogError = signal<string | null>(null);

  /** A WhatsApp campaign sends one approved template: those on the chosen number. */
  private readonly templateApi = inject(TemplateApi);
  protected readonly approvedTemplates = signal<TemplateDto[]>([]);
  protected readonly templatesLoading = signal(false);

  private async loadTemplates(channelId: string): Promise<void> {
    this.approvedTemplates.set([]);
    this.newTemplate.set('');
    if (!channelId) return;
    this.templatesLoading.set(true);
    try {
      const page = await firstValueFrom(
        this.templateApi.getList({
          channelId,
          status: TemplateStatus.Approved,
          maxResultCount: 200,
          skipCount: 0,
        }),
      );
      if (channelId !== this.newChannel()) return; // the number changed meanwhile
      const list = [...(page.items ?? [])].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? ''),
      );
      this.approvedTemplates.set(list);
      this.newTemplate.set(list[0]?.id ?? '');
    } catch (e: unknown) {
      this.dialogError.set(readApiError(e, 'The approved templates could not be loaded.'));
    } finally {
      this.templatesLoading.set(false);
    }
  }

  protected chooseChannel(id: string): void {
    this.newChannel.set(id);
    void this.loadTemplates(id);
  }

  protected openDialog(): void {
    this.newName.set('');
    this.dialogError.set(null);
    this.newChannel.set(this.channels()[0]?.id ?? '');
    void this.loadTemplates(this.newChannel());
    this.dialogOpen.set(true);
  }

  protected async createCampaign(): Promise<void> {
    if (!this.newName().trim()) {
      this.dialogError.set('Give the campaign a name.');
      return;
    }
    if (!this.newChannel()) {
      this.dialogError.set('Pick the WhatsApp number to send from.');
      return;
    }
    if (!this.newTemplate()) {
      this.dialogError.set('Pick an approved template to send.');
      return;
    }
    this.dialogError.set(null);
    this.saving.set(true);
    try {
      const id = await this.store.create(this.newName(), this.newChannel(), this.newTemplate());
      this.dialogOpen.set(false);
      this.setOpen(id);
      this.preflight.set(null);
      this.report.set(null);
    } catch (e: unknown) {
      this.dialogError.set(readApiError(e, 'The campaign could not be created.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected readonly openId = signal<string | null>(null);

  /**
   * Opens (or closes) one campaign and keeps it in the URL (`?open=<id>`), so a screen opened from its links shows
   * "Campaign · <name>" in the breadcrumb and leads back to it open.
   */
  private setOpen(id: string | null): void {
    this.openId.set(id);
    const name = id ? (this.campaigns().find((c) => c.id === id)?.name ?? null) : null;
    void this.router
      .navigate([], { queryParams: { open: id }, queryParamsHandling: 'merge', replaceUrl: true })
      .then(() => this.cockpitOrigin.setCockpitName(name));
  }

  /** "Sales · +91 98200 00000": the number a campaign sends from, when it is in the list of numbers. */
  protected channelName(c: Campaign): string | null {
    const ch = this.channels().find((x) => x.id === c.channelId);
    return ch ? `${ch.displayName} · ${ch.displayPhone}` : null;
  }

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
      this.setOpen(null);
      return;
    }
    this.setOpen(c.id);
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
  protected async refreshReadiness(id: string): Promise<void> {
    this.preflight.set(null);
    this.busy.set(true);
    this.error.set(null);
    try {
      this.preflight.set(await this.store.preflight(id));
      this.store.refresh();
    } catch (e) {
      this.error.set(readApiError(e, 'Could not load campaign detail.'));
    } finally {
      this.busy.set(false);
    }
  }
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
      this.setOpen(null);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The action failed.');
    } finally {
      this.busy.set(false);
    }
  }

  // ---- Scheduling -----------------------------------------------------------------------------
  protected readonly R = RecurrenceKind;
  protected readonly weekdays = WEEKDAYS;
  protected readonly scheduling = signal<Campaign | null>(null);
  protected readonly scheduleDraft = signal<ScheduleDraft | null>(null);
  protected readonly scheduleError = signal<string | null>(null);

  protected openSchedule(c: Campaign): void {
    this.scheduleError.set(null);
    this.scheduleDraft.set(defaultScheduleDraft());
    this.scheduling.set(c);
  }

  protected patchSchedule(change: Partial<ScheduleDraft>): void {
    this.scheduleDraft.update((d) => (d ? { ...d, ...change } : d));
    this.scheduleError.set(null);
  }

  protected toggleDay(day: number): void {
    this.scheduleDraft.update((d) =>
      d
        ? {
            ...d,
            daysOfWeek: d.daysOfWeek.includes(day)
              ? d.daysOfWeek.filter((x) => x !== day)
              : [...d.daysOfWeek, day],
          }
        : d,
    );
  }

  protected async saveSchedule(): Promise<void> {
    const c = this.scheduling();
    const d = this.scheduleDraft();
    if (!c || !d) return;
    const problem = scheduleProblem(d);
    if (problem) {
      this.scheduleError.set(problem);
      return;
    }
    this.busy.set(true);
    try {
      await this.store.schedule(c.id, toScheduleInput(d));
      this.toasts.success(`${c.name} is scheduled.`, 'Campaign');
      this.scheduling.set(null);
      this.setOpen(null);
    } catch (e: unknown) {
      this.scheduleError.set(readApiError(e, 'The campaign could not be scheduled.'));
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

  protected async deleteCampaign(c: Campaign): Promise<void> {
    const ok = await this.dialogs.delete(
      'campaign',
      c.name,
      'Any unsent messages will be cancelled permanently.',
    );
    if (!ok) return;
    this.busy.set(true);
    try {
      await this.store.delete(c.id);
      this.toasts.success(`Campaign "${c.name}" deleted`);
      if (this.openId() === c.id) {
        this.setOpen(null);
      }
    } catch (e: unknown) {
      this.toasts.error(e instanceof Error ? e.message : 'Could not delete campaign');
    } finally {
      this.busy.set(false);
    }
  }
}
