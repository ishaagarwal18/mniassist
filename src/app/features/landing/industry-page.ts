import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ArPublicFrame } from './public-frame';

export interface IndustryPage {
  slug: string;
  name: string;
  headline: string;
  intro: string;
  problems: string[];
  /** What the product does for them today, each a feature that exists. */
  uses: { title: string; text: string }[];
  /** The voice agent playbooks that fit. */
  playbooks: string[];
  planFit: string;
  pitch: string;
}

/**
 * The three segments the pilot programme targets, in their own terms. Every use listed is a feature the product has today
 * (docs/pilot-program.md, plus the AI voice agents). AI voice agents are in Pro and above.
 */
export const INDUSTRY_PAGES: IndustryPage[] = [
  {
    slug: 'system-integrators',
    name: 'System integrators',
    headline: 'Quote faster, follow up every enquiry, and never miss an AMC renewal.',
    intro:
      'You quote, install and service equipment for other businesses: pumps, panels, automation retrofits. MNI Assist keeps every enquiry, quotation and installed unit in one place, and its AI voice agents take the calls your engineers shouldn’t have to.',
    problems: [
      'Enquiries arrive on WhatsApp, calls and email, and some never get a quote.',
      'Quotations go out, then nobody follows up.',
      'Renewals depend on someone remembering which customer’s AMC ends this month.',
    ],
    uses: [
      {
        title: 'Enquiries to quotations',
        text: 'A lead comes in, gets quoted as a GST-compliant quotation, and win or loss is tracked.',
      },
      {
        title: 'Installed base',
        text: 'Every unit you have installed, with warranty and AMC dates, so renewals are a list, not a memory.',
      },
      {
        title: 'AI agent for enquiries',
        text: 'Answers calls on WhatsApp or your phone line, asks what is needed, saves it to the CRM and books a call with your team.',
      },
      {
        title: 'AI renewal calls',
        text: 'Calls customers whose AMC is ending, tells them which contract and when, and books the renewal or visit.',
      },
    ],
    playbooks: ['Lead qualification', 'Service and renewal reminders', 'Appointment booking'],
    planFit:
      'Pro (₹9,999 a month, excluding GST): the enquiry pipeline, quotations and AI voice agents are in Pro and above.',
    pitch:
      'Every quotation you send has a follow-up behind it, and every AMC renewal gets a call on time.',
  },
  {
    slug: 'oems',
    name: 'Machine OEMs',
    headline: 'Keep the customer for the machine’s whole life.',
    intro:
      'You build equipment, sell it directly and through dealers, and carry a long tail of AMC and calibration work on units in the field. MNI Assist runs those reminders, routes service requests and lets an AI agent answer the first call.',
    problems: [
      'AMC and calibration dates live in spreadsheets.',
      'Service requests come in without the model, serial or problem written down.',
      'Customers wait on hold for answers that are already in the manual.',
    ],
    uses: [
      {
        title: 'AMC and calibration campaigns',
        text: 'Reminders to customers whose AMC or calibration falls due, ready in a new workspace.',
      },
      {
        title: 'Document library',
        text: 'Manuals, calibration certificates and compliance papers, sent when a technician or customer asks.',
      },
      {
        title: 'AI service desk',
        text: 'Takes the problem, model and urgency, solves it from your knowledge base where it can, and raises a ticket or hands the call to a person.',
      },
      { title: 'Dealer routing', text: 'Enquiries go to the dealer who covers the customer.' },
    ],
    playbooks: ['Support and service desk', 'Service and renewal reminders', 'Lead qualification'],
    planFit:
      'Pro (₹9,999 a month, excluding GST) for AI voice agents; a large service team may want Enterprise.',
    pitch:
      'Your AMC renewal list is a working campaign on day one, and the first service call is answered at any hour.',
  },
  {
    slug: 'distributors',
    name: 'Distributors and dealers',
    headline: 'Answer faster than the next supplier, and get paid sooner.',
    intro:
      'You carry catalogues from one or more makers and sell to dealers and retailers. MNI Assist puts your catalogue on WhatsApp, sends price lists to the right region, and lets an AI agent chase overdue payments politely.',
    problems: [
      'Dealers ask for prices and stock, and wait for a reply.',
      'A price list goes to everyone instead of the region it’s for.',
      'Overdue invoices need calls nobody has time to make.',
    ],
    uses: [
      {
        title: 'WhatsApp catalogue',
        text: 'Dealers browse and order from your catalogue inside a chat.',
      },
      {
        title: 'Regional campaigns',
        text: 'Send this month’s price list to just the West region dealers, and see who replied or ordered.',
      },
      {
        title: 'AI collections calls',
        text: 'Tells a customer what is overdue from your accounts system (Tally, Zoho Books or SAP Business One), agrees a payment date and sends a payment link on WhatsApp.',
      },
      {
        title: 'Trade-show attribution',
        text: 'Know which exhibition’s leads became dealers who ordered.',
      },
    ],
    playbooks: ['Payment collections', 'Lead qualification'],
    planFit:
      'Growth (₹4,999 a month, excluding GST) covers the catalogue and campaigns; AI voice agents are in Pro (₹9,999) and above.',
    pitch:
      'Price lists reach the right dealers, and overdue payments get a call before they get old.',
  },
];

/** A public industry page at /industries/:segment. An unknown segment shows the list of pages. */
@Component({
  selector: 'ar-industry-page',
  imports: [RouterLink, ArPublicFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-public-frame>
      @if (page(); as p) {
        <p class="ip__eyebrow">{{ p.name }}</p>
        <h1 class="ip__h">{{ p.headline }}</h1>
        <p class="ip__lede">{{ p.intro }}</p>
        <section class="ip__block" aria-labelledby="ip-problems">
          <h2 id="ip-problems">Sound familiar?</h2>
          <ul>
            @for (problem of p.problems; track problem) {
              <li>{{ problem }}</li>
            }
          </ul>
        </section>
        <section aria-labelledby="ip-uses">
          <h2 id="ip-uses">What MNI Assist does for you</h2>
          <div class="ip__cards">
            @for (u of p.uses; track u.title) {
              <article class="ip__card">
                <h3>{{ u.title }}</h3>
                <p>{{ u.text }}</p>
              </article>
            }
          </div>
        </section>
        <section class="ip__block" aria-labelledby="ip-playbooks">
          <h2 id="ip-playbooks">Ready AI agents for you</h2>
          <p>Tested playbooks you can start from: {{ p.playbooks.join(', ') }}.</p>
          <p class="ip__fit">{{ p.planFit }}</p>
        </section>
        <p class="ip__pitch">{{ p.pitch }}</p>
        <div class="ip__cta">
          <a class="ip__btn ip__btn--primary" routerLink="/signup">Create a workspace</a>
          <a class="ip__btn" routerLink="/roi">Work out your saving</a>
        </div>
      } @else {
        <h1 class="ip__h">Industries</h1>
        <ul>
          @for (p of pages; track p.slug) {
            <li>
              <a [routerLink]="['/industries', p.slug]">{{ p.name }}</a>
            </li>
          }
        </ul>
      }
    </ar-public-frame>
  `,
  styles: `
    .ip__eyebrow {
      margin: 0 0 6px;
      color: var(--ar-blue-600);
      font: 600 12px var(--ar-font-sans);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .ip__h {
      margin: 0 0 12px;
      font: 700 30px/1.2 var(--ar-font-sans);
      text-wrap: balance;
      max-width: 30ch;
    }
    .ip__lede {
      margin: 0 0 28px;
      max-width: 65ch;
      color: var(--ar-ink-600);
      font-size: 16px;
    }
    h2 {
      margin: 0 0 10px;
      font: 600 18px var(--ar-font-sans);
    }
    .ip__block {
      margin-bottom: 28px;
      max-width: 70ch;
    }
    .ip__cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }
    .ip__card {
      padding: 18px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .ip__card h3 {
      margin: 0 0 6px;
      font: 600 15px var(--ar-font-sans);
    }
    .ip__card p {
      margin: 0;
      color: var(--ar-ink-600);
      font-size: 14px;
    }
    .ip__fit {
      color: var(--ar-ink-600);
      font-size: 14px;
    }
    .ip__pitch {
      margin: 0 0 16px;
      font: 600 17px var(--ar-font-sans);
      max-width: 60ch;
    }
    .ip__cta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .ip__btn {
      display: inline-flex;
      align-items: center;
      height: 38px;
      padding: 0 16px;
      border-radius: var(--ar-radius-control);
      border: 1px solid var(--ar-line-300);
      color: var(--ar-ink-900);
      text-decoration: none;
      font-weight: 600;
    }
    .ip__btn--primary {
      background: var(--ar-blue-500);
      border-color: var(--ar-blue-500);
      color: #fff;
    }
  `,
})
export class ArIndustryPage {
  protected readonly pages = INDUSTRY_PAGES;
  private readonly segment = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('segment'))),
  );
  protected readonly page = computed(
    () => INDUSTRY_PAGES.find((p) => p.slug === this.segment()) ?? null,
  );
}
