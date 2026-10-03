import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArIcon } from '../../ui';
import { Cycle, LANDING_PLANS, limitLines, priceLabel } from './landing-plans';

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
      background: var(--ar-ink-900);
      color: #fff;
    }
    .toggle em {
      font-style: normal;
      color: var(--ar-amber-500);
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
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .plan--featured {
      border: 2px solid var(--ar-amber-600);
    }
    .plan__tag {
      position: absolute;
      top: -11px;
      left: 18px;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--ar-amber-600);
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
      border-block: 1px solid var(--ar-line-200);
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
    }
    .btn:hover {
      border-color: var(--ar-ink-900);
    }
    .btn--primary {
      border-color: transparent;
      background: var(--ar-amber-600);
      color: #fff;
    }
    .btn--primary:hover {
      border-color: transparent;
      background: var(--ar-amber-500);
    }
    .btn:focus-visible,
    .toggle button:focus-visible {
      outline: 2px solid var(--ar-teal-600);
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
  `,
})
export class ArLandingPlans {
  readonly signedIn = input(false);

  protected readonly cycle = signal<Cycle>('monthly');
  protected readonly plans = LANDING_PLANS;
  protected readonly priceLabel = priceLabel;
  protected readonly limitLines = limitLines;
}
