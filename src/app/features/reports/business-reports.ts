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
import { ArChart } from '../../ui/chart';
import { ArChartSeries } from '../../ui/chart-series';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';

import { isPlanRefusal } from '../../core/http/api-feedback';
import { ReportPeriodStore, UtcRange, changeOf } from '../../core/services/report-period.store';
import { ArPeriodPicker } from '../../ui/period-picker';
import { chartColours } from '../../core/ui/chart-colours';
import { inr, inrCompact } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { BusinessReportService, PaymentReportDto, StockReportDto } from '../../proxy/reports';
import { ArBanner, ArCard, ArChip, ArStatTile, ArTabs } from '../../ui';
import { ArGrid } from '../../ui/grid';

const TABS = ['Stock', 'Payments'] as const;
type Tab = (typeof TABS)[number];

/**
 * Business reports: the owner's view of stock and money for a chosen period.
 * Stock — what it is worth, how it turns over, where it sits, which parts carry
 * the value (ABC) and which have stopped moving. Payments — what was collected,
 * how quickly payment links are paid and why they fail; with the ERP connected,
 * what customers owe, how old it is and who owes the most.
 */
@Component({
  selector: 'ar-business-reports',
  imports: [
    RouterLink,
    ArTopbar,
    ArTabs,
    ArBanner,
    ArCard,
    ArChip,
    ArStatTile,
    ArPeriodPicker,
    ArGrid,
    GridModule,
    ArChart,
    ArChartSeries,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Business reports"
      [subtitle]="period.label()"
      help="Stock and money in one place: stock value, turnover and idle parts; collections, payment speed and what customers owe."
    >
      <ar-period-picker />
    </ar-topbar>

    <div class="br ar-scroll">
      <ar-tabs [tabs]="tabs" [(active)]="tab" />

      @if (tab() === 'Stock') {
        @if (stockNotInPlan()) {
          <ar-banner tone="teal">
            Stock reports come with the re-order portal add-on, which keeps stock in MNI Assist. Ask
            your MNI Assist contact to switch it on; the Payments tab works without it.
          </ar-banner>
        }
        @if (stock(); as s) {
          <section class="br__tiles" [class.br__tiles--loading]="loading()">
            <ar-stat-tile
              label="Stock value"
              [value]="money(s.stockValueInPaise)"
              [note]="(s.partsInStock ?? 0) + ' parts in stock'"
              tone="teal"
            />
            <ar-stat-tile
              label="Issued (at cost)"
              [value]="money(s.issuedValueInPaise)"
              [note]="
                vs(s.issuedValueInPaise, stockPrev()?.issuedValueInPaise, true)?.text ??
                'sent out to customers and jobs'
              "
              [tone]="vsTone(s.issuedValueInPaise, stockPrev()?.issuedValueInPaise, true)"
            />
            <ar-stat-tile
              label="Received (at cost)"
              [value]="money(s.receivedValueInPaise)"
              [note]="
                vs(s.receivedValueInPaise, stockPrev()?.receivedValueInPaise, null)?.text ??
                'bought in or opened'
              "
            />
            <ar-stat-tile
              label="Turnover"
              [value]="s.annualTurnover == null ? '—' : s.annualTurnover + '× a year'"
              [note]="
                s.daysOfInventory == null
                  ? 'no issues in the period'
                  : s.daysOfInventory + ' days of stock on hand'
              "
              [tone]="turnoverTone(s.annualTurnover)"
            />
            <ar-stat-tile
              label="Adjustments"
              [value]="money(s.adjustmentValueInPaise)"
              note="counts and write-offs"
              [tone]="(s.adjustmentValueInPaise ?? 0) < 0 ? 'bad' : 'neutral'"
            />
          </section>

          <div class="br__two">
            <ar-card heading="Stock in and out, by month (at cost)">
              @defer (on viewport) {
                <ar-chart
                  id="br-stock-months"
                  height="240px"
                  background="transparent"
                  [theme]="colours().theme"
                  [primaryXAxis]="xAxis"
                  [primaryYAxis]="yAxis"
                  [chartArea]="{ border: { width: 0 } }"
                  [tooltip]="{ enable: true, shared: true }"
                  [legendSettings]="{ visible: true, position: 'Bottom' }"
                  (axisLabelRender)="moneyAxis($event)"
                >
                  <ar-chart-series
                    [dataSource]="stockMonths()"
                    type="Column"
                    xName="month"
                    yName="in"
                    name="Received"
                    [fill]="colours().inbound"
                    [columnWidth]="0.6"
                  />
                  <ar-chart-series
                    [dataSource]="stockMonths()"
                    type="Column"
                    xName="month"
                    yName="out"
                    name="Issued"
                    [fill]="colours().outbound"
                    [columnWidth]="0.6"
                  />
                </ar-chart>
              } @placeholder {
                <div style="min-height:240px" aria-busy="true"></div>
              }
            </ar-card>

            <ar-card heading="Where the value sits (ABC by value issued)">
              <div class="abc">
                @for (c of s.abc ?? []; track c.class) {
                  <div class="abc__row">
                    <span class="abc__class abc__class--{{ c.class }}">{{ c.class }}</span>
                    <span class="abc__text">
                      <b>{{ c.parts }} part{{ c.parts === 1 ? '' : 's' }}</b> carry
                      {{ pct(c.share) }} of the value issued ({{ money(c.issuedValueInPaise) }})
                    </span>
                    <span class="abc__bar"
                      ><span [style.width.%]="(c.share ?? 0) * 100"></span
                    ></span>
                  </div>
                }
                <p class="br__note">
                  Keep A parts always in stock and count them often; B parts on a steady reorder; C
                  parts ordered as needed.
                </p>
              </div>
            </ar-card>
          </div>

          <ar-card heading="By location">
            <ejs-grid
              arGrid="stock-by-location"
              [arGridTools]="false"
              [dataSource]="s.byLocation ?? []"
            >
              <e-columns>
                <e-column field="location" headerText="Location" />
                <e-column
                  field="parts"
                  headerText="Parts"
                  type="number"
                  textAlign="Right"
                  width="110"
                />
                <e-column
                  field="units"
                  headerText="Units"
                  type="number"
                  textAlign="Right"
                  width="110"
                />
                <e-column
                  field="valueInPaise"
                  headerText="Value"
                  type="number"
                  textAlign="Right"
                  width="140"
                >
                  <ng-template #template let-r>{{ money(r.valueInPaise) }}</ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          </ar-card>

          <ar-card heading="Top parts by value issued">
            <ejs-grid
              arGrid="stock-top-issued"
              [arGridSearch]="false"
              [dataSource]="s.topIssued ?? []"
            >
              <e-columns>
                <e-column field="partNumber" headerText="Part" width="160">
                  <ng-template #template let-r
                    ><span class="ar-mono">{{ r.partNumber }}</span></ng-template
                  >
                </e-column>
                <e-column field="name" headerText="Name" />
                <e-column field="abcClass" headerText="Class" width="90">
                  <ng-template #template let-r
                    ><span class="abc__class abc__class--{{ r.abcClass }}">{{
                      r.abcClass
                    }}</span></ng-template
                  >
                </e-column>
                <e-column
                  field="issuedUnits"
                  headerText="Issued"
                  type="number"
                  textAlign="Right"
                  width="100"
                />
                <e-column
                  field="issuedValueInPaise"
                  headerText="Value issued"
                  type="number"
                  textAlign="Right"
                  width="140"
                >
                  <ng-template #template let-r>{{ money(r.issuedValueInPaise) }}</ng-template>
                </e-column>
                <e-column
                  field="onHand"
                  headerText="In stock"
                  type="number"
                  textAlign="Right"
                  width="100"
                />
              </e-columns>
              <ng-template #emptyRecordTemplate
                >Nothing was issued from stock in this period.</ng-template
              >
            </ejs-grid>
          </ar-card>

          <ar-card heading="Idle stock — not issued in 90 days">
            <a card-actions class="br__link" routerLink="/stock/planning">Plan stock →</a>
            <ejs-grid arGrid="stock-idle" [arGridSearch]="false" [dataSource]="s.idle ?? []">
              <e-columns>
                <e-column field="partNumber" headerText="Part" width="160">
                  <ng-template #template let-r
                    ><span class="ar-mono">{{ r.partNumber }}</span></ng-template
                  >
                </e-column>
                <e-column field="name" headerText="Name" />
                <e-column
                  field="onHand"
                  headerText="In stock"
                  type="number"
                  textAlign="Right"
                  width="100"
                />
                <e-column
                  field="stockValueInPaise"
                  headerText="Value tied up"
                  type="number"
                  textAlign="Right"
                  width="140"
                >
                  <ng-template #template let-r>{{ money(r.stockValueInPaise) }}</ng-template>
                </e-column>
                <e-column
                  field="daysIdle"
                  headerText="Last issued"
                  type="number"
                  textAlign="Right"
                  width="140"
                >
                  <ng-template #template let-r>{{
                    r.daysIdle == null ? 'Never' : r.daysIdle + ' days ago'
                  }}</ng-template>
                </e-column>
              </e-columns>
              <ng-template #emptyRecordTemplate
                >No idle stock — everything in stock has moved in the last 90 days.</ng-template
              >
            </ejs-grid>
          </ar-card>
        }
      } @else {
        @if (payments(); as p) {
          <section class="br__tiles" [class.br__tiles--loading]="loading()">
            <ar-stat-tile
              label="Collected"
              [value]="money(p.collectedInPaise)"
              [note]="
                vs(p.collectedInPaise, paymentsPrev()?.collectedInPaise, true)?.text ??
                (p.linksPaid ?? 0) + ' payment links paid'
              "
              [tone]="vsTone(p.collectedInPaise, paymentsPrev()?.collectedInPaise, true, 'good')"
            />
            <ar-stat-tile
              label="Links paid"
              [value]="p.conversionRate == null ? '—' : pct(p.conversionRate)"
              [note]="
                (p.linksSent ?? 0) +
                ' sent · ' +
                (p.linksFailed ?? 0) +
                ' failed · ' +
                (p.linksExpired ?? 0) +
                ' expired'
              "
              [tone]="(p.conversionRate ?? 1) < 0.5 ? 'amber' : 'neutral'"
            />
            @if (vs(p.conversionRate, paymentsPrev()?.conversionRate, true, true); as c) {
              <ar-stat-tile
                label="Links paid, change"
                [value]="c.text"
                [note]="period.previousLabel()"
                [tone]="c.good == null ? 'neutral' : c.good ? 'good' : 'bad'"
              />
            }
            <ar-stat-tile
              label="Time to pay"
              [value]="hours(p.medianHoursToPay)"
              note="median, link sent to paid"
            />
            <ar-stat-tile
              label="Waiting on links"
              [value]="money(p.openValueInPaise)"
              [note]="(p.linksOpen ?? 0) + ' links still open'"
              tone="teal"
            />
            @if (p.hasReceivables) {
              <ar-stat-tile
                label="Owed by customers"
                [value]="money(p.outstandingInPaise)"
                [note]="'DSO ' + (p.daysSalesOutstanding ?? '—') + ' days'"
              />
              <ar-stat-tile
                label="Overdue"
                [value]="money(p.overdueInPaise)"
                [note]="(p.overdueInvoices ?? 0) + ' invoices past due'"
                [tone]="(p.overdueInPaise ?? 0) > 0 ? 'bad' : 'good'"
              />
            }
          </section>

          <ar-card heading="Requested and collected, by month">
            @defer (on viewport) {
              <ar-chart
                id="br-pay-months"
                height="240px"
                background="transparent"
                [theme]="colours().theme"
                [primaryXAxis]="xAxis"
                [primaryYAxis]="yAxis"
                [chartArea]="{ border: { width: 0 } }"
                [tooltip]="{ enable: true, shared: true }"
                [legendSettings]="{ visible: true, position: 'Bottom' }"
                (axisLabelRender)="moneyAxis($event)"
              >
                <ar-chart-series
                  [dataSource]="payMonths()"
                  type="Column"
                  xName="month"
                  yName="requested"
                  name="Requested"
                  [fill]="colours().outbound"
                  [columnWidth]="0.6"
                />
                <ar-chart-series
                  [dataSource]="payMonths()"
                  type="Column"
                  xName="month"
                  yName="collected"
                  name="Collected"
                  [fill]="colours().collected"
                  [columnWidth]="0.6"
                />
              </ar-chart>
            } @placeholder {
              <div style="min-height:240px" aria-busy="true"></div>
            }
          </ar-card>

          @if (p.hasReceivables) {
            <div class="br__two">
              <ar-card heading="Receivables ageing">
                <div class="age">
                  @for (a of p.ageing ?? []; track a.bucket; let i = $index) {
                    <div class="age__row">
                      <span class="age__k">{{ a.bucket }}</span>
                      <span class="age__bar"
                        ><span
                          [class]="'age__fill age__fill--' + i"
                          [style.width.%]="share(a.amountInPaise, p.outstandingInPaise)"
                        ></span
                      ></span>
                      <span class="age__v">{{ money(a.amountInPaise) }}</span>
                      <span class="age__n">{{ a.invoices }} inv.</span>
                    </div>
                  }
                </div>
              </ar-card>
              <ar-card heading="Who owes the most">
                <a card-actions class="br__link" routerLink="/collections">Chase on WhatsApp →</a>
                <ejs-grid
                  arGrid="top-debtors"
                  [arGridTools]="false"
                  [dataSource]="p.topDebtors ?? []"
                >
                  <e-columns>
                    <e-column field="name" headerText="Customer" />
                    <e-column
                      field="amountInPaise"
                      headerText="Owed"
                      type="number"
                      textAlign="Right"
                      width="120"
                    >
                      <ng-template #template let-r>{{ money(r.amountInPaise) }}</ng-template>
                    </e-column>
                    <e-column
                      field="overdueInPaise"
                      headerText="Overdue"
                      type="number"
                      textAlign="Right"
                      width="120"
                    >
                      <ng-template #template let-r>
                        <span [class.br__bad]="r.overdueInPaise > 0">{{
                          money(r.overdueInPaise)
                        }}</span>
                      </ng-template>
                    </e-column>
                    <e-column
                      field="oldestDaysOverdue"
                      headerText="Oldest"
                      type="number"
                      textAlign="Right"
                      width="100"
                    >
                      <ng-template #template let-r>{{
                        r.oldestDaysOverdue ? r.oldestDaysOverdue + ' d' : '—'
                      }}</ng-template>
                    </e-column>
                  </e-columns>
                  <ng-template #emptyRecordTemplate>Nobody owes anything. 🎉</ng-template>
                </ejs-grid>
              </ar-card>
            </div>
          } @else {
            <ar-banner tone="teal">
              Connect your ERP (Tally, Zoho Books…) under Integrations to add what customers owe:
              ageing, days sales outstanding and the customers to chase first.
            </ar-banner>
          }

          <div class="br__two">
            <ar-card heading="Top paying customers">
              <ejs-grid arGrid="top-payers" [arGridTools]="false" [dataSource]="p.topPayers ?? []">
                <e-columns>
                  <e-column field="name" headerText="Customer" />
                  <e-column
                    field="count"
                    headerText="Payments"
                    type="number"
                    textAlign="Right"
                    width="110"
                  />
                  <e-column
                    field="amountInPaise"
                    headerText="Paid"
                    type="number"
                    textAlign="Right"
                    width="130"
                  >
                    <ng-template #template let-r>{{ money(r.amountInPaise) }}</ng-template>
                  </e-column>
                </e-columns>
                <ng-template #emptyRecordTemplate
                  >No payment links were paid in this period.</ng-template
                >
              </ejs-grid>
            </ar-card>
            <ar-card heading="Why payments failed">
              <ejs-grid
                arGrid="payment-failures"
                [arGridTools]="false"
                [dataSource]="p.failureReasons ?? []"
              >
                <e-columns>
                  <e-column field="reason" headerText="Reason" />
                  <e-column
                    field="count"
                    headerText="Times"
                    type="number"
                    textAlign="Right"
                    width="100"
                  >
                    <ng-template #template let-r
                      ><ar-chip tone="bad">{{ r.count }}</ar-chip></ng-template
                    >
                  </e-column>
                </e-columns>
                <ng-template #emptyRecordTemplate>No failed payments in this period.</ng-template>
              </ejs-grid>
            </ar-card>
          </div>
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
    .br {
      flex: 1;
      min-height: 0;
      padding: 14px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .br > * {
      flex-shrink: 0; /* the page scrolls; sections keep their height */
    }
    .br ar-card {
      display: block;
    }
    .br__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
      transition: opacity 0.15s;
    }
    .br__tiles--loading {
      opacity: 0.55;
    }
    .br__two {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 16px;
    }
    .br__note {
      margin: 6px 0 0;
      font: 400 12px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .br__link {
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-primary);
      text-decoration: none;
    }
    .br__bad {
      color: var(--ar-red-600);
      font-weight: 600;
    }
    .abc,
    .age {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .abc__row {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 4px 10px;
      align-items: center;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .abc__bar,
    .age__bar {
      grid-column: 2;
      height: 6px;
      border-radius: 3px;
      background: var(--ar-bg-100);
      overflow: hidden;
    }
    .abc__bar span {
      display: block;
      height: 100%;
      background: var(--ar-primary);
    }
    .abc__class {
      display: inline-grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      font: 700 12px var(--ar-font-sans);
      color: #fff;
      background: var(--ar-ink-400);
    }
    .abc__class--A {
      background: var(--ar-primary);
    }
    .abc__class--B {
      background: var(--ar-teal-500);
    }
    .age__row {
      display: grid;
      grid-template-columns: 110px 1fr 100px 60px;
      gap: 10px;
      align-items: center;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .age__bar {
      grid-column: auto;
      height: 10px;
    }
    .age__fill {
      display: block;
      height: 100%;
      border-radius: 3px;
    }
    .age__fill--0 {
      background: var(--ar-green-500);
    }
    .age__fill--1 {
      background: var(--ar-amber-500);
    }
    .age__fill--2 {
      background: var(--ar-amber-600);
    }
    .age__fill--3,
    .age__fill--4 {
      background: var(--ar-red-500);
    }
    .age__v {
      text-align: right;
      font-weight: 600;
    }
    .age__n {
      text-align: right;
      color: var(--ar-ink-400);
    }
  `,
})
export class ArBusinessReports {
  private readonly api = inject(BusinessReportService);

  protected readonly tabs = TABS;
  protected readonly tab = signal<Tab>('Stock');
  protected readonly period = inject(ReportPeriodStore);

  protected readonly stock = signal<StockReportDto | null>(null);
  protected readonly payments = signal<PaymentReportDto | null>(null);
  /** The same reports for the period before, when comparing. */
  protected readonly stockPrev = signal<StockReportDto | null>(null);
  protected readonly paymentsPrev = signal<PaymentReportDto | null>(null);
  protected readonly loading = signal(false);
  protected readonly stockNotInPlan = signal(false);

  protected readonly colours = chartColours({
    inbound: '--ar-teal-500',
    outbound: '--ar-primary',
    collected: '--ar-green-500',
  });
  protected readonly xAxis = {
    valueType: 'Category',
    majorGridLines: { width: 0 },
    majorTickLines: { width: 0 },
  } as const;
  protected readonly yAxis = {
    minimum: 0,
    lineStyle: { width: 0 },
    majorTickLines: { width: 0 },
  } as const;

  constructor() {
    // Load the tab on show for the period chosen; each tab loads once per period.
    effect(() => {
      const tab = this.tab();
      const range = this.period.range();
      const previous = this.period.compare() ? this.period.previousRange() : null;
      untracked(() => void this.load(tab, range, previous));
    });
  }

  private loadedFor: Record<Tab, string | null> = { Stock: null, Payments: null };

  private async load(tab: Tab, range: UtcRange, previous: UtcRange | null): Promise<void> {
    const key = JSON.stringify([range, previous]);
    if (this.loadedFor[tab] === key) return;
    this.loading.set(true);
    try {
      if (tab === 'Stock') {
        const [now, before] = await Promise.all([
          firstValueFrom(this.api.getStock(range)),
          previous ? firstValueFrom(this.api.getStock(previous)) : Promise.resolve(null),
        ]);
        this.stock.set(now);
        this.stockPrev.set(before);
      } else {
        const [now, before] = await Promise.all([
          firstValueFrom(this.api.getPayments(range)),
          previous ? firstValueFrom(this.api.getPayments(previous)) : Promise.resolve(null),
        ]);
        this.payments.set(now);
        this.paymentsPrev.set(before);
      }
      this.loadedFor[tab] = key;
    } catch (e: unknown) {
      // Most reasons are shown as a toast; a missing add-on gets its own note.
      if (tab === 'Stock') this.stockNotInPlan.set(isPlanRefusal(e));
    } finally {
      this.loading.set(false);
    }
  }

  /** "+12% vs 2 Aug – 31 Aug 2026" against the period before; null when not comparing or nothing to compare. */
  protected vs(
    current: number | null | undefined,
    previous: number | null | undefined,
    higherIsBetter: boolean | null,
    rate = false,
  ): { text: string; good: boolean | null } | null {
    if (!this.period.compare()) return null;
    const c = changeOf(current, previous, { rate, higherIsBetter });
    return c
      ? { text: rate ? c.text : `${c.text} ${this.period.previousLabel()}`, good: c.good }
      : null;
  }

  protected vsTone(
    current: number | null | undefined,
    previous: number | null | undefined,
    higherIsBetter: boolean | null,
    fallback: 'good' | 'neutral' = 'neutral',
  ): 'good' | 'bad' | 'neutral' {
    const c = this.vs(current, previous, higherIsBetter);
    return c?.good == null ? fallback : c.good ? 'good' : 'bad';
  }

  private monthLabel(iso?: string): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      : '';
  }

  protected readonly stockMonths = computed(() =>
    (this.stock()?.byMonth ?? []).map((m) => ({
      month: this.monthLabel(m.month),
      in: (m.valueInInPaise ?? 0) / 100,
      out: (m.valueOutInPaise ?? 0) / 100,
    })),
  );
  protected readonly payMonths = computed(() =>
    (this.payments()?.byMonth ?? []).map((m) => ({
      month: this.monthLabel(m.month),
      requested: (m.requestedInPaise ?? 0) / 100,
      collected: (m.collectedInPaise ?? 0) / 100,
    })),
  );

  /** Chart values are in rupees; the axis shows them compactly. */
  protected moneyAxis(args: { axis: { orientation: string }; value: number; text: string }): void {
    if (args.axis.orientation === 'Vertical') args.text = inrCompact(args.value);
  }

  protected money(paise: number | null | undefined): string {
    const rupees = (paise ?? 0) / 100;
    return Math.abs(rupees) >= 100_000 ? inrCompact(rupees) : inr(paise ?? 0);
  }

  protected pct(v: number | null | undefined): string {
    return v == null ? '—' : `${Math.round(v * 100)}%`;
  }

  protected hours(h: number | null | undefined): string {
    if (h == null) return '—';
    return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
  }

  protected share(part: number | null | undefined, whole: number | null | undefined): number {
    return whole ? Math.min(100, ((part ?? 0) / whole) * 100) : 0;
  }

  protected turnoverTone(t: number | null | undefined): 'good' | 'amber' | 'neutral' {
    if (t == null) return 'neutral';
    return t >= 4 ? 'good' : t < 2 ? 'amber' : 'neutral';
  }
}
