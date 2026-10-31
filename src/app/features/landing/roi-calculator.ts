import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { count, inr } from '../../core/util/format';
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
  imports: [FormsModule, RouterLink, ArPublicFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-public-frame>
      <h1 class="roi__h">What would AI voice agents save you?</h1>
      <p class="roi__lede">
        Enter the calls your team takes or makes each month that an AI agent could handle:
        enquiries, service requests, AMC and renewal reminders, payment follow-ups. The estimate is
        for one month, excluding GST.
      </p>
      <div class="roi__grid">
        <form class="roi__form" (submit)="$event.preventDefault()">
          <label class="ar-field"
            ><span class="ar-field__label">Calls a month</span>
            <input
              class="ar-field__input"
              type="number"
              min="0"
              name="calls"
              [ngModel]="v().callsPerMonth"
              (ngModelChange)="set('callsPerMonth', $event)"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">Average call length (minutes)</span>
            <input
              class="ar-field__input"
              type="number"
              min="0"
              max="60"
              step="0.5"
              name="length"
              [ngModel]="v().averageCallMinutes"
              (ngModelChange)="set('averageCallMinutes', $event)"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">A person's time per call, with notes (minutes)</span>
            <input
              class="ar-field__input"
              type="number"
              min="0"
              max="120"
              name="staffMinutes"
              [ngModel]="v().staffMinutesPerCall"
              (ngModelChange)="set('staffMinutesPerCall', $event)"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">Cost of an hour of their time (₹)</span>
            <input
              class="ar-field__input"
              type="number"
              min="0"
              name="staffCost"
              [ngModel]="v().staffCostPerHour"
              (ngModelChange)="set('staffCostPerHour', $event)"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">Calls the AI handles to the end (%)</span>
            <input
              class="ar-field__input"
              type="number"
              min="0"
              max="100"
              name="share"
              [ngModel]="v().aiHandledPercent"
              (ngModelChange)="set('aiHandledPercent', $event)"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">AI call rate (₹ a minute)</span>
            <input
              class="ar-field__input"
              type="number"
              min="0"
              step="0.01"
              name="rate"
              placeholder="Ask our team"
              [ngModel]="v().aiPricePerMinute"
              (ngModelChange)="setRate($event)"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">Plan</span>
            <select
              class="ar-field__input"
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
            </select></label
          >
        </form>
        <section class="roi__result" aria-live="polite" aria-label="Estimate">
          @if (estimate(); as e) {
            <p class="roi__big" [class.roi__loss]="e.monthlySaving < 0">
              {{ e.monthlySaving < 0 ? 'Costs' : 'Saves' }}
              <strong>{{ money(abs(e.monthlySaving)) }}</strong> a month
            </p>
            @if (e.returnMultiple !== null && e.monthlySaving >= 0) {
              <p class="roi__sub">{{ e.returnMultiple }}× what the AI and plan cost</p>
            }
            <table class="roi__table">
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
            <p class="roi__note">
              An estimate from your figures, excluding GST. WhatsApp and telephone charges where
              they apply are not included. Try it on your own calls in a pilot: the AI impact report
              shows the real numbers.
            </p>
          } @else {
            <p class="roi__empty">
              Enter the AI call rate to see your estimate. Our team will quote it for your call
              volume.
            </p>
          }
          <div class="roi__cta">
            <a class="roi__btn roi__btn--primary" routerLink="/signup">Create a workspace</a>
            <a class="roi__btn" routerLink="/">See plans</a>
          </div>
        </section>
      </div>
    </ar-public-frame>
  `,
  styles: `
    .roi__h {
      margin: 0 0 8px;
      font: 700 28px/1.2 var(--ar-font-sans);
      text-wrap: balance;
    }
    .roi__lede {
      margin: 0 0 24px;
      max-width: 65ch;
      color: var(--ar-ink-600);
    }
    .roi__grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 760px) {
      .roi__grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .roi__form {
      display: grid;
      gap: 10px;
    }
    .roi__result {
      padding: 20px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      display: grid;
      gap: 10px;
    }
    .roi__big {
      margin: 0;
      font-size: 20px;
    }
    .roi__big strong {
      font-size: 28px;
      color: var(--ar-ok-700, #067647);
    }
    .roi__loss strong {
      color: var(--ar-danger-600, #b42318);
    }
    .roi__sub,
    .roi__note,
    .roi__empty {
      margin: 0;
      color: var(--ar-ink-600);
      font-size: 13px;
    }
    .roi__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .roi__table th,
    .roi__table td {
      padding: 6px 0;
      border-bottom: 1px solid var(--ar-line-200);
      text-align: start;
      font-weight: 400;
    }
    .roi__table td {
      text-align: end;
      font-variant-numeric: tabular-nums;
    }
    .roi__cta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .roi__btn {
      display: inline-flex;
      align-items: center;
      height: 36px;
      padding: 0 16px;
      border-radius: var(--ar-radius-control);
      border: 1px solid var(--ar-line-300);
      color: var(--ar-ink-900);
      text-decoration: none;
      font-weight: 600;
    }
    .roi__btn--primary {
      background: var(--ar-blue-500);
      border-color: var(--ar-blue-500);
      color: #fff;
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
