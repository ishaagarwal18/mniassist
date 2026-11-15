import type { ProductDto } from '../../../proxy/library/product.service';
import type {
  CreateSalesOrderLineDto,
  SalesOrderLineDto,
} from '../../../proxy/sales/sales-order.models';

/** One item on a new sales order, as typed or picked from the catalogue. */
export interface OrderLine {
  /** The product's name, as searched; not sent (the description carries it). */
  itemName: string;
  partNumber: string;
  description: string;
  hsnCode: string;
  quantity: number;
  /** Rupees. */
  unitPrice: number;
  taxRateBasisPoints: number;
  productId: string | null;
  /** Kept from a quote's special-price line, so an edit does not drop the SPA link. */
  spaLineId?: string | null;
}

/** GST when the catalogue gives none: 18%. */
export const DEFAULT_TAX_BPS = 1800;

export const blankLine = (): OrderLine => ({
  itemName: '',
  partNumber: '',
  description: '',
  hsnCode: '',
  quantity: 1,
  unitPrice: 0,
  taxRateBasisPoints: DEFAULT_TAX_BPS,
  productId: null,
});

/**
 * A line filled from a catalogue product: its name, part number, description (the name when it has none), HSN, list price and GST.
 * The quantity already typed is kept.
 */
export function lineFromProduct(p: ProductDto, current: OrderLine): OrderLine {
  const name = p.name?.trim() ?? '';
  return {
    ...current,
    itemName: name,
    partNumber: p.partNumber?.trim() ?? '',
    description: p.description?.trim() || name,
    hsnCode: p.hsnCode?.trim() ?? '',
    unitPrice: (p.listPriceInPaise ?? 0) / 100,
    taxRateBasisPoints: p.taxRateBasisPoints ?? DEFAULT_TAX_BPS,
    productId: p.id ?? null,
  };
}

/** Typing over a picked item's name or number makes it a hand-typed line again. */
export function editLine(line: OrderLine, patch: Partial<OrderLine>): OrderLine {
  const unlinks = 'itemName' in patch || 'partNumber' in patch;
  return { ...line, ...patch, ...(unlinks && line.productId ? { productId: null } : {}) };
}

/** The lines the API gets: those with a part number and a quantity, prices in paise. */
export function toOrderLines(lines: readonly OrderLine[]): CreateSalesOrderLineDto[] {
  return lines
    .filter((l) => l.partNumber.trim() && l.quantity > 0)
    .map((l) => ({
      productId: l.productId ?? undefined,
      partNumber: l.partNumber.trim(),
      description: l.description.trim() || l.itemName.trim() || l.partNumber.trim(),
      hsnCode: l.hsnCode.trim() || undefined,
      quantity: l.quantity,
      unitPriceInPaise: Math.round(l.unitPrice * 100),
      discountPercent: 0,
      taxRateBasisPoints: l.taxRateBasisPoints,
      spaLineId: l.spaLineId ?? undefined,
    }));
}

/** A saved order's line, as the form edits it. */
export function lineFromOrder(l: SalesOrderLineDto): OrderLine {
  return {
    itemName: l.description,
    partNumber: l.partNumber,
    description: l.description,
    hsnCode: l.hsnCode ?? '',
    quantity: l.quantity,
    unitPrice: l.unitPriceInPaise / 100,
    taxRateBasisPoints: l.taxRateBasisPoints,
    productId: l.productId ?? null,
    spaLineId: l.spaLineId ?? null,
  };
}
