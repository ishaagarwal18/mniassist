import { changeOf, istMidnightUtc, istToday, presetDates } from './report-period.store';

describe('Reporting period', () => {
  it('counts the day in India Standard Time, not UTC', () => {
    // 20:00 UTC on 4 Oct is 01:30 IST on 5 Oct.
    expect(istToday(Date.UTC(2026, 9, 4, 20, 0))).toBe('2026-10-05');
    expect(new Date(istMidnightUtc('2026-10-05')).toISOString()).toBe('2026-10-04T18:30:00.000Z');
  });

  it('turns presets into inclusive local dates', () => {
    const today = '2026-10-04';
    expect(presetDates('today', today)).toEqual({ from: today, to: today });
    expect(presetDates('7d', today)).toEqual({ from: '2026-09-28', to: today });
    expect(presetDates('thisMonth', today)).toEqual({ from: '2026-10-01', to: today });
    expect(presetDates('lastMonth', today)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(presetDates('thisQuarter', today)).toEqual({ from: '2026-10-01', to: today });
    expect(presetDates('lastMonth', '2026-01-15')).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('reads a change the right way round', () => {
    expect(changeOf(112, 100, { higherIsBetter: true })).toEqual({ text: '+12%', good: true });
    expect(changeOf(20, 30, { higherIsBetter: false })).toEqual({ text: '−33%', good: true });
    expect(changeOf(5, 0, { higherIsBetter: true })).toEqual({ text: 'new', good: true });
    expect(changeOf(0, 0)).toBeNull();
    expect(changeOf(0.42, 0.38, { rate: true, higherIsBetter: true })).toEqual({
      text: '+4 pts',
      good: true,
    });
    expect(changeOf(100, 90, { higherIsBetter: null })?.good).toBeNull();
  });
});
