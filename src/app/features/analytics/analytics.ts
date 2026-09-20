import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AnalyticsRange, AnalyticsStore, ConversionDimension } from '../../core/services/analytics.service';
import { PipelineStore } from '../../core/services/pipeline.service';
import { AnalyticsExportFormat } from '../../proxy/analytics';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArStatTile } from '../../ui';

interface TrendBar {
  readonly date: string;
  readonly label: string;
  readonly marketing: number;
  readonly utility: number;
  readonly service: number;
  readonly total: number;
}

/**
 * Analytics (M12). Volume trend, spend by category, and the two per-actor tables —
 * template performance and agent performance — that the API only started answering
 * once the reporting read models were written.
 */
@Component({
  selector: 'ar-analytics',
  imports: [ArTopbar, ArButton, ArStatTile, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class ArAnalytics {
  private readonly store = inject(AnalyticsStore);

  protected readonly loading = this.store.loading;
  protected readonly range = this.store.range;
  protected readonly categories = this.store.categories;
  protected readonly templates = this.store.templates;
  protected readonly agents = this.store.agents;
  protected readonly totals = this.store.totals;
  protected readonly conversion = this.store.conversion;
  protected readonly mmLite = this.store.mmLite;

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

  protected setConversionDimension(d: ConversionDimension): void {
    this.store.setConversionDimension(d);
  }

  protected setConversionPipeline(id: string): void {
    this.store.setConversionPipeline(id || null);
  }

  protected dimensionLabel(d: string | null | undefined): string {
    return d === 'owner' ? 'Owner' : d === 'stage' ? 'Stage' : d === 'pipeline' ? 'Pipeline' : 'Source';
  }

  protected readonly ranges: readonly AnalyticsRange[] = [7, 30, 90];

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

  protected readonly peak = computed(() => Math.max(1, ...this.bars().map((b) => b.total)));

  protected setRange(days: AnalyticsRange): void {
    this.store.setRange(days);
  }

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

  protected height(value: number): string {
    return `${Math.max(1, (value / this.peak()) * 100)}%`;
  }

  protected minutes(m?: number): string {
    if (m == null) return '—';
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }
}
