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

/**
 * What the customer reads about stock: the exact quantity when the workspace shows it ("12 in stock", "On order" at none),
 * otherwise the band. Empty when stock isn't shown.
 */
export function stockText(
  part: Pick<PublicReorderPartDto, 'availability' | 'availableQuantity' | 'unit'>,
): string {
  if (part.availableQuantity != null) {
    const q = part.availableQuantity;
    if (q <= 0) return BAND_LABEL.OnOrder;
    const n = q.toLocaleString('en-IN', { maximumFractionDigits: 3 });
    return part.unit && part.unit !== 'no' ? `${n} ${part.unit} in stock` : `${n} in stock`;
  }
  return part.availability ? BAND_LABEL[part.availability] : '';
}

/** "Due in 5 days", "Due today", "Overdue by 3 days". */
export function dueLabel(days: number | null | undefined): string {
  if (days == null) return '';
  if (days === 0) return 'Due today';
  if (days < 0) return `Overdue by ${-days} day${days === -1 ? '' : 's'}`;
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Rupees as staff type them ("25000", "25,000", "₹ 25,000.50") to paise. Blank is null (no amount); anything else unreadable is
 * undefined.
 */
export function parseRupees(text: string): number | null | undefined {
  const t = text.replace(/[₹,\s]/g, '');
  if (t === '') return null;
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(t)) return undefined;
  return Math.round(Number(t) * 100);
}

/** Whole days, 0–365, as typed. Blank is null; anything else unreadable is undefined. */
export function parseDays(text: string): number | null | undefined {
  const t = text.trim();
  if (t === '') return null;
  if (!/^\d{1,3}$/.test(t) || Number(t) > 365) return undefined;
  return Number(t);
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

/** Where a link's session is kept in the tab, so a reload (or a password sign-in) doesn't need another code. */
export function sessionKeyFor(token: string): string {
  return 'reorder-session:' + token.slice(-12);
}

export function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string | null): void {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // Private windows can refuse storage; the page still works.
  }
}
