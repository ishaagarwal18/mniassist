import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import {
  CategoryService,
  ChartModule,
  IAxisLabelRenderEventArgs,
  ISharedTooltipRenderEventArgs,
  LegendService,
  LineSeriesService,
  TooltipService,
} from '@syncfusion/ej2-angular-charts';

import { ForecastStore } from '../../core/services/forecast.store';
import { chartColours } from '../../core/ui/chart-colours';
import { PipelineStore } from '../../core/services/pipeline.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { inrCompact } from '../../core/util/format';
import {
  EnquiryStage,
  ForecastChanceBasis,
  ForecastOwnerDto,
  ForecastValueSource,
  PipelineWeightsDto,
  SalesPeriodKind,
  StageWeightsDto,
} from '../../proxy/pipeline';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';

const STAGE_LABEL: Record<number, string> = {
  [EnquiryStage.New]: 'New',
  [EnquiryStage.Qualified]: 'Qualified',
  [EnquiryStage.SiteVisit]: 'Site visit',
  [EnquiryStage.Quoted]: 'Quoted',
  [EnquiryStage.Negotiation]: 'Negotiation',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** One quota being edited: who, and the target in rupees as typed. */
interface QuotaRow {
  userId: string | null;
  name: string;
  rupees: string;
  original: string;
}

/**
 * Sales forecast and quotas. For a month or a fiscal quarter: what is won, what is expected (open deals due in
 * the period, weighted by how likely their stage is to win), what is committed and the best case, set against
 * each person's quota. Deals with no close date or a date that has passed are called out rather than counted.
 */
@Component({
  selector: 'ar-forecast',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSelect, ChartModule],
  providers: [LineSeriesService, CategoryService, LegendService, TooltipService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forecast.html',
  styleUrl: './forecast.scss',
})
export class ArForecast {
  private readonly store = inject(ForecastStore);
  private readonly members = inject(WorkspaceStore).members;

  protected readonly pipelines = inject(PipelineStore).pipelines;
  protected readonly forecast = this.store.forecast;
  protected readonly loading = this.store.loading;
  protected readonly failed = this.store.failed;
  protected readonly kind = this.store.kind;
  protected readonly pipelineId = this.store.pipelineId;
  protected readonly Kind = SalesPeriodKind;
  protected readonly Source = ForecastValueSource;
  protected readonly history = this.store.history;
  protected readonly months = MONTHS;

  protected readonly team = computed(() => this.forecast().team);
  protected readonly owners = computed(() => this.forecast().owners ?? []);
  protected readonly deals = computed(() => this.forecast().deals ?? []);

  /** Share of the team target that is won and that is expected, capped at 100% for the bar. */
  protected readonly closedShare = computed(() =>
    this.share(this.team()?.closedInPaise, this.team()?.targetInPaise),
  );
  protected readonly expectedShare = computed(() =>
    this.share(this.team()?.expectedInPaise, this.team()?.targetInPaise),
  );

  // ---- the trend chart -----------------------------------------------------

  /** The period's daily snapshots, for the history chart. Values stay in paise; the axis and tooltip format them. */
  protected readonly chart = computed(() => {
    const points = this.history().points ?? [];
    if (points.length === 0) return null;
    return {
      points: points.map((p) => ({
        day: this.day(p.date),
        expected: p.expectedInPaise ?? 0,
        closed: p.closedInPaise ?? 0,
        target: p.targetInPaise ?? 0,
      })),
      hasTarget: (points[points.length - 1].targetInPaise ?? 0) > 0,
    };
  });

  protected readonly colours = chartColours({
    expected: '--ar-teal-500',
    closed: '--ar-ink-900',
    target: '--ar-amber-500',
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
    labelStyle: { size: '11px' },
  } as const;

  protected moneyAxisLabel(args: IAxisLabelRenderEventArgs): void {
    if (args.axis.orientation === 'Vertical') args.text = this.money(args.value);
  }

  protected moneyTooltip(args: ISharedTooltipRenderEventArgs): void {
    args.text = (args.data ?? []).map(
      (d) => `${d.seriesName}: <b>${this.money(Number(d.pointY))}</b>`,
    );
  }

  protected readonly changeText = computed(() => {
    const h = this.history();
    if (h.expectedChangeInPaise == null || h.changeOverDays == null) return null;
    const d = h.expectedChangeInPaise;
    return `${d >= 0 ? 'Up' : 'Down'} ${this.money(Math.abs(d))} in expected over ${h.changeOverDays} day${h.changeOverDays === 1 ? '' : 's'}`;
  });

  // dialogs
  protected readonly quotaOpen = signal(false);
  protected readonly quotaRows = signal<QuotaRow[]>([]);
  protected readonly assumptionsOpen = signal(false);
  protected readonly fiscalStart = signal(4);
  protected readonly learn = signal(true);
  /** Which set of chances the dialog is editing: '' is the workspace's, otherwise a pipeline's own. */
  protected readonly scope = signal('');
  protected readonly overrides = signal<Record<string, StageWeightsDto>>({});
  protected readonly weights = signal<StageWeightsDto>({
    new: 10,
    qualified: 25,
    siteVisit: 40,
    quoted: 55,
    negotiation: 75,
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly weightRows: { key: keyof StageWeightsDto; label: string }[] = [
    { key: 'new', label: 'New' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'siteVisit', label: 'Site visit' },
    { key: 'quoted', label: 'Quoted' },
    { key: 'negotiation', label: 'Negotiation' },
  ];

  protected money(paise: number | null | undefined): string {
    return inrCompact((paise ?? 0) / 100);
  }

  protected pct(v: number | null | undefined): string {
    return v == null ? '—' : `${Math.round(v * 100)}%`;
  }

  protected stage(s: EnquiryStage | undefined): string {
    return s == null ? '' : (STAGE_LABEL[s] ?? '');
  }

  protected day(iso: string | undefined): string {
    return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
  }

  protected barWidth(part: number | null | undefined, whole: number | null | undefined): string {
    return `${this.share(part, whole)}%`;
  }

  protected tone(o: ForecastOwnerDto): 'good' | 'amber' | 'bad' | 'neutral' {
    const p = o.projectedAttainment;
    if (p == null) return 'neutral';
    return p >= 1 ? 'good' : p >= 0.7 ? 'amber' : 'bad';
  }

  protected setKind(k: SalesPeriodKind): void {
    this.store.setKind(k);
  }

  protected previous(): void {
    this.store.go(this.forecast().previousPeriodStart);
  }

  protected next(): void {
    this.store.go(this.forecast().nextPeriodStart);
  }

  protected today(): void {
    this.store.today();
  }

  protected choosePipeline(id: string): void {
    this.store.pipelineId.set(id || null);
  }

  // ---- quotas ------------------------------------------------------------

  protected async openQuotas(): Promise<void> {
    this.error.set(null);
    const existing = await this.store.quotas();
    const rupeesOf = (userId: string | null) => {
      const q = existing.find((x) => (x.userId ?? null) === userId);
      return q?.targetInPaise ? String(Math.round(q.targetInPaise / 100)) : '';
    };

    const rows: QuotaRow[] = [
      {
        userId: null,
        name: 'Whole team (replaces the sum of individual targets)',
        rupees: rupeesOf(null),
        original: rupeesOf(null),
      },
      ...this.members()
        .filter((m) => m.isActive)
        .map((m) => ({
          userId: m.userId,
          name: m.name || m.userName,
          rupees: rupeesOf(m.userId),
          original: rupeesOf(m.userId),
        })),
    ];
    this.quotaRows.set(rows);
    this.quotaOpen.set(true);
  }

  protected setRupees(i: number, value: string): void {
    const digits = value.replace(/[^\d]/g, '');
    this.quotaRows.update((rows) => rows.map((r, at) => (at === i ? { ...r, rupees: digits } : r)));
  }

  protected async saveQuotas(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      for (const row of this.quotaRows().filter((r) => r.rupees !== r.original)) {
        await this.store.setQuota(row.userId, Number(row.rupees || 0));
      }
      this.quotaOpen.set(false);
    } catch (e: unknown) {
      this.error.set(this.message(e));
    } finally {
      this.busy.set(false);
    }
  }

  // ---- assumptions -------------------------------------------------------

  protected async openAssumptions(): Promise<void> {
    this.error.set(null);
    const s = await this.store.settings();
    this.fiscalStart.set(s.fiscalYearStartMonth);
    this.learn.set(s.learnFromHistory);
    this.weights.set({ ...s.weights });
    this.overrides.set(
      Object.fromEntries(s.pipelineWeights.map((p) => [p.pipelineId, { ...p.weights }])),
    );
    this.scope.set('');
    this.assumptionsOpen.set(true);
  }

  /** The chances the dialog shows: the pipeline's own if it has some, else the workspace's. */
  protected readonly shownWeights = computed(() => {
    const s = this.scope();
    return s ? (this.overrides()[s] ?? this.weights()) : this.weights();
  });

  protected readonly scopeHasOverride = computed(
    () => !!this.scope() && !!this.overrides()[this.scope()],
  );

  protected setScope(id: string): void {
    this.scope.set(id);
  }

  protected setWeight(key: keyof StageWeightsDto, value: string): void {
    const n = Math.min(100, Math.max(0, Math.round(Number(value)) || 0));
    const s = this.scope();
    if (s) {
      // Editing a pipeline's chances gives it its own set, starting from what it was showing.
      this.overrides.update((o) => ({ ...o, [s]: { ...this.shownWeights(), [key]: n } }));
    } else {
      this.weights.update((w) => ({ ...w, [key]: n }));
    }
  }

  protected useWorkspaceChances(): void {
    const s = this.scope();
    this.overrides.update((o) => {
      const next = { ...o };
      delete next[s];
      return next;
    });
  }

  protected async saveAssumptions(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const pipelineWeights: PipelineWeightsDto[] = Object.entries(this.overrides()).map(
        ([pipelineId, weights]) => ({ pipelineId, weights }),
      );
      await this.store.saveSettings({
        fiscalYearStartMonth: this.fiscalStart(),
        weights: this.weights(),
        learnFromHistory: this.learn(),
        pipelineWeights,
      });
      this.assumptionsOpen.set(false);
    } catch (e: unknown) {
      this.error.set(this.message(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected basisText(basis: ForecastChanceBasis | undefined, sample: number | undefined): string {
    if (!sample) return 'your setting';
    const n = `${sample} closed deal${sample === 1 ? '' : 's'}`;
    return basis === ForecastChanceBasis.Person
      ? `${n}, this person's`
      : basis === ForecastChanceBasis.Pipeline
        ? `${n} in this pipeline`
        : n;
  }

  protected sourceText(d: {
    valueSource?: ForecastValueSource;
    quotationReference?: string | null;
  }): string {
    return d.valueSource === ForecastValueSource.Quotation
      ? (d.quotationReference ?? 'Quotation')
      : d.valueSource === ForecastValueSource.Estimate
        ? 'Estimate'
        : 'No value';
  }

  protected errorText(e: number | null | undefined): string {
    if (e == null) return '—';
    const p = Math.round(Math.abs(e) * 100);
    return e > 0 ? `${p}% too high` : e < 0 ? `${p}% too low` : 'spot on';
  }

  protected async saveSnapshot(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.store.takeSnapshot();
    } catch (e: unknown) {
      this.error.set(this.message(e));
    } finally {
      this.busy.set(false);
    }
  }

  private share(part: number | null | undefined, whole: number | null | undefined): number {
    return whole && whole > 0 ? Math.min(100, Math.max(0, ((part ?? 0) / whole) * 100)) : 0;
  }

  private message(e: unknown): string {
    const err = e as { error?: { error?: { message?: string } }; message?: string };
    return err?.error?.error?.message ?? err?.message ?? 'That could not be saved.';
  }
}
