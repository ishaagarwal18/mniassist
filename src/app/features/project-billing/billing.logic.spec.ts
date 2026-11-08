import { describe, expect, it } from 'vitest';

import { BillingTrigger } from '../../proxy/project-billing/billing-plan.service';
import { MilestoneRow, amountsOf, planProblem, toInput, totalBp } from './billing.logic';

const row = (name: string, percent: string, trigger = BillingTrigger.Manual): MilestoneRow => ({
  id: null,
  name,
  percent,
  trigger,
  triggerDate: '',
  retention: '10',
  terms: '30',
  locked: false,
});

describe('billing plan logic', () => {
  it('works out the worked example: 70 / 20 / 10 of ₹50,00,000', () => {
    const rows = [row('Supply', '70'), row('SAT', '20'), row('Commissioning', '10')];
    expect(totalBp(rows)).toBe(10_000);
    expect(amountsOf(rows, 50_00_000_00)).toEqual([35_00_000_00, 10_00_000_00, 5_00_000_00]);
    expect(planProblem(rows, '20', 50_00_000_00)).toBeNull();
    expect(toInput(rows[0])).toMatchObject({
      percentBp: 7000,
      retentionPercentBp: 1000,
      paymentTermsDays: 30,
    });
  });

  it('puts paise on the last milestone and checks the plan', () => {
    const thirds = [row('A', '33.33'), row('B', '33.33'), row('C', '33.34')];
    expect(amountsOf(thirds, 10_000_01)).toEqual([3_333_00, 3_333_00, 3_334_01]);
    expect(planProblem([row('A', '50'), row('B', '40')], '0', 100)).toBe(
      'The milestones add up to 90%, not 100%.',
    );
    expect(planProblem([row('A', '10'), row('B', '90')], '20', 100_00)).toBe(
      "The advance can't be more than the first milestone's value.",
    );
    expect(planProblem([row('A', '100', BillingTrigger.Date)], '0', 100)).toBe(
      'Give the date for each milestone billed on a date.',
    );
  });
});
