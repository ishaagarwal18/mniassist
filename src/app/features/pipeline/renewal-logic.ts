import { AmcRenewalDto, RenewalStatus } from '../../proxy/pipeline/amc-renewal.service';
import { ChipTone } from '../../ui/chip';

export const RENEWAL_STATUS_LABEL: Record<RenewalStatus, string> = {
  [RenewalStatus.Due]: 'Due',
  [RenewalStatus.Contacted]: 'Reminded',
  [RenewalStatus.Interested]: 'Asked for quote',
  [RenewalStatus.Quoted]: 'Quoted',
  [RenewalStatus.Won]: 'Renewed',
  [RenewalStatus.Lost]: 'Lost',
  [RenewalStatus.Lapsed]: 'Lapsed',
};

/** The board's columns, left to right, for open renewals. */
export const OPEN_STATUSES: RenewalStatus[] = [
  RenewalStatus.Due,
  RenewalStatus.Contacted,
  RenewalStatus.Interested,
  RenewalStatus.Quoted,
];

/** Whole days from now until the AMC ends (negative once it has ended). */
export function daysLeft(endsOnIso: string, now: Date = new Date()): number {
  const end = new Date(endsOnIso);
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.round((endDay - startOfToday) / 86_400_000);
}

/**
 * How urgent a renewal looks: red when it ends within 15 days with nobody quoting, amber within 30, otherwise by status.
 * The customer asking is always worth a colour of its own — it's the moment to act.
 */
export function renewalTone(r: AmcRenewalDto, now: Date = new Date()): ChipTone {
  if (r.status === RenewalStatus.Won) return 'good';
  if (r.status === RenewalStatus.Lost || r.status === RenewalStatus.Lapsed) return 'neutral';
  if (r.status === RenewalStatus.Interested) return 'teal';
  const d = daysLeft(r.currentEndsOn, now);
  if (d <= 15 && !r.quotationId) return 'bad';
  if (d <= 30) return 'amber';
  return 'neutral';
}

/** Open renewals grouped into board columns, soonest ending first in each. */
export function groupByStatus(
  rows: AmcRenewalDto[],
): { status: RenewalStatus; rows: AmcRenewalDto[] }[] {
  return OPEN_STATUSES.map((status) => ({
    status,
    rows: rows
      .filter((r) => r.status === status)
      .sort((a, b) => a.currentEndsOn.localeCompare(b.currentEndsOn)),
  }));
}

/**
 * Reads the AMC value (rupees) and term (months) typed into the asset form. Blank is fine for both; anything else must be a
 * sensible number. Returns the values to send, or the reason they can't be used.
 */
export function amcCommercials(
  valueText: string,
  termText: string,
): { valueInPaise: number | undefined; termMonths: number | undefined } | string {
  const value = valueText.replace(/[₹,\s]/g, '');
  const term = termText.trim();
  let valueInPaise: number | undefined;
  let termMonths: number | undefined;

  if (value) {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return 'Enter the AMC value in rupees, e.g. 42000.';
    valueInPaise = Math.round(Number(value) * 100);
  }
  if (term) {
    if (!/^\d+$/.test(term) || Number(term) < 1 || Number(term) > 60)
      return 'The AMC term is a whole number of months, 1 to 60.';
    termMonths = Number(term);
  }
  return { valueInPaise, termMonths };
}

/** Uplift as the settings form shows it: basis points ⇄ a percentage with up to two decimals. */
export function upliftPercent(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2).replace(/\.?0+$/, '');
}

export function upliftBasisPoints(percentText: string): number | null {
  const t = percentText.trim().replace('%', '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(t)) return null;
  const bp = Math.round(Number(t) * 100);
  return bp < -5000 || bp > 10000 ? null : bp;
}

/** The chip on an installed-base row: what the machine's latest AMC renewal is doing. */
export function renewalChip(status: RenewalStatus): { label: string; tone: ChipTone } {
  const tone: ChipTone =
    status === RenewalStatus.Won
      ? 'good'
      : status === RenewalStatus.Interested
        ? 'teal'
        : status === RenewalStatus.Quoted
          ? 'amber'
          : status === RenewalStatus.Lapsed
            ? 'bad'
            : 'neutral';
  return { label: `Renewal: ${RENEWAL_STATUS_LABEL[status].toLowerCase()}`, tone };
}
