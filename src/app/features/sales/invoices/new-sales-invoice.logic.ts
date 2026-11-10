import type { ProductDto } from '../../../proxy/library/product.service';
import type { CreateSalesInvoiceLineDto } from '../../../proxy/sales/sales-invoice.models';

/** One item on a new sales invoice, as typed or picked from the catalogue. */
export interface InvoiceLine {
  /** The product's name, as searched; sent as the description when there is none. */
  itemName: string;
  /** The item number (the API's part number). */
  partNumber: string;
  description: string;
  hsnCode: string;
  quantity: number;
  /** Rupees. */
  unitPrice: number;
  discountPercent: number;
  gstPercent: number;
  productId: string | null;
}

/** GST when the catalogue gives none. */
export const DEFAULT_GST_PERCENT = 18;

export const blankInvoiceLine = (): InvoiceLine => ({
  itemName: '',
  partNumber: '',
  description: '',
  hsnCode: '',
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  gstPercent: DEFAULT_GST_PERCENT,
  productId: null,
});

/**
 * The catalogue's GST (basis points) as one of the rates the form offers (Settings → Pick lists); 18% when missing or not offered.
 * With no list given, any rate the catalogue has is kept.
 */
export function gstPercentFrom(
  basisPoints: number | null | undefined,
  rates?: readonly number[],
): number {
  if (basisPoints === null || basisPoints === undefined) return DEFAULT_GST_PERCENT;
  const percent = basisPoints / 100;
  return !rates || rates.includes(percent) ? percent : DEFAULT_GST_PERCENT;
}

/**
 * A line filled from a catalogue product: its name, item number, description (the name when it has none), HSN, list price
 * and GST. The quantity and discount already typed are kept.
 */
export function invoiceLineFromProduct(
  p: ProductDto,
  current: InvoiceLine,
  rates?: readonly number[],
): InvoiceLine {
  const name = p.name?.trim() ?? '';
  return {
    ...current,
    itemName: name,
    partNumber: p.partNumber?.trim() ?? '',
    description: p.description?.trim() || name,
    hsnCode: p.hsnCode?.trim() ?? '',
    unitPrice: (p.listPriceInPaise ?? 0) / 100,
    gstPercent: gstPercentFrom(p.taxRateBasisPoints, rates),
    productId: p.id ?? null,
  };
}

/** Typing over a picked item's name or number makes it a hand-typed line again. */
export function editInvoiceLine(line: InvoiceLine, patch: Partial<InvoiceLine>): InvoiceLine {
  const unlinks = 'itemName' in patch || 'partNumber' in patch;
  return { ...line, ...patch, ...(unlinks && line.productId ? { productId: null } : {}) };
}

/** Taxable value of a line in paise: quantity × rate, less its discount. */
export function lineTaxablePaise(
  l: Pick<InvoiceLine, 'quantity' | 'unitPrice' | 'discountPercent'>,
): number {
  const gross = Math.round(l.quantity * l.unitPrice * 100);
  return Math.round(gross * (1 - Math.min(100, Math.max(0, l.discountPercent)) / 100));
}

/** A line the user has started: any of its name, item number or description filled. */
export function isStarted(l: InvoiceLine): boolean {
  return !!(l.itemName.trim() || l.partNumber.trim() || l.description.trim());
}

/**
 * The lines the API gets: those started, prices in paise. The item number falls back to the name, then the description, and
 * the description to the name, then the item number, as the API needs both.
 */
export function toInvoiceLines(
  lines: readonly InvoiceLine[],
  billOfSupply: boolean,
): CreateSalesInvoiceLineDto[] {
  return lines.filter(isStarted).map((l) => {
    const name = l.itemName.trim();
    const number = l.partNumber.trim();
    const description = l.description.trim();
    return {
      productId: l.productId ?? undefined,
      partNumber: number || name || description,
      description: description || name || number,
      hsnCode: l.hsnCode.trim() || undefined,
      quantity: l.quantity,
      unitPriceInPaise: Math.round(l.unitPrice * 100),
      discountPercent: l.discountPercent || 0,
      taxRateBasisPoints: billOfSupply ? 0 : Math.round(l.gstPercent * 100),
    };
  });
}

/** Taxable value and GST for the lines, in paise. */
export function invoiceTotals(
  lines: readonly InvoiceLine[],
  billOfSupply: boolean,
): { taxable: number; tax: number } {
  let taxable = 0;
  let tax = 0;
  for (const l of lines) {
    const t = lineTaxablePaise(l);
    taxable += t;
    if (!billOfSupply) tax += Math.round((t * l.gstPercent) / 100);
  }
  return { taxable, tax };
}

/** A date (yyyy-mm-dd) some days later. */
export function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
