import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArTopbar } from '../../layout/topbar';

export interface Release {
  /** yyyy-MM-dd */
  date: string;
  title: string;
  items: { text: string; route?: string }[];
}

/** Newest first. Add a release at the top when it ships; say what a customer can now do, not how it was built. */
export const RELEASES: Release[] = [
  {
    date: '2026-11-16',
    title: 'Company sign-in, conversation status and smaller conveniences',
    items: [
      {
        text: 'Sign in with your company account (single sign-on) once your administrator has set it up.',
      },
      {
        text: 'Give each conversation a status and priority, and filter the inbox by them.',
        route: '/inbox',
      },
      {
        text: 'Email a contact straight from the app, and see the history of your contact exports.',
      },
      {
        text: 'The notification bell updates by itself, without reloading the page.',
        route: '/notifications',
      },
      {
        text: 'Add contacts you already have to an AI call batch.',
        route: '/calls/ai-batches',
      },
      { text: 'Bank guarantees can be edited after they are recorded.' },
    ],
  },
  {
    date: '2026-11-14',
    title: 'GST e-invoices, e-way bills and input credit',
    items: [
      {
        text: 'Raise the e-invoice (IRN and QR code) and e-way bill for an invoice from the app, through your GST portal connection.',
        route: '/finance/gst-compliance',
      },
      {
        text: 'GSTR-3B: import your GSTR-2B, match it to supplier bills and see the input credit you can claim.',
        route: '/finance/gst-compliance',
      },
      { text: 'Clearer menu icons, and meeting times shown on the meetings list.', route: '/meetings' },
    ],
  },
  {
    date: '2026-11-10',
    title: 'Your own pick lists, and only your real data',
    items: [
      {
        text: 'Pick lists: choose the options your drop-downs offer, such as industries, units and GST rates.',
        route: '/settings/pick-lists',
      },
      { text: 'Sample and demo figures are gone: every screen shows your own records.' },
      { text: 'When your session runs out you are taken to sign in, instead of a page that stops working.' },
    ],
  },
  {
    date: '2026-11-09',
    title: 'Milestone billing, retention and favourites',
    items: [
      {
        text: 'Bill a project in milestones, with advance and retention, and see what is due.',
        route: '/billing/due',
      },
      {
        text: 'Record acceptance tests and customer sign-off, and release retention against a bank guarantee, with daily reminders.',
        route: '/billing/reports',
      },
      { text: '★ Favourites: pin the pages you use most to the top of the menu.' },
      {
        text: 'Import large contact lists (20,000 and more) in the background, with a progress bar.',
        route: '/contacts',
      },
    ],
  },
  {
    date: '2026-11-08',
    title: 'Projects, OEM special prices, fault codes and the obsolescence radar',
    items: [
      {
        text: 'Projects: follow a plant or line from first news to the order, with competitor brands, key dates and one bid per project in the forecast.',
        route: '/projects',
      },
      {
        text: 'OEM deal registrations and special prices, used on quotations, with claims to recover the price support.',
        route: '/oem/spa',
      },
      {
        text: 'Fault-code library and machine QR stickers: a customer scans the machine and the breakdown ticket arrives with it already identified.',
        route: '/documents/fault-codes',
      },
      { text: 'Breakdown tickets escalate on their own when nobody acts on them.', route: '/helpdesk' },
      {
        text: 'Obsolescence radar: see which installed parts are being phased out, and tell the customers who have them by WhatsApp or email.',
        route: '/obsolescence',
      },
    ],
  },
  {
    date: '2026-11-07',
    title: 'Quote from a file',
    items: [
      {
        text: 'Quote from a BOQ or enquiry file: lines are matched to your parts, including other brands’ part numbers and technical ratings.',
        route: '/quotations/import',
      },
      {
        text: 'Cross-references: map other brands’ part numbers to yours; corrections made in review are remembered.',
        route: '/quotations/cross-references',
      },
      { text: 'Every issued quotation is kept as a revision, and any two revisions can be compared.', route: '/quotations' },
    ],
  },
  {
    date: '2026-11-04',
    title: 'Customer 360, Vendor 360 and full-page sales forms',
    items: [
      {
        text: 'Customer 360: one page for an account and its contacts, orders, invoices and activity.',
        route: '/contacts/360',
      },
      {
        text: 'Vendor 360: one supplier’s orders, receipts, bills, quality and MSME payment dues.',
        route: '/purchasing/vendor-360',
      },
      {
        text: 'New pages for sales orders, delivery challans, invoices, purchase orders, goods receipts and supplier bills.',
        route: '/sales/challans',
      },
      { text: 'Accounts hold GST numbers and several shipping addresses.' },
      { text: 'A grouped menu with breadcrumbs, so you always know where you are.' },
    ],
  },
  {
    date: '2026-10-31',
    title: 'Playbooks, a website call button and an impact report',
    items: [
      {
        text: 'AI impact report: calls, goals met, meetings, leads, AI cost and the staff time saved, as PDF or CSV.',
        route: '/calls/ai-impact',
      },
      {
        text: 'Playbooks: tested agents for lead qualification, support, booking, reminders and collections, ready to apply in the agent builder.',
      },
      {
        text: 'Website call button: visitors talk to your AI agent from your own website.',
        route: '/calls/web-widget',
      },
      {
        text: 'Google Calendar: agents that book in your name skip the times you are busy in Google.',
        route: '/settings/profile',
      },
    ],
  },
  {
    date: '2026-10-29',
    title: 'Agents that use your other systems, and compliance on every AI call',
    items: [
      {
        text: 'Freshdesk, Zendesk and Shopify: agents look up and raise tickets, and tell callers about their store orders.',
        route: '/settings/integrations',
      },
      {
        text: 'Balances, orders, service contracts and payment links from your accounts system, told only to the caller about their own account.',
      },
      {
        text: 'Custom functions: let an agent call your own system over HTTPS, with changes confirmed by the caller first.',
        route: '/calls/ai-agents',
      },
      {
        text: 'Every AI call says it is recorded, honours "don’t call me again" straight away, and masks card, Aadhaar and PAN numbers in transcripts.',
        route: '/compliance',
      },
    ],
  },
  {
    date: '2026-10-28',
    title: 'Phone lines, SIP, voices and cost per call',
    items: [
      {
        text: 'AI agents answer and place calls on your Exotel phone line and your own SIP trunk, and leave a voicemail when nobody answers.',
      },
      { text: 'Several numbers per phone line; platform administrators can rent new ones.' },
      {
        text: 'Ten voices, a lower-cost model choice, a speech engine with Indian-language providers, and a switch to the other engine if one fails.',
      },
      {
        text: 'Speech tuning: patience, interruptions, speaking speed, noise reduction, words to recognise and pronunciations.',
      },
      {
        text: 'Each AI call shows how quickly the agent replied and what the call cost.',
        route: '/calls',
      },
    ],
  },
  {
    date: '2026-10-27',
    title: 'AI agents that act, call out and hand over',
    items: [
      {
        text: 'Agents book meetings, save CRM details, raise tickets and send WhatsApp follow-ups, each read back and confirmed by the caller.',
      },
      {
        text: 'AI call batches: your agent calls a list of people, within calling hours, retrying those who don’t pick up.',
        route: '/calls/ai-batches',
      },
      {
        text: 'After every call: a summary, sentiment, whether the goal was met, and the fields you ask for.',
      },
      {
        text: 'Test calls from the browser, version history, publishing, templates, flow agents and shared agents across numbers.',
        route: '/calls/ai-agents',
      },
      {
        text: 'Agents hand a call to a person when needed, and automations can start or react to AI calls.',
        route: '/automations',
      },
    ],
  },
];

/** What's new: the features that have shipped, for the people using them. */
@Component({
  selector: 'ar-whats-new',
  imports: [RouterLink, ArTopbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="What's new" help="The latest features, newest first." />
    <main class="wn">
      @for (r of releases; track r.date) {
        <section class="wn__release" [attr.aria-labelledby]="'wn-' + r.date">
          <p class="wn__date">{{ label(r.date) }}</p>
          <h2 [id]="'wn-' + r.date">{{ r.title }}</h2>
          <ul>
            @for (item of r.items; track item.text) {
              <li>
                {{ item.text }}
                @if (item.route) {
                  <a [routerLink]="item.route">Open</a>
                }
              </li>
            }
          </ul>
        </section>
      }
    </main>
  `,
  styles: `
    /* The shell is one screen tall; this page scrolls inside it. */
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
    }
    .wn {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      box-sizing: border-box;
      width: 100%;
      padding: 16px 16px 32px;
      display: grid;
      align-content: start;
      gap: 20px;
    }
    .wn__release {
      min-width: 0;
      overflow-wrap: anywhere;
      padding: 16px 18px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .wn__date {
      margin: 0;
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    h2 {
      margin: 4px 0 10px;
      font: 600 16px var(--ar-font-sans);
    }
    ul {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 6px;
    }
    li {
      line-height: 1.5;
    }
    li a {
      margin-left: 6px;
      font-size: 13px;
      white-space: nowrap;
    }
    @media (max-width: 600px) {
      .wn {
        gap: 14px;
        padding: 12px 12px 24px;
      }
      .wn__release {
        padding: 12px 14px;
      }
      h2 {
        font-size: 15px;
      }
      li {
        font-size: 13.5px;
      }
    }
  `,
})
export class ArWhatsNew {
  protected readonly releases = RELEASES;

  protected label(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
