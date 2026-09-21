import { QuotePriceSource } from '../../proxy/pipeline';
import {
  QuoteRow,
  belowListPaise,
  belowMinimum,
  blankRow,
  lineTotalPaise,
  rowFromLine,
  rowFromMatch,
  taxBasisPointsOf,
  totalsOf,
} from './quote-pricing';

const row = (over: Partial<QuoteRow>): QuoteRow => ({ ...blankRow(1), ...over });

describe('quote line arithmetic', () => {
  it('multiplies quantity by price and takes the discount off', () => {
    expect(lineTotalPaise(row({ quantity: '3', price: '1000', discount: '10' }))).toBe(270_000);
  });

  it('reads Indian-formatted rupees', () => {
    expect(lineTotalPaise(row({ quantity: '1', price: '₹1,20,000' }))).toBe(12_000_000);
  });

  it('treats unreadable numbers as nothing rather than NaN', () => {
    expect(lineTotalPaise(row({ quantity: 'x', price: '10' }))).toBe(0);
  });

  it('adds GST on the subtotal', () => {
    const t = totalsOf([row({ quantity: '2', price: '500' })], 1800);
    expect(t).toMatchObject({ subtotalPaise: 100_000, taxPaise: 18_000, totalPaise: 118_000 });
    expect(t.breakdown).toEqual([{ rateBasisPoints: 1800, netPaise: 100_000, taxPaise: 18_000 }]);
  });

  it('taxes each line at its own rate and groups by rate', () => {
    const t = totalsOf(
      [
        row({ quantity: '1', price: '1000', tax: '12' }),
        row({ quantity: '1', price: '500', tax: '12' }),
        row({ quantity: '1', price: '2000', tax: '5' }),
        row({ quantity: '1', price: '3000', tax: '' }),
      ],
      1800,
    );
    expect(t.breakdown.map((b) => [b.rateBasisPoints, b.taxPaise])).toEqual([
      [500, 10_000],
      [1200, 18_000],
      [1800, 54_000],
    ]);
    expect(t.taxPaise).toBe(82_000);
    expect(t.totalPaise).toBe(732_000);
  });

  it('a zero rate on a line is zero tax, not the default', () => {
    expect(totalsOf([row({ quantity: '1', price: '100', tax: '0' })], 1800).taxPaise).toBe(0);
  });

  it('reads a typed line rate, blank meaning left to the product or the quotation', () => {
    expect(taxBasisPointsOf(row({ tax: '' }))).toBeNull();
    expect(taxBasisPointsOf(row({ tax: '12.5' }))).toBe(1250);
    expect(taxBasisPointsOf(row({ tax: '99' }))).toBe(3000);
  });
});

describe('quote line warnings', () => {
  it('flags a quantity under the minimum order, but not when there is none', () => {
    expect(belowMinimum(row({ quantity: '5', moq: 10 }))).toBe(true);
    expect(belowMinimum(row({ quantity: '10', moq: 10 }))).toBe(false);
    expect(belowMinimum(row({ quantity: '1', moq: 0 }))).toBe(false);
  });

  it('shows how far under the list price a typed price is', () => {
    expect(belowListPaise(row({ price: '90', listPaise: 10_000 }))).toBe(1_000);
    expect(belowListPaise(row({ price: '100', listPaise: 10_000 }))).toBe(0);
    expect(belowListPaise(row({ price: '120', listPaise: 10_000 }))).toBe(0);
    expect(belowListPaise(row({ price: '1', listPaise: null }))).toBe(0);
  });
});

describe('quote rows', () => {
  it('a catalogue match becomes a list-priced line', () => {
    const r = rowFromMatch(
      {
        partNumber: 'VFD-15KW',
        name: '15 kW drive',
        unit: 'no',
        unitPriceInPaise: 4_100_000,
        source: QuotePriceSource.PriceList,
        priceListName: 'West',
        minimumOrderQuantity: 2,
      },
      7,
    );
    expect(r).toMatchObject({ fromList: true, price: '41000', listName: 'West', moq: 2, key: 7, tax: '' });
  });

  it('a match brings the products GST rate with it', () => {
    expect(rowFromMatch({ partNumber: 'X', name: 'X', taxRateBasisPoints: 1200 }, 1).tax).toBe('12');
  });

  it('a saved manual line stays manual; a saved list line stays list-priced', () => {
    const manual = rowFromLine({ id: 'a', unitPriceInPaise: 500, priceSource: QuotePriceSource.Manual }, 1);
    const listed = rowFromLine({ id: 'b', unitPriceInPaise: 500, priceSource: QuotePriceSource.PriceList }, 2);
    expect(manual.fromList).toBe(false);
    expect(listed.fromList).toBe(true);
    expect(listed.keep).toBe(true);   // saving must not quietly reprice it
    expect(manual.keep).toBe(false);
  });
});
