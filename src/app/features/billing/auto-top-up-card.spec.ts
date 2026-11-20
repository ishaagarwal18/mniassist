import { autoTopUpProblem, rupeesToPaise } from './auto-top-up-card';

describe('automatic top-up settings', () => {
  it('turns typed rupees into paise', () => {
    expect(rupeesToPaise('2,000')).toBe(200000);
    expect(rupeesToPaise('-5')).toBe(0);
    expect(rupeesToPaise('abc')).toBe(0);
  });

  it('needs a saved card and an amount from ₹100 to the per-charge limit when switched on', () => {
    const max = 15_000_00;
    expect(autoTopUpProblem(false, false, 0, max)).toBeNull();
    expect(autoTopUpProblem(true, false, 200000, max)).toContain('Save a card');
    expect(autoTopUpProblem(true, true, 5000, max)).toContain('at least ₹100');
    expect(autoTopUpProblem(true, true, 15_000_01, max)).toContain('at most ₹15,000');
    expect(autoTopUpProblem(true, true, 15_000_00, max)).toBeNull();
  });
});
