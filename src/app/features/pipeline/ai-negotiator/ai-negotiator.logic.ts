import type { NegotiationSessionDto } from '../../../proxy/pipeline/negotiation-agent.models';
import {
  CustomerPersona,
  NegotiationAction,
  NegotiationSessionStatus,
  NegotiationStrategy,
  OfferSender,
} from '../../../proxy/pipeline/negotiation-enums';
import type { ChipTone } from '../../../ui/chip';

export const STATUS: Record<NegotiationSessionStatus, { label: string; tone: ChipTone }> = {
  [NegotiationSessionStatus.Negotiating]: { label: 'Negotiating', tone: 'amber' },
  [NegotiationSessionStatus.Agreed]: { label: 'Agreed', tone: 'good' },
  [NegotiationSessionStatus.EscalatedToHuman]: { label: 'Needs you', tone: 'warn' },
  [NegotiationSessionStatus.WalkedAway]: { label: 'Walked away', tone: 'bad' },
  [NegotiationSessionStatus.Expired]: { label: 'Expired', tone: 'neutral' },
};

export const ACTION_LABEL: Record<NegotiationAction, string> = {
  [NegotiationAction.InitialQuote]: 'Quoted',
  [NegotiationAction.CounterOffer]: 'Counter-offer',
  [NegotiationAction.AcceptOffer]: 'Accepted',
  [NegotiationAction.RejectAndWalkAway]: 'Final offer / walk away',
  [NegotiationAction.EscalateToHuman]: 'Passed to a manager',
};

export const SENDER_LABEL: Record<OfferSender, string> = {
  [OfferSender.Customer]: 'Customer',
  [OfferSender.AiAgent]: 'Negotiator',
  [OfferSender.HumanSalesManager]: 'Manager',
};

export const STRATEGIES: { value: NegotiationStrategy; label: string; hint: string }[] = [
  {
    value: NegotiationStrategy.ConcessionCurve,
    label: 'Step-by-step concessions',
    hint: 'Gives a little more each round, never below the floor margin.',
  },
  {
    value: NegotiationStrategy.PaymentTermTradeoff,
    label: 'Better price for better payment terms',
    hint: 'Offers a lower price in return for advance or quicker payment.',
  },
  {
    value: NegotiationStrategy.VolumeCommitment,
    label: 'Better price for more quantity',
    hint: 'Offers a lower price in return for a bigger order.',
  },
  {
    value: NegotiationStrategy.FirmFixed,
    label: 'Hold the price',
    hint: 'Defends the quoted price on value, warranty and support.',
  },
];

export const PERSONAS: { value: CustomerPersona; label: string }[] = [
  { value: CustomerPersona.AggressiveProcurement, label: 'Tough purchase department' },
  { value: CustomerPersona.BudgetConstrained, label: 'Tight budget' },
  { value: CustomerPersona.VolumeBuyer, label: 'Large-volume buyer' },
  { value: CustomerPersona.SpeedFocused, label: 'Needs it fast' },
];

export type StatusFilter = 'all' | 'open' | 'needs-you' | 'closed';

export function matchesFilter(s: NegotiationSessionDto, f: StatusFilter): boolean {
  switch (f) {
    case 'open':
      return s.status === NegotiationSessionStatus.Negotiating;
    case 'needs-you':
      return s.status === NegotiationSessionStatus.EscalatedToHuman;
    case 'closed':
      return (
        s.status === NegotiationSessionStatus.Agreed ||
        s.status === NegotiationSessionStatus.WalkedAway ||
        s.status === NegotiationSessionStatus.Expired
      );
    default:
      return true;
  }
}

export interface NegotiationTotals {
  open: number;
  agreed: number;
  needsYou: number;
  closed: number;
  /** Average margin kept on agreed deals, or null when there are none. */
  avgAgreedMargin: number | null;
}

export function totalsOf(sessions: NegotiationSessionDto[]): NegotiationTotals {
  const agreed = sessions.filter((s) => s.status === NegotiationSessionStatus.Agreed);
  return {
    open: sessions.filter((s) => s.status === NegotiationSessionStatus.Negotiating).length,
    agreed: agreed.length,
    needsYou: sessions.filter((s) => s.status === NegotiationSessionStatus.EscalatedToHuman).length,
    closed: sessions.filter((s) => matchesFilter(s, 'closed')).length,
    avgAgreedMargin: agreed.length
      ? Math.round(
          (agreed.reduce((sum, s) => sum + s.currentMarginPercent, 0) / agreed.length) * 10,
        ) / 10
      : null,
  };
}

/** Where a margin sits on a 0–40% scale, for the margin bar; the floor and target are marked on the same scale. */
export function marginPosition(margin: number): number {
  return Math.max(0, Math.min(100, (margin / 40) * 100));
}

/** Rupees as typed into paise, or null when it is not a positive amount. */
export function rupeesToPaise(text: string): number | null {
  const n = Number(String(text).replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export interface RulesDraft {
  targetMarginPercent: number;
  floorMarginPercent: number;
  maxDiscountPercent: number;
  maxRounds: number;
  concessionStepPercent: number;
}

/** What is wrong with the negotiation rules, or null. */
export function rulesProblem(r: RulesDraft): string | null {
  const ok = (n: number, lo: number, hi: number) => Number.isFinite(n) && n >= lo && n <= hi;
  if (!ok(r.targetMarginPercent, 0, 90)) return 'Target margin must be 0 to 90%.';
  if (!ok(r.floorMarginPercent, 0, 90)) return 'Lowest margin must be 0 to 90%.';
  if (r.floorMarginPercent > r.targetMarginPercent) {
    return 'The lowest margin cannot be above the target margin.';
  }
  if (!ok(r.maxDiscountPercent, 0, 60)) return 'Largest discount must be 0 to 60%.';
  if (!Number.isInteger(r.maxRounds) || r.maxRounds < 1 || r.maxRounds > 10) {
    return 'Rounds must be a whole number from 1 to 10.';
  }
  if (!ok(r.concessionStepPercent, 0, 20)) return 'Step must be 0 to 20%.';
  return null;
}
