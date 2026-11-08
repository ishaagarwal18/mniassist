import { describe, expect, it } from 'vitest';

import { QuotePriceSource } from '../../proxy/pipeline';
import { SpaMode, SpaOptionDto, SpaResaleRule } from '../../proxy/oem/oem-pricing.service';
import { blankRow } from './quote-pricing';
import { netUnitPaise, spaFindings, spaMargins } from './spa-line.logic';

const option: SpaOptionDto = {
  spaId: 's',
  spaLineId: 'l',
  reference: 'SPA-2026-0001',
  supplierName: 'Siemens',
  mode: SpaMode.ClaimBack,
  validTo: '2026-12-31T18:30:00Z',
  approvedQty: 10,
  remainingQty: 6,
  quotedElsewhereQty: 0,
  normalBuyInPaise: 1_00_000_00,
  specialBuyInPaise: 80_000_00,
  supportPerUnitInPaise: 20_000_00,
  resaleRule: SpaResaleRule.Floor,
  resaleValue: 88_000_00,
};

const row = (price: string, quantity: string, discount = '0') => ({
  ...blankRow(1),
  partNumber: '6SL3210-1PE',
  price,
  quantity,
  discount,
  source: QuotePriceSource.Spa,
});

describe('special price on a quote line', () => {
  it('blocks a price below the floor after discount and warns on quantity and expiry', () => {
    const r = row('90000', '8', '5');
    expect(netUnitPaise(r)).toBe(85_500_00);
    const now = Date.parse('2026-12-20T00:00:00Z');
    const f = spaFindings(r, option, 30, now);
    expect(f.blocks).toEqual(['Price is below the SPA-2026-0001 floor of ₹88,000.']);
    expect(f.warnings).toHaveLength(2);
    expect(f.warnings[1]).toBe('Quantity 8 is over the remaining 6.');
  });

  it('is clean at the floor within the quantity and validity', () => {
    const f = spaFindings(row('88000', '4'), option, 7, Date.parse('2026-12-01T00:00:00Z'));
    expect(f).toEqual({ blocks: [], warnings: [] });
  });

  it('shows the margin before and after the OEM support', () => {
    expect(spaMargins(row('88000', '1'), option)).toEqual({ before: -13.6, after: 9.1 });
  });
});
