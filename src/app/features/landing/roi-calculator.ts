import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { count, inr } from '../../core/util/format';
import { ArIcon } from '../../ui';
import { LANDING_PLANS } from './landing-plans';
import { ArPublicFrame } from './public-frame';
import { RoiInputs, roiEstimate } from './roi-logic';

/** The plans with AI voice agents (Pro and above), as the landing page lists them. */
const VOICE_PLANS = LANDING_PLANS.filter((p) => p.name === 'Pro' || p.name === 'Enterprise');

/**
 * The public ROI calculator at /roi: a prospect's call volume and staff cost against AI call minutes and a plan. The AI rate is the
 * visitor's to enter, from what the sales team quotes; no estimate is shown without it. Everything excludes GST.
 */
@Component({
  selector: 'ar-roi-calculator',
  imports: [FormsModule, RouterLink, ArIcon, ArPublicFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-public-frame>
      <div class="roi-container">
        <header class="roi-hero">
          <div class="roi-hero__glow" aria-hidden="true"></div>
          <div class="roi-hero__badge">
            <ar-icon name="sparkle" class="roi-hero__badge-icon" />
            <span>ROI ESTIMATOR</span>
          </div>
          <h1 class="roi-hero__title">What would AI voice agents save you?</h1>
          <p class="roi-hero__lede">
            Enter the calls your team takes or makes each month that an AI agent could handle:
            enquiries, service requests, AMC and renewal reminders, payment follow-ups. The estimate
            is for one month, excluding GST.
          </p>
        </header>

        <!-- Interactive Calculator Grid -->
        <div class="roi-grid">
          <!-- Left: Input Form Card -->
          <section class="roi-card roi-card--form" aria-labelledby="roi-form-heading">
            <div class="roi-card__header">
              <div class="roi-card__bar"></div>
              <h2 id="roi-form-heading" class="roi-card__title">Your call volume & staff cost</h2>
            </div>

            <form class="roi-form" (submit)="$event.preventDefault()">
              <label class="ar-field">
                <span class="ar-field__label">
                  <ar-icon name="phone" class="ar-field__icon" />
                  Calls a month
                </span>
                <input
                  class="ar-field__input"
                  type="number"
                  min="0"
                  name="calls"
                  [ngModel]="v().callsPerMonth"
                  (ngModelChange)="set('callsPerMonth', $event)"
                />
              </label>

              <label class="ar-field">
                <span class="ar-field__label">
                  <ar-icon name="clock" class="ar-field__icon" />
                  Average call length (minutes)
                </span>
                <input
                  class="ar-field__input"
                  type="number"
                  min="0"
                  max="60"
                  step="0.5"
                  name="length"
                  [ngModel]="v().averageCallMinutes"
                  (ngModelChange)="set('averageCallMinutes', $event)"
                />
              </label>

              <label class="ar-field">
                <span class="ar-field__label">
                  <ar-icon name="user" class="ar-field__icon" />
                  A person's time per call, with notes (minutes)
                </span>
                <input
                  class="ar-field__input"
                  type="number"
                  min="0"
                  max="120"
                  name="staffMinutes"
                  [ngModel]="v().staffMinutesPerCall"
                  (ngModelChange)="set('staffMinutesPerCall', $event)"
                />
              </label>

              <label class="ar-field">
                <span class="ar-field__label">
                  <ar-icon name="billing" class="ar-field__icon" />
                  Cost of an hour of their time (₹)
                </span>
                <input
                  class="ar-field__input"
                  type="number"
                  min="0"
                  name="staffCost"
                  [ngModel]="v().staffCostPerHour"
                  (ngModelChange)="set('staffCostPerHour', $event)"
                />
              </label>

              <label class="ar-field">
                <span class="ar-field__label">
                  <ar-icon name="sparkle" class="ar-field__icon" />
                  Calls the AI handles to the end (%)
                </span>
                <input
                  class="ar-field__input"
                  type="number"
                  min="0"
                  max="100"
                  name="share"
                  [ngModel]="v().aiHandledPercent"
                  (ngModelChange)="set('aiHandledPercent', $event)"
                />
              </label>

              <label class="ar-field">
                <span class="ar-field__label">
                  <ar-icon name="bolt" class="ar-field__icon" />
                  AI call rate (₹ a minute)
                </span>
                <input
                  class="ar-field__input"
                  type="number"
                  min="0"
                  step="0.01"
                  name="rate"
                  placeholder="Ask our team"
                  [ngModel]="v().aiPricePerMinute"
                  (ngModelChange)="setRate($event)"
                />
              </label>

              <label class="ar-field">
                <span class="ar-field__label">
                  <ar-icon name="shield" class="ar-field__icon" />
                  Plan
                </span>
                <select
                  class="ar-field__input ar-field__select"
                  name="plan"
                  [ngModel]="plan()"
                  (ngModelChange)="plan.set($event)"
                >
                  @for (p of plans; track p.name) {
                    <option [ngValue]="p.name">
                      {{ p.name }} · {{ p.isFloor ? 'from ' : ''
                      }}{{ money(p.monthlyFeeInPaise / 100) }} a month
                    </option>
                  }
                </select>
              </label>
            </form>
          </section>

          <!-- Right: Calculated Estimate Card -->
          <section
            class="roi-card roi-card--result"
            aria-live="polite"
            aria-label="Estimate"
            [class.roi-card--has-estimate]="estimate() !== null"
          >
            @if (estimate(); as e) {
              <!-- Saving Hero Callout -->
              <div
                class="roi-result-banner"
                [class.roi-result-banner--positive]="e.monthlySaving >= 0"
                [class.roi-result-banner--negative]="e.monthlySaving < 0"
              >
                <p class="roi-result-banner__label">Estimated Net Monthly Impact</p>
                <p class="roi-result-banner__figure roi__big" [class.roi__loss]="e.monthlySaving < 0">
                  {{ e.monthlySaving < 0 ? 'Costs' : 'Saves' }}
                  <strong class="roi-result-banner__amount">{{ money(abs(e.monthlySaving)) }}</strong> a month
                </p>

                @if (e.returnMultiple !== null && e.monthlySaving >= 0) {
                  <div class="roi-multiple-pill">
                    <ar-icon name="sparkle" class="roi-multiple-pill__icon" />
                    <span>{{ e.returnMultiple }}× what the AI and plan cost</span>
                  </div>
                }
              </div>

              <!-- Detailed Breakdown Table -->
              <div class="roi-table-wrapper">
                <table class="roi-table">
                  <tbody>
                    <tr>
                      <th scope="row">Calls the AI handles to the end</th>
                      <td>{{ count(e.aiHandledCalls) }}</td>
                    </tr>
                    <tr>
                      <th scope="row">Staff time freed</th>
                      <td>{{ e.staffHoursSaved }} hours</td>
                    </tr>
                    <tr>
                      <th scope="row">Staff cost freed</th>
                      <td>{{ money(e.staffCostSaved) }}</td>
                    </tr>
                    <tr>
                      <th scope="row">AI minutes</th>
                      <td>{{ count(e.aiMinutes) }}</td>
                    </tr>
                    <tr>
                      <th scope="row">AI call cost</th>
                      <td>{{ money(e.aiCallCost) }}</td>
                    </tr>
                    <tr>
                      <th scope="row">Plan</th>
                      <td>{{ money(e.planFee) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Note -->
              <div class="roi-note-box">
                <p class="roi-note-box__text">
                  An estimate from your figures, excluding GST. WhatsApp and telephone charges where
                  they apply are not included. Try it on your own calls in a pilot: the AI impact
                  report shows the real numbers.
                </p>
              </div>
            } @else {
              <!-- Empty Rate Prompt -->
              <div class="roi-empty-state">
                <div class="roi-empty-state__icon">
                  <ar-icon name="bolt" />
                </div>
                <h3 class="roi-empty-state__title">Enter AI call rate</h3>
                <p class="roi-empty-state__text">
                  Enter the AI call rate to see your estimate. Our team will quote it for your call
                  volume.
                </p>
              </div>
            }

            <!-- Card Actions -->
            <div class="roi-card__actions">
              <a class="roi-btn roi-btn--primary" routerLink="/signup">
                <span>Create a workspace</span>
                <span class="roi-btn__arrow" aria-hidden="true">→</span>
              </a>
              <a class="roi-btn roi-btn--secondary" routerLink="/">See plans</a>
            </div>
          </section>
        </div>
      </div>
    </ar-public-frame>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      color: #0F172A;
      font-family: var(--ar-font-sans, system-ui, -apple-system, sans-serif);
      -webkit-font-smoothing: antialiased;
    }

    .roi-container {
      max-width: 1040px;
      margin: 0 auto;
      padding: 16px 0 48px;
    }

    /* Hero */
    .roi-hero {
      position: relative;
      padding: 32px 0 36px;
      overflow: hidden;
    }

    .roi-hero__glow {
      position: absolute;
      top: -40px;
      left: 10%;
      width: 460px;
      height: 280px;
      background: radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(13, 148, 136, 0.08) 50%, transparent 70%);
      filter: blur(50px);
      pointer-events: none;
      z-index: 0;
    }

    .roi-hero__badge {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      border-radius: 9999px;
      background: #EFF6FF;
      border: 1px solid rgba(37, 99, 235, 0.25);
      color: #2563EB;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }

    .roi-hero__badge-icon {
      color: #2563EB;
      width: 13px;
      height: 13px;
    }

    .roi-hero__title {
      position: relative;
      z-index: 1;
      margin: 0 0 16px;
      font-size: 38px;
      line-height: 1.2;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #0F172A;
      max-width: 28ch;
      text-wrap: balance;
    }

    .roi-hero__lede {
      position: relative;
      z-index: 1;
      margin: 0;
      max-width: 68ch;
      color: #475569;
      font-size: 16px;
      line-height: 1.6;
    }

    /* Grid */
    .roi-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
      gap: 28px;
      align-items: start;
      margin-top: 24px;
    }

    @media (max-width: 860px) {
      .roi-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Cards */
    .roi-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      padding: 30px 28px;
      box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      gap: 20px;
      transition: all 220ms ease;
    }

    .roi-card__header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }

    .roi-card__bar {
      width: 4px;
      height: 20px;
      border-radius: 2px;
      background: linear-gradient(180deg, #2563EB 0%, #0D9488 100%);
    }

    .roi-card__title {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
      color: #0F172A;
    }

    /* Form & Fields */
    .roi-form {
      display: grid;
      gap: 16px;
    }

    .ar-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ar-field__label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }

    .ar-field__icon {
      width: 14px;
      height: 14px;
      color: #64748B;
    }

    .ar-field__input {
      width: 100%;
      height: 42px;
      padding: 0 14px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      color: #0F172A;
      box-sizing: border-box;
      transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
    }

    .ar-field__input:hover {
      border-color: #94A3B8;
      background: #FFFFFF;
    }

    .ar-field__input:focus {
      outline: none;
      background: #FFFFFF;
      border-color: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }

    .ar-field__select {
      cursor: pointer;
    }

    /* Results Card */
    .roi-card--result {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      position: sticky;
      top: 24px;
    }

    .roi-card--has-estimate {
      border-color: #93C5FD;
      box-shadow: 0 12px 32px -8px rgba(37, 99, 235, 0.1);
    }

    .roi-result-banner {
      border-radius: 12px;
      padding: 22px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      border: 1px solid transparent;
    }

    .roi-result-banner--positive {
      background: #F0FDF4;
      border-color: rgba(22, 163, 74, 0.25);
    }

    .roi-result-banner--positive .roi-result-banner__amount {
      color: #15803D;
    }

    .roi-result-banner--negative {
      background: #FEF2F2;
      border-color: rgba(239, 68, 68, 0.25);
    }

    .roi-result-banner--negative .roi-result-banner__amount {
      color: #DC2626;
    }

    .roi-result-banner__label {
      margin: 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748B;
    }

    .roi-result-banner__figure {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .roi-result-banner__type {
      font-size: 20px;
      font-weight: 700;
      color: #0F172A;
    }

    .roi-result-banner__amount {
      font-size: 34px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.02em;
    }

    .roi-result-banner__period {
      font-size: 15px;
      font-weight: 500;
      color: #64748B;
    }

    .roi-multiple-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      background: #FFFFFF;
      border: 1px solid rgba(22, 163, 74, 0.25);
      color: #15803D;
      font-size: 12px;
      font-weight: 700;
      margin-top: 4px;
    }

    .roi-multiple-pill__icon {
      width: 13px;
      height: 13px;
    }

    /* Breakdown Table */
    .roi-table-wrapper {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow: hidden;
    }

    .roi-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .roi-table th,
    .roi-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #F1F5F9;
    }

    .roi-table tr:last-child th,
    .roi-table tr:last-child td {
      border-bottom: none;
    }

    .roi-table th {
      text-align: left;
      font-weight: 500;
      color: #475569;
      background: #F8FAFC;
    }

    .roi-table td {
      text-align: right;
      font-weight: 600;
      color: #0F172A;
      font-variant-numeric: tabular-nums;
      background: #FFFFFF;
    }

    /* Note Box */
    .roi-note-box {
      background: #EFF6FF;
      border: 1px solid rgba(37, 99, 235, 0.18);
      border-radius: 10px;
      padding: 12px 14px;
    }

    .roi-note-box__text {
      margin: 0;
      font-size: 12px;
      line-height: 1.55;
      color: #1E3A8A;
    }

    /* Empty state */
    .roi-empty-state {
      padding: 36px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      background: #F8FAFC;
      border: 1px dashed #CBD5E1;
      border-radius: 12px;
    }

    .roi-empty-state__icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #EFF6FF;
      color: #2563EB;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .roi-empty-state__icon ar-icon {
      width: 20px;
      height: 20px;
    }

    .roi-empty-state__title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
    }

    .roi-empty-state__text {
      margin: 0;
      font-size: 13px;
      line-height: 1.55;
      color: #64748B;
      max-width: 32ch;
    }

    /* Actions */
    .roi-card__actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
    }

    .roi-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      box-sizing: border-box;
      transition: all 180ms ease;
    }

    .roi-btn__arrow {
      transition: transform 180ms ease;
    }

    .roi-btn:hover .roi-btn__arrow {
      transform: translateX(4px);
    }

    .roi-btn--primary {
      background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
    }

    .roi-btn--primary:hover {
      background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
      transform: translateY(-2px);
    }

    .roi-btn--secondary {
      background: #FFFFFF;
      color: #0F172A;
      border: 1px solid #CBD5E1;
    }

    .roi-btn--secondary:hover {
      background: #F8FAFC;
      border-color: #94A3B8;
      transform: translateY(-2px);
    }

    @media (max-width: 640px) {
      .roi-hero__title {
        font-size: 28px;
      }
      .roi-card {
        padding: 22px 18px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .roi-btn {
        transition: none !important;
        transform: none !important;
      }
    }
  `,
})
export class ArRoiCalculator {
  protected readonly plans = VOICE_PLANS;
  protected readonly plan = signal(VOICE_PLANS[0]?.name ?? 'Pro');
  protected readonly v = signal<Omit<RoiInputs, 'planFeePerMonth'>>({
    callsPerMonth: 1000,
    averageCallMinutes: 3,
    staffMinutesPerCall: 6,
    staffCostPerHour: 300,
    aiHandledPercent: 70,
    aiPricePerMinute: null,
  });
  protected readonly estimate = computed(() => {
    const plan = VOICE_PLANS.find((p) => p.name === this.plan()) ?? VOICE_PLANS[0];
    return roiEstimate({ ...this.v(), planFeePerMonth: (plan?.monthlyFeeInPaise ?? 0) / 100 });
  });
  protected readonly count = count;

  protected set(
    key: keyof Omit<RoiInputs, 'planFeePerMonth' | 'aiPricePerMinute'>,
    value: number | string,
  ): void {
    this.v.update((v) => ({ ...v, [key]: Number(value) || 0 }));
  }

  protected setRate(value: number | string | null): void {
    const rate = value === '' || value === null ? null : Number(value);
    this.v.update((v) => ({
      ...v,
      aiPricePerMinute: rate !== null && Number.isFinite(rate) ? rate : null,
    }));
  }

  protected money(rupees: number): string {
    return inr(Math.round(rupees), { paise: false });
  }

  protected abs(n: number): number {
    return Math.abs(n);
  }
}
