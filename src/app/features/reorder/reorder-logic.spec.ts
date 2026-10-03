import type { PublicReorderPartDto } from '../../proxy/reorder/reorder-public.service';
import {
  dueLabel,
  parseDays,
  parseQuantity,
  parseRupees,
  rupees,
  stockText,
  totals,
} from './reorder-logic';

const part = (price: number, gst = 1800): PublicReorderPartDto => ({
  partNumber: 'P' + price,
  description: 'Part',
  unit: 'no',
  unitPriceInPaise: price,
  taxRateBasisPoints: gst,
  suggestedQuantity: 1,
});

describe('re-order logic', () => {
  it('adds lines at their own GST rate and counts unpriced lines apart', () => {
    const t = totals([
      { part: part(1_850_00), quantity: 2 },
      { part: part(1_000_00, 1200), quantity: 1.5 },
      { part: part(0), quantity: 4 },
      { part: part(500_00), quantity: 0 },
    ]);
    expect(t.subtotalInPaise).toBe(3_700_00 + 1_500_00);
    expect(t.taxInPaise).toBe(666_00 + 180_00);
    expect(t.totalInPaise).toBe(t.subtotalInPaise + t.taxInPaise);
    expect(t.unpriced).toBe(1);
    expect(t.lines).toBe(3);
  });

  it('reads quantities as typed', () => {
    expect(parseQuantity('2')).toBe(2);
    expect(parseQuantity(' 1.5 ')).toBe(1.5);
    expect(parseQuantity('')).toBe(0);
    expect(parseQuantity('-1')).toBeNull();
    expect(parseQuantity('1.2345')).toBeNull();
    expect(parseQuantity('20000')).toBeNull();
    expect(parseQuantity('two')).toBeNull();
  });

  it('says when a part is due', () => {
    expect(dueLabel(5)).toBe('Due in 5 days');
    expect(dueLabel(1)).toBe('Due in 1 day');
    expect(dueLabel(0)).toBe('Due today');
    expect(dueLabel(-3)).toBe('Overdue by 3 days');
    expect(dueLabel(null)).toBe('');
  });

  it('shows rupees the Indian way', () => {
    expect(rupees(1_85_000_00)).toBe('₹1,85,000');
    expect(rupees(1_850_50)).toBe('₹1,850.50');
  });

  it('shows the exact quantity when the workspace chooses it, and the band otherwise', () => {
    expect(stockText({ availability: 'InStock', availableQuantity: 12, unit: 'no' })).toBe(
      '12 in stock',
    );
    expect(stockText({ availability: 'Limited', availableQuantity: 2.5, unit: 'L' })).toBe(
      '2.5 L in stock',
    );
    expect(stockText({ availability: 'OnOrder', availableQuantity: 0, unit: 'no' })).toBe(
      'On order',
    );
    expect(stockText({ availability: 'Limited', availableQuantity: null, unit: 'no' })).toBe(
      'Limited stock',
    );
    expect(stockText({ availability: null, availableQuantity: null, unit: 'no' })).toBe('');
  });

  it('reads rupees as staff type them', () => {
    expect(parseRupees('25000')).toBe(25_000_00);
    expect(parseRupees('₹ 25,000.50')).toBe(25_000_50);
    expect(parseRupees('')).toBeNull();
    expect(parseRupees('25k')).toBeUndefined();
  });

  it('reads whole days up to a year', () => {
    expect(parseDays('30')).toBe(30);
    expect(parseDays(' ')).toBeNull();
    expect(parseDays('400')).toBeUndefined();
    expect(parseDays('2.5')).toBeUndefined();
  });
});
