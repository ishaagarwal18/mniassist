import { SpaOptionDto, SpaResaleRule } from '../../proxy/oem/oem-pricing.service';
import { QuoteRow, percentToBasisPoints, rupeesToPaise } from './quote-pricing';

/** What the special price on a quote line says about it: what stops the issue, and what only needs accepting. */
export interface SpaLineFindings {
  blocks: string[];
  warnings: string[];
}

function rupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function day(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

/** The unit price after the line's discount, in paise. */
export function netUnitPaise(row: QuoteRow): number {
  const price = rupeesToPaise(row.price);
  return price - Math.trunc((price * percentToBasisPoints(row.discount)) / 10_000);
}

/** The price the resale rule allows at least (or exactly, for Fixed); null when it can't be worked out. */
export function resaleFloorPaise(o: SpaOptionDto, listPaise: number | null): number | null {
  if (o.resaleValue === null || o.resaleValue === undefined) return null;
  if (o.resaleRule === SpaResaleRule.MaxDiscount) {
    return listPaise ? Math.round((listPaise * (10_000 - o.resaleValue)) / 10_000) : null;
  }
  return o.resaleValue;
}

/**
 * The same checks the API runs on issue, worked out on the line as it is typed: a price breaking the resale rule blocks; an agreement
 * ending before the quote's validity, or more than is left, warns.
 */
export function spaFindings(
  row: QuoteRow,
  o: SpaOptionDto,
  validDays: number | null,
  now = Date.now(),
): SpaLineFindings {
  const blocks: string[] = [];
  const warnings: string[] = [];
  const floor = resaleFloorPaise(o, row.listPaise);
  const net = netUnitPaise(row);
  if (floor !== null) {
    if (o.resaleRule === SpaResaleRule.Fixed && net !== floor) {
      blocks.push(`${o.reference} fixes the price at ${rupees(floor)}.`);
    } else if (o.resaleRule !== SpaResaleRule.Fixed && net < floor) {
      blocks.push(`Price is below the ${o.reference} floor of ${rupees(floor)}.`);
    }
  }
  if (validDays && o.validTo && new Date(o.validTo).getTime() < now + validDays * 86_400_000) {
    warnings.push(`${o.reference} expires on ${day(o.validTo)}, before the quote's validity.`);
  }
  const qty = Number(row.quantity) || 0;
  if (qty > o.remainingQty) {
    warnings.push(`Quantity ${qty} is over the remaining ${o.remainingQty}.`);
  }
  return { blocks, warnings };
}

/** Margin on the line as a percentage of the selling price: on the normal buy price, and with the OEM's support. */
export function spaMargins(
  row: QuoteRow,
  o: SpaOptionDto,
): { before: number; after: number } | null {
  const net = netUnitPaise(row);
  if (net <= 0) return null;
  const before = ((net - o.normalBuyInPaise) / net) * 100;
  const after = ((net - o.normalBuyInPaise + o.supportPerUnitInPaise) / net) * 100;
  return { before: Math.round(before * 10) / 10, after: Math.round(after * 10) / 10 };
}
