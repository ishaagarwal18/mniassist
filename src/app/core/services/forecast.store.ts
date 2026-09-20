import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EnquiryStage,
  ForecastChanceBasis,
  ForecastHistoryDto,
  ForecastValueSource,
  SalesForecastDto,
  SalesForecastService,
  SalesForecastSettingsDto,
  SalesPeriodKind,
  SalesQuotaDto,
} from '../../proxy/pipeline';

const CR = 1_00_00_000 * 100;
const L = 1_00_000 * 100;

const MOCK: SalesForecastDto = {
  kind: SalesPeriodKind.Month,
  periodStart: '2026-09-01T00:00:00Z',
  periodEnd: '2026-09-30T00:00:00Z',
  label: 'Sep 2026',
  previousPeriodStart: '2026-08-01T00:00:00Z',
  nextPeriodStart: '2026-10-01T00:00:00Z',
  team: {
    ownerName: 'Team', targetInPaise: CR, closedInPaise: 38 * L, commitInPaise: 71 * L,
    expectedInPaise: 62 * L, bestCaseInPaise: 1.4 * CR, openDeals: 11, attainment: 0.38, projectedAttainment: 0.62, gapInPaise: 38 * L,
  },
  owners: [
    { ownerUserId: 'u1', ownerName: 'Ravi K', targetInPaise: 60 * L, closedInPaise: 30 * L, commitInPaise: 50 * L, expectedInPaise: 44 * L, bestCaseInPaise: 90 * L, openDeals: 6, attainment: 0.5, projectedAttainment: 0.73, gapInPaise: 16 * L },
    { ownerUserId: 'u2', ownerName: 'Sneha P', targetInPaise: 40 * L, closedInPaise: 8 * L, commitInPaise: 21 * L, expectedInPaise: 18 * L, bestCaseInPaise: 50 * L, openDeals: 5, attainment: 0.2, projectedAttainment: 0.45, gapInPaise: 22 * L },
  ],
  deals: [
    { enquiryId: 'e1', reference: 'ENQ-2026-0101', title: 'Palletiser line upgrade', contactName: 'Sandeep Rao', ownerName: 'Ravi K', stage: EnquiryStage.Negotiation, valueInPaise: 42 * L, weightedInPaise: 34 * L, expectedClose: '2026-09-22T00:00:00Z', valueSource: ForecastValueSource.Quotation, quotationReference: 'QTN-2026-0044', chancePercent: 81, chanceBasis: ForecastChanceBasis.Person },
    { enquiryId: 'e2', reference: 'ENQ-2026-0104', title: 'SCADA migration', contactName: 'Priya Nambiar', ownerName: 'Sneha P', stage: EnquiryStage.Quoted, valueInPaise: 28 * L, weightedInPaise: 17.4 * L, expectedClose: '2026-09-27T00:00:00Z', valueSource: ForecastValueSource.Estimate, chancePercent: 62, chanceBasis: ForecastChanceBasis.Workspace },
  ],
  unscheduledDeals: 3,
  unscheduledValueInPaise: 24 * L,
  overdueDeals: 2,
  overdueValueInPaise: 17 * L,
  unvaluedDeals: 1,
  fiscalYearStartMonth: 4,
  weights: { new: 10, qualified: 25, siteVisit: 40, quoted: 55, negotiation: 75 },
  learnFromHistory: true,
  chances: [
    { stage: EnquiryStage.New, configuredPercent: 10, effectivePercent: 9, sample: 34, basis: ForecastChanceBasis.Workspace },
    { stage: EnquiryStage.Qualified, configuredPercent: 25, effectivePercent: 27, sample: 30, basis: ForecastChanceBasis.Workspace },
    { stage: EnquiryStage.SiteVisit, configuredPercent: 40, effectivePercent: 46, sample: 22, basis: ForecastChanceBasis.Workspace },
    { stage: EnquiryStage.Quoted, configuredPercent: 55, effectivePercent: 62, sample: 17, basis: ForecastChanceBasis.Workspace },
    { stage: EnquiryStage.Negotiation, configuredPercent: 75, effectivePercent: 81, sample: 9, basis: ForecastChanceBasis.Workspace },
  ],
};

const MOCK_HISTORY: ForecastHistoryDto = {
  label: 'Sep 2026',
  points: [
    { date: '2026-09-01T00:00:00Z', targetInPaise: CR, closedInPaise: 0, commitInPaise: 20 * L, expectedInPaise: 40 * L, bestCaseInPaise: 1.1 * CR, openDeals: 9 },
    { date: '2026-09-08T00:00:00Z', targetInPaise: CR, closedInPaise: 12 * L, commitInPaise: 40 * L, expectedInPaise: 51 * L, bestCaseInPaise: 1.2 * CR, openDeals: 10 },
    { date: '2026-09-15T00:00:00Z', targetInPaise: CR, closedInPaise: 38 * L, commitInPaise: 71 * L, expectedInPaise: 62 * L, bestCaseInPaise: 1.4 * CR, openDeals: 11 },
  ],
  changeOverDays: 7,
  expectedChangeInPaise: 11 * L,
  closedChangeInPaise: 26 * L,
  accuracy: [
    { label: 'Aug 2026', periodStart: '2026-08-01T00:00:00Z', targetInPaise: CR, expectedAtStartInPaise: 70 * L, expectedAtMidpointInPaise: 66 * L, actualInPaise: 58 * L, midpointError: 0.14 },
    { label: 'Jul 2026', periodStart: '2026-07-01T00:00:00Z', targetInPaise: CR, expectedAtStartInPaise: 55 * L, expectedAtMidpointInPaise: 61 * L, actualInPaise: 64 * L, midpointError: -0.05 },
  ],
};

/**
 * The sales forecast for a period, and the quotas and assumptions behind it. The period, pipeline and person
 * being looked at are signals; changing one refetches.
 */
@Injectable({ providedIn: 'root' })
export class ForecastStore {
  private readonly api = inject(SalesForecastService);

  readonly kind = signal<SalesPeriodKind>(SalesPeriodKind.Month);
  /** Any date inside the period wanted; null is the current period. */
  readonly periodStart = signal<string | null>(null);
  readonly pipelineId = signal<string | null>(null);
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () =>
      environment.useMockData
        ? undefined
        : { kind: this.kind(), start: this.periodStart(), pipeline: this.pipelineId(), tick: this.tick() },
    stream: ({ params }) =>
      this.api.get({ kind: params.kind, periodStart: params.start, pipelineId: params.pipeline }),
    defaultValue: MOCK,
  });

  readonly forecast = computed<SalesForecastDto>(() => (environment.useMockData ? MOCK : this.resource.value()));
  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());
  readonly failed = computed(() => !environment.useMockData && this.resource.error() != null);

  private readonly historyResource = rxResource({
    params: () =>
      environment.useMockData ? undefined : { kind: this.kind(), start: this.periodStart(), tick: this.tick() },
    stream: ({ params }) => this.api.getHistory({ kind: params.kind, periodStart: params.start }),
    defaultValue: MOCK_HISTORY,
  });

  /** How the period's forecast has moved, and how earlier periods' forecasts turned out. */
  readonly history = computed<ForecastHistoryDto>(() => (environment.useMockData ? MOCK_HISTORY : this.historyResource.value()));

  setKind(kind: SalesPeriodKind): void {
    this.kind.set(kind);
    this.periodStart.set(null);
  }

  go(start: string | undefined): void {
    if (start) this.periodStart.set(start);
  }

  today(): void {
    this.periodStart.set(null);
  }

  reload(): void {
    this.tick.update((n) => n + 1);
  }

  async quotas(): Promise<SalesQuotaDto[]> {
    if (environment.useMockData) return [];
    return firstValueFrom(this.api.getQuotas({ kind: this.kind(), periodStart: this.forecast().periodStart }));
  }

  async setQuota(userId: string | null, rupees: number): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(
      this.api.setQuota({
        userId,
        kind: this.kind(),
        periodStart: this.forecast().periodStart!,
        targetInPaise: Math.round(rupees * 100),
      }),
    );
    this.reload();
  }

  async takeSnapshot(): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(this.api.takeSnapshot());
    this.reload();
  }

  async settings(): Promise<SalesForecastSettingsDto> {
    if (environment.useMockData) {
      return { fiscalYearStartMonth: 4, weights: MOCK.weights!, learnFromHistory: true, pipelineWeights: [] };
    }
    return firstValueFrom(this.api.getSettings());
  }

  async saveSettings(input: SalesForecastSettingsDto): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(this.api.saveSettings(input));
    this.reload();
  }
}
