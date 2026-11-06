import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
import { ToastService } from '../../core/ui/toast.service';

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
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSelect, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class ArScheduledReports {
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(ScheduledReportService);
  private readonly toasts = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly pageTitle = computed(() => {
    if (this.mode === 'preview') return 'Report preview';
    return this.editingId() ? 'Edit scheduled report' : 'New scheduled report';
  });

  /** The report being sent right now, so its button shows progress. */
  protected readonly sending = signal<string | null>(null);
  /** The preview open in the dialog: the server's own escaped HTML, shown in a sandboxed frame. */
  protected readonly previewing = signal<{ subject: string; html: SafeHtml } | null>(null);

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

  constructor() {
    effect(() => {
      const list = this.reports();
      if (list.length > 0) {
        this.checkRouteParam();
      }
    });
    if (this.mode === 'new') {
      this.openNew();
    }
  }

  private checkRouteParam(): void {
    if (this.mode === 'new') {
      this.openNew();
    } else if (this.mode === 'edit') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const r = this.reports().find((x) => x.id === id);
      if (r) this.openEdit(r);
      else this.openNew();
    } else if (this.mode === 'preview') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const r = this.reports().find((x) => x.id === id);
      if (r) void this.preview(r);
    }
  }

  protected goNew(): void {
    if (this.router) void this.router.navigate(['/settings/reports/new']);
    else this.openNew();
  }

  protected goEdit(r: ScheduledReportDto): void {
    if (this.router && r.id) void this.router.navigate(['/settings/reports', r.id, 'edit']);
    else this.openEdit(r);
  }

  protected goPreview(r: ScheduledReportDto): void {
    if (this.router && r.id) void this.router.navigate(['/settings/reports', r.id, 'preview']);
    else void this.preview(r);
  }

  protected close(): void {
    this.editorOpen.set(false);
    this.previewing.set(null);
    if (this.isPage && this.router) {
      void this.router.navigate(['/settings/reports']);
    }
  }

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
      this.close();
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the report.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async runNow(r: ScheduledReportDto): Promise<void> {
    if (!r.id) return;
    this.sending.set(r.id);
    try {
      const after = await firstValueFrom(this.api.runNow(r.id));
      // Success already toasts; a channel that did not go out is worth its own warning.
      if (after.lastRunNote && this.isProblem(after.lastRunNote)) {
        this.toasts.warning(after.lastRunNote, r.name ?? 'Report');
      }
      this.tick.update((n) => n + 1);
    } finally {
      this.sending.set(null);
    }
  }

  protected async preview(r: ScheduledReportDto): Promise<void> {
    if (!r.id) return;
    const p = await firstValueFrom(this.api.preview(r.id));
    this.previewing.set({
      subject: p.subject,
      html: this.sanitizer.bypassSecurityTrustHtml(p.html),
    });
  }

  /** A run note that says something did not go out. */
  protected isProblem(note: string): boolean {
    return /not sent|failed|refused|could not|nobody/i.test(note);
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
