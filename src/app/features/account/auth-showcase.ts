import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ArIcon, IconName } from '../../ui';
import { ArBrand } from '../../layout/brand';

interface Highlight {
  readonly icon: IconName;
  readonly title: string;
  readonly text: string;
  readonly ai?: boolean;
}

/**
 * The brand panel beside the sign-in form: what AutoReach is for, in four lines
 * and one example. Navy in both themes. Hidden on narrow screens, where the form
 * alone is the better use of the space.
 */
@Component({
  selector: 'ar-auth-showcase',
  imports: [ArIcon, ArBrand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sc">
      <ar-brand onDark tagline size="lg" />

      <div class="sc__body">
        <p class="sc__eyebrow">
          <ar-icon name="sparkle" [size]="13" /> Industrial intelligence, connected
        </p>
        <h2>Every customer conversation, with the context to act on it.</h2>
        <p class="sc__lede">
          Enquiries, service requests and spares orders arrive on WhatsApp. MNI Assist puts each one
          next to the customer's machines, contracts and history, and helps your team reply.
        </p>

        <ul class="sc__list">
          @for (h of highlights; track h.title) {
            <li [class.sc__item--ai]="h.ai">
              <span class="sc__icon"><ar-icon [name]="h.icon" [size]="16" /></span>
              <span>
                <strong>{{ h.title }}</strong>
                <span class="sc__text">{{ h.text }}</span>
              </span>
            </li>
          }
        </ul>

        <figure class="sc__ai">
          <figcaption>
            <ar-icon name="sparkle" [size]="12" /> AI suggested reply · example
          </figcaption>
          <p>
            “Your VMC-850 is under AMC, so the visit is covered. I've raised ticket TK-2481 and Ravi
            will be with you tomorrow at 10 am.”
          </p>
        </figure>
      </div>

      <p class="sc__foot">For machinery makers, OEMs, dealers and service teams.</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background:
        linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px) 0 0 / 32px 32px,
        linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px) 0 0 / 32px 32px,
        var(--ar-navy);
      color: #fff;
      border-right: 1px solid var(--ar-nav-line);
    }
    .sc {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 32px;
      padding: 40px 48px;
      max-width: 560px;
      margin-left: auto;
    }
    .sc__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 18px;
    }
    .sc__eyebrow {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      font: 600 11px var(--ar-font-mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #2dd4bf;
    }
    h2 {
      margin: 0;
      font: 700 30px/1.15 var(--ar-font-sans);
      letter-spacing: -0.025em;
      text-wrap: balance;
    }
    .sc__lede {
      margin: 0;
      font-size: 14.5px;
      line-height: 1.6;
      color: #cbd5e1;
    }
    .sc__list {
      display: grid;
      gap: 14px;
      margin: 6px 0 0;
      padding: 0;
      list-style: none;
    }
    .sc__list li {
      display: flex;
      gap: 12px;
      font-size: 13.5px;
      line-height: 1.45;
    }
    .sc__icon {
      flex: none;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: rgba(59, 130, 246, 0.16);
      color: #93c5fd;
    }
    .sc__item--ai .sc__icon {
      background: rgba(45, 212, 191, 0.14);
      color: #2dd4bf;
    }
    .sc__list strong {
      display: block;
      font-weight: 600;
      color: #fff;
    }
    .sc__text {
      color: #94a3b8;
    }
    .sc__ai {
      margin: 6px 0 0;
      padding: 12px 14px;
      border: 1px solid rgba(45, 212, 191, 0.3);
      border-left: 3px solid #2dd4bf;
      border-radius: var(--ar-radius-inset);
      background: rgba(45, 212, 191, 0.07);
    }
    .sc__ai figcaption {
      display: flex;
      align-items: center;
      gap: 5px;
      font: 600 11px var(--ar-font-sans);
      color: #2dd4bf;
    }
    .sc__ai p {
      margin: 6px 0 0;
      font-size: 13px;
      line-height: 1.55;
      color: #e2e8f0;
    }
    .sc__foot {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
    }
  `,
})
export class ArAuthShowcase {
  protected readonly highlights: readonly Highlight[] = [
    {
      icon: 'inbox',
      title: 'One inbox for every channel',
      text: 'WhatsApp, SMS, email, Instagram and Messenger, shared by your team.',
    },
    {
      icon: 'sparkle',
      title: 'AI that drafts, people who decide',
      text: 'Suggested replies and conversation summaries your team checks before sending.',
      ai: true,
    },
    {
      icon: 'machine',
      title: 'Your installed base, working for you',
      text: 'AMC renewal and spares reminders go out on time, on their own.',
    },
    {
      icon: 'quotation',
      title: 'From enquiry to payment',
      text: 'Quotations with e-signature, payment links and Tally or SAP collections.',
    },
  ];
}
