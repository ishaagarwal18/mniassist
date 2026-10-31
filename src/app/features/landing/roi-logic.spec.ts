import { describe, expect, it } from 'vitest';
import { RoiInputs, roiEstimate } from './roi-logic';

const inputs: RoiInputs = {
  callsPerMonth: 1000,
  averageCallMinutes: 3,
  staffMinutesPerCall: 6,
  staffCostPerHour: 300,
  aiHandledPercent: 70,
  aiPricePerMinute: 2,
  planFeePerMonth: 9999,
};

describe('ROI estimate', () => {
  it('weighs the staff time the AI-handled calls save against AI minutes and the plan', () => {
    expect(roiEstimate(inputs)).toEqual({
      aiHandledCalls: 700,
      staffHoursSaved: 70,
      staffCostSaved: 21_000,
      aiMinutes: 3000,
      aiCallCost: 6000,
      planFee: 9999,
      monthlySaving: 5001,
      returnMultiple: 1.3,
    });
  });

  it('shows nothing until the visitor enters the AI rate', () => {
    expect(roiEstimate({ ...inputs, aiPricePerMinute: null })).toBeNull();
    expect(roiEstimate({ ...inputs, aiPricePerMinute: -1 })).toBeNull();
  });

  it('can come out negative, and keeps silly inputs in range', () => {
    expect(roiEstimate({ ...inputs, callsPerMonth: 10 })!.monthlySaving).toBeLessThan(0);
    const wild = roiEstimate({ ...inputs, aiHandledPercent: 250, staffMinutesPerCall: -5 })!;
    expect(wild.aiHandledCalls).toBe(1000);
    expect(wild.staffHoursSaved).toBe(0);
  });
});
