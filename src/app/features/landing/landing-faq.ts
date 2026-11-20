import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Questions people ask before buying. Every answer describes how the product
 *  works today; nothing is promised that the product doesn't do. */
@Component({
  selector: 'ar-landing-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="faq">
      @for (q of questions; track q.q; let first = $first) {
        <details [open]="first">
          <summary>{{ q.q }}</summary>
          <p>{{ q.a }}</p>
        </details>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      margin-top: 32px;
    }
    .faq {
      display: grid;
      gap: 10px;
      max-width: 820px;
    }
    details {
      background: #fff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 10px;
      transition:
        border-color 260ms ease,
        box-shadow 260ms ease;
    }
    details[open] {
      border-color: rgba(37, 99, 235, 0.35);
      box-shadow:
        0 16px 36px -10px rgba(15, 23, 42, 0.07),
        0 4px 12px -4px rgba(15, 23, 42, 0.04);
    }
    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px;
      cursor: pointer;
      list-style: none;
      font: 600 15px var(--ar-font-sans);
      color: #0f172a;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary::after {
      content: '+';
      flex: none;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: grid;
      place-items: center;
      background: #ebf2ff;
      color: #1258e0;
      font: 500 16px/1 var(--ar-font-sans);
    }
    details[open] summary::after {
      content: '–';
    }
    summary:focus-visible {
      outline: 2px solid #1769ff;
      outline-offset: 2px;
      border-radius: 10px;
    }
    p {
      margin: 0;
      padding: 0 18px 18px;
      max-width: 70ch;
      font-size: 14px;
      line-height: 1.65;
      color: #475467;
    }
  `,
})
export class ArLandingFaq {
  protected readonly questions = [
    {
      q: 'How does pricing work?',
      a: 'You pay a monthly plan fee plus GST, based on the team size, WhatsApp numbers and contacts you need. WhatsApp conversation charges set by Meta are paid separately from a prepaid wallet you top up, so there is never a surprise bill. Annual billing costs ten months’ price.',
    },
    {
      q: 'Can I change my plan later?',
      a: 'Yes. Move up or down a plan from Billing at any time. Plan limits are enforced as you go, so you are told when you reach one rather than charged for it.',
    },
    {
      q: 'Do I need my own WhatsApp Business number?',
      a: 'Yes. You connect a number through Meta’s guided sign-up inside the app. If your number is on the WhatsApp Business app today, you can move it across; its chat history in the app does not carry over.',
    },
    {
      q: 'What do I get invoices for?',
      a: 'GST invoices for your plan and usage are generated in the app under Invoices, and you can check Meta’s charges against them.',
    },
    {
      q: 'Does it work with Tally or SAP?',
      a: 'Yes. Connect Tally or SAP Business One to read invoices for collections reminders and to keep stock in step. CRM connectors and a REST API are available on Pro and above.',
    },
    {
      q: 'How is customer data protected?',
      a: 'Every contact carries its consent evidence, opt-outs are honoured at send time, access is role-based, and data requests, retention and breaches are handled in a DPDP Act, 2023 readiness workspace.',
    },
  ];
}
