import { QuotePriceSource } from '../../proxy/pipeline';
import type { QuotationDto } from '../../proxy/pipeline';
import { demoPriceLists, demoReprice, demoResolve, demoSearch, demoWrite } from './quote-mock';

const base: QuotationDto = {
  id: 'q-1',
  reference: 'QTN-1',
  priceListId: 'demo-west',
  taxRateBasisPoints: 1800,
  lines: [],
};

describe('demo quote pricing (mock data mode)', () => {
  it('prices a listed part from the regional list and flags a quantity under its minimum', () => {
    const r = demoResolve('vfd-15kw', 1, null);
    expect(r).toMatchObject({
      found: true,
      source: QuotePriceSource.PriceList,
      unitPriceInPaise: 41_000_00,
      belowMinimumOrder: true,
    });
  });

  it('a named list that lacks the part falls back to the catalogue and says so', () => {
    const r = demoResolve('PLC-S7-1214', 1, 'demo-west');
    expect(r).toMatchObject({
      source: QuotePriceSource.Catalogue,
      unitPriceInPaise: 42_000_00,
      missingFromRequestedList: true,
    });
  });

  it('an unknown part is not found', () => {
    expect(demoResolve('NOPE-1', 1, null).found).toBe(false);
  });

  it('searches by part number or name and carries the tax rate', () => {
    const hits = demoSearch('cable', null, 15);
    expect(hits.map((h) => h.partNumber)).toEqual(['CBL-3C-2.5']);
    expect(hits[0].taxRateBasisPoints).toBe(1200);
  });

  it('offers the demo price lists', () => {
    expect(demoPriceLists().map((l) => l.id)).toEqual(['demo-west', 'demo-general']);
  });
});

describe('demo quote writing', () => {
  const line = (over: Record<string, unknown>) => ({
    order: 1,
    description: 'Item',
    quantity: 1,
    unit: 'no',
    unitPriceInPaise: 0,
    ...over,
  });

  it('takes the price and the parts own GST from the list, and adds tax by rate', () => {
    const q = demoWrite(base, {
      taxRateBasisPoints: 1800,
      lines: [
        line({ order: 1, partNumber: 'VFD-15KW', quantity: 2, useCataloguePrice: true }),
        line({ order: 2, partNumber: 'CBL-3C-2.5', quantity: 100, useCataloguePrice: true }),
        line({ order: 3, partNumber: null, unitPriceInPaise: 1_000_00, useCataloguePrice: false }),
      ],
    });
    expect(q.lines![0]).toMatchObject({
      unitPriceInPaise: 41_000_00,
      priceSource: QuotePriceSource.PriceList,
      taxRateBasisPoints: 1800,
    });
    expect(q.lines![1]).toMatchObject({ unitPriceInPaise: 190_00, taxRateBasisPoints: 1200 });
    expect(q.taxBreakdown!.map((t) => t.rateBasisPoints)).toEqual([1200, 1800]);
    expect(q.taxInPaise).toBe(q.taxBreakdown!.reduce((s, t) => s + (t.taxInPaise ?? 0), 0));
    expect(q.totalInPaise).toBe(q.subtotalInPaise! + q.taxInPaise!);
  });

  it('keeps a saved lines price when asked to, however the list has moved', () => {
    const q = demoWrite(base, {
      lines: [
        line({
          partNumber: 'VFD-15KW',
          unitPriceInPaise: 39_000_00,
          keepPricing: true,
          priceSource: QuotePriceSource.PriceList,
          priceListId: 'demo-west',
          listPriceInPaise: 41_000_00,
        }),
      ],
    });
    expect(q.lines![0]).toMatchObject({
      unitPriceInPaise: 39_000_00,
      priceSource: QuotePriceSource.PriceList,
      listPriceInPaise: 41_000_00,
    });
  });

  it('a hand-typed price stays manual', () => {
    const q = demoWrite(base, {
      lines: [
        line({ partNumber: 'VFD-15KW', unitPriceInPaise: 30_000_00, useCataloguePrice: false }),
      ],
    });
    expect(q.lines![0].priceSource).toBe(QuotePriceSource.Manual);
  });

  it('reprices list-priced lines, leaves typed ones, and only changes the quote when applied', () => {
    const written = demoWrite(base, {
      lines: [
        line({
          order: 1,
          partNumber: 'VFD-15KW',
          unitPriceInPaise: 35_000_00,
          keepPricing: true,
          priceSource: QuotePriceSource.PriceList,
          priceListId: 'demo-west',
        }),
        line({
          order: 2,
          partNumber: 'PLC-S7-1214',
          unitPriceInPaise: 1_00,
          useCataloguePrice: false,
        }),
      ],
    });

    const preview = demoReprice(written, { keepManualPrices: true, apply: false });
    expect(preview.result.lines![0]).toMatchObject({
      changed: true,
      newUnitPriceInPaise: 41_000_00,
    });
    expect(preview.result.lines![1].skipped).toBe('Price was typed by hand.');
    expect(preview.quote).toBe(written);

    const applied = demoReprice(written, { keepManualPrices: true, apply: true });
    expect(applied.quote.lines![0].unitPriceInPaise).toBe(41_000_00);
    expect(applied.quote.lines![1].unitPriceInPaise).toBe(1_00);
  });
});
