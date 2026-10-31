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
    .wn {
      padding: 16px;
      display: grid;
      gap: 20px;
      max-width: 820px;
    }
    .wn__release {
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
    li a {
      margin-left: 6px;
      font-size: 13px;
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
