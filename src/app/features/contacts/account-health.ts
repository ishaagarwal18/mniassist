import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import {
  AccountHealthDto,
  AccountHealthService,
  HealthBand,
  HealthWeightsDto,
  RenewalForecastDto,
} from '../../proxy/contacts/account-health.service';
import { ArButton, ArChip, ArDialog, ArSearchBox } from '../../ui';
import type { ChipTone } from '../../ui/chip';

/** The original fixed rules: what a workspace that never tunes anything scores with. */
const DEFAULT_WEIGHTS: HealthWeightsDto = {
  start: 75,
  healthyFrom: 70,
  watchFrom: 45,
  neverMessaged: 10,
  silentOver90Days: 10,
  silentOver180Days: 20,
  inTouchThisMonth: 5,
  perOpenTicket: 5,
  openTicketsCap: 15,
  perOverdueTicket: 10,
  overdueTicketsCap: 20,
  lowSatisfaction: 15,
  highSatisfaction: 5,
  overdueInvoices: 15,
  perRenewalLost: 15,
  renewalsLostCap: 30,
  perRenewalWon: 5,
  renewalsWonCap: 10,
  perQuoteWon: 5,
  quotesWonCap: 15,
  perQuoteLost: 3,
  quotesLostCap: 9,
};

type WeightKey = keyof HealthWeightsDto;

/** The tuning form, in the order a person reads the score: where it starts, then what takes points away and what adds them. */
const WEIGHT_GROUPS: {
  title: string;
  fields: { key: WeightKey; label: string; sign?: '+' | '−' }[];
}[] = [
  {
    title: 'Score and bands',
    fields: [
      { key: 'start', label: 'Everyone starts at' },
      { key: 'healthyFrom', label: 'Healthy from' },
      { key: 'watchFrom', label: 'Watch from (below: at risk)' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'neverMessaged', label: 'Never messaged', sign: '−' },
      { key: 'silentOver90Days', label: 'Silent over 90 days', sign: '−' },
      { key: 'silentOver180Days', label: 'Silent over 180 days', sign: '−' },
      { key: 'inTouchThisMonth', label: 'In touch this month', sign: '+' },
    ],
  },
  {
    title: 'Service',
    fields: [
      { key: 'perOpenTicket', label: 'Each open ticket', sign: '−' },
      { key: 'openTicketsCap', label: 'Open tickets, at most', sign: '−' },
      { key: 'perOverdueTicket', label: 'Each overdue ticket', sign: '−' },
      { key: 'overdueTicketsCap', label: 'Overdue tickets, at most', sign: '−' },
      { key: 'lowSatisfaction', label: 'Low satisfaction (below 3★)', sign: '−' },
      { key: 'highSatisfaction', label: 'High satisfaction (4.5★ and up)', sign: '+' },
    ],
  },
  {
    title: 'Money and sales',
    fields: [
      { key: 'overdueInvoices', label: 'Overdue invoices', sign: '−' },
      { key: 'perRenewalLost', label: 'Each AMC renewal lost', sign: '−' },
      { key: 'renewalsLostCap', label: 'Renewals lost, at most', sign: '−' },
      { key: 'perRenewalWon', label: 'Each AMC renewal won', sign: '+' },
      { key: 'renewalsWonCap', label: 'Renewals won, at most', sign: '+' },
      { key: 'perQuoteWon', label: 'Each quote won (12 months)', sign: '+' },
      { key: 'quotesWonCap', label: 'Quotes won, at most', sign: '+' },
      { key: 'perQuoteLost', label: 'Each quote lost (12 months)', sign: '−' },
      { key: 'quotesLostCap', label: 'Quotes lost, at most', sign: '−' },
    ],
  },
];

const now = new Date().toISOString();
const month = (offset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
};

const SEED: AccountHealthDto[] = [
  {
    customerId: 'a1',
    isAccount: true,
    name: 'Kalyani Forge',
    score: 30,
    band: 'AtRisk',
    machines: 6,
    openRenewalValueInPaise: 1_62_000_00,
    computedAtUtc: now,
    reasons: [
      { text: 'No message from them in 190 days', points: -20 },
      { text: '2 tickets past the promised time', points: -20 },
      { text: 'Invoices more than 30 days overdue', points: -15 },
      { text: '1 quotation won this year', points: 5 },
    ],
  },
  {
    customerId: 'a2',
    isAccount: true,
    name: 'Precision Pumps',
    score: 60,
    band: 'Watch',
    machines: 3,
    openRenewalValueInPaise: 28_500_00,
    computedAtUtc: now,
    reasons: [
      { text: '1 open service ticket', points: -5 },
      { text: 'No message from them in 120 days', points: -10 },
    ],
  },
  {
    customerId: 'a3',
    isAccount: true,
    name: 'Godavari Cement',
    score: 95,
    band: 'Healthy',
    machines: 11,
    openRenewalValueInPaise: 65_000_00,
    computedAtUtc: now,
    reasons: [
      { text: 'In touch this month', points: 5 },
      { text: '2 AMC renewals won this year', points: 10 },
      { text: '1 quotation won this year', points: 5 },
    ],
  },
];

const SEED_FORECAST: RenewalForecastDto = {
  months: 3,
  openValueInPaise: 2_55_500_00,
  expectedValueInPaise: 1_49_000_00,
  withoutValue: 1,
  byMonth: [
    { month: month(0), count: 2, openValueInPaise: 70_500_00, expectedValueInPaise: 30_000_00 },
    { month: month(1), count: 1, openValueInPaise: 65_000_00, expectedValueInPaise: 56_000_00 },
    { month: month(2), count: 2, openValueInPaise: 1_20_000_00, expectedValueInPaise: 63_000_00 },
  ],
  renewals: [],
};

const BAND_LABEL: Record<HealthBand, string> = {
  Healthy: 'Healthy',
  Watch: 'Watch',
  AtRisk: 'At risk',
};

/**
 * S1: which customers are drifting away, and what the AMC book is likely to renew. Scores are points with reasons, not a model:
 * every number on the page says where it came from. Recomputed nightly from messages, tickets, invoices, renewals and quotes.
 */
@Component({
  selector: 'ar-account-health',
  imports: [RouterLink, ArTopbar, ArButton, ArChip, ArDialog, ArSearchBox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Account health"
      [subtitle]="subtitle()"
      help="A score out of 100 for each customer, from what MNI Assist already records: how recently they messaged, open and late service tickets, satisfaction, overdue invoices, renewals and quotes won or lost. It starts at 75; each reason shows its points. Recomputed every night."
    >
      @if (canRecompute()) {
        <button
          ar-button
          type="button"
          variant="ghost"
          icon="refresh"
          [disabled]="busy()"
          (click)="recompute()"
        >
          {{ busy() ? 'Scoring…' : 'Rescore now' }}
        </button>
        <button ar-button type="button" variant="ghost" icon="settings" (click)="openTune()">
          Tune scoring
        </button>
      }
    </ar-topbar>

    @if (tuneOpen()) {
      <ar-dialog title="Tune the health score" (dismiss)="tuneOpen.set(false)">
        <p class="ah__hint">
          Points from 0 to 100. Penalties are taken away, rewards added; “at most” caps how much one
          kind of signal can move a score. Saving rescores every customer.
        </p>
        @for (g of weightGroups; track g.title) {
          <fieldset class="tune">
            <legend>{{ g.title }}</legend>
            @for (f of g.fields; track f.key) {
              <label class="tune__row" [for]="'hw-' + f.key">
                <span
                  >{{ f.label }}
                  @if (f.sign) {
                    <span class="tune__sign" [class.neg]="f.sign === '−'">{{ f.sign }}</span>
                  }
                </span>
                <input
                  [id]="'hw-' + f.key"
                  class="ar-field__input tune__input"
                  inputmode="numeric"
                  [value]="weights()[f.key]"
                  (input)="setWeight(f.key, $any($event.target).value)"
                />
              </label>
            }
          </fieldset>
        }
        @if (tuneError(); as e) {
          <p class="ah__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="weights.set(defaults)">
            Restore defaults
          </button>
          <button ar-button type="button" variant="ghost" (click)="tuneOpen.set(false)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="saveWeights()"
          >
            {{ busy() ? 'Saving and rescoring…' : 'Save and rescore' }}
          </button>
        </div>
      </ar-dialog>
    }

    <div class="ah ar-scroll">
      @if (forecast(); as f) {
        <section class="fc" aria-label="AMC renewal forecast">
          <div class="fc__h">
            <div>
              <h2>AMC Renewals Forecast (Next {{ f.months }} Months)</h2>
              <p>
                A data-driven forecast calculated from each renewal's stage, service satisfaction, and customer health score.
                @if (f.withoutValue) {
                  <span>· {{ f.withoutValue }} renewal(s) count as ₹0 pending contract value.</span>
                }
              </p>
            </div>
            <div class="fc__kpis">
              <div class="fc__kpi">
                <span class="fc__kpi-lbl">Likely Renewal</span>
                <span class="fc__kpi-val text-good">{{ money(f.expectedValueInPaise) }}</span>
              </div>
              <div class="fc__kpi">
                <span class="fc__kpi-lbl">Open Exposure</span>
                <span class="fc__kpi-val">{{ money(f.openValueInPaise) }}</span>
              </div>
              <div class="fc__kpi">
                <span class="fc__kpi-lbl">Projected Realization</span>
                <span class="fc__kpi-val text-accent">{{ forecastPct() }}%</span>
              </div>
            </div>
          </div>

          <div class="fc__bars" role="list">
            @for (m of f.byMonth; track m.month) {
              <div
                class="fc__col"
                role="listitem"
                [attr.aria-label]="
                  monthLabel(m.month) +
                  ': ' +
                  money(m.expectedValueInPaise) +
                  ' likely of ' +
                  money(m.openValueInPaise)
                "
              >
                <div class="fc__track">
                  <div class="fc__open" [style.height.%]="pct(m.openValueInPaise)" title="Open value"></div>
                  <div class="fc__exp" [style.height.%]="pct(m.expectedValueInPaise)" title="Likely renewal value"></div>
                </div>
                <span class="fc__v">{{ money(m.expectedValueInPaise) }}</span>
                <span class="fc__m">{{ monthLabel(m.month) }} · {{ m.count }} AMC{{ m.count === 1 ? '' : 's' }}</span>
              </div>
            } @empty {
              <p class="ah__hint">No AMC agreements expire in this planning period.</p>
            }
          </div>
          <div class="fc__legend">
            <span class="sw sw--exp"></span> Expected Likely
            <span class="sw sw--open"></span> Total Open Exposure
          </div>
        </section>
      }

      <!-- Search & Health Band Toolbar -->
      <div class="ah__toolbar">
        <div class="seg" role="group" aria-label="Filter by health band">
          @for (b of bands; track b.value) {
            <button
              type="button"
              [attr.aria-pressed]="band() === b.value"
              (click)="band.set(b.value)"
            >
              {{ b.label }} <span class="seg__n">({{ count(b.value) }})</span>
            </button>
          }
        </div>
        <div class="ah__search">
          <ar-search-box placeholder="Search customer by name..." [query]="search()" (queryChange)="search.set($event)" />
        </div>
      </div>

      @if (error(); as e) {
        <p class="ah__err" role="alert">{{ e }}</p>
      }
      @if (loading()) {
        <div class="state-box">
          <p>Calculating customer health scores…</p>
        </div>
      } @else if (visible().length === 0) {
        <div class="state-box">
          <p>
            @if (search().trim()) {
              No customers match “{{ search() }}”.
            } @else {
              No customers scored{{ band() ? ' in this band' : '' }} yet.
            }
          </p>
        </div>
      } @else {
        <ul class="list">
          @for (h of visible(); track h.customerId) {
            <li class="acc">
              <div class="acc__score" [class]="'acc__score acc__score--' + h.band" title="Health Score: {{ h.score }}/100">
                <span class="acc__score-num">{{ h.score }}</span>
                <span class="acc__score-max">/100</span>
              </div>

              <div class="acc__main">
                <div class="acc__top">
                  <a class="acc__name" [routerLink]="customerUrl(h)" title="Open Customer 360">
                    {{ h.name }}
                  </a>
                  <ar-chip [tone]="tone(h.band)" [dot]="true">{{ label(h.band) }}</ar-chip>
                  <span class="acc__meta">
                    🏭 {{ h.machines }} machine{{ h.machines === 1 ? '' : 's' }}
                    @if (h.openRenewalValueInPaise) {
                      · 📋 {{ money(h.openRenewalValueInPaise) }} AMC renewal exposure
                    }
                  </span>
                  <div class="acc__action-spacer"></div>
                  <a ar-button variant="ghost" [routerLink]="customerUrl(h)">
                    Customer 360 →
                  </a>
                </div>

                <div class="reasons">
                  @for (r of h.reasons; track r.text) {
                    <span class="reason-pill" [class.reason-pill--neg]="r.points < 0">
                      <strong class="ar-mono">{{ r.points > 0 ? '+' + r.points : r.points }}</strong>
                      {{ r.text }}
                    </span>
                  }
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .ah {
      padding: 18px 24px 36px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }
    .fc {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .fc__h {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }
    .fc__h h2 {
      margin: 0;
      font: 600 15px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .fc__h p {
      margin: 4px 0 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      max-width: 65ch;
    }
    .fc__kpis {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .fc__kpi {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 6px 12px;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
    }
    .fc__kpi-lbl {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ar-ink-500);
    }
    .fc__kpi-val {
      font: 700 14px var(--ar-font-mono, monospace);
      color: var(--ar-ink-900);
    }
    .text-good {
      color: var(--ar-green-600) !important;
    }
    .text-accent {
      color: var(--ar-primary) !important;
    }
    .fc__bars {
      display: flex;
      gap: 24px;
      align-items: flex-end;
      min-height: 140px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .fc__col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 96px;
    }
    .fc__track {
      position: relative;
      width: 48px;
      height: 100px;
      display: flex;
      align-items: flex-end;
    }
    .fc__open,
    .fc__exp {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      border-radius: 4px 4px 0 0;
      transition: height 0.3s ease;
    }
    .fc__open {
      background: var(--ar-line-200);
    }
    .fc__exp {
      background: linear-gradient(180deg, var(--ar-primary), var(--ar-blue-700));
      left: 8px;
      right: 8px;
    }
    .fc__v {
      font: 600 12px var(--ar-font-mono, monospace);
      color: var(--ar-ink-900);
    }
    .fc__m {
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .fc__legend {
      margin: 0;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .sw {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }
    .sw--exp {
      background: var(--ar-primary);
    }
    .sw--open {
      background: var(--ar-line-200);
      margin-left: 12px;
    }
    .ah__toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .ah__search {
      min-width: 280px;
    }
    .seg {
      display: inline-flex;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      overflow: hidden;
    }
    .seg button {
      font: 500 12.5px var(--ar-font-sans);
      border: 0;
      border-right: 1px solid var(--ar-line-200);
      background: var(--ar-white);
      color: var(--ar-ink-700);
      padding: 6px 14px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .seg button:last-child {
      border-right: 0;
    }
    .seg button[aria-pressed='true'] {
      background: var(--ar-inverse-bg);
      color: var(--ar-inverse-fg);
    }
    .seg__n {
      opacity: 0.75;
      font-size: 11px;
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .acc {
      display: flex;
      gap: 16px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      padding: 14px 18px;
      align-items: flex-start;
      transition: border-color var(--ar-ease, 0.15s ease);
    }
    .acc:hover {
      border-color: var(--ar-line-300);
    }
    .acc__score {
      flex: none;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 3px solid var(--ar-line-200);
      background: var(--ar-bg-50);
      line-height: 1;
    }
    .acc__score-num {
      font: 700 16px var(--ar-font-mono, monospace);
      color: var(--ar-ink-900);
    }
    .acc__score-max {
      font: 500 9px var(--ar-font-sans);
      color: var(--ar-ink-400);
      margin-top: 1px;
    }
    .acc__score--Healthy {
      border-color: var(--ar-green-500);
      background: var(--ar-green-100);
    }
    .acc__score--Watch {
      border-color: var(--ar-amber-500);
      background: var(--ar-amber-100);
    }
    .acc__score--AtRisk {
      border-color: var(--ar-red-500);
      background: var(--ar-red-100);
    }
    .acc__main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .acc__top {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .acc__name {
      font: 600 14.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
      text-decoration: none;
    }
    .acc__name:hover {
      color: var(--ar-blue-600);
      text-decoration: underline;
    }
    .acc__meta {
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    .acc__action-spacer {
      margin-left: auto;
    }
    .reasons {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .reason-pill {
      font-size: 11.5px;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--ar-green-100);
      color: var(--ar-green-600);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .reason-pill--neg {
      background: var(--ar-red-100);
      color: var(--ar-red-600);
    }
    .state-box {
      padding: 2.5rem;
      text-align: center;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      color: var(--ar-ink-500);
    }
    .ah__hint {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .ah__err {
      margin: 0;
      padding: 8px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12.5px var(--ar-font-sans);
    }
    .tune {
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      margin: 0 0 10px;
      padding: 10px 14px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 8px 16px;
    }
    .tune legend {
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
      padding: 0 4px;
    }
    .tune__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font: 400 13px var(--ar-font-sans);
    }
    .tune__input {
      width: 64px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .tune__sign {
      margin-left: 4px;
      font-weight: 600;
      color: var(--ar-green-600);
    }
    .tune__sign.neg {
      color: var(--ar-red-600);
    }
  `,
})
export class ArAccountHealth {
  private readonly api = inject(AccountHealthService);
  protected readonly canRecompute = grantedPolicy(
    'AutoReach.Contacts.Update',
    inject(PermissionService),
  );

  protected readonly bands: { value: HealthBand | null; label: string }[] = [
    { value: null, label: 'All' },
    { value: 'AtRisk', label: 'At risk' },
    { value: 'Watch', label: 'Watch' },
    { value: 'Healthy', label: 'Healthy' },
  ];

  protected readonly rows = signal<AccountHealthDto[]>([]);
  protected readonly forecast = signal<RenewalForecastDto | null>(null);
  protected readonly band = signal<HealthBand | null>(null);
  protected readonly search = signal('');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const b = this.band();
    const q = this.search().trim().toLowerCase();
    let list = this.rows();
    if (b) list = list.filter((r) => r.band === b);
    if (q) list = list.filter((r) => r.name?.toLowerCase().includes(q));
    return list;
  });

  protected readonly forecastPct = computed(() => {
    const f = this.forecast();
    if (!f || !f.openValueInPaise) return 0;
    return Math.round((f.expectedValueInPaise / f.openValueInPaise) * 100);
  });

  protected customerUrl(h: AccountHealthDto): (string | undefined)[] {
    return h.isAccount
      ? ['/contacts/accounts', h.customerId, '360']
      : ['/contacts', h.customerId, '360'];
  }

  protected readonly subtitle = computed(() => {
    const risk = this.rows().filter((r) => r.band === 'AtRisk').length;
    return `${this.rows().length} customers scored · ${risk} at risk`;
  });

  private readonly max = computed(() =>
    Math.max(1, ...(this.forecast()?.byMonth ?? []).map((m) => m.openValueInPaise)),
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      if (environment.useMockData) {
        this.rows.set(SEED);
        this.forecast.set(SEED_FORECAST);
        return;
      }
      const [rows, forecast] = await Promise.all([
        firstValueFrom(this.api.getList()),
        firstValueFrom(this.api.getRenewalForecast(3)),
      ]);
      this.rows.set(rows);
      this.forecast.set(forecast);
    } catch (e: unknown) {
      this.error.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'Could not load account health.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  // ---- Tuning -------------------------------------------------------------------------
  protected readonly weightGroups = WEIGHT_GROUPS;
  protected readonly defaults = DEFAULT_WEIGHTS;
  protected readonly tuneOpen = signal(false);
  protected readonly weights = signal<HealthWeightsDto>({ ...DEFAULT_WEIGHTS });
  protected readonly tuneError = signal<string | null>(null);

  protected async openTune(): Promise<void> {
    this.tuneError.set(null);
    this.tuneOpen.set(true);
    if (environment.useMockData) return;
    try {
      this.weights.set(await firstValueFrom(this.api.getWeights()));
    } catch (e: unknown) {
      this.tuneError.set(this.problem(e, 'Could not load the current points.'));
    }
  }

  protected setWeight(key: WeightKey, value: string): void {
    this.weights.update((w) => ({ ...w, [key]: Number(value.trim()) }));
  }

  protected async saveWeights(): Promise<void> {
    const w = this.weights();
    if (Object.values(w).some((v) => !Number.isInteger(v) || v < 0 || v > 100)) {
      this.tuneError.set('Use whole numbers from 0 to 100.');
      return;
    }
    if (w.watchFrom >= w.healthyFrom) {
      this.tuneError.set('“Watch from” must be below “Healthy from”.');
      return;
    }
    this.busy.set(true);
    this.tuneError.set(null);
    try {
      if (!environment.useMockData)
        this.weights.set(await firstValueFrom(this.api.updateWeights(w)));
      this.tuneOpen.set(false);
      await this.load();
    } catch (e: unknown) {
      this.tuneError.set(this.problem(e, 'The points could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  private problem(e: unknown, fallback: string): string {
    return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
  }

  protected async recompute(): Promise<void> {
    this.busy.set(true);
    try {
      if (!environment.useMockData) await firstValueFrom(this.api.recompute());
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }

  protected count(b: HealthBand | null): number {
    return b ? this.rows().filter((r) => r.band === b).length : this.rows().length;
  }

  protected tone(b: HealthBand): ChipTone {
    return b === 'Healthy' ? 'good' : b === 'Watch' ? 'warn' : 'bad';
  }

  protected label(b: HealthBand): string {
    return BAND_LABEL[b];
  }

  protected money(paise: number): string {
    return inr(paise);
  }

  protected pct(paise: number): number {
    return Math.round((paise / this.max()) * 100);
  }

  protected monthLabel(yyyyMm: string): string {
    const [y, m] = yyyyMm.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
}
