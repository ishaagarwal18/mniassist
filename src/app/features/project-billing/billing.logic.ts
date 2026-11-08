import type { ChipTone } from '../../ui/chip';
import {
  BillingMilestoneStatus,
  BillingTrigger,
  SaveBillingMilestoneInput,
} from '../../proxy/project-billing/billing-plan.service';

export const TRIGGER_TEXT: Record<BillingTrigger, string> = {
  [BillingTrigger.OrderConfirmed]: 'Order confirmed',
  [BillingTrigger.AdvanceReceived]: 'Advance received',
  [BillingTrigger.Dispatch]: 'Whole order dispatched',
  [BillingTrigger.DispatchProRata]: 'Each dispatch (its share)',
  [BillingTrigger.FatSigned]: 'FAT signed',
  [BillingTrigger.SatSigned]: 'SAT signed',
  [BillingTrigger.CommissioningSigned]: 'Commissioning signed',
  [BillingTrigger.Date]: 'On a date',
  [BillingTrigger.Manual]: 'Marked by hand',
};

export const TRIGGERS = Object.values(BillingTrigger).filter(
  (v): v is BillingTrigger => typeof v === 'number',
);

export const STATUS_TEXT: Record<BillingMilestoneStatus, string> = {
  [BillingMilestoneStatus.Waiting]: 'Waiting',
  [BillingMilestoneStatus.Ready]: 'Ready',
  [BillingMilestoneStatus.PartlyInvoiced]: 'Partly invoiced',
  [BillingMilestoneStatus.Invoiced]: 'Invoiced',
  [BillingMilestoneStatus.Paid]: 'Paid',
};

export const STATUS_TONE: Record<BillingMilestoneStatus, ChipTone> = {
  [BillingMilestoneStatus.Waiting]: 'neutral',
  [BillingMilestoneStatus.Ready]: 'amber',
  [BillingMilestoneStatus.PartlyInvoiced]: 'teal',
  [BillingMilestoneStatus.Invoiced]: 'teal',
  [BillingMilestoneStatus.Paid]: 'good',
};

/** A milestone row as typed: percentages and money stay text until saved. */
export interface MilestoneRow {
  id: string | null;
  name: string;
  percent: string;
  trigger: BillingTrigger;
  triggerDate: string;
  retention: string;
  terms: string;
  /** Invoiced: can't change. */
  locked: boolean;
}

export function rowOf(m: SaveBillingMilestoneInput, locked = false): MilestoneRow {
  return {
    id: m.id ?? null,
    name: m.name,
    percent: m.percentBp != null ? String(m.percentBp / 100) : '',
    trigger: m.trigger,
    triggerDate: m.triggerDate ? m.triggerDate.slice(0, 10) : '',
    retention: String((m.retentionPercentBp ?? 0) / 100),
    terms: m.paymentTermsDays != null ? String(m.paymentTermsDays) : '',
    locked,
  };
}

const bp = (text: string): number => Math.round((Number(text.replace(/[%\s]/g, '')) || 0) * 100);

export function toInput(r: MilestoneRow): SaveBillingMilestoneInput {
  return {
    id: r.id,
    name: r.name.trim(),
    percentBp: bp(r.percent),
    trigger: r.trigger,
    triggerDate: r.trigger === BillingTrigger.Date && r.triggerDate ? r.triggerDate : null,
    retentionPercentBp: bp(r.retention),
    paymentTermsDays: r.terms.trim() ? Math.round(Number(r.terms)) : null,
  };
}

/** The plan's total in basis points (10000 = 100%). */
export function totalBp(rows: readonly MilestoneRow[]): number {
  return rows.reduce((n, r) => n + bp(r.percent), 0);
}

/** Each row's amount from the order value, paise to the last row: as the API works it out. */
export function amountsOf(rows: readonly MilestoneRow[], orderValuePaise: number): number[] {
  const amounts = rows.map((r) => Math.round((orderValuePaise * bp(r.percent)) / 10_000));
  if (amounts.length && totalBp(rows) === 10_000) {
    amounts[amounts.length - 1] += orderValuePaise - amounts.reduce((a, b) => a + b, 0);
  }
  return amounts;
}

/** What stops the plan being saved, or null. */
export function planProblem(
  rows: readonly MilestoneRow[],
  advancePercent: string,
  orderValuePaise: number,
): string | null {
  if (!rows.length) return 'Add at least one milestone.';
  if (rows.some((r) => !r.name.trim())) return 'Every milestone needs a name.';
  if (rows.some((r) => !(bp(r.percent) > 0))) return 'Every milestone needs a percentage above 0.';
  const total = totalBp(rows);
  if (total !== 10_000) return `The milestones add up to ${total / 100}%, not 100%.`;
  if (rows.some((r) => r.trigger === BillingTrigger.Date && !r.triggerDate)) {
    return 'Give the date for each milestone billed on a date.';
  }
  const advance = Math.round((orderValuePaise * bp(advancePercent)) / 10_000);
  const first = amountsOf(rows, orderValuePaise)[0] ?? 0;
  if (advance > first) return "The advance can't be more than the first milestone's value.";
  return null;
}
