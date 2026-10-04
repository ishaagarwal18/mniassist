import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import {
  CreateUpdateScheduledReportDto,
  ReportCadence,
  ReportDeliveryChannel,
  ScheduledReportDto,
  ScheduledReportKind,
  ScheduledReportService,
} from '../../proxy/analytics';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ConfirmService } from '../../core/ui/confirm.service';

const KINDS = [
  { value: ScheduledReportKind.ExecutiveSummary, label: 'Executive summary' },
  { value: ScheduledReportKind.CampaignPerformance, label: 'Campaign performance' },
  { value: ScheduledReportKind.AgentPerformance, label: 'Agent performance' },
  { value: ScheduledReportKind.PipelineConversion, label: 'Pipeline conversion' },
];
const CADENCES = [
  { value: ReportCadence.Daily, label: 'Daily' },
  { value: ReportCadence.Weekly, label: 'Weekly' },
  { value: ReportCadence.Monthly, label: 'Monthly' },
];

interface Draft {
  name: string;
  kind: ScheduledReportKind;
  cadence: ReportCadence;
  sendHourLocal: number;
  email: boolean;
  whatsapp: boolean;
  inApp: boolean;
  emailRecipients: string;
  whatsAppNumber: string;
  isActive: boolean;
}

const BLANK: Draft = {
  name: '',
  kind: ScheduledReportKind.ExecutiveSummary,
  cadence: ReportCadence.Weekly,
  sendHourLocal: 8,
  email: true,
  whatsapp: false,
  inApp: true,
  emailRecipients: '',
  whatsAppNumber: '',
  isActive: true,
};

/**
 * Scheduled report delivery (M12-5). A report goes to the tenant owner on a cadence
 * by email, WhatsApp and/or in-app.
 */
@Component({
  selector: 'ar-scheduled-reports',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class ArScheduledReports {
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(ScheduledReportService);

  protected readonly kinds = KINDS;
  protected readonly cadences = CADENCES;
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () => this.api.getList({ skipCount: 0, maxResultCount: 100 }),
    defaultValue: { items: [] as ScheduledReportDto[], totalCount: 0 },
  });

  protected readonly reports = computed(() => this.resource.value().items ?? []);
  protected readonly loading = computed(() => this.resource.isLoading());

  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly draft = signal<Draft>({ ...BLANK });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected kindLabel(k?: ScheduledReportKind): string {
    return KINDS.find((x) => x.value === k)?.label ?? '';
  }
  protected cadenceLabel(c?: ReportCadence): string {
    return CADENCES.find((x) => x.value === c)?.label ?? '';
  }
  protected channelSummary(mask?: number): string {
    const m = mask ?? 0;
    return (
      [
        m & ReportDeliveryChannel.Email ? 'Email' : null,
        m & ReportDeliveryChannel.WhatsApp ? 'WhatsApp' : null,
        m & ReportDeliveryChannel.InApp ? 'In-app' : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'None'
    );
  }

  protected patch<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.draft.set({ ...BLANK });
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected openEdit(r: ScheduledReportDto): void {
    const m = r.channels ?? 0;
    this.editingId.set(r.id ?? null);
    this.draft.set({
      name: r.name ?? '',
      kind: r.kind ?? ScheduledReportKind.ExecutiveSummary,
      cadence: r.cadence ?? ReportCadence.Weekly,
      sendHourLocal: r.sendHourLocal ?? 8,
      email: !!(m & ReportDeliveryChannel.Email),
      whatsapp: !!(m & ReportDeliveryChannel.WhatsApp),
      inApp: !!(m & ReportDeliveryChannel.InApp),
      emailRecipients: r.emailRecipients ?? '',
      whatsAppNumber: r.whatsAppNumber ?? '',
      isActive: r.isActive ?? true,
    });
    this.error.set(null);
    this.editorOpen.set(true);
  }

  private toDto(d: Draft): CreateUpdateScheduledReportDto {
    let channels = 0;
    if (d.email) channels |= ReportDeliveryChannel.Email;
    if (d.whatsapp) channels |= ReportDeliveryChannel.WhatsApp;
    if (d.inApp) channels |= ReportDeliveryChannel.InApp;
    return {
      name: d.name.trim(),
      kind: d.kind,
      cadence: d.cadence,
      sendHourLocal: Number(d.sendHourLocal) || 8,
      timeZoneId: 'Asia/Kolkata',
      channels,
      emailRecipients: d.emailRecipients.trim() || null,
      whatsAppNumber: d.whatsAppNumber.trim() || null,
      isActive: d.isActive,
    };
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d.name.trim()) {
      this.error.set('A name is required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const id = this.editingId();
      if (id) await firstValueFrom(this.api.update(id, this.toDto(d)));
      else await firstValueFrom(this.api.create(this.toDto(d)));
      this.editorOpen.set(false);
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the report.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async runNow(r: ScheduledReportDto): Promise<void> {
    if (!r.id) return;
    await firstValueFrom(this.api.runNow(r.id));
    this.tick.update((n) => n + 1);
  }

  protected async remove(r: ScheduledReportDto): Promise<void> {
    if (!r.id || !(await this.dialogs.delete('this scheduled report', r.name))) return;
    await firstValueFrom(this.api.delete(r.id));
    this.tick.update((n) => n + 1);
  }

  protected when(iso?: string | null): string {
    if (!iso) return 'never';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
