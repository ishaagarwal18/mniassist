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
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 22px 20px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      transition:
        transform var(--ar-ease),
        border-color var(--ar-ease),
        box-shadow var(--ar-ease);
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: var(--ar-blue-200);
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
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
    }
    h3 {
      margin: 4px 0 0;
      font: 650 16px var(--ar-font-sans);
      color: var(--ar-ink-900);
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
      border-top: 1px solid var(--ar-line-200);
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
