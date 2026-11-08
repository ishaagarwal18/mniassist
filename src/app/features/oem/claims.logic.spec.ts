import { describe, expect, it } from 'vitest';

import { SpaClaimLineDto, SpaClaimLineState } from '../../proxy/oem/spa-claim.service';
import { allocationOf, settleableLines } from './claims.logic';

const line = (id: string, state: SpaClaimLineState, amount: number, outstanding: number) =>
  ({
    id,
    state,
    amountInPaise: amount,
    outstandingInPaise: outstanding,
  }) as SpaClaimLineDto;

describe('oem claims logic', () => {
  it('turns typed rupees per line into paise, leaving out blanks', () => {
    expect(allocationOf({ a: '20,000', b: '', c: '0', d: '₹ 1500.50' })).toEqual([
      { lineId: 'a', amountInPaise: 20_000_00 },
      { lineId: 'd', amountInPaise: 1_500_50 },
    ]);
  });

  it('offers only open lines with something outstanding', () => {
    const lines = [
      line('open', SpaClaimLineState.Open, 100, 100),
      line('paid', SpaClaimLineState.Settled, 100, 0),
      line('return', SpaClaimLineState.Open, -50, 0),
      line('refused', SpaClaimLineState.Rejected, 100, 0),
    ];
    expect(settleableLines(lines).map((l) => l.id)).toEqual(['open']);
  });
});
