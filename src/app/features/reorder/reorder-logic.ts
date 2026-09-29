import type { PublicReorderPartDto, StockBand } from '../../proxy/reorder/reorder-public.service';

/** A part in the customer's list, with the quantity they want. */
export interface CartLine {
  part: PublicReorderPartDto;
  quantity: number;
}

export interface CartTotals {
  lines: number;
  subtotalInPaise: number;
  taxInPaise: number;
  totalInPaise: number;
  /** Lines with no price for this customer: sales will quote them. */
  unpriced: number;
}

/** Totals the way the quotation will add them up: each line at its own GST rate, rounded to the paisa. */
export function totals(cart: readonly CartLine[]): CartTotals {
  let subtotal = 0;
  let tax = 0;
  let unpriced = 0;
  for (const { part, quantity } of cart) {
    if (!(quantity > 0)) continue;
    if (part.unitPriceInPaise <= 0) {
      unpriced++;
      continue;
    }
    const line = Math.round(part.unitPriceInPaise * quantity);
    subtotal += line;
    tax += Math.round((line * part.taxRateBasisPoints) / 10_000);
  }
  return {
    lines: cart.filter((l) => l.quantity > 0).length,
    subtotalInPaise: subtotal,
    taxInPaise: tax,
    totalInPaise: subtotal + tax,
    unpriced,
  };
}

/** Quantities as a person types them: "2", "1.5", "" (none). Anything else is not a quantity. */
export function parseQuantity(text: string): number | null {
  const t = text.trim();
  if (t === '') return 0;
  if (!/^\d{1,5}(\.\d{1,3})?$/.test(t)) return null;
  const n = Number(t);
  return n <= 10_000 ? n : null;
}

export const BAND_LABEL: Record<StockBand, string> = {
  InStock: 'In stock',
  Limited: 'Limited stock',
  OnOrder: 'On order',
};

/** "Due in 5 days", "Due today", "Overdue by 3 days". */
export function dueLabel(days: number | null | undefined): string {
  if (days == null) return '';
  if (days === 0) return 'Due today';
  if (days < 0) return `Overdue by ${-days} day${days === -1 ? '' : 's'}`;
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
}

/** ₹1,850 or ₹1,850.50, Indian grouping. */
export function rupees(paise: number): string {
  const r = paise / 100;
  return (
    '₹' +
    r.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(r) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}
