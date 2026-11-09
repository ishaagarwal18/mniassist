import { describe, expect, it } from 'vitest';

import {
  BankGuaranteeKind,
  BankGuaranteeReturnCondition,
} from '../../proxy/project-billing/bank-guarantee.service';
import { defaultReturn, expiryTone } from './guarantees.logic';

describe('bank guarantee logic', () => {
  it('suggests when each kind comes back and colours an ending guarantee', () => {
    expect(defaultReturn(BankGuaranteeKind.Advance)).toBe(
      BankGuaranteeReturnCondition.AdvanceAdjusted,
    );
    expect(defaultReturn(BankGuaranteeKind.Performance)).toBe(
      BankGuaranteeReturnCondition.RetentionReleased,
    );
    expect(expiryTone(45)).toBeNull();
    expect(expiryTone(30)).toBe('warn');
    expect(expiryTone(7)).toBe('bad');
  });
});
