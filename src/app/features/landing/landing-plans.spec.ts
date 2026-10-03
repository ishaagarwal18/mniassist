import { describe, expect, it } from 'vitest';

import {
  LANDING_PLANS,
  limitLines,
  periodFeeInPaise,
  planByKey,
  planKey,
  priceLabel,
} from './landing-plans';

const plan = (name: string) => LANDING_PLANS.find((p) => p.name === name)!;

describe('landing plans', () => {
  it('lists the ladder in order, matching SubscriptionPlanCatalog', () => {
    expect(
      LANDING_PLANS.map((p) => [p.name, p.monthlyFeeInPaise, p.seats, p.channels, p.contacts]),
    ).toEqual([
      ['Starter', 1_99_900, 3, 1, 2_500],
      ['Growth', 4_99_900, 10, 2, 25_000],
      ['Pro', 9_99_900, 25, 5, 1_00_000],
      ['Enterprise', 24_99_900, 50, 20, null],
    ]);
  });

  it('charges annual billing at ten months', () => {
    expect(periodFeeInPaise(plan('Growth'), 'monthly')).toBe(4_99_900);
    expect(periodFeeInPaise(plan('Growth'), 'annual')).toBe(49_99_000);
  });

  it('labels prices in rupees, with Enterprise as a floor', () => {
    expect(priceLabel(plan('Starter'), 'monthly')).toBe('₹1,999');
    expect(priceLabel(plan('Pro'), 'annual')).toBe('₹99,990');
    expect(priceLabel(plan('Enterprise'), 'monthly')).toBe('from ₹24,999');
  });

  it('describes limits in plain words', () => {
    expect(limitLines(plan('Starter'))).toEqual([
      '3 team members',
      '1 WhatsApp number',
      '2,500 contacts',
    ]);
    expect(limitLines(plan('Pro'))[2]).toBe('1,00,000 contacts');
    expect(limitLines(plan('Enterprise'))[2]).toBe('Unlimited contacts');
  });
});

describe('plan links', () => {
  it('round-trips every plan through its key', () => {
    for (const p of LANDING_PLANS) expect(planByKey(planKey(p))).toBe(p);
  });

  it('ignores case and surrounding spaces', () => {
    expect(planByKey(' Growth ')?.name).toBe('Growth');
  });

  it('rejects anything that is not a plan', () => {
    expect(planByKey('free')).toBeUndefined();
    expect(planByKey('')).toBeUndefined();
    expect(planByKey(null)).toBeUndefined();
  });
});
