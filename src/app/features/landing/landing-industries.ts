import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ArIcon, IconName } from '../../ui';

interface Industry {
  readonly icon: IconName;
  readonly title: string;
  readonly text: string;
  readonly uses: readonly string[];
}

/** "Built for" — who MNI Assist is for, in their own terms. Every use listed is a
 *  feature the product has today. */
@Component({
  selector: 'ar-landing-industries',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid">
      @for (i of industries; track i.title) {
        <article class="card">
          <span class="card__icon"><ar-icon [name]="i.icon" [size]="20" /></span>
          <h3>{{ i.title }}</h3>
          <p>{{ i.text }}</p>
          <ul>
            @for (u of i.uses; track u) {
              <li><ar-icon name="check" [size]="13" />{{ u }}</li>
            }
          </ul>
        </article>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      margin-top: 40px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
    }
    .card {
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
        transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1),
        border-color 300ms ease,
        box-shadow 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
      animation: cardFloat 8s ease-in-out infinite alternate;
      will-change: transform, box-shadow, border-color;
      cursor: pointer;
    }
    .card:hover {
      animation-play-state: paused;
      transform: translateY(-8px) scale(1.012);
      border-color: #3b82f6;
      box-shadow:
        0 0 0 1px #3b82f6,
        0 24px 48px -12px rgba(37, 99, 235, 0.24),
        0 12px 28px -6px rgba(15, 23, 42, 0.08);
    }
    .card:hover .card__icon {
      transform: translateY(-3px) scale(1.1);
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-color: #3b82f6;
      box-shadow: 0 4px 14px -2px rgba(37, 99, 235, 0.35);
    }
    .card:hover h3 {
      color: #1d4ed8;
    }
    .card:hover li ar-icon {
      transform: scale(1.15);
    }
    .card:nth-child(1) { animation-delay: 0s; }
    .card:nth-child(2) { animation-delay: 1.8s; }
    .card:nth-child(3) { animation-delay: 3.6s; }
    .card:nth-child(4) { animation-delay: 5.4s; }
    @keyframes cardFloat {
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
    .card__icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--ar-blue-100), #fff);
      border: 1px solid var(--ar-blue-200);
      color: var(--ar-blue-600);
      transition:
        transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1),
        background 300ms ease,
        border-color 300ms ease,
        box-shadow 300ms ease;
    }
    h3 {
      margin: 4px 0 0;
      font: 650 16px var(--ar-font-sans);
      color: var(--ar-ink-900);
      transition: color 260ms ease;
    }
    p {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.5;
      color: var(--ar-ink-500);
    }
    ul {
      display: grid;
      gap: 7px;
      margin: 6px 0 0;
      padding: 12px 0 0;
      border-top: 1px solid rgba(15, 23, 42, 0.06);
      list-style: none;
      font-size: 13px;
      line-height: 1.4;
      color: var(--ar-ink-700);
    }
    li {
      display: flex;
      gap: 8px;
    }
    li ar-icon {
      flex: none;
      margin-top: 2px;
      color: var(--ar-green-600);
      transition: transform 260ms ease;
    }
    @media (max-width: 1020px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 600px) {
      .grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .card,
      .card:hover {
        animation: none;
        transition: none;
        transform: none;
      }
    }
  `,
})
export class ArLandingIndustries {
  protected readonly industries: readonly Industry[] = [
    {
      icon: 'machine',
      title: 'Machinery & equipment makers',
      text: 'Sell the machine once, then keep the customer for its whole life.',
      uses: [
        'Installed base with serial numbers and AMC dates',
        'Spares-due and AMC renewal reminders',
        'Quotations with e-signature',
      ],
    },
    {
      icon: 'tower',
      title: 'OEMs with dealer networks',
      text: 'Route every enquiry to the dealer who covers the customer.',
      uses: [
        'Dealer territories and lead routing',
        'See each dealer’s stage, quotes and activity',
        'Take back or re-route stalled leads',
      ],
    },
    {
      icon: 'quotation',
      title: 'Distributors & dealers',
      text: 'Answer faster than the next supplier and get paid sooner.',
      uses: [
        'Region and tier price lists',
        'Customer spares re-order portal',
        'Payment links and overdue reminders',
      ],
    },
    {
      icon: 'help',
      title: 'Service & AMC teams',
      text: 'Run service requests from first message to sign-off.',
      uses: [
        'Helpdesk with response-time targets',
        'Offline app for field engineers',
        'Public ticket portal for customers',
      ],
    },
  ];
}
