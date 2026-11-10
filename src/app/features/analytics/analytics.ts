import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArChart } from '../../ui/chart';
import { ArChartSeries } from '../../ui/chart-series';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';
import { AnalyticsStore, ConversionDimension } from '../../core/services/analytics.service';
import { ChannelService } from '../../core/services/channel.service';
import { PipelineStore } from '../../core/services/pipeline.service';
import { ReportPeriodStore } from '../../core/services/report-period.store';
import { chartColours } from '../../core/ui/chart-colours';
import { inr } from '../../core/util/format';
import { formatKpi, kpiNote } from '../../core/util/kpi';
import { ArTopbar } from '../../layout/topbar';
import {
  AnalyticsExportFormat,
  AnalyticsService,
  ConversionEnquiryDto,
} from '../../proxy/analytics';
import { ArBanner, ArButton, ArDialog, ArIcon, ArStatTile } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { ArPeriodPicker } from '../../ui/period-picker';
import { ArSelect } from '../../ui/select';

interface TrendBar {
  readonly date: string;
  readonly label: string;
  readonly marketing: number;
  readonly utility: number;
  readonly service: number;
  readonly total: number;
}

type Outcome = 'won' | 'lost' | 'open';

interface DrillRow {
  readonly id: string;
  readonly reference: string;
  readonly title: string | null;
  readonly contact: string;
  readonly company: string | null;
  readonly outcomeText: string;
  readonly value: number | null;
  readonly owner: string;
  readonly when: string;
}

const OUTCOME_LABEL: Record<Outcome, string> = { won: 'Won', lost: 'Lost', open: 'Open' };

/**
 * Analytics (M12). The period's headline figures against the period before, daily volume,
 * spend by category, template and agent performance, and how the pipeline converts. Every
 * table row leads somewhere: a template to its editor, an agent to their conversations, a
 * conversion figure to the enquiries that make it up.
 */
@Component({
  selector: 'ar-analytics',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    ArTopbar,
    ArBanner,
    ArButton,
    ArDialog,
    ArIcon,
    ArStatTile,
    DecimalPipe,
    ArSelect,
    ArPeriodPicker,
    ArGrid,
    GridModule,
    ArChart,
    ArChartSeries,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class ArAnalytics {
  private readonly store = inject(AnalyticsStore);
  private readonly api = inject(AnalyticsService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  constructor() {
    if (this.mode === 'drilldown') {
      const q = this.route?.snapshot?.queryParams;
      if (q && q['key']) {
        void this.drill(
          { key: q['key'], label: q['label'] || q['key'] },
          (q['outcome'] as Outcome) || 'won',
        );
      } else {
        void this.drill({ key: 'Meta', label: 'Meta Ads' }, 'won');
      }
    }
  }

  protected drillToPage(row: { key: string; label: string }, outcome: Outcome): void {
    if (this.router) {
      void this.router.navigate(['/analytics/drilldown'], {
        queryParams: { key: row.key, label: row.label, outcome },
      });
    } else {
      void this.drill(row, outcome);
    }
  }

  protected closeDrill(): void {
    this.drilling.set(null);
    if (this.isPage && this.router) {
      void this.router.navigate(['/analytics']);
    }
  }

  protected readonly loading = this.store.loading;
  protected readonly notInPlan = this.store.notInPlan;
  protected readonly period = inject(ReportPeriodStore);

  /** The headline figures, each with its change on the period before when comparing. */
  protected readonly kpis = computed(() => {
    const compare = this.period.compare();
    const previous = this.period.previousLabel();
    return (this.store.summary()?.kpis ?? []).map((k) => ({
      key: k.key,
      label: k.label,
      value: formatKpi(k.unit, k.current),
      ...kpiNote(k, compare, previous),
    }));
  });
  protected readonly totals = this.store.totals;
  protected readonly conversion = this.store.conversion;
  protected readonly mmLite = this.store.mmLite;

  // Grid rows carry plain numbers (rupees, fractions) so sorting, filtering and export see values.
  protected readonly categoryRows = computed(() =>
    this.store.categories().map((c) => ({
      category: c.category.charAt(0).toUpperCase() + c.category.slice(1),
      count: c.count,
      share: c.shareOfVolume,
      spend: c.spendInPaise / 100,
    })),
  );
  protected readonly templateRows = computed(() =>
    this.store.templates().map((t) => ({
      templateId: t.templateId,
      name: t.name,
      category: t.category,
      sent: t.sent,
      delivered: t.deliveryRate,
      read: t.readRate,
      reply: t.replyRate,
    })),
  );
  protected readonly agentRows = computed(() =>
    this.store.agents().map((a) => ({
      userId: a.userId,
      userName: a.userName,
      conversations: a.conversationsHandled,
      messages: a.messagesSent,
      firstReply: a.medianFirstResponseMinutes ?? null,
      enquiries: a.enquiriesCreated,
      csat: a.csatPercent ?? null,
      csatResponses: a.csatResponses ?? 0,
    })),
  );
  protected readonly teamRows = computed(() => this.store.teams());
  protected readonly conversionRows = computed(() =>
    (this.conversion().rows ?? []).map((r) => ({
      key: r.key ?? '',
      label: r.label ?? '',
      won: r.won ?? 0,
      lost: r.lost ?? 0,
      open: r.open ?? 0,
      winRate: r.winRate ?? 0,
      wonValue: (r.wonValueInPaise ?? 0) / 100,
    })),
  );

  protected readonly mmLiteRows = computed(() => {
    const c = this.mmLite();
    return [c.viaMarketingLite, c.standard].filter(
      (r): r is NonNullable<typeof r> => !!r && !!r.sent,
    );
  });

  protected readonly lostReasons = computed(() =>
    Object.entries(this.conversion().lostReasonBreakdown ?? {})
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  );

  protected readonly pipelines = inject(PipelineStore).pipelines;
  protected readonly conversionPipelineId = this.store.conversionPipelineId;

  protected readonly dimensions: readonly { value: ConversionDimension; label: string }[] = [
    { value: 'source', label: 'By source' },
    { value: 'owner', label: 'By owner' },
    { value: 'stage', label: 'By stage' },
    { value: 'pipeline', label: 'By pipeline' },
  ];

  protected setConversionDimension(d: ConversionDimension): void {
    this.store.setConversionDimension(d);
  }

  protected setConversionPipeline(id: string): void {
    this.store.setConversionPipeline(id || null);
  }

  protected dimensionLabel(d: string | null | undefined): string {
    return d === 'owner'
      ? 'Owner'
      : d === 'stage'
        ? 'Stage'
        : d === 'pipeline'
          ? 'Pipeline'
          : 'Source';
  }

  // ---- the assistant's summary of the period -----------------------------------------

  private readonly channels = inject(ChannelService);
  protected readonly narrative = signal<{
    text?: string | null;
    unavailable?: string | null;
  } | null>(null);
  protected readonly narrating = signal(false);

  protected async summarise(): Promise<void> {
    this.narrating.set(true);
    try {
      this.narrative.set(
        await firstValueFrom(
          this.api.getNarrative({
            ...this.period.range(),
            channelId: this.channels.active()?.id,
          }),
        ),
      );
    } catch {
      // Shown as a toast; the button stays available to try again.
    } finally {
      this.narrating.set(false);
    }
  }

  // ---- drill-down: the enquiries behind a conversion figure --------------------------

  protected readonly drilling = signal<{
    title: string;
    loading: boolean;
    rows: DrillRow[];
  } | null>(null);

  protected async drill(row: { key: string; label: string }, outcome: Outcome): Promise<void> {
    const title = `${row.label} · ${OUTCOME_LABEL[outcome].toLowerCase()}`;
    this.drilling.set({ title, loading: true, rows: [] });
    try {
      const items =
        (
          await firstValueFrom(
            this.api.getConversionEnquiries({
              ...this.period.range(),
              dimension: this.conversion().dimension ?? 'source',
              pipelineId: this.conversionPipelineId(),
              key: row.key,
              outcome,
            }),
          )
        ).items ?? [];
      this.drilling.set({ title, loading: false, rows: items.map((e) => this.drillRow(e)) });
    } catch {
      // The failure is shown as a toast; close rather than leave a spinner.
      this.drilling.set(null);
    }
  }

  private drillRow(e: ConversionEnquiryDto): DrillRow {
    const date = e.closedAtUtc ?? e.openedAtUtc;
    return {
      id: e.id,
      reference: e.reference,
      title: e.title ?? null,
      contact: e.contact,
      company: e.company ?? null,
      outcomeText:
        e.outcome === 'lost' && e.lostReason ? `Lost · ${e.lostReason}` : OUTCOME_LABEL[e.outcome],
      value: e.valueInPaise == null ? null : e.valueInPaise / 100,
      owner: e.owner ?? 'Unassigned',
      when: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    };
  }

  // ---- chart --------------------------------------------------------------------------

  protected readonly bars = computed<TrendBar[]>(() =>
    this.store.trend().map((p) => ({
      date: p.date,
      label: new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      marketing: p.marketing,
      utility: p.utility,
      service: p.service,
      total: p.marketing + p.utility + p.service,
    })),
  );

  protected readonly colours = chartColours({
    marketing: '--ar-chart-marketing',
    utility: '--ar-chart-utility',
    service: '--ar-line-300',
  });
  protected readonly xAxis = {
    valueType: 'Category',
    majorGridLines: { width: 0 },
    majorTickLines: { width: 0 },
    labelIntersectAction: 'Hide',
  } as const;
  protected readonly yAxis = {
    minimum: 0,
    lineStyle: { width: 0 },
    majorTickLines: { width: 0 },
    labelFormat: 'n0',
  } as const;

  protected readonly exportFormats = [
    { value: AnalyticsExportFormat.Csv, label: 'CSV' },
    { value: AnalyticsExportFormat.Excel, label: 'Excel' },
    { value: AnalyticsExportFormat.Pdf, label: 'PDF' },
  ];

  protected export(format: AnalyticsExportFormat): void {
    void this.store.export(format);
  }

  protected inr(paise: number): string {
    return inr(paise);
  }

  protected pct(fraction: number): string {
    return `${(fraction * 100).toFixed(1)}%`;
  }

  protected minutes(m?: number | null): string {
    if (m == null) return '—';
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }
}
