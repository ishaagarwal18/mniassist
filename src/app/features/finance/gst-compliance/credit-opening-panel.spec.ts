import { previousPeriod, toPaise } from './credit-opening-panel';

describe('credit ledger opening balance', () => {
  it('finds the month before, across a year end', () => {
    expect(previousPeriod('112026')).toBe('102026');
    expect(previousPeriod('012027')).toBe('122026');
  });

  it('reads rupees as paise', () => {
    expect(toPaise('1,250.50')).toBe(125050);
    expect(toPaise('₹ 10')).toBe(1000);
    expect(toPaise('')).toBe(0);
    expect(toPaise('-5')).toBe(null);
    expect(toPaise('1.234')).toBe(null);
    expect(toPaise('abc')).toBe(null);
  });
});
