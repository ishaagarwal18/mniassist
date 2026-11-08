import { describe, expect, it } from 'vitest';

import { SpaResaleRule } from '../../proxy/oem/oem-pricing.service';
import {
  indiaDay,
  parsePastedDecision,
  resaleLabel,
  resaleValue,
  rupees,
  toPaise,
} from './oem.logic';

describe('oem pricing logic', () => {
  it('reads an India-midnight UTC date as that India day', () => {
    expect(indiaDay('2026-11-14T18:30:00Z')).toBe('2026-11-15');
    expect(indiaDay('2026-11-15T00:00:00Z')).toBe('2026-11-15');
    expect(indiaDay('2026-11-15T00:00:00')).toBe('2026-11-15');
    expect(indiaDay(null)).toBe('');
  });

  it('turns typed rupees into paise and back', () => {
    expect(toPaise('1,00,000')).toBe(1_00_000_00);
    expect(toPaise('₹ 80000.5')).toBe(80_000_50);
    expect(toPaise('abc')).toBeNull();
    expect(rupees(1_00_000_00)).toBe('₹1,00,000');
    expect(resaleValue(SpaResaleRule.MaxDiscount, '15%')).toBe(1500);
    expect(resaleLabel({ resaleRule: SpaResaleRule.MaxDiscount, resaleValue: 1500 })).toBe(
      'Max 15% off',
    );
    expect(resaleLabel({ resaleRule: SpaResaleRule.Floor, resaleValue: 88_000_00 })).toBe(
      'Not below ₹88,000',
    );
  });

  it('matches pasted approval rows to the lines by part number', () => {
    const lines = [
      { id: 'a', partNumber: '6SL3210-1PE' },
      { id: 'b', partNumber: '6ES7214-1AG40' },
    ];
    const text =
      'Part\tQty\tPrice\n6sl3210-1pe\t10\t80,000\t88000\n6ES7214-1AG40;0;\nXYZ-1  2  100';
    const { matched, unmatched } = parsePastedDecision(text, lines);
    expect(matched).toEqual([
      { lineId: 'a', approvedQty: 10, specialBuyInPaise: 80_000_00, resaleValueText: '88000' },
      { lineId: 'b', approvedQty: 0, specialBuyInPaise: null, resaleValueText: null },
    ]);
    expect(unmatched).toEqual(['XYZ-1']);
  });
});
