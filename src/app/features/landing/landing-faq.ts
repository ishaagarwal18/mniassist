import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Questions people ask before buying. Every answer describes how the product
 *  works today; nothing is promised that the product doesn't do. */
@Component({
  selector: 'ar-landing-faq',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="faq__head">
      <p class="faq__eyebrow">FAQ</p>
      <h2 class="faq__title">Frequently asked <span>questions</span></h2>
      <p class="faq__lede">
        Straight answers on pricing, WhatsApp numbers, invoices and data, before you buy. Nothing here
        is a promise the product doesn't keep today.
      </p>
    </header>

    <ol class="faq__list">
      @for (q of questions; track q.q; let i = $index) {
        <li class="faq__item" [class.faq__item--open]="open().has(i)">
          <h3>
            <button
              type="button"
              class="faq__q"
              [id]="'faq-q-' + i"
              [attr.aria-expanded]="open().has(i)"
              [attr.aria-controls]="'faq-a-' + i"
              (click)="toggle(i)"
            >
              <span class="faq__n">{{ (i + 1).toString().padStart(2, '0') }}</span>
              <span class="faq__qt">{{ q.q }}</span>
              <span class="faq__chev" aria-hidden="true"></span>
            </button>
          </h3>
          <div class="faq__a" role="region" [id]="'faq-a-' + i" [attr.aria-labelledby]="'faq-q-' + i">
            <div><p>{{ q.a }}</p></div>
          </div>
        </li>
      }
    </ol>

    <div class="faq__card">
      <span class="faq__card-icon" aria-hidden="true">?</span>
      <div class="faq__card-text">
        <strong>Still deciding?</strong>
        <p>Run the numbers for your business, or open a workspace and look around first.</p>
      </div>
      <div class="faq__card-links">
        <a class="faq__card-btn faq__card-btn--ghost" routerLink="/roi">ROI calculator</a>
        <a class="faq__card-btn" routerLink="/signup">Create a workspace →</a>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .faq__head {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      margin: 0 auto 44px;
      max-width: 720px;
      text-align: center;
    }
    .faq__eyebrow {
      margin: 0;
      padding: 5px 12px;
      border-radius: 999px;
      background: #ebf2ff;
      color: #1258e0;
      font: 600 12px var(--ar-font-sans);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .faq__title {
      margin: 0;
      font: 700 clamp(32px, 4.2vw, 48px) / 1.05 var(--ar-font-sans);
      letter-spacing: -0.035em;
      color: #0b1220;
    }
    .faq__title span {
      background: linear-gradient(100deg, #1769ff 0%, #0ea5a4 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .faq__lede {
      margin: 0;
      max-width: 60ch;
      font-size: 16px;
      line-height: 1.6;
      color: #475467;
    }
    .faq__card {
      max-width: 860px;
      margin-left: auto;
      margin-right: auto;
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 28px;
      padding: 20px 24px;
      border-radius: 18px;
      background: linear-gradient(160deg, #ffffff 0%, #f5f8ff 100%);
      border: 1px solid rgba(23, 105, 255, 0.14);
      box-shadow: 0 18px 40px -24px rgba(23, 105, 255, 0.35);
    }
    .faq__card-icon {
      flex: none;
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: linear-gradient(135deg, #1769ff, #0ea5a4);
      color: #fff;
      font: 700 18px var(--ar-font-sans);
    }
    .faq__card strong {
      display: block;
      font: 600 15px var(--ar-font-sans);
      color: #0b1220;
    }
    .faq__card-text {
      flex: 1;
      min-width: 0;
    }
    .faq__card p {
      margin: 2px 0 0;
      font-size: 13.5px;
      line-height: 1.55;
      color: #475467;
    }
    .faq__card-links {
      flex: none;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .faq__card-btn {
      display: inline-flex;
      align-items: center;
      height: 42px;
      padding: 0 18px;
      border-radius: 999px;
      background: #1769ff;
      color: #fff;
      font: 600 14px var(--ar-font-sans);
      text-decoration: none;
      transition: transform 200ms ease, background 200ms ease;
    }
    .faq__card-btn:hover {
      transform: translateY(-1px);
      background: #1258e0;
    }
    .faq__card-btn--ghost {
      background: #fff;
      color: #1258e0;
      border: 1px solid rgba(23, 105, 255, 0.3);
    }
    .faq__card-btn--ghost:hover {
      background: #ebf2ff;
    }
    .faq__card-btn:focus-visible {
      outline: 2px solid #1769ff;
      outline-offset: 2px;
    }

    /* One column, centred at a comfortable reading width. */
    .faq__list {
      margin: 0 auto;
      padding: 0;
      max-width: 860px;
      list-style: none;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }
    .faq__item {
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(6px);
      transition:
        border-color 240ms ease,
        box-shadow 240ms ease,
        background 240ms ease;
    }
    .faq__item:hover {
      border-color: rgba(23, 105, 255, 0.28);
    }
    .faq__item--open {
      background: #fff;
      border-color: rgba(23, 105, 255, 0.35);
      box-shadow: 0 24px 48px -28px rgba(15, 23, 42, 0.28);
    }
    h3 {
      margin: 0;
    }
    .faq__q {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 22px;
      border: 0;
      background: none;
      cursor: pointer;
      text-align: left;
      font: 600 16px/1.4 var(--ar-font-sans);
      color: #0b1220;
      border-radius: 18px;
    }
    .faq__q:focus-visible {
      outline: 2px solid #1769ff;
      outline-offset: 2px;
    }
    .faq__n {
      flex: none;
      font: 600 12px var(--ar-font-mono, ui-monospace, monospace);
      color: #98a2b3;
      transition: color 240ms ease;
    }
    .faq__item--open .faq__n {
      color: #1769ff;
    }
    .faq__qt {
      flex: 1;
    }
    .faq__chev {
      flex: none;
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f2f4f7;
      transition:
        background 240ms ease,
        transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .faq__chev::before,
    .faq__chev::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 12px;
      height: 2px;
      border-radius: 2px;
      background: #344054;
      transform: translate(-50%, -50%);
      transition: transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1), background 240ms ease;
    }
    .faq__chev::after {
      transform: translate(-50%, -50%) rotate(90deg);
    }
    .faq__item--open .faq__chev {
      background: #1769ff;
      transform: rotate(180deg);
    }
    .faq__item--open .faq__chev::before,
    .faq__item--open .faq__chev::after {
      background: #fff;
    }
    .faq__item--open .faq__chev::after {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    .faq__a {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .faq__a > div {
      overflow: hidden;
    }
    .faq__item--open .faq__a {
      grid-template-rows: 1fr;
    }
    .faq__a p {
      margin: 0;
      padding: 0 22px 22px 58px;
      max-width: 68ch;
      font-size: 15px;
      line-height: 1.7;
      color: #475467;
    }
    @media (max-width: 900px) {
      .faq__list {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      .faq__head {
        margin-bottom: 28px;
      }
      .faq__q {
        padding: 16px 16px;
        gap: 12px;
        font-size: 15px;
      }
      .faq__a p {
        padding: 0 16px 18px;
        font-size: 14.5px;
      }
      .faq__card {
        flex-direction: column;
        align-items: flex-start;
        padding: 18px;
      }
      .faq__card-links,
      .faq__card-btn {
        width: 100%;
      }
      .faq__card-btn {
        justify-content: center;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .faq__a,
      .faq__chev,
      .faq__chev::before,
      .faq__chev::after {
        transition: none;
      }
    }
  `,
})
export class ArLandingFaq {
  /** Each question opens and closes on its own; the first starts open. */
  protected readonly open = signal<ReadonlySet<number>>(new Set([0]));

  protected toggle(i: number): void {
    this.open.update((o) => {
      const next = new Set(o);
      if (!next.delete(i)) next.add(i);
      return next;
    });
  }

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
