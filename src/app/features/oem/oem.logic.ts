import type { ChipTone } from '../../ui/chip';
import {
  DealRegistrationStatus,
  SpaLineDto,
  SpaResaleRule,
  SpaStatus,
} from '../../proxy/oem/oem-pricing.service';

export const SPA_STATUS_TEXT: Record<SpaStatus, string> = {
  [SpaStatus.Requested]: 'Requested',
  [SpaStatus.Approved]: 'Approved',
  [SpaStatus.PartlyApproved]: 'Partly approved',
  [SpaStatus.Rejected]: 'Rejected',
  [SpaStatus.Expired]: 'Expired',
  [SpaStatus.Cancelled]: 'Cancelled',
};

export const SPA_STATUS_TONE: Record<SpaStatus, ChipTone> = {
  [SpaStatus.Requested]: 'amber',
  [SpaStatus.Approved]: 'good',
  [SpaStatus.PartlyApproved]: 'good',
  [SpaStatus.Rejected]: 'bad',
  [SpaStatus.Expired]: 'neutral',
  [SpaStatus.Cancelled]: 'neutral',
};

export const REG_STATUS_TEXT: Record<DealRegistrationStatus, string> = {
  [DealRegistrationStatus.Requested]: 'Requested',
  [DealRegistrationStatus.Approved]: 'Approved',
  [DealRegistrationStatus.Rejected]: 'Rejected',
  [DealRegistrationStatus.Expired]: 'Expired',
  [DealRegistrationStatus.Won]: 'Won',
  [DealRegistrationStatus.Lost]: 'Lost',
};

export const REG_STATUS_TONE: Record<DealRegistrationStatus, ChipTone> = {
  [DealRegistrationStatus.Requested]: 'amber',
  [DealRegistrationStatus.Approved]: 'good',
  [DealRegistrationStatus.Rejected]: 'bad',
  [DealRegistrationStatus.Expired]: 'neutral',
  [DealRegistrationStatus.Won]: 'good',
  [DealRegistrationStatus.Lost]: 'neutral',
};

export const RESALE_TEXT: Record<SpaResaleRule, string> = {
  [SpaResaleRule.Fixed]: 'Fixed price',
  [SpaResaleRule.Floor]: 'Not below',
  [SpaResaleRule.MaxDiscount]: 'Max discount %',
};

/** A stored date as the India calendar day, "yyyy-mm-dd": a date picked in India comes back as India's midnight in UTC. */
export function indiaDay(value: string | null | undefined): string {
  if (!value) return '';
  if (!/[zZ]|[+-]\d\d:\d\d$/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
}

/** ₹ amount from paise with two decimals only when there are paise: ₹1,00,000 or ₹1,234.50. */
export function rupees(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '';
  const r = paise / 100;
  return (
    '₹' +
    r.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(r) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Typed rupees ("1,00,000" or "80000.50") to paise; null when blank or unreadable. */
export function toPaise(text: string | number | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  const t = String(text).replace(/[₹,\s]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** The stored resale value as typed: rupees for Fixed and Floor, a percentage for Max discount (both are value ÷ 100). */
export function resaleText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : `${value / 100}`;
}

/** Typed resale value to what is stored: paise, or basis points for Max discount. */
export function resaleValue(rule: SpaResaleRule, text: string): number | null {
  const t = text.replace(/[₹,%\s]/g, '');
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** How a line's resale rule reads: "Not below ₹88,000" or "Max 15% off". */
export function resaleLabel(line: Pick<SpaLineDto, 'resaleRule' | 'resaleValue'>): string {
  if (line.resaleValue === null || line.resaleValue === undefined) return '';
  return line.resaleRule === SpaResaleRule.MaxDiscount
    ? `Max ${line.resaleValue / 100}% off`
    : `${RESALE_TEXT[line.resaleRule]} ${rupees(line.resaleValue)}`;
}

export interface PastedDecision {
  lineId: string;
  approvedQty: number;
  specialBuyInPaise: number | null;
  resaleValueText: string | null;
}

/**
 * Rows pasted from the OEM's approval (Excel or email), matched to the lines by part number: part, approved quantity, special
 * price and, optionally, the resale price. Tabs, semicolons or two or more spaces between columns. Rows whose part isn't on the
 * agreement are returned as unmatched.
 */
export function parsePastedDecision(
  text: string,
  lines: readonly Pick<SpaLineDto, 'id' | 'partNumber'>[],
): { matched: PastedDecision[]; unmatched: string[] } {
  const byKey = new Map(lines.map((l) => [l.partNumber.trim().toUpperCase(), l.id]));
  const matched: PastedDecision[] = [];
  const unmatched: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    const cells = row
      .split(/\t|;|\s{2,}/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    const id = byKey.get((cells[0] ?? '').toUpperCase());
    if (!id) {
      if (!/^part/i.test(row)) unmatched.push(cells[0] ?? row);
      continue;
    }
    const qty = Number((cells[1] ?? '').replace(/,/g, ''));
    matched.push({
      lineId: id,
      approvedQty: Number.isFinite(qty) ? qty : 0,
      specialBuyInPaise: toPaise(cells[2] ?? null),
      resaleValueText: cells[3] ?? null,
    });
  }
  return { matched, unmatched };
}
