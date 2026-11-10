import { ReportExportService } from '../../proxy/reports/report-export.service';
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, map } from 'rxjs';
import {
  AnalyticsSummaryDto,
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
  TeamSatisfaction,
  TemplatePerformance,
  TrendPoint,
} from '../models/analytics.model';
import { ChannelService } from './channel.service';
import { ReportPeriodStore } from './report-period.store';
import { ToastService } from '../ui/toast.service';
import { settled } from '../util/resource';
import { isPlanRefusal } from '../http/api-feedback';

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

interface Bundle {
  trend: TrendPoint[];
  categories: CategoryBreakdown[];
  templates: TemplatePerformance[];
  agents: AgentPerformance[];
  teams: TeamSatisfaction[];
}

export type ConversionDimension = 'source' | 'owner' | 'stage' | 'pipeline';

const EMPTY_TABLES: Omit<Bundle, 'trend'> = {
  categories: [],
  templates: [],
  agents: [],
  teams: [],
};

@Injectable({ providedIn: 'root' })
export class AnalyticsStore {
  private readonly toasts = inject(ToastService);
  private readonly api = inject(AnalyticsApi);
  private readonly exports = inject(ReportExportService);
  private readonly channels = inject(ChannelService);

  private readonly period = inject(ReportPeriodStore);

  private params() {
    return { ...this.period.range(), channelId: this.channels.active()?.id };
  }

  /** The daily trend is in every plan; it loads on its own so a plan without full
   *  analytics still gets its chart. */
  private readonly trendResource = rxResource({
    params: () => this.params(),
    stream: ({ params }) =>
      this.api.getVolumeTrend(params).pipe(
        map((r) =>
          (r.items ?? []).map((t) => ({
            date: t.date ?? '',
            marketing: t.marketing ?? 0,
            utility: t.utility ?? 0,
            service: t.service ?? 0,
            spendInPaise: t.spendInPaise ?? 0,
          })),
        ),
      ),
    defaultValue: [] as TrendPoint[],
  });

  /** The tables need the full-analytics plan feature. */
  private readonly resource = rxResource({
    params: () => this.params(),
    stream: ({ params }) =>
      forkJoin({
        categories: this.api.getCategoryBreakdown(params),
        templates: this.api.getTemplatePerformance(params),
        agents: this.api.getAgentPerformance(params),
        teams: this.api.getTeamSatisfaction(params),
      }).pipe(
        map((r): Omit<Bundle, 'trend'> => ({
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
            csatResponses: a.csatResponses ?? 0,
            csatPercent: a.csatPercent ?? undefined,
          })),
          teams: (r.teams.items ?? []).map((t) => ({
            teamId: t.teamId,
            name: t.name,
            responses: t.responses,
            csatPercent: t.csatPercent ?? undefined,
            good: t.good,
            okay: t.okay,
            poor: t.poor,
          })),
        })),
      ),
    defaultValue: EMPTY_TABLES,
  });

  readonly loading = computed(() => this.resource.isLoading() || this.trendResource.isLoading());

  /** The workspace's plan leaves out full analytics: the tables answer 403 with
   *  PlanFeatureNotIncluded, quietly, so the page says why they are empty. */
  readonly notInPlan = computed(() => isPlanRefusal(this.resource.error()));

  /** A failed request (a 403 without the permission, say) reads as no data: Angular's
   *  resource.value() throws once a request has failed, which would freeze the screen. */
  private readonly data = computed<Bundle>(() => ({
    trend: this.trendResource.hasValue() ? settled(this.trendResource, []) : [],
    ...(this.resource.hasValue() ? settled(this.resource, EMPTY_TABLES) : EMPTY_TABLES),
  }));

  readonly trend = computed(() => this.data().trend);
  readonly categories = computed(() => this.data().categories);
  readonly templates = computed(() => this.data().templates);
  readonly agents = computed(() => this.data().agents);
  readonly teams = computed(() => this.data().teams ?? []);

  readonly totals = computed(() => {
    const t = this.data().trend;
    return {
      messages: t.reduce((n, p) => n + p.marketing + p.utility + p.service, 0),
      spendInPaise: t.reduce((n, p) => n + p.spendInPaise, 0),
      free: this.data().categories.find((c) => c.category === 'service')?.count ?? 0,
    };
  });

  // ── Headline figures against the period before ─────────────────────────
  private readonly summaryResource = rxResource({
    params: () => this.params(),
    stream: ({ params }) => this.api.getSummary(params),
  });

  /** Null until the first answer, and after a failure (shown as a toast). */
  readonly summary = computed<AnalyticsSummaryDto | null>(() => {
    if (this.summaryResource.error() || !this.summaryResource.hasValue()) return null;
    return this.summaryResource.value() ?? null;
  });

  // ── Conversion report (M10-8) ──────────────────────────────────────────
  readonly conversionDimension = signal<ConversionDimension>('source');
  /** Limits the report to one pipeline; null covers all of them. */
  readonly conversionPipelineId = signal<string | null>(null);

  private readonly conversionResource = rxResource({
    params: () => ({
      dimension: this.conversionDimension(),
      pipelineId: this.conversionPipelineId(),
      // Conversion is a pipeline report and covers every channel: many
      // enquiries (exhibition, import, dealer) never touched a WhatsApp number.
      ...this.period.range(),
    }),
    stream: ({ params }) => this.api.getConversionReport(params),
    defaultValue: undefined,
  });

  readonly conversion = computed<ConversionReportDto>(() =>
    this.conversionResource.hasValue()
      ? settled(this.conversionResource, { dimension: this.conversionDimension(), rows: [] })
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
    params: () => this.params(),
    stream: ({ params }) => this.api.getMarketingLiteComparison(params),
    defaultValue: undefined,
  });

  readonly mmLite = computed<MarketingLiteComparisonDto>(() =>
    this.mmLiteResource.hasValue()
      ? settled(this.mmLiteResource, {} as MarketingLiteComparisonDto)
      : {},
  );

  /** Downloads the category / template / agent tables in the chosen format. M12-6. */
  async export(format: AnalyticsExportFormat): Promise<void> {
    // M12-6: built in the background; the person is told when it is ready and fetches it from
    // My exports or the emailed link, instead of waiting on the page.
    await firstValueFrom(
      this.exports.requestAnalytics({
        ...this.period.range(),
        channelId: this.channels.active()?.id,
        format,
      }),
    );
    this.toasts.info(
      'Preparing your export. You’ll be notified when it’s ready; it will be under Reports → My exports.',
      'Export',
    );
  }
}
