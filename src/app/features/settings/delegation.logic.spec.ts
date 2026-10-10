import { delegationPeriod, indianToday } from './delegation.logic';

const NOW = new Date('2026-10-10T06:30:00Z'); // 12:00 in India

describe('delegation period', () => {
  it('runs from now to the end of the last day in India', () => {
    expect(delegationPeriod('2026-10-10', '2026-10-17', NOW)).toEqual({
      startTime: '2026-10-10T06:30:00.000Z',
      endTime: '2026-10-17T18:29:59.000Z',
    });
  });

  it('starts at midnight in India for a future first day', () => {
    expect(delegationPeriod('2026-10-12', '2026-10-12', NOW)).toEqual({
      startTime: '2026-10-11T18:30:00.000Z',
      endTime: '2026-10-12T18:29:59.000Z',
    });
  });

  it('refuses more than 90 days, reversed dates and periods already over', () => {
    expect(delegationPeriod('2026-10-10', '2027-02-10', NOW)).toContain('90 days');
    expect(delegationPeriod('2026-10-12', '2026-10-11', NOW)).toContain('on or after');
    expect(delegationPeriod('2026-10-01', '2026-10-05', NOW)).toContain('already be over');
    expect(delegationPeriod('', '2026-10-05', NOW)).toContain('Choose');
  });

  it('knows today in India', () => {
    expect(indianToday(new Date('2026-10-10T20:00:00Z'))).toBe('2026-10-11');
  });
});
