import type { SpaOptionDto } from '../../proxy/oem/oem-pricing.service';
import type { CatalogueMatchDto, QuotationLineDto } from '../../proxy/pipeline';
import { QuotePriceSource } from '../../proxy/pipeline';

/** One editable quotation line. Money is held as the text a person typed (rupees, percent), not as numbers. */
export interface QuoteRow {
  key: number;
  partNumber: string;
  description: string;
  quantity: string;
  unit: string;
  /** Rupees per unit, as typed. */
  price: string;
  /** Percent, as typed. */
  discount: string;
  /** GST percent, as typed. Blank takes the product's rate, else the quotation's. */
  tax: string;
  /** The price comes from a price list or the catalogue and is re-read on save; typing a price turns this off. */
  fromList: boolean;
  /** A saved line left alone: saving keeps its price and source rather than reading the list again. */
  keep: boolean;
  source: QuotePriceSource;
  priceListId: string | null;
  listName: string | null;
  /** What the part listed for, in paise, so a lower price reads as a discount. */
  listPaise: number | null;
  moq: number;
  /** Left at ₹0 for a person to price (an engineering line, a replacement to choose): issuing waits until it has a price. */
  mustBePriced?: boolean;
  /** The special price agreement line the price came from. */
  spaLineId?: string | null;
  /** That agreement line, as the SPA picker offered it: for the chip, checks and margin. */
  spa?: SpaOptionDto | null;
}

export interface QuoteTaxLine {
  rateBasisPoints: number;
  netPaise: number;
  taxPaise: number;
}

export interface QuoteTotals {
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  /** GST by rate: lines at the same rate are taxed together. */
  breakdown: QuoteTaxLine[];
}

const toNumber = (text: string): number => {
  const n = Number(text.replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const rupeesToPaise = (text: string): number => Math.round(toNumber(text) * 100);
export const paiseToRupees = (paise: number): string => String(paise / 100);
export const percentToBasisPoints = (text: string): number =>
  Math.min(10_000, Math.max(0, Math.round(toNumber(text) * 100)));
export const basisPointsToPercent = (bp: number): string => String(bp / 100);

/** A line's total, before tax: quantity × price less the discount, to the nearest paisa. */
export function lineTotalPaise(row: QuoteRow): number {
  const gross = toNumber(row.quantity) * rupeesToPaise(row.price);
  return Math.round(gross * (1 - percentToBasisPoints(row.discount) / 10_000));
}

/** The rate typed on a line in basis points, or null when it is left to the product or the quotation. */
export function taxBasisPointsOf(row: QuoteRow): number | null {
  if (row.tax.trim() === '') return null;
  return Math.min(3000, Math.max(0, Math.round(toNumber(row.tax) * 100)));
}

export function totalsOf(rows: QuoteRow[], quoteRateBasisPoints: number): QuoteTotals {
  const byRate = new Map<number, number>();
  let subtotalPaise = 0;
  for (const r of rows) {
    const net = lineTotalPaise(r);
    subtotalPaise += net;
    const rate = taxBasisPointsOf(r) ?? quoteRateBasisPoints;
    byRate.set(rate, (byRate.get(rate) ?? 0) + net);
  }
  const breakdown = [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rateBasisPoints, netPaise]) => ({
      rateBasisPoints,
      netPaise,
      taxPaise: Math.floor((netPaise * rateBasisPoints) / 10_000),
    }));
  const taxPaise = breakdown.reduce((sum, t) => sum + t.taxPaise, 0);
  return { subtotalPaise, taxPaise, totalPaise: subtotalPaise + taxPaise, breakdown };
}

/** The quantity is under the price list's minimum order for this part. */
export const belowMinimum = (row: QuoteRow): boolean =>
  row.moq > 0 && toNumber(row.quantity) < row.moq;

/** The unit price is under what the part lists for: a discount somebody gave, worth showing. */
export function belowListPaise(row: QuoteRow): number {
  const list = row.listPaise ?? 0;
  const price = rupeesToPaise(row.price);
  return list > 0 && price < list ? list - price : 0;
}

export function rowFromLine(line: QuotationLineDto, key: number): QuoteRow {
  const source = line.priceSource ?? QuotePriceSource.Manual;
  return {
    key,
    partNumber: line.partNumber ?? '',
    description: line.description ?? '',
    quantity: String(line.quantity ?? 1),
    unit: line.unit ?? 'no',
    price: paiseToRupees(line.unitPriceInPaise ?? 0),
    discount: basisPointsToPercent(line.discountBasisPoints ?? 0),
    tax: line.taxRateBasisPoints == null ? '' : basisPointsToPercent(line.taxRateBasisPoints),
    fromList: source !== QuotePriceSource.Manual,
    keep: source !== QuotePriceSource.Manual,
    source,
    priceListId: line.priceListId ?? null,
    listName: null,
    listPaise: line.listPriceInPaise ?? null,
    moq: 0,
    mustBePriced: !!line.mustBePriced,
    spaLineId: line.spaLineId ?? null,
  };
}

export function rowFromMatch(m: CatalogueMatchDto, key: number): QuoteRow {
  return {
    key,
    partNumber: m.partNumber ?? '',
    description: m.name ?? '',
    quantity: '1',
    unit: m.unit ?? 'no',
    price: paiseToRupees(m.unitPriceInPaise ?? 0),
    discount: '0',
    tax: m.taxRateBasisPoints == null ? '' : basisPointsToPercent(m.taxRateBasisPoints),
    fromList: true,
    keep: false,
    source: m.source ?? QuotePriceSource.Catalogue,
    priceListId: null,
    listName: m.priceListName ?? null,
    listPaise: m.unitPriceInPaise ?? null,
    moq: m.minimumOrderQuantity ?? 0,
  };
}

export function blankRow(key: number): QuoteRow {
  return {
    key,
    partNumber: '',
    description: '',
    quantity: '1',
    unit: 'no',
    price: '0',
    discount: '0',
    tax: '',
    fromList: false,
    keep: false,
    source: QuotePriceSource.Manual,
    priceListId: null,
    listName: null,
    listPaise: null,
    moq: 0,
  };
}
