import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ArIcon, IconName } from '../../ui';
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

/** A public industry page at /industries/:segment with enhanced graphics and color. */
@Component({
  selector: 'ar-industry-page',
  imports: [RouterLink, ArIcon, ArPublicFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-public-frame>
      @if (page(); as p) {
        <article class="ip-container">
          <!-- Hero Section with Ambient Glow & Badges -->
          <header class="ip-hero">
            <div class="ip-hero__glow" aria-hidden="true"></div>
            <div class="ip-hero__badge">
              <ar-icon name="sparkle" class="ip-hero__badge-icon" />
              <span>{{ p.name }}</span>
            </div>
            <h1 class="ip-hero__title">{{ p.headline }}</h1>
            <p class="ip-hero__intro">{{ p.intro }}</p>
            <div class="ip-hero__actions">
              <a class="ip-btn ip-btn--primary" routerLink="/signup">
                <span>Create a workspace</span>
                <span class="ip-btn__arrow" aria-hidden="true">→</span>
              </a>
              <a class="ip-btn ip-btn--secondary" routerLink="/roi">Work out your saving</a>
            </div>
          </header>

          <!-- Problems Section with Distinct Pastel Cards -->
          <section class="ip-block" aria-labelledby="ip-problems">
            <div class="ip-block__header">
              <div class="ip-block__bar"></div>
              <h2 id="ip-problems" class="ip-block__title">Sound familiar?</h2>
            </div>
            <div class="ip-problems-grid">
              @for (problem of p.problems; track problem; let i = $index) {
                <div class="ip-problem-card" [class]="'ip-problem-card--' + (i % 3)">
                  <div class="ip-problem-card__icon-box">
                    <ar-icon [name]="getProblemIcon(problem, i)" class="ip-problem-card__icon" />
                  </div>
                  <p class="ip-problem-card__text">{{ problem }}</p>
                </div>
              }
            </div>
          </section>

          <!-- Uses Section with Polished Graphic Cards -->
          <section class="ip-block" aria-labelledby="ip-uses">
            <div class="ip-block__header">
              <div class="ip-block__bar"></div>
              <h2 id="ip-uses" class="ip-block__title">What MNI Assist does for you</h2>
            </div>
            <div class="ip-uses-grid">
              @for (u of p.uses; track u.title) {
                <article class="ip-use-card">
                  <div class="ip-use-card__icon-box">
                    <ar-icon [name]="getUseIcon(u.title)" class="ip-use-card__icon" />
                  </div>
                  <h3 class="ip-use-card__title">{{ u.title }}</h3>
                  <p class="ip-use-card__text">{{ u.text }}</p>
                </article>
              }
            </div>
          </section>

          <!-- AI Agents & Plan Section -->
          <section class="ip-block" aria-labelledby="ip-playbooks">
            <div class="ip-ai-card">
              <div class="ip-ai-card__glow" aria-hidden="true"></div>
              <div class="ip-ai-card__content">
                <div class="ip-block__header">
                  <div class="ip-block__bar ip-block__bar--teal"></div>
                  <h2 id="ip-playbooks" class="ip-block__title">Ready AI agents for you</h2>
                </div>
                <p class="ip-ai-card__subtitle">Tested playbooks you can start from:</p>
                <div class="ip-playbooks-chips">
                  @for (pb of p.playbooks; track pb) {
                    <span class="ip-playbook-chip">
                      <ar-icon name="sparkle" class="ip-chip-icon" />
                      <span>{{ pb }}</span>
                    </span>
                  }
                </div>
                <div class="ip-plan-box">
                  <div class="ip-plan-box__icon">
                    <ar-icon name="check" />
                  </div>
                  <p class="ip-plan-box__text">{{ p.planFit }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Pitch & Final Call to Action -->
          <section class="ip-pitch-banner">
            <div class="ip-pitch-banner__glow" aria-hidden="true"></div>
            <div class="ip-pitch-banner__inner">
              <p class="ip-pitch-banner__quote">{{ p.pitch }}</p>
              <div class="ip-pitch-banner__cta">
                <a class="ip-btn ip-btn--primary" routerLink="/signup">
                  <span>Create a workspace</span>
                  <span class="ip-btn__arrow" aria-hidden="true">→</span>
                </a>
                <a class="ip-btn ip-btn--ghost-white" routerLink="/roi">Work out your saving</a>
              </div>
            </div>
          </section>
        </article>
      } @else {
        <div class="ip-list">
          <h1 class="ip-hero__title">Industries</h1>
          <ul class="ip-list__items">
            @for (p of pages; track p.slug) {
              <li>
                <a [routerLink]="['/industries', p.slug]">{{ p.name }}</a>
              </li>
            }
          </ul>
        </div>
      }
    </ar-public-frame>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      color: #0F172A;
      font-family: var(--ar-font-sans, system-ui, -apple-system, sans-serif);
      -webkit-font-smoothing: antialiased;
    }

    .ip-container {
      max-width: 960px;
      margin: 0 auto;
      padding: 16px 0 48px;
    }

    /* Hero */
    .ip-hero {
      position: relative;
      padding: 32px 0 36px;
      overflow: hidden;
    }

    .ip-hero__glow {
      position: absolute;
      top: -40px;
      left: 10%;
      width: 460px;
      height: 280px;
      background: radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(13, 148, 136, 0.08) 50%, transparent 70%);
      filter: blur(50px);
      pointer-events: none;
      z-index: 0;
    }

    .ip-hero__badge {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      border-radius: 9999px;
      background: var(--ar-blue-100);
      border: 1px solid rgba(37, 99, 235, 0.25);
      color: #2563EB;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }

    .ip-hero__badge-icon {
      color: #2563EB;
      width: 13px;
      height: 13px;
    }

    .ip-hero__title {
      position: relative;
      z-index: 1;
      margin: 0 0 16px;
      font-size: 38px;
      line-height: 1.2;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #0F172A;
      max-width: 28ch;
      text-wrap: balance;
    }

    .ip-hero__intro {
      position: relative;
      z-index: 1;
      margin: 0 0 28px;
      max-width: 68ch;
      color: #475569;
      font-size: 17px;
      line-height: 1.6;
    }

    .ip-hero__actions {
      position: relative;
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    /* Section blocks */
    .ip-block {
      margin-top: 48px;
    }

    .ip-block__header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .ip-block__bar {
      width: 4px;
      height: 22px;
      border-radius: 2px;
      background: linear-gradient(180deg, #2563EB 0%, #0D9488 100%);
    }

    .ip-block__bar--teal {
      background: linear-gradient(180deg, #0D9488 0%, #2DD4BF 100%);
    }

    .ip-block__title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.01em;
    }

    /* Problem Cards */
    .ip-problems-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }

    .ip-problem-card {
      padding: 22px 20px;
      border-radius: 12px;
      border: 1px solid transparent;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      transition: all 220ms ease;
    }

    .ip-problem-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 24px -6px rgba(15, 23, 42, 0.08);
    }

    .ip-problem-card--0 {
      background: #FFF1F2;
      border-color: rgba(244, 63, 94, 0.18);
    }
    .ip-problem-card--0 .ip-problem-card__icon-box {
      background: #FFE4E6;
      color: #E11D48;
    }

    .ip-problem-card--1 {
      background: #FFFBEB;
      border-color: rgba(245, 158, 11, 0.22);
    }
    .ip-problem-card--1 .ip-problem-card__icon-box {
      background: #FEF3C7;
      color: #D97706;
    }

    .ip-problem-card--2 {
      background: var(--ar-blue-100);
      border-color: rgba(37, 99, 235, 0.2);
    }
    .ip-problem-card--2 .ip-problem-card__icon-box {
      background: var(--ar-blue-100);
      color: #2563EB;
    }

    .ip-problem-card__icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ip-problem-card__icon {
      width: 18px;
      height: 18px;
    }

    .ip-problem-card__text {
      margin: 0;
      font-size: 14px;
      line-height: 1.55;
      color: #334155;
      font-weight: 500;
    }

    /* Uses Grid */
    .ip-uses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: 18px;
    }

    .ip-use-card {
      background: #FFFFFF;
      border: 1px solid var(--ar-line-200);
      border-radius: 14px;
      padding: 24px 22px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.04);
      transition: all 240ms ease;
      position: relative;
    }

    .ip-use-card:hover {
      transform: translateY(-4px);
      border-color: var(--ar-blue-200);
      box-shadow: 0 16px 32px -8px rgba(37, 99, 235, 0.12);
    }

    .ip-use-card__icon-box {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: var(--ar-blue-100);
      color: #2563EB;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      transition: background 200ms ease;
    }

    .ip-use-card:hover .ip-use-card__icon-box {
      background: var(--ar-blue-100);
    }

    .ip-use-card__icon {
      width: 20px;
      height: 20px;
    }

    .ip-use-card__title {
      margin: 0 0 8px;
      font-size: 17px;
      font-weight: 700;
      color: #0F172A;
    }

    .ip-use-card__text {
      margin: 0;
      font-size: 14px;
      line-height: 1.55;
      color: #475569;
    }

    /* AI Card */
    .ip-ai-card {
      position: relative;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-radius: 16px;
      padding: 28px 24px;
      overflow: hidden;
    }

    .ip-ai-card__glow {
      position: absolute;
      top: -60px;
      right: -40px;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(13, 148, 136, 0.12) 0%, transparent 70%);
      pointer-events: none;
    }

    .ip-ai-card__content {
      position: relative;
      z-index: 1;
    }

    .ip-ai-card__subtitle {
      margin: 0 0 14px;
      font-size: 14px;
      font-weight: 600;
      color: #475569;
    }

    .ip-playbooks-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
    }

    .ip-playbook-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: #FFFFFF;
      border: 1px solid var(--ar-line-300);
      font-size: 13px;
      font-weight: 600;
      color: #1E293B;
      box-shadow: 0 2px 4px rgba(15, 23, 42, 0.03);
    }

    .ip-chip-icon {
      color: #0D9488;
      width: 14px;
      height: 14px;
    }

    .ip-plan-box {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--ar-blue-100);
      border: 1px solid rgba(37, 99, 235, 0.2);
      border-radius: 10px;
      padding: 14px 16px;
    }

    .ip-plan-box__icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #2563EB;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ip-plan-box__icon ar-icon {
      width: 13px;
      height: 13px;
    }

    .ip-plan-box__text {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #1E3A8A;
      line-height: 1.5;
    }

    /* Pitch Banner */
    .ip-pitch-banner {
      position: relative;
      margin-top: 48px;
      background: linear-gradient(140deg, #0B1B32 0%, #172554 50%, #1E3A8A 100%);
      border-radius: 18px;
      padding: 36px 32px;
      color: #FFFFFF;
      overflow: hidden;
      box-shadow: 0 16px 36px -8px rgba(11, 27, 50, 0.25);
    }

    .ip-pitch-banner__glow {
      position: absolute;
      top: -50px;
      right: 10%;
      width: 360px;
      height: 360px;
      background: radial-gradient(circle, rgba(13, 148, 136, 0.25) 0%, transparent 70%);
      filter: blur(40px);
      pointer-events: none;
    }

    .ip-pitch-banner__inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .ip-pitch-banner__quote {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.35;
      color: #FFFFFF;
      max-width: 48ch;
    }

    .ip-pitch-banner__cta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    /* Buttons */
    .ip-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      box-sizing: border-box;
      transition: all 200ms ease;
    }

    .ip-btn__arrow {
      transition: transform 180ms ease;
    }

    .ip-btn:hover .ip-btn__arrow {
      transform: translateX(4px);
    }

    .ip-btn--primary {
      background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .ip-btn--primary:hover {
      background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
      box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
      transform: translateY(-2px);
    }

    .ip-btn--secondary {
      background: #FFFFFF;
      color: #0F172A;
      border: 1px solid var(--ar-line-300);
    }

    .ip-btn--secondary:hover {
      background: var(--ar-bg-50);
      border-color: #94A3B8;
      transform: translateY(-2px);
    }

    .ip-btn--ghost-white {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .ip-btn--ghost-white:hover {
      background: rgba(255, 255, 255, 0.16);
      border-color: rgba(255, 255, 255, 0.4);
      transform: translateY(-2px);
    }

    /* Fallback list */
    .ip-list {
      padding: 32px 0;
    }
    .ip-list__items {
      margin-top: 16px;
      padding-left: 20px;
      line-height: 1.8;
    }
    .ip-list__items a {
      color: #2563EB;
      font-weight: 600;
      text-decoration: none;
    }
    .ip-list__items a:hover {
      text-decoration: underline;
    }

    @media (max-width: 640px) {
      .ip-hero__title {
        font-size: 28px;
      }
      .ip-pitch-banner__quote {
        font-size: 19px;
      }
      .ip-pitch-banner {
        padding: 28px 20px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ip-btn,
      .ip-use-card,
      .ip-problem-card {
        transition: none !important;
        transform: none !important;
      }
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

  protected getProblemIcon(problem: string, index: number): IconName {
    const text = problem.toLowerCase();
    if (text.includes('spreadsheet') || text.includes('calendar') || text.includes('dates')) return 'clock';
    if (text.includes('manual') || text.includes('document')) return 'document';
    if (text.includes('hold') || text.includes('wait') || text.includes('delay')) return 'clock';
    if (text.includes('price') || text.includes('invoice') || text.includes('overdue')) return 'billing';
    if (text.includes('renewal') || text.includes('amc')) return 'amc-renewals';
    if (text.includes('service') || text.includes('model') || text.includes('serial')) return 'helpdesk';
    if (text.includes('dealer') || text.includes('stock')) return 'stock';
    if (text.includes('enquir') || text.includes('quote') || text.includes('lead')) return 'enquiry';
    const icons: IconName[] = ['alert', 'clock', 'amc-renewals'];
    return icons[index % icons.length];
  }

  protected getUseIcon(title: string): IconName {
    const lower = title.toLowerCase();
    if (lower.includes('enquir') || lower.includes('quot')) return 'quotation';
    if (lower.includes('installed')) return 'installed-base';
    if (lower.includes('ai') && lower.includes('enquir')) return 'ai-agents';
    if (lower.includes('renewal') || lower.includes('amc')) return 'amc-renewals';
    if (lower.includes('service desk') || lower.includes('support')) return 'helpdesk';
    if (lower.includes('dealer')) return 'dealer-network';
    if (lower.includes('catalogue')) return 'catalogue';
    if (lower.includes('campaign')) return 'campaign';
    if (lower.includes('collection') || lower.includes('payment')) return 'collections';
    if (lower.includes('document')) return 'document';
    if (lower.includes('trade')) return 'analytics';
    return 'sparkle';
  }
}
