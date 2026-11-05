import { describe, expect, it } from 'vitest';
import { BusinessLine, ProjectionPlanItemDto } from '../../../proxy/projections';
import {
  fiscalYearOf,
  fiscalYearOptions,
  itemsFromAnnualTarget,
  itemsOfRows,
  newPlanProblem,
  quartersOf,
  rowsOf,
  rowsProblem,
} from './projection-plan.logic';

describe('projection-plan.logic', () => {
  it('knows the Indian fiscal year', () => {
    expect(fiscalYearOf(new Date(2026, 10, 4))).toBe('2026-27');
    expect(fiscalYearOf(new Date(2027, 1, 1))).toBe('2026-27');
    expect(fiscalYearOptions(new Date(2026, 10, 4))).toEqual([
      '2028-29',
      '2027-28',
      '2026-27',
      '2025-26',
    ]);
    expect(quartersOf('2026-27')[3]).toMatchObject({
      label: 'Q4 FY2026-27 (Jan–Mar)',
      start: '2027-01-01T00:00:00.000Z',
      end: '2027-04-01T00:00:00.000Z',
    });
  });

  it('spreads an annual target over quarters and lines at the margin asked for', () => {
    const items = itemsFromAnnualTarget('2026-27', 1_00_00_000, 30);
    expect(items).toHaveLength(20);
    const revenue = items.reduce((s, i) => s + i.projectedRevenueInPaise, 0);
    const cogs = items.reduce((s, i) => s + i.projectedCogsInPaise, 0);
    expect(Math.abs(revenue - 1_00_00_000_00)).toBeLessThan(25);
    expect(Math.round(((revenue - cogs) / revenue) * 1000) / 10).toBe(30);
  });

  it('edits lines as rupees and percent, and checks them', () => {
    const saved = {
      id: 'i1',
      planId: 'p',
      periodLabel: 'Q1',
      periodStartDate: 's',
      periodEndDate: 'e',
      businessLine: BusinessLine.DrivesAndMotors,
      projectedRevenueInPaise: 10_00_000_00,
      projectedCogsInPaise: 7_80_000_00,
      projectedOperatingExpensesInPaise: 50_000_00,
      projectedMarginPercent: 22,
      capacityHoursRequired: 10,
    } as ProjectionPlanItemDto;
    const rows = rowsOf([saved]);
    expect(rows[0]).toMatchObject({ revenue: '1000000', margin: '22', opexShare: 0.05 });

    rows[0].revenue = '12,00,000';
    rows[0].margin = '25';
    const [item] = itemsOfRows(rows);
    expect(item.projectedRevenueInPaise).toBe(12_00_000_00);
    expect(item.projectedCogsInPaise).toBe(9_00_000_00);
    expect(item.projectedOperatingExpensesInPaise).toBe(60_000_00);
    expect(rowsProblem([{ ...rows[0], margin: '120' }])).toContain('margin');
    expect(rowsProblem([{ ...rows[0], revenue: '' }])).toContain('revenue');
    expect(rowsProblem(rows)).toBeNull();
  });

  it('needs a name and a revenue target for a new plan', () => {
    expect(newPlanProblem(' ', '100', '25')).toContain('name');
    expect(newPlanProblem('FY plan', '', '25')).toContain('revenue');
    expect(newPlanProblem('FY plan', '1,00,00,000', '25')).toBeNull();
  });
});
