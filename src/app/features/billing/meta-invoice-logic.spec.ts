import {
  categoryLabel,
  lastMonth,
  metaFigures,
  monthRange,
  rupeesToPaise,
} from './meta-invoice-logic';

describe('Meta invoice logic', () => {
  it('turns a month into the whole calendar month in UTC', () => {
    expect(monthRange('2026-09')).toEqual({
      startUtc: '2026-09-01T00:00:00.000Z',
      endUtc: '2026-10-01T00:00:00.000Z',
    });
    expect(monthRange('2026-12')?.endUtc).toBe('2027-01-01T00:00:00.000Z');
    expect(monthRange('2026-13')).toBeNull();
    expect(monthRange('Sept')).toBeNull();
    expect(lastMonth(new Date(Date.UTC(2026, 0, 15)))).toBe('2025-12');
  });

  it('reads rupees as printed on the invoice', () => {
    expect(rupeesToPaise('₹2,34,000.50')).toBe(2_34_000_50);
    expect(rupeesToPaise('34.5')).toBe(34_50);
    expect(rupeesToPaise('')).toBe(0);
    expect(rupeesToPaise('12.345')).toBeNull();
    expect(rupeesToPaise('abc')).toBeNull();
  });

  it('builds the figures from the lines entered, and names a bad line', () => {
    const ok = metaFigures({
      Marketing: { messages: '3,000', amount: '2,34,000' },
      Utility: { messages: '', amount: '' },
      Authentication: { messages: '120', amount: '14.40' },
    });
    expect(ok).toEqual({
      figures: {
        Marketing: { messageCount: 3000, costInPaise: 2_34_000_00 },
        Authentication: { messageCount: 120, costInPaise: 14_40 },
      },
    });
    expect(metaFigures({ Utility: { messages: 'many', amount: '10' } })).toEqual({
      error: 'Utility: enter the number of paid messages.',
    });
    expect('error' in metaFigures({})).toBe(true);
  });

  it('names categories', () => {
    expect(categoryLabel(1)).toBe('Marketing');
    expect(categoryLabel(5)).toBe('Utility (in window)');
    expect(categoryLabel('Utility')).toBe('Utility');
  });
});
