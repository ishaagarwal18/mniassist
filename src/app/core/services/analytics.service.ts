import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AnalyticsExportFormat,
  AnalyticsService as AnalyticsApi,
  ConversionReportDto,
  MarketingLiteComparisonDto,
} from '../../proxy/analytics';
import {
  PricingCategory as ApiPricingCategory,
  TemplateCategory as ApiTemplateCategory,
  TemplateQuality as ApiTemplateQuality,
} from '../../proxy/messaging';
import {
  AgentPerformance,
  CategoryBreakdown,
  PricingCategory,
  TemplatePerformance,
  TrendPoint,
} from '../models/analytics.model';
import { ChannelService } from './channel.service';
import { ToastService } from '../ui/toast.service';

const PRICING: Record<ApiPricingCategory, PricingCategory> = {
  [ApiPricingCategory.Unknown]: 'unknown',
  [ApiPricingCategory.Marketing]: 'marketing',
  [ApiPricingCategory.Utility]: 'utility',
  [ApiPricingCategory.Authentication]: 'authentication',
  [ApiPricingCategory.Service]: 'service',
  // Priced separately only when a rate exists; in reports it is utility.
  [ApiPricingCategory.UtilityInWindow]: 'utility',
};

const TEMPLATE_CAT: Record<ApiTemplateCategory, TemplatePerformance['category']> = {
  [ApiTemplateCategory.Marketing]: 'marketing',
  [ApiTemplateCategory.Utility]: 'utility',
  [ApiTemplateCategory.Authentication]: 'authentication',
};

const TEMPLATE_QUALITY: Record<ApiTemplateQuality, TemplatePerformance['quality']> = {
  [ApiTemplateQuality.Unknown]: 'unknown',
  [ApiTemplateQuality.High]: 'high',
  [ApiTemplateQuality.Medium]: 'medium',
  [ApiTemplateQuality.Low]: 'low',
};

/** Range presets, in days back from now. */
export type AnalyticsRange = 7 | 30 | 90;

interface Bundle {
  trend: TrendPoint[];
  categories: CategoryBreakdown[];
  templates: TemplatePerformance[];
  agents: AgentPerformance[];
}

export type ConversionDimension = 'source' | 'owner' | 'stage' | 'pipeline';

const SEED_CONVERSION: ConversionReportDto = {
  dimension: 'source',
  rows: [
    {
      key: 'Exhibition',
      label: 'Exhibition',
      won: 9,
      lost: 6,
      open: 4,
      wonValueInPaise: 182_00_000,
      winRate: 0.6,
    },
    {
      key: 'Website',
      label: 'Website',
      won: 5,
      lost: 8,
      open: 7,
      wonValueInPaise: 71_00_000,
      winRate: 0.385,
    },
    {
      key: 'ClickToWhatsApp',
      label: 'ClickToWhatsApp',
      won: 4,
      lost: 3,
      open: 2,
      wonValueInPaise: 54_00_000,
      winRate: 0.571,
    },
    {
      key: 'Referral',
      label: 'Referral',
      won: 6,
      lost: 1,
      open: 1,
      wonValueInPaise: 120_00_000,
      winRate: 0.857,
    },
  ],
  lostReasonBreakdown: {
    PriceTooHigh: 7,
    LostToCompetitor: 5,
    NoBudget: 4,
    ProjectCancelledOrDeferred: 2,
  },
};

const SEED_MM_LITE: MarketingLiteComparisonDto = {
  viaMarketingLite: {
    path: 'MM Lite',
    sent: 4200,
    delivered: 4100,
    read: 2700,
    replied: 540,
    spendInPaise: 273_00_000,
    deliveryRate: 0.976,
    readRate: 0.643,
    replyRate: 0.129,
  },
  standard: {
    path: 'Standard',
    sent: 3800,
    delivered: 3660,
    read: 2200,
    replied: 410,
    spendInPaise: 361_00_000,
    deliveryRate: 0.963,
    readRate: 0.579,
    replyRate: 0.108,
  },
};

const SEED: Bundle = {
  trend: Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86_400_000);
    return {
      date: d.toISOString().slice(0, 10),
      marketing: 120 + Math.round(Math.sin(i / 2) * 60) + i * 4,
      utility: 200 + Math.round(Math.cos(i / 3) * 40),
      service: 90 + (i % 5) * 12,
      spendInPaise: (140 + i * 6) * 8631,
    };
  }),
  categories: [
    { category: 'utility', count: 3_240, spendInPaise: 372_600, shareOfVolume: 0.52 },
    { category: 'marketing', count: 2_180, spendInPaise: 1_881_558, shareOfVolume: 0.35 },
    { category: 'service', count: 810, spendInPaise: 0, shareOfVolume: 0.13 },
  ],
  templates: [
    {
      templateId: 't-1',
      name: 'amc_renewal_30d',
      category: 'utility',
      quality: 'high',
      sent: 1_204,
      deliveryRate: 0.982,
      readRate: 0.741,
      replyRate: 0.38,
    },
    {
      templateId: 't-2',
      name: 'quotation_followup_d5',
      category: 'marketing',
      quality: 'medium',
      sent: 880,
      deliveryRate: 0.955,
      readRate: 0.62,
      replyRate: 0.29,
    },
    {
      templateId: 't-3',
      name: 'vfd_retrofit_bulletin',
      category: 'marketing',
      quality: 'high',
      sent: 2_000,
      deliveryRate: 0.968,
      readRate: 0.54,
      replyRate: 0.11,
    },
  ],
  agents: [
    {
      userId: 'u-1',
      userName: 'ravi.k',
      conversationsHandled: 148,
      messagesSent: 612,
      medianFirstResponseMinutes: 7,
      enquiriesCreated: 22,
    },
    {
      userId: 'u-2',
      userName: 'sneha.p',
      conversationsHandled: 121,
      messagesSent: 503,
      medianFirstResponseMinutes: 11,
      enquiriesCreated: 14,
    },
    {
      userId: 'u-3',
      userName: 'imtiaz.a',
      conversationsHandled: 96,
      messagesSent: 388,
      medianFirstResponseMinutes: 19,
      enquiriesCreated: 9,
    },
  ],
};

@Injectable({ providedIn: 'root' })
export class AnalyticsStore {
  private readonly toasts = inject(ToastService);
  private readonly api = inject(AnalyticsApi);
  private readonly channels = inject(ChannelService);

  readonly range = signal<AnalyticsRange>(30);

  private readonly resource = rxResource({
    params: () =>
      environment.useMockData
        ? undefined
        : {
            fromUtc: new Date(Date.now() - this.range() * 86_400_000).toISOString(),
            channelId: this.channels.active()?.id,
          },
    stream: ({ params }) =>
      forkJoin({
        trend: this.api.getVolumeTrend(params),
        categories: this.api.getCategoryBreakdown(params),
        templates: this.api.getTemplatePerformance(params),
        agents: this.api.getAgentPerformance(params),
      }).pipe(
        map((r): Bundle => ({
          trend: (r.trend.items ?? []).map((t) => ({
            date: t.date ?? '',
            marketing: t.marketing ?? 0,
            utility: t.utility ?? 0,
            service: t.service ?? 0,
            spendInPaise: t.spendInPaise ?? 0,
          })),
          categories: (r.categories.items ?? []).map((c) => ({
            category:
              c.category != null ? PRICING[c.category] : PRICING[ApiPricingCategory.Unknown],
            count: c.count ?? 0,
            spendInPaise: c.spendInPaise ?? 0,
            shareOfVolume: c.shareOfVolume ?? 0,
          })),
          templates: (r.templates.items ?? []).map((t) => ({
            templateId: t.templateId ?? '',
            name: t.name ?? '(unnamed)',
            category:
              t.category != null
                ? TEMPLATE_CAT[t.category]
                : TEMPLATE_CAT[ApiTemplateCategory.Utility],
            quality:
              t.quality != null
                ? TEMPLATE_QUALITY[t.quality]
                : TEMPLATE_QUALITY[ApiTemplateQuality.Unknown],
            sent: t.sent ?? 0,
            deliveryRate: t.deliveryRate ?? 0,
            readRate: t.readRate ?? 0,
            replyRate: t.replyRate ?? 0,
          })),
          agents: (r.agents.items ?? []).map((a) => ({
            userId: a.userId ?? '',
            userName: a.userName ?? '(removed)',
            conversationsHandled: a.conversationsHandled ?? 0,
            messagesSent: a.messagesSent ?? 0,
            medianFirstResponseMinutes: a.medianFirstResponseMinutes ?? undefined,
            enquiriesCreated: a.enquiriesCreated ?? 0,
          })),
        })),
      ),
    defaultValue: SEED,
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());
  /** A failed request (a 403 without the permission, say) reads as no data: Angular's
   *  resource.value() throws once a request has failed, which would freeze the screen. */
  private readonly data = computed<Bundle>(() =>
    environment.useMockData
      ? SEED
      : this.resource.hasValue()
        ? this.resource.value()
        : { trend: [], categories: [], templates: [], agents: [] },
  );

  readonly trend = computed(() => this.data().trend);
  readonly categories = computed(() => this.data().categories);
  readonly templates = computed(() => this.data().templates);
  readonly agents = computed(() => this.data().agents);

  readonly totals = computed(() => {
    const t = this.data().trend;
    return {
      messages: t.reduce((n, p) => n + p.marketing + p.utility + p.service, 0),
      spendInPaise: t.reduce((n, p) => n + p.spendInPaise, 0),
      free: this.data().categories.find((c) => c.category === 'service')?.count ?? 0,
    };
  });

  setRange(days: AnalyticsRange): void {
    this.range.set(days);
  }

  // ── Conversion report (M10-8) ──────────────────────────────────────────
  readonly conversionDimension = signal<ConversionDimension>('source');
  /** Limits the report to one pipeline; null covers all of them. */
  readonly conversionPipelineId = signal<string | null>(null);

  private readonly conversionResource = rxResource({
    params: () =>
      environment.useMockData
        ? undefined
        : {
            dimension: this.conversionDimension(),
            pipelineId: this.conversionPipelineId(),
            fromUtc: new Date(Date.now() - this.range() * 86_400_000).toISOString(),
            channelId: this.channels.active()?.id,
          },
    stream: ({ params }) => this.api.getConversionReport(params),
    defaultValue: SEED_CONVERSION,
  });

  readonly conversion = computed<ConversionReportDto>(() =>
    environment.useMockData
      ? SEED_CONVERSION
      : this.conversionResource.hasValue()
        ? this.conversionResource.value()
        : { dimension: this.conversionDimension(), rows: [] },
  );

  setConversionDimension(d: ConversionDimension): void {
    this.conversionDimension.set(d);
  }

  setConversionPipeline(id: string | null): void {
    this.conversionPipelineId.set(id);
  }

  // ── MM Lite comparison (M05-11) ────────────────────────────────────────
  private readonly mmLiteResource = rxResource({
    params: () =>
      environment.useMockData
        ? undefined
        : {
            fromUtc: new Date(Date.now() - this.range() * 86_400_000).toISOString(),
            channelId: this.channels.active()?.id,
          },
    stream: ({ params }) => this.api.getMarketingLiteComparison(params),
    defaultValue: SEED_MM_LITE,
  });

  readonly mmLite = computed<MarketingLiteComparisonDto>(() =>
    environment.useMockData
      ? SEED_MM_LITE
      : this.mmLiteResource.hasValue()
        ? this.mmLiteResource.value()
        : {},
  );

  /** Downloads the category / template / agent tables in the chosen format. M12-6. */
  async export(format: AnalyticsExportFormat): Promise<void> {
    if (environment.useMockData) {
      this.toasts.info('Export needs the API — it is disabled in the standalone build.', 'Export');
      return;
    }
    const blob = await firstValueFrom(
      this.api.export(
        {
          fromUtc: new Date(Date.now() - this.range() * 86_400_000).toISOString(),
          channelId: this.channels.active()?.id,
        },
        format,
      ),
    );
    const ext =
      format === AnalyticsExportFormat.Excel
        ? 'xls'
        : format === AnalyticsExportFormat.Pdf
          ? 'pdf'
          : 'csv';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${this.range()}d.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
