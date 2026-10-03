import { count, inr } from '../../core/util/format';

/**
 * The published plan ladder, as the landing page shows it. Figures mirror
 * `SubscriptionPlanCatalog.For` in the API (fees in paise, exclusive of GST;
 * Enterprise's fee is a floor) — change both together. Feature lists are
 * cumulative up the ladder, so each plan lists only what it adds.
 */
export interface LandingPlan {
  readonly name: string;
  readonly monthlyFeeInPaise: number;
  readonly isFloor: boolean;
  readonly seats: number;
  readonly channels: number;
  /** null when unlimited. */
  readonly contacts: number | null;
  readonly blurb: string;
  readonly adds: readonly string[];
  readonly featured?: boolean;
}

export type Cycle = 'monthly' | 'annual';

export const LANDING_PLANS: readonly LandingPlan[] = [
  {
    name: 'Starter',
    monthlyFeeInPaise: 1_99_900,
    isFloor: false,
    seats: 3,
    channels: 1,
    contacts: 2_500,
    blurb: 'Start messaging your customers properly on WhatsApp.',
    adds: [
      'Shared team inbox',
      'Approved templates and campaigns',
      'Contacts with consent tracking',
      'Audiences and basic campaign reports',
    ],
  },
  {
    name: 'Growth',
    monthlyFeeInPaise: 4_99_900,
    isFloor: false,
    seats: 10,
    channels: 2,
    contacts: 25_000,
    blurb: 'Automate follow-ups and capture structured enquiries.',
    adds: [
      'Automation builder',
      'WhatsApp Flows (RFQ, booking, tickets)',
      'Datasheet and drawing library',
      'Full analytics',
      'Click-to-WhatsApp ad attribution',
    ],
    featured: true,
  },
  {
    name: 'Pro',
    monthlyFeeInPaise: 9_99_900,
    isFloor: false,
    seats: 25,
    channels: 5,
    contacts: 1_00_000,
    blurb: 'Run sales, service and aftermarket from one place.',
    adds: [
      'Enquiries, quotations and installed base',
      'AMC renewals and spares reminders',
      'Helpdesk and AI assistant',
      'Payment links, SMS, email and voice',
      'Tally / SAP sync, CRM connectors and API',
    ],
  },
  {
    name: 'Enterprise',
    monthlyFeeInPaise: 24_99_900,
    isFloor: true,
    seats: 50,
    channels: 20,
    contacts: null,
    blurb: 'For OEMs with a dealer network and company sign-in.',
    adds: ['OEM dealer network and lead routing', 'Single sign-on (SSO)', 'Negotiated terms'],
  },
];

/** Annual billing is charged at ten months' price (`PeriodFeeInPaise`). */
export function periodFeeInPaise(plan: LandingPlan, cycle: Cycle): number {
  return cycle === 'annual' ? plan.monthlyFeeInPaise * 10 : plan.monthlyFeeInPaise;
}

/** "₹4,999" or "from ₹24,999". */
export function priceLabel(plan: LandingPlan, cycle: Cycle): string {
  const price = inr(periodFeeInPaise(plan, cycle));
  return plan.isFloor ? `from ${price}` : price;
}

export function limitLines(plan: LandingPlan): string[] {
  return [
    `${plan.seats} team members`,
    `${plan.channels} WhatsApp number${plan.channels === 1 ? '' : 's'}`,
    plan.contacts === null ? 'Unlimited contacts' : `${count(plan.contacts)} contacts`,
  ];
}

/** The plan's key in links, e.g. `/signup?plan=growth`. */
export function planKey(plan: LandingPlan): string {
  return plan.name.toLowerCase();
}

/** The plan a `?plan=` link asks for, or undefined for anything unrecognised. */
export function planByKey(key: string | null | undefined): LandingPlan | undefined {
  const k = (key ?? '').trim().toLowerCase();
  return LANDING_PLANS.find((p) => planKey(p) === k);
}
