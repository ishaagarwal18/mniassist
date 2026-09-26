import type { PriceListDto } from '../../proxy/library';
import type {
  CatalogueMatchDto,
  CreateUpdateQuotationDto,
  QuotationDto,
  QuotationLineDto,
  QuotationTaxLineDto,
  RepriceQuotationInput,
  RepriceResultDto,
  ResolvedPriceDto,
} from '../../proxy/pipeline';
import { QuotePriceSource } from '../../proxy/pipeline';

/**
 * A small in-memory product catalogue, price lists and quote writer, so the line editor works when the app runs on
 * mock data (no API). It follows the server's rules closely enough to be a fair demo: a named price list is the answer or
 * the catalogue price, GST comes from the part else the quotation, and saving keeps a saved line's price unless asked.
 */

interface DemoProduct {
  partNumber: string;
  name: string;
  unit: string;
  paise: number;
  taxBasisPoints: number | null;
}

interface DemoList {
  id: string;
  name: string;
  region: string | null;
  prices: Record<string, { paise: number; moq: number }>;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    partNumber: 'VFD-15KW',
    name: '15 kW variable frequency drive',
    unit: 'no',
    paise: 45_000_00,
    taxBasisPoints: 1800,
  },
  {
    partNumber: 'VFD-22KW',
    name: '22 kW variable frequency drive',
    unit: 'no',
    paise: 61_500_00,
    taxBasisPoints: 1800,
  },
  {
    partNumber: 'PLC-S7-1214',
    name: 'S7-1200 CPU 1214C',
    unit: 'no',
    paise: 42_000_00,
    taxBasisPoints: 1800,
  },
  {
    partNumber: 'CBL-3C-2.5',
    name: '3-core screened cable, 2.5 mm²',
    unit: 'm',
    paise: 210_00,
    taxBasisPoints: 1200,
  },
  {
    partNumber: 'SVC-COMM',
    name: 'Commissioning and start-up',
    unit: 'lot',
    paise: 15_000_00,
    taxBasisPoints: 1800,
  },
  {
    partNumber: 'SPR-FUSE-10A',
    name: 'Spare fuse, 10 A',
    unit: 'no',
    paise: 45_00,
    taxBasisPoints: 500,
  },
];

export const DEMO_LISTS: DemoList[] = [
  {
    id: 'demo-west',
    name: 'West zone distributors',
    region: 'Maharashtra',
    prices: {
      'VFD-15KW': { paise: 41_000_00, moq: 2 },
      'CBL-3C-2.5': { paise: 190_00, moq: 100 },
    },
  },
  {
    id: 'demo-general',
    name: 'General',
    region: null,
    prices: {
      'VFD-15KW': { paise: 44_000_00, moq: 0 },
      'PLC-S7-1214': { paise: 40_500_00, moq: 0 },
    },
  },
];

/** The list a new demo quote starts on: the regional one, as "best fit" for the demo customer. */
export const DEMO_DEFAULT_LIST = 'demo-west';

const key = (part: string | null | undefined): string => (part ?? '').trim().toUpperCase();

export function demoPriceLists(): PriceListDto[] {
  return DEMO_LISTS.map((l) => ({
    id: l.id,
    name: l.name,
    region: l.region,
    distributorTier: null,
    isActive: true,
    items: Object.keys(l.prices).map((sku) => ({ sku, unitPriceInPaise: l.prices[sku].paise })),
  }));
}

export function demoResolve(
  partNumber: string,
  quantity: number,
  requestedListId: string | null,
): ResolvedPriceDto {
  const k = key(partNumber);
  const product = DEMO_PRODUCTS.find((p) => key(p.partNumber) === k);
  const list = DEMO_LISTS.find((l) => l.id === (requestedListId ?? DEMO_DEFAULT_LIST));
  const hit = list?.prices[k];

  if (list && hit) {
    return {
      found: true,
      partNumber: product?.partNumber ?? partNumber,
      description: product?.name,
      unit: product?.unit ?? 'no',
      unitPriceInPaise: hit.paise,
      source: QuotePriceSource.PriceList,
      priceListId: list.id,
      priceListName: list.name,
      minimumOrderQuantity: hit.moq,
      belowMinimumOrder: hit.moq > 0 && quantity < hit.moq,
      missingFromRequestedList: false,
      taxRateBasisPoints: product?.taxBasisPoints ?? null,
    };
  }
  if (product) {
    return {
      found: true,
      partNumber: product.partNumber,
      description: product.name,
      unit: product.unit,
      unitPriceInPaise: product.paise,
      source: QuotePriceSource.Catalogue,
      minimumOrderQuantity: 0,
      belowMinimumOrder: false,
      missingFromRequestedList: requestedListId !== null,
      taxRateBasisPoints: product.taxBasisPoints,
    };
  }
  return {
    found: false,
    partNumber,
    unit: 'no',
    unitPriceInPaise: 0,
    source: QuotePriceSource.Manual,
  };
}

export function demoSearch(
  query: string | null | undefined,
  requestedListId: string | null,
  max: number,
): CatalogueMatchDto[] {
  const q = key(query);
  return DEMO_PRODUCTS.filter(
    (p) => !q || key(p.partNumber).includes(q) || p.name.toUpperCase().includes(q),
  )
    .slice(0, max)
    .map((p) => {
      const r = demoResolve(p.partNumber, 1, requestedListId);
      return {
        partNumber: p.partNumber,
        name: p.name,
        unit: r.unit,
        unitPriceInPaise: r.unitPriceInPaise,
        source: r.source,
        priceListName: r.priceListName,
        minimumOrderQuantity: r.minimumOrderQuantity,
        taxRateBasisPoints: r.taxRateBasisPoints,
        onlyInPriceList: false,
      };
    });
}

// ---- quote writing ----------------------------------------------------------

const lineTotal = (l: QuotationLineDto): number => {
  const gross = Math.round((l.quantity ?? 0) * (l.unitPriceInPaise ?? 0));
  return gross - Math.trunc((gross * (l.discountBasisPoints ?? 0)) / 10_000);
};

/** Tax by rate, the way the server adds it up. */
export function demoTotals(lines: QuotationLineDto[], quoteRate: number) {
  const byRate = new Map<number, number>();
  let subtotal = 0;
  for (const l of lines) {
    const net = l.lineTotalInPaise ?? lineTotal(l);
    subtotal += net;
    const rate = l.taxRateBasisPoints ?? quoteRate;
    byRate.set(rate, (byRate.get(rate) ?? 0) + net);
  }
  const taxBreakdown: QuotationTaxLineDto[] = [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rateBasisPoints, netInPaise]) => ({
      rateBasisPoints,
      netInPaise,
      taxInPaise: Math.floor((netInPaise * rateBasisPoints) / 10_000),
    }));
  const tax = taxBreakdown.reduce((s, t) => s + (t.taxInPaise ?? 0), 0);
  return { subtotalInPaise: subtotal, taxInPaise: tax, totalInPaise: subtotal + tax, taxBreakdown };
}

/** A quotation as the demo API would return it after its lines are written. */
export function demoWrite(base: QuotationDto, input: CreateUpdateQuotationDto): QuotationDto {
  const listId = input.priceListId ?? base.priceListId ?? null;
  const rate = input.taxRateBasisPoints ?? 1800;

  const lines: QuotationLineDto[] = [...(input.lines ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((l, i) => {
      const resolved = l.partNumber?.trim()
        ? demoResolve(l.partNumber, l.quantity ?? 1, listId)
        : null;
      const fromList = !!l.useCataloguePrice && !!resolved?.found;
      const keep =
        !l.useCataloguePrice &&
        !!l.keepPricing &&
        (l.priceSource ?? QuotePriceSource.Manual) !== QuotePriceSource.Manual;
      const line: QuotationLineDto = {
        id: `demo-line-${Date.now()}-${i}`,
        order: i + 1,
        partNumber: l.partNumber?.trim() || null,
        description: l.description,
        quantity: l.quantity,
        unit: fromList ? resolved!.unit : l.unit,
        unitPriceInPaise: fromList ? resolved!.unitPriceInPaise : l.unitPriceInPaise,
        discountBasisPoints: l.discountBasisPoints ?? 0,
        priceSource: fromList ? resolved!.source : keep ? l.priceSource : QuotePriceSource.Manual,
        priceListId: fromList ? resolved!.priceListId : keep ? (l.priceListId ?? null) : null,
        listPriceInPaise:
          keep && l.listPriceInPaise != null
            ? l.listPriceInPaise
            : resolved?.found
              ? resolved.unitPriceInPaise
              : null,
        taxRateBasisPoints: l.taxRateBasisPoints ?? resolved?.taxRateBasisPoints ?? null,
      };
      line.lineTotalInPaise = lineTotal(line);
      return line;
    });

  return {
    ...base,
    priceListId: listId,
    taxRateBasisPoints: rate,
    lines,
    ...demoTotals(lines, rate),
  };
}

export function demoReprice(
  base: QuotationDto,
  input: RepriceQuotationInput,
): { result: RepriceResultDto; quote: QuotationDto } {
  const listId = input.priceListId ?? base.priceListId ?? null;
  const rate = base.taxRateBasisPoints ?? 1800;
  const rows: NonNullable<RepriceResultDto['lines']> = [];

  const lines = (base.lines ?? []).map((l) => {
    const row = {
      lineId: l.id,
      partNumber: l.partNumber,
      description: l.description,
      oldUnitPriceInPaise: l.unitPriceInPaise,
      newUnitPriceInPaise: l.unitPriceInPaise,
      newSource: l.priceSource,
      priceListName: null as string | null,
      skipped: null as string | null,
      changed: false,
    };
    let next = l;
    if (!l.partNumber) row.skipped = 'No part number.';
    else if ((input.keepManualPrices ?? true) && (l.priceSource ?? 0) === QuotePriceSource.Manual)
      row.skipped = 'Price was typed by hand.';
    else {
      const r = demoResolve(l.partNumber, l.quantity ?? 1, listId);
      if (!r.found) row.skipped = 'Not in a price list or the catalogue.';
      else {
        row.newUnitPriceInPaise = r.unitPriceInPaise;
        row.newSource = r.source;
        row.priceListName = r.priceListName ?? null;
        row.changed = r.unitPriceInPaise !== l.unitPriceInPaise;
        next = {
          ...l,
          unitPriceInPaise: r.unitPriceInPaise,
          priceSource: r.source,
          priceListId: r.priceListId ?? null,
          listPriceInPaise: r.unitPriceInPaise,
        };
        next.lineTotalInPaise = lineTotal(next);
      }
    }
    rows.push(row);
    return next;
  });

  const totals = demoTotals(lines, rate);
  const result: RepriceResultDto = {
    applied: !!input.apply,
    lines: rows,
    oldSubtotalInPaise: base.subtotalInPaise,
    newSubtotalInPaise: totals.subtotalInPaise,
  };
  const quote = input.apply ? { ...base, priceListId: listId, lines, ...totals } : base;
  return { result, quote };
}
