import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CurrentUserService } from '../../core/services/current-user.service';
import { ArIcon, IconName } from '../../ui';
import { ArBrand, BRAND_TAGLINE } from '../../layout/brand';
import { ArLandingAi } from './landing-ai';
import { ArLandingChat } from './landing-chat';
import { ArLandingFaq } from './landing-faq';
import { ArLandingIndustries } from './landing-industries';
import { ArLandingPlans } from './landing-plans-section';
import { INDUSTRY_LINKS } from './public-frame';

interface Pillar {
  readonly icon: IconName;
  readonly title: string;
  readonly text: string;
  readonly points: readonly string[];
}

/**
 * The public front page at `/`: what MNI Assist is, who it is for, what it does
 * and what it costs, for visitors who have never signed in. Every path on the
 * page leads to a plan and sign-up. No auth guard and no app shell. A visitor
 * who is already signed in sees "Open MNI Assist" in place of the sign-in
 * buttons rather than being bounced away.
 */
@Component({
  selector: 'ar-landing',
  imports: [
    RouterLink,
    ArIcon,
    ArBrand,
    ArLandingChat,
    ArLandingIndustries,
    ArLandingAi,
    ArLandingPlans,
    ArLandingFaq,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class ArLanding {
  protected readonly signedIn = inject(CurrentUserService).isAuthenticated;

  protected readonly activeSection = signal<string>('industries');
  protected readonly tagline = BRAND_TAGLINE;
  protected readonly year = new Date().getFullYear();
  protected readonly industryLinks = INDUSTRY_LINKS;

  /** In-page sections, for the header and footer links. */
  protected readonly sections = [
    { id: 'industries', label: 'Industries' },
    { id: 'features', label: 'Features' },
    { id: 'ai', label: 'AI' },
    { id: 'how', label: 'How it works' },
    { id: 'plans', label: 'Plans' },
    { id: 'faq', label: 'FAQ' },
  ];

  /** Plain facts about the platform — each one true of the product today. */
  protected readonly proof: readonly { icon: IconName; text: string }[] = [
    { icon: 'channel', text: 'Built on Meta’s WhatsApp Cloud API' },
    { icon: 'billing', text: 'GST invoices and UPI payments' },
    { icon: 'link', text: 'Tally and SAP connectors' },
    { icon: 'shield', text: 'DPDP Act, 2023 tools built in' },
  ];

  protected readonly trust: readonly { icon: IconName; title: string; text: string }[] = [
    {
      icon: 'check',
      title: 'Consent first',
      text: 'Every contact carries its consent evidence, and opt-outs are honoured the moment a campaign sends.',
    },
    {
      icon: 'analytics',
      title: 'Limits you can see',
      text: 'Your number’s quality and daily sending limit are on every screen, with a warning before you reach them.',
    },
    {
      icon: 'template',
      title: 'Templates checked first',
      text: 'Common reasons Meta rejects a template are flagged before you submit it for review.',
    },
    {
      icon: 'shield',
      title: 'DPDP ready',
      text: 'Data requests, retention and a breach log, with a readiness checklist for the DPDP Act, 2023.',
    },
  ];

  protected readonly pillars: readonly Pillar[] = [
    {
      icon: 'campaign',
      title: 'Reach',
      text: 'Message the right customers, with consent you can prove.',
      points: [
        'Campaigns with Meta-approved templates',
        'Audiences that re-check opt-outs at send time',
        'Keyword bots, drip sequences and journeys',
        'In-chat forms for RFQs and bookings',
      ],
    },
    {
      icon: 'enquiry',
      title: 'Sell',
      text: 'Turn conversations into enquiries, quotes and orders.',
      points: [
        'Pipeline board with your own stages',
        'Quotations with PDF and e-signature',
        'Monthly and quarterly forecast',
        'OEM-to-dealer lead routing',
      ],
    },
    {
      icon: 'machine',
      title: 'Service',
      text: 'Keep every machine you sold earning after the sale.',
      points: [
        'Installed base with AMC and warranty dates',
        'AMC renewal and spares-due reminders',
        'Customer self-service spares re-order page',
        'Helpdesk with an offline field-engineer app',
      ],
    },
    {
      icon: 'billing',
      title: 'Get paid',
      text: 'Close the loop from quote to cash.',
      points: [
        'Payment links by UPI, card or net banking',
        'Overdue reminders from Tally or SAP invoices',
        'Stock and purchasing by location',
        'GST invoices for your own usage',
      ],
    },
  ];

  /** The product story the hero tells, left to right. */
  protected readonly story = [
    { title: 'Customer message', text: 'WhatsApp, SMS, email, Instagram, Messenger', ai: false },
    { title: 'AI understanding', text: 'Summaries and suggested replies', ai: true },
    { title: 'Business context', text: 'Machines, AMC, quotes and tickets', ai: false },
    { title: 'Action', text: 'Ticket, quotation, re-order or payment link', ai: false },
    { title: 'Growth', text: 'Renewals, spares orders, payments collected', ai: false },
  ];

  protected readonly steps = [
    {
      title: 'Connect your number',
      text: 'Link a WhatsApp Business number in a guided sign-up with Meta, or move an existing one across.',
    },
    {
      title: 'Bring in your customers',
      text: 'Import your contact list with consent recorded for each person, register the machines you have sold, and connect Tally or SAP.',
    },
    {
      title: 'Let it run',
      text: 'Send campaigns, switch on renewal and spares reminders, and answer every reply from one inbox.',
    },
  ];

  private readonly destroyRef = inject(DestroyRef);
  private isClickScrolling = false;
  private scrollTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    // Links like "/#plans" (the "Change" link on sign-up) land on that section.
    const fragment = inject(ActivatedRoute).snapshot.fragment;
    if (fragment) {
      this.activeSection.set(fragment);
      afterNextRender(() => this.scrollTo(fragment));
    }

    afterNextRender(() => {
      this.initScrollSpy();
    });
  }

  private initScrollSpy(): void {
    if (typeof window === 'undefined') return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.updateActiveSection();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      clearTimeout(this.scrollTimeout);
    });

    this.updateActiveSection();
  }

  private updateActiveSection(): void {
    if (typeof window === 'undefined' || this.isClickScrolling) return;

    const scrollY = window.scrollY || window.pageYOffset;

    // When scrolled near the bottom of the page, activate the last section
    const atBottom =
      window.innerHeight + scrollY >= document.documentElement.scrollHeight - 50;
    if (atBottom) {
      const last = this.sections[this.sections.length - 1];
      if (last && this.activeSection() !== last.id) {
        this.activeSection.set(last.id);
      }
      return;
    }

    // 60px sticky header height + 40px buffer
    const headerOffset = 100;
    let current = '';

    for (const s of this.sections) {
      const el = document.getElementById(s.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= headerOffset) {
        current = s.id;
      } else {
        break;
      }
    }

    if (current && current !== this.activeSection()) {
      this.activeSection.set(current);
    }
  }

  protected scrollTo(id: string): void {
    this.activeSection.set(id);
    this.isClickScrolling = true;
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isClickScrolling = false;
      this.updateActiveSection();
    }, 800);

    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  }
}
