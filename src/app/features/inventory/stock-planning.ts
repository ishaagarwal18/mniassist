import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CategoryService,
  ChartModule,
  DateTimeService,
  LegendService,
  LineSeriesService,
  TooltipService,
} from '@syncfusion/ej2-angular-charts';
import { GridModule, RowSelectEventArgs } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';

import { isPlanRefusal } from '../../core/http/api-feedback';
import { chartColours } from '../../core/ui/chart-colours';
import { inr, inrCompact } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { StockPlanDto, StockPlanLineDto, StockPlanningService } from '../../proxy/reports';
import { ArBanner, ArButton, ArCard, ArChip, ArStatTile } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { ArGrid } from '../../ui/grid';
import { ArSelect } from '../../ui/select';

type Status = 'Out' | 'OrderNow' | 'OrderSoon' | 'Healthy' | 'Overstock' | 'NoUsage';

const STATUS: Record<Status, { label: string; tone: ChipTone }> = {
  Out: { label: 'Out of stock', tone: 'bad' },
  OrderNow: { label: 'Order now', tone: 'warn' },
  OrderSoon: { label: 'Order soon', tone: 'amber' },
  Healthy: { label: 'Healthy', tone: 'good' },
  Overstock: { label: 'Overstock', tone: 'teal' },
  NoUsage: { label: 'Not used lately', tone: 'neutral' },
};

/**
 * Stock planning: every stocked part projected forward from how fast it is used, what is available and what
 * is on order, with the day it runs out and what to order now to stay covered through the supplier's lead
 * time. The arithmetic is the API's (Reports/StockPlanner); this screen shows it, sorts it by urgency and draws
 * one part's projected balance against its reorder point.
 */
@Component({
  selector: 'ar-stock-planning',
  imports: [
    RouterLink,
    ArTopbar,
    ArButton,
    ArBanner,
    ArCard,
    ArChip,
    ArStatTile,
    ArSelect,
    ArGrid,
    GridModule,
    ChartModule,
  ],
  providers: [LineSeriesService, DateTimeService, CategoryService, LegendService, TooltipService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Stock planning"
      [subtitle]="subtitle()"
      help="How long each part's stock lasts at the rate it is used, when it runs out, and what to order now."
    >
      <a ar-button variant="ghost" icon="machine" routerLink="/stock">Stock</a>
      <a ar-button variant="primary" icon="document" routerLink="/purchasing">Raise orders</a>
    </ar-topbar>

    <div class="sp ar-scroll">
      <section class="sp__assume" aria-label="Assumptions">
        <label class="ar-field">
          <span class="ar-field__label">Usage measured over</span>
          <select class="ar-field__input" (change)="lookback.set(+$any($event.target).value)">
            @for (d of [30, 60, 90, 180, 365]; track d) {
              <option [value]="d" [selected]="d === lookback()">Last {{ d }} days</option>
            }
          </select>
        </label>
        <label class="ar-field">
          <span class="ar-field__label">Project ahead</span>
          <select class="ar-field__input" (change)="horizon.set(+$any($event.target).value)">
            @for (d of [30, 60, 90, 180]; track d) {
              <option [value]="d" [selected]="d === horizon()">{{ d }} days</option>
            }
          </select>
        </label>
        <label class="ar-field">
          <span class="ar-field__label">Safety buffer</span>
          <select class="ar-field__input" (change)="safety.set(+$any($event.target).value)">
            @for (d of [0, 3, 7, 14, 21, 30]; track d) {
              <option [value]="d" [selected]="d === safety()">{{ d }} days of usage</option>
            }
          </select>
        </label>
        <label class="ar-field">
          <span class="ar-field__label">Each order covers</span>
          <select class="ar-field__input" (change)="cover.set(+$any($event.target).value)">
            @for (d of [15, 30, 45, 60, 90]; track d) {
              <option [value]="d" [selected]="d === cover()">{{ d }} days</option>
            }
          </select>
        </label>
        <label class="ar-field">
          <span class="ar-field__label">Lead time if unknown</span>
          <select class="ar-field__input" (change)="lead.set(+$any($event.target).value)">
            @for (d of [3, 7, 14, 21, 30, 45, 60]; track d) {
              <option [value]="d" [selected]="d === lead()">{{ d }} days</option>
            }
          </select>
        </label>
      </section>

      @if (notInPlan()) {
        <ar-banner tone="teal">
          Stock planning comes with the re-order portal add-on, which keeps stock in MNI Assist. Ask
          your MNI Assist contact to switch it on.
        </ar-banner>
      } @else if (failed()) {
        <ar-banner tone="bad">
          The plan could not be worked out. The reason is shown in the message above.
        </ar-banner>
      }

      @if (plan(); as p) {
        <section class="sp__tiles" [class.sp__tiles--loading]="loading()">
          <ar-stat-tile
            label="Out of stock"
            [value]="'' + (p.outCount ?? 0)"
            note="parts with nothing available"
            [tone]="(p.outCount ?? 0) > 0 ? 'bad' : 'neutral'"
          />
          <ar-stat-tile
            label="Order now"
            [value]="'' + (p.orderNowCount ?? 0)"
            note="at or below the reorder point"
            [tone]="(p.orderNowCount ?? 0) > 0 ? 'warn' : 'neutral'"
          />
          <ar-stat-tile
            label="Order soon"
            [value]="'' + (p.orderSoonCount ?? 0)"
            note="reach it within two weeks"
            [tone]="(p.orderSoonCount ?? 0) > 0 ? 'amber' : 'neutral'"
          />
          <ar-stat-tile
            label="Suggested buying"
            [value]="money(p.suggestedOrderValueInPaise)"
            note="at average cost"
            tone="teal"
          />
          <ar-stat-tile
            label="Idle stock"
            [value]="money(p.idleValueInPaise)"
            [note]="
              (p.noUsageCount ?? 0) +
              ((p.noUsageCount ?? 0) === 1 ? ' part' : ' parts') +
              ' not used in ' +
              p.lookbackDays +
              ' days'
            "
          />
        </section>

        <div class="sp__filters" role="group" aria-label="Show">
          @for (f of filters; track f.key) {
            <button
              type="button"
              class="sp__filter"
              [class.sp__filter--on]="filter() === f.key"
              [attr.aria-pressed]="filter() === f.key"
              (click)="filter.set(f.key)"
            >
              {{ f.label }} <span class="ar-mono">{{ countOf(f.key) }}</span>
            </button>
          }
        </div>

        <ar-card>
          <ejs-grid
            arGrid="stock-plan"
            [dataSource]="rows()"
            [allowSelection]="true"
            [selectionSettings]="{ mode: 'Row', type: 'Single' }"
            (rowSelected)="pick($event)"
          >
            <e-columns>
              <e-column field="partNumber" headerText="Part" width="200">
                <ng-template #template let-r>
                  <span class="ar-mono sp__part">{{ r.partNumber }}</span>
                  <span class="sp__name">{{ r.name }}</span>
                </ng-template>
              </e-column>
              <e-column field="statusLabel" headerText="Status" width="125">
                <ng-template #template let-r>
                  <ar-chip [tone]="r.tone">{{ r.statusLabel }}</ar-chip>
                </ng-template>
              </e-column>
              <e-column
                field="available"
                headerText="Available"
                type="number"
                textAlign="Right"
                width="95"
              />
              <e-column
                field="onOrder"
                headerText="On order"
                type="number"
                textAlign="Right"
                width="100"
              >
                <ng-template #template let-r>
                  {{ r.onOrder || '—' }}
                  @if (r.nextArrival) {
                    <span class="sp__sub">due {{ r.nextArrival }}</span>
                  }
                </ng-template>
              </e-column>
              <e-column
                field="dailyUsage"
                headerText="Use / day"
                type="number"
                textAlign="Right"
                width="100"
              >
                <ng-template #template let-r>
                  {{ r.dailyUsage || '—' }}
                  @if (r.trend != null && r.trend !== 0) {
                    <span class="sp__trend" [class.sp__trend--up]="r.trend > 0">
                      {{ r.trend > 0 ? '▲' : '▼' }} {{ pct(r.trend) }}
                    </span>
                  }
                </ng-template>
              </e-column>
              <e-column
                field="daysOfCover"
                headerText="Lasts"
                type="number"
                textAlign="Right"
                width="80"
              >
                <ng-template #template let-r>{{
                  r.daysOfCover == null ? '—' : r.daysOfCover + ' d'
                }}</ng-template>
              </e-column>
              <e-column
                field="stockoutOn"
                headerText="Runs out"
                type="date"
                format="d MMM"
                width="100"
              >
                <ng-template #template let-r>
                  <span [class.sp__late]="r.stockoutSoon">{{ r.stockoutText }}</span>
                </ng-template>
              </e-column>
              <e-column
                field="leadDays"
                headerText="Lead"
                type="number"
                textAlign="Right"
                width="75"
              >
                <ng-template #template let-r>{{ r.leadDays }} d</ng-template>
              </e-column>
              <e-column
                field="reorderPoint"
                headerText="Reorder at"
                type="number"
                textAlign="Right"
                width="100"
              />
              <e-column
                field="suggested"
                headerText="Order qty"
                type="number"
                textAlign="Right"
                width="95"
              >
                <ng-template #template let-r>
                  <b>{{ r.suggested || '—' }}</b>
                </ng-template>
              </e-column>
              <e-column
                field="orderValue"
                headerText="Order value"
                type="number"
                textAlign="Right"
                width="115"
              >
                <ng-template #template let-r>{{
                  r.orderValue ? money(r.orderValue) : '—'
                }}</ng-template>
              </e-column>
            </e-columns>
            <ng-template #emptyRecordTemplate>
              Nothing to plan yet: parts appear here once they are in stock, issued or on order.
            </ng-template>
          </ejs-grid>
        </ar-card>

        @if (selected(); as s) {
          <ar-card [heading]="s.partNumber + ' — projected stock'">
            <p class="sp__explain">
              {{ explain(s) }}
            </p>
            <ejs-chart
              id="stock-projection-chart"
              height="260px"
              background="transparent"
              [theme]="colours().theme"
              [primaryXAxis]="{
                valueType: 'DateTime',
                labelFormat: 'd MMM',
                majorGridLines: { width: 0 },
              }"
              [primaryYAxis]="{ minimum: 0, lineStyle: { width: 0 }, majorTickLines: { width: 0 } }"
              [chartArea]="{ border: { width: 0 } }"
              [tooltip]="{ enable: true, shared: true }"
              [legendSettings]="{ visible: true, position: 'Bottom' }"
              aria-label="Projected stock balance against the reorder point"
            >
              <e-series-collection>
                <e-series
                  [dataSource]="projection()"
                  type="Line"
                  xName="on"
                  yName="balance"
                  name="Projected stock"
                  [width]="2"
                  [fill]="colours().balance"
                  [marker]="{ visible: true, width: 6, height: 6 }"
                />
                <e-series
                  [dataSource]="projection()"
                  type="Line"
                  xName="on"
                  yName="reorderPoint"
                  name="Reorder point"
                  dashArray="5,4"
                  [width]="1.5"
                  [fill]="colours().reorder"
                />
                <e-series
                  [dataSource]="projection()"
                  type="Line"
                  xName="on"
                  yName="safety"
                  name="Safety stock"
                  dashArray="2,3"
                  [width]="1.5"
                  [fill]="colours().safety"
                />
              </e-series-collection>
            </ejs-chart>
          </ar-card>
        } @else if ((p.lines ?? []).length > 0) {
          <p class="sp__hint">Pick a part in the table to see its projected stock week by week.</p>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .sp {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .sp > * {
      flex-shrink: 0; /* the page scrolls; sections keep their height */
    }
    .sp ar-card {
      display: block;
    }
    .sp__assume {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      padding: 14px 16px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .sp__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
      transition: opacity 0.15s;
    }
    .sp__tiles--loading {
      opacity: 0.55;
    }
    .sp__filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .sp__filter {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border: 1px solid var(--ar-line-300);
      border-radius: 999px;
      background: var(--ar-white);
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-600, var(--ar-ink-500));
      cursor: pointer;
    }
    .sp__filter span {
      color: var(--ar-ink-400);
      font-size: 11px;
    }
    .sp__filter--on {
      background: var(--ar-inverse-bg);
      border-color: var(--ar-inverse-bg);
      color: var(--ar-inverse-fg);
    }
    .sp__filter--on span {
      color: inherit;
      opacity: 0.8;
    }
    .sp__part {
      display: block;
      font-size: 11.5px;
      color: var(--ar-ink-900);
    }
    .sp__name,
    .sp__sub {
      display: block;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sp__trend {
      display: block;
      font: 500 10.5px var(--ar-font-sans);
      color: var(--ar-green-500);
    }
    .sp__trend--up {
      color: var(--ar-amber-600);
    }
    .sp__late {
      color: var(--ar-red-600);
      font-weight: 600;
    }
    .sp__explain,
    .sp__hint {
      margin: 0 0 8px;
      font: 400 12.5px/1.55 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArStockPlanning {
  private readonly api = inject(StockPlanningService);

  protected readonly lookback = signal(90);
  protected readonly horizon = signal(60);
  protected readonly safety = signal(7);
  protected readonly cover = signal(30);
  protected readonly lead = signal(14);

  protected readonly plan = signal<StockPlanDto | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  /** The workspace's plan does not include stock (the re-order portal add-on). */
  protected readonly notInPlan = signal(false);
  protected readonly filter = signal<Status | 'all' | 'attention'>('attention');
  protected readonly selectedId = signal<string | null>(null);

  protected readonly colours = chartColours({
    balance: '--ar-primary',
    reorder: '--ar-amber-500',
    safety: '--ar-red-500',
  });

  protected readonly filters: { key: Status | 'all' | 'attention'; label: string }[] = [
    { key: 'attention', label: 'Needs attention' },
    { key: 'all', label: 'All parts' },
    { key: 'Out', label: STATUS.Out.label },
    { key: 'OrderNow', label: STATUS.OrderNow.label },
    { key: 'OrderSoon', label: STATUS.OrderSoon.label },
    { key: 'Healthy', label: STATUS.Healthy.label },
    { key: 'Overstock', label: STATUS.Overstock.label },
    { key: 'NoUsage', label: STATUS.NoUsage.label },
  ];

  constructor() {
    // Re-plan whenever an assumption changes.
    effect(() => {
      const input = {
        lookbackDays: this.lookback(),
        horizonDays: this.horizon(),
        safetyDays: this.safety(),
        coverDays: this.cover(),
        defaultLeadDays: this.lead(),
      };
      untracked(() => void this.load(input));
    });
  }

  private async load(input: Parameters<StockPlanningService['get']>[0]): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    try {
      this.plan.set(await firstValueFrom(this.api.get(input)));
    } catch (e: unknown) {
      this.failed.set(true);
      this.notInPlan.set(isPlanRefusal(e));
      this.plan.set(this.plan() ?? { lines: [] });
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly subtitle = computed(() => {
    const p = this.plan();
    if (!p?.asOfUtc) return 'Working it out…';
    const at = new Date(p.asOfUtc).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${(p.lines ?? []).length} parts · as of ${at}`;
  });

  private readonly lines = computed(() => this.plan()?.lines ?? []);

  protected countOf(key: Status | 'all' | 'attention'): number {
    return this.lines().filter((l) => this.matches(l, key)).length;
  }

  private matches(l: StockPlanLineDto, key: Status | 'all' | 'attention'): boolean {
    if (key === 'all') return true;
    if (key === 'attention') return ['Out', 'OrderNow', 'OrderSoon'].includes(l.status ?? '');
    return l.status === key;
  }

  /** Grid rows: plain values to sort, filter and export by. */
  protected readonly rows = computed(() => {
    const soon = Date.now() + 14 * 86_400_000;
    return this.lines()
      .filter((l) => this.matches(l, this.filter()))
      .map((l) => {
        const status = STATUS[(l.status ?? 'NoUsage') as Status] ?? STATUS.NoUsage;
        const out = l.stockoutOn ? new Date(l.stockoutOn) : null;
        return {
          id: l.productId,
          partNumber: l.partNumber,
          name: l.name,
          statusLabel: status.label,
          tone: status.tone,
          available: l.available ?? 0,
          onOrder: l.onOrder ?? 0,
          nextArrival: l.nextArrivalOn ? this.day(l.nextArrivalOn) : null,
          dailyUsage: Math.round((l.dailyUsage ?? 0) * 100) / 100,
          trend: l.trend ?? null,
          daysOfCover: l.daysOfCover == null ? null : Math.round(l.daysOfCover),
          stockoutOn: out,
          stockoutText: out
            ? this.day(l.stockoutOn!)
            : (l.dailyUsage ?? 0) > 0
              ? 'Beyond horizon'
              : '—',
          stockoutSoon: !!out && out.getTime() <= soon,
          leadDays: l.leadDays ?? 0,
          reorderPoint: l.reorderPoint ?? 0,
          suggested: l.suggestedOrderQuantity ?? 0,
          orderValue: l.suggestedOrderValueInPaise ?? 0,
        };
      });
  });

  protected readonly selected = computed(
    () => this.lines().find((l) => l.productId === this.selectedId()) ?? null,
  );

  protected readonly projection = computed(() => {
    const s = this.selected();
    if (!s) return [];
    return (s.projection ?? []).map((p) => ({
      on: new Date(p.on!),
      balance: Math.max(0, p.balance ?? 0),
      reorderPoint: s.reorderPoint ?? 0,
      safety: s.safetyStock ?? 0,
    }));
  });

  protected pick(args: RowSelectEventArgs): void {
    const row = (Array.isArray(args.data) ? args.data[0] : args.data) as
      { id?: string } | undefined;
    this.selectedId.set(row?.id ?? null);
  }

  /** One sentence on what the plan says about the part. */
  protected explain(s: StockPlanLineDto): string {
    const use = s.dailyUsage ?? 0;
    if (use === 0) {
      return `Not issued in the last ${this.lookback()} days. ${s.onHand ?? 0} in stock worth ${this.money(
        s.stockValueInPaise,
      )} — consider whether it needs to be kept.`;
    }
    const parts = [
      `Used about ${Math.round(use * 7 * 10) / 10} a week.`,
      `${s.available} available${s.onOrder ? ` and ${s.onOrder} on order` : ''} last${s.daysOfCover != null ? ` about ${Math.round(s.daysOfCover)} days` : ''}.`,
      s.stockoutOn ? `At this rate it runs out on ${this.day(s.stockoutOn)}.` : '',
      (s.suggestedOrderQuantity ?? 0) > 0
        ? `Order ${s.suggestedOrderQuantity} now (${this.money(s.suggestedOrderValueInPaise)}) to cover the ${s.leadDays}-day lead time, the buffer and ${this.cover()} days after.`
        : `Reorder when it falls to ${s.reorderPoint}.`,
    ];
    return parts.filter(Boolean).join(' ');
  }

  protected money(paise: number | null | undefined): string {
    const rupees = (paise ?? 0) / 100;
    return rupees >= 100_000 ? inrCompact(rupees) : inr(paise ?? 0);
  }

  protected pct(v: number): string {
    return `${Math.round(Math.abs(v) * 100)}%`;
  }

  private day(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
