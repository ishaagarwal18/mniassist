import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import {
  ForecastHistoryDto,
  SalesForecastDto,
  SalesForecastService,
  SalesForecastSettingsDto,
  SalesPeriodKind,
  SalesQuotaDto,
} from '../../proxy/pipeline';
import { isPlanRefusal } from '../http/api-feedback';
import { settled } from '../util/resource';

/**
 * The sales forecast for a period, and the quotas and assumptions behind it. The period, pipeline and person
 * being looked at are signals; changing one refetches.
 */
/** What a screen shows before the first answer, or when the request failed: nothing, not sample figures. */
const EMPTY: SalesForecastDto = { owners: [], deals: [], chances: [] };
const EMPTY_HISTORY: ForecastHistoryDto = { points: [], accuracy: [] };

/** A date inside the period `steps` months or quarters away from `anchor` (YYYY-MM-DD, local). */
export function shiftPeriod(anchor: Date, kind: SalesPeriodKind, steps: number): string {
  const months = kind === SalesPeriodKind.Quarter ? 3 : 1;
  const d = new Date(anchor.getFullYear(), anchor.getMonth() + steps * months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

@Injectable({ providedIn: 'root' })
export class ForecastStore {
  private readonly api = inject(SalesForecastService);

  readonly kind = signal<SalesPeriodKind>(SalesPeriodKind.Month);
  /** Any date inside the period wanted; null is the current period. */
  readonly periodStart = signal<string | null>(null);
  readonly pipelineId = signal<string | null>(null);
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () => ({
      kind: this.kind(),
      start: this.periodStart(),
      pipeline: this.pipelineId(),
      tick: this.tick(),
    }),
    stream: ({ params }) =>
      this.api.get({ kind: params.kind, periodStart: params.start, pipelineId: params.pipeline }),
    defaultValue: EMPTY,
  });

  // A failed request reads as empty (resource.value() throws once a request has
  // failed, which froze the whole screen), and the error is shown as a toast.
  readonly forecast = computed<SalesForecastDto>(() =>
    this.resource.hasValue() ? this.resource.value() : EMPTY,
  );
  readonly loading = computed(() => this.resource.isLoading());
  readonly failed = computed(() => this.resource.error() != null);
  /** The plan does not include forecasting: a note, not an error. */
  readonly notInPlan = computed(() => isPlanRefusal(this.resource.error()));

  private readonly historyResource = rxResource({
    params: () => ({ kind: this.kind(), start: this.periodStart(), tick: this.tick() }),
    stream: ({ params }) => this.api.getHistory({ kind: params.kind, periodStart: params.start }),
    defaultValue: EMPTY_HISTORY,
  });

  /** How the period's forecast has moved, and how earlier periods' forecasts turned out. */
  readonly history = computed<ForecastHistoryDto>(() =>
    this.historyResource.hasValue() ? settled(this.historyResource, EMPTY_HISTORY) : EMPTY_HISTORY,
  );

  setKind(kind: SalesPeriodKind): void {
    this.kind.set(kind);
    this.periodStart.set(null);
  }

  go(start: string | undefined): void {
    if (start) this.periodStart.set(start);
  }

  /** One period back or forward from the one shown, worked out here so it works even when a load failed. */
  step(direction: -1 | 1): void {
    const anchor = this.periodStart() ?? this.forecast().periodStart ?? null;
    const from = anchor ? new Date(anchor.slice(0, 10) + 'T00:00:00') : new Date();
    this.periodStart.set(shiftPeriod(from, this.kind(), direction));
  }

  today(): void {
    this.periodStart.set(null);
  }

  reload(): void {
    this.tick.update((n) => n + 1);
  }

  /** The start of the period shown, even before (or without) the server's answer. */
  private shownStart(): string {
    return (
      this.forecast().periodStart ?? this.periodStart() ?? shiftPeriod(new Date(), this.kind(), 0)
    );
  }

  async quotas(): Promise<SalesQuotaDto[]> {
    return firstValueFrom(
      this.api.getQuotas({ kind: this.kind(), periodStart: this.shownStart() }),
    );
  }

  async setQuota(userId: string | null, rupees: number): Promise<void> {
    await firstValueFrom(
      this.api.setQuota({
        userId,
        kind: this.kind(),
        periodStart: this.shownStart(),
        targetInPaise: Math.round(rupees * 100),
      }),
    );
    this.reload();
  }

  async takeSnapshot(): Promise<void> {
    await firstValueFrom(this.api.takeSnapshot());
    this.reload();
  }

  async settings(): Promise<SalesForecastSettingsDto> {
    return firstValueFrom(this.api.getSettings());
  }

  async saveSettings(input: SalesForecastSettingsDto): Promise<void> {
    await firstValueFrom(this.api.saveSettings(input));
    this.reload();
  }
}
