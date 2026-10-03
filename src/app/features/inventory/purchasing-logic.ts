import type { ChipTone } from '../../ui/chip';
import type { PurchaseOrderState } from '../../proxy/inventory/purchasing.service';

export const ORDER_STATE: Record<PurchaseOrderState, { label: string; tone: ChipTone }> = {
  Draft: { label: 'Draft', tone: 'neutral' },
  Sent: { label: 'Sent', tone: 'teal' },
  PartlyReceived: { label: 'Part received', tone: 'amber' },
  Received: { label: 'Received', tone: 'good' },
  Cancelled: { label: 'Cancelled', tone: 'neutral' },
};

/** A line as staff type it: a part, a quantity and a cost in rupees, all still text. */
export interface DraftLine {
  productId: string;
  partNumber: string;
  name: string;
  quantity: string;
  cost: string;
}

/**
 * The lines of an order ready to save, or what's wrong with them: at least one, quantities above zero (three decimals at most), costs
 * in rupees of zero or more (two decimals).
 */
export function readLines(
  lines: readonly DraftLine[],
):
  | { lines: { productId: string; quantity: number; unitCostInPaise: number }[] }
  | { error: string } {
  if (lines.length === 0) return { error: 'Add at least one part.' };
  const out: { productId: string; quantity: number; unitCostInPaise: number }[] = [];
  for (const l of lines) {
    const q = l.quantity.trim().replace(/,/g, '');
    if (!/^\d{1,8}(\.\d{1,3})?$/.test(q) || Number(q) <= 0) {
      return { error: `Enter a quantity above zero for ${l.partNumber}.` };
    }
    const c = l.cost.replace(/[₹,\s]/g, '');
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(c)) {
      return { error: `Enter the cost per unit in rupees for ${l.partNumber}.` };
    }
    out.push({
      productId: l.productId,
      quantity: Number(q),
      unitCostInPaise: Math.round(Number(c) * 100),
    });
  }
  return { lines: out };
}

/** The order's value before GST, in paise, from lines as typed (lines that don't read yet count as nothing). */
export function draftTotal(lines: readonly DraftLine[]): number {
  return lines.reduce((sum, l) => {
    const q = Number(l.quantity.replace(/,/g, ''));
    const c = Number(l.cost.replace(/[₹,\s]/g, ''));
    return Number.isFinite(q) && Number.isFinite(c) && q > 0 && c >= 0
      ? sum + Math.round(q * c * 100)
      : sum;
  }, 0);
}
