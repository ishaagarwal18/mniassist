import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArIcon } from '../../ui';
import { Cycle, LANDING_PLANS, limitLines, planKey, priceLabel } from './landing-plans';

/** The landing page's plan cards and billing-cycle toggle. Its own component so
 *  the page's styles stay inside the per-component style budget. */
@Component({
  selector: 'ar-landing-plans',
  imports: [RouterLink, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toggle" role="group" aria-label="Billing cycle">
      <button
        type="button"
        [class.on]="cycle() === 'monthly'"
        [attr.aria-pressed]="cycle() === 'monthly'"
        (click)="cycle.set('monthly')"
      >
        Monthly
      </button>
      <button
        type="button"
        [class.on]="cycle() === 'annual'"
        [attr.aria-pressed]="cycle() === 'annual'"
        (click)="cycle.set('annual')"
      >
        Annual <em>2 months free</em>
      </button>
    </div>

    <div class="plans">
      @for (p of plans; track p.name; let i = $index) {
        <article class="plan" [class.plan--featured]="p.featured">
          @if (p.featured) {
            <span class="plan__tag">Recommended</span>
          }
          <h3>{{ p.name }}</h3>
          <p class="plan__blurb">{{ p.blurb }}</p>
          <p class="plan__price">
            <strong>{{ priceLabel(p, cycle()) }}</strong>
            <span>/ {{ cycle() === 'annual' ? 'year' : 'month' }} + GST</span>
          </p>
          <ul class="plan__limits">
            @for (l of limitLines(p); track l) {
              <li>{{ l }}</li>
            }
          </ul>
          <p class="plan__adds">
            {{ i === 0 ? 'Includes' : 'Everything in ' + plans[i - 1].name + ', plus' }}
          </p>
          <ul class="plan__features">
            @for (f of p.adds; track f) {
              <li><ar-icon name="check" [size]="13" />{{ f }}</li>
            }
          </ul>
          <a
            class="btn"
            [class.btn--primary]="p.featured"
            [routerLink]="signedIn() ? '/billing' : '/signup'"
            [queryParams]="{ plan: planKey(p) }"
          >
            {{ signedIn() ? 'Manage plan' : 'Get started' }}
          </a>
        </article>
      }
    </div>
    <p class="note">
      Prices exclude GST. WhatsApp conversation charges set by Meta are paid separately from a
      prepaid wallet, so there is no surprise bill.
    </p>
  `,
  styles: `
    :host {
      display: block;
      margin-top: 24px;
    }
    h3,
    p,
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .toggle {
      display: inline-flex;
      padding: 3px;
      border: 1px solid var(--ar-line-300);
      border-radius: 999px;
      background: var(--ar-white);
    }
    .toggle button {
      border: 0;
      border-radius: 999px;
      padding: 7px 14px;
      background: none;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      cursor: pointer;
    }
    .toggle button.on {
      background: var(--ar-navy);
      color: #fff;
    }
    .toggle em {
      font-style: normal;
      color: var(--ar-green-600);
    }
    .toggle button.on em {
      color: #6fd394;
    }
    .plans {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-top: 28px;
    }
    .plan {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 22px 20px;
      background: var(--ar-white);
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: var(--ar-radius-card);
      box-shadow:
        0 20px 40px -15px rgba(15, 23, 42, 0.07),
        0 6px 18px -6px rgba(15, 23, 42, 0.04);
      transition:
        transform 300ms cubic-bezier(0.16, 1, 0.3, 1),
        box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1),
        border-color 260ms ease;
      animation: planFloat 8s ease-in-out infinite alternate;
      will-change: transform;
    }
    .plan:hover {
      animation-play-state: paused;
      transform: translateY(-4px);
      box-shadow:
        0 28px 56px -12px rgba(15, 23, 42, 0.11),
        0 12px 24px -8px rgba(15, 23, 42, 0.06);
    }
    .plan:nth-child(1) { animation-delay: 0s; }
    .plan:nth-child(2) { animation-delay: 1.6s; }
    .plan:nth-child(3) { animation-delay: 3.2s; }
    .plan:nth-child(4) { animation-delay: 4.8s; }
    @keyframes planFloat {
      0% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
      100% {
        transform: translateY(0);
      }
    }
    .plan--featured {
      border: 1.5px solid rgba(37, 99, 235, 0.65);
      box-shadow:
        0 24px 52px -12px rgba(37, 99, 235, 0.18),
        0 8px 24px -6px rgba(15, 23, 42, 0.06);
    }
    .plan__tag {
      position: absolute;
      top: -11px;
      left: 18px;
      padding: 2px 9px;
      border-radius: 999px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #fff;
      font: 600 11px var(--ar-font-sans);
    }
    h3 {
      font-size: 17px;
    }
    .plan__blurb {
      min-height: 3em;
      font-size: 13px;
      line-height: 1.5;
      color: var(--ar-ink-500);
    }
    .plan__price strong {
      font-size: 26px;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
    .plan__price span {
      margin-left: 4px;
      font-size: 12.5px;
      color: var(--ar-ink-400);
    }
    .plan__limits {
      display: grid;
      gap: 4px;
      padding: 10px 0;
      border-block: 1px solid rgba(15, 23, 42, 0.06);
      font: 500 12.5px var(--ar-font-mono);
      color: var(--ar-ink-700);
    }
    .plan__adds {
      font: 600 11.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .plan__features {
      display: grid;
      gap: 7px;
      margin-bottom: 14px;
      font-size: 13.5px;
      line-height: 1.4;
      color: var(--ar-ink-700);
    }
    .plan__features li {
      display: flex;
      gap: 8px;
    }
    .plan__features ar-icon {
      flex: none;
      margin-top: 2px;
      color: var(--ar-green-600);
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 36px;
      margin-top: auto;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      font: 600 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
      text-decoration: none;
      transition:
        transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1),
        box-shadow 260ms cubic-bezier(0.2, 0.8, 0.2, 1),
        background 240ms ease,
        border-color 240ms ease,
        color 200ms ease;
    }
    .btn:hover {
      border-color: var(--ar-ink-900);
    }
    .btn--primary {
      border-color: rgba(255, 255, 255, 0.16);
      background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
      color: #fff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    .btn--primary:hover {
      border-color: rgba(255, 255, 255, 0.2);
      background: linear-gradient(180deg, #3b82f6 0%, #1e40af 100%);
      box-shadow:
        0 6px 20px -4px rgba(37, 99, 235, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }
    .btn:focus-visible,
    .toggle button:focus-visible {
      outline: 2px solid var(--ar-blue-500);
      outline-offset: 2px;
    }
    .note {
      margin-top: 20px;
      font-size: 13px;
      color: var(--ar-ink-500);
    }
    @media (max-width: 960px) {
      .plans {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 640px) {
      .plans {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 480px) {
      .toggle {
        display: flex;
        width: 100%;
        max-width: 320px;
      }
      .toggle button {
        flex: 1;
        padding: 6px 8px;
        font-size: 11.5px;
        text-align: center;
        justify-content: center;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .plan {
        animation: none;
        transform: none;
      }
    }
  `,
})
export class ArLandingPlans {
  readonly signedIn = input(false);

  protected readonly cycle = signal<Cycle>('monthly');
  protected readonly plans = LANDING_PLANS;
  protected readonly priceLabel = priceLabel;
  protected readonly limitLines = limitLines;
  protected readonly planKey = planKey;
}
