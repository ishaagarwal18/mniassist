import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CurrentUserService } from '../../core/services/current-user.service';
import { ArIcon, IconName } from '../../ui';
import { ArLandingPlans } from './landing-plans-section';

interface Pillar {
  readonly icon: IconName;
  readonly title: string;
  readonly text: string;
  readonly points: readonly string[];
}

/**
 * The public front page at `/`: what AutoReach is, what it does and what it
 * costs, for visitors who have never signed in. No auth guard and no app
 * shell. A visitor who is already signed in sees "Open AutoReach" in place of
 * the sign-in buttons rather than being bounced away, so the page stays
 * shareable from inside the app too.
 */
@Component({
  selector: 'ar-landing',
  imports: [RouterLink, ArIcon, ArLandingPlans],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class ArLanding {
  protected readonly signedIn = inject(CurrentUserService).isAuthenticated;

  protected readonly year = new Date().getFullYear();

  protected readonly channels = ['WhatsApp', 'SMS', 'Email', 'Instagram', 'Messenger', 'Voice'];

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

  protected scrollTo(id: string): void {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  }
}
