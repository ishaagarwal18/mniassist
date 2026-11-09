import type { ChipTone } from '../../ui/chip';
import {
  BankGuaranteeKind,
  BankGuaranteeReturnCondition,
  BankGuaranteeStatus,
} from '../../proxy/project-billing/bank-guarantee.service';

export const BG_KIND_TEXT: Record<BankGuaranteeKind, string> = {
  [BankGuaranteeKind.Advance]: 'Advance',
  [BankGuaranteeKind.Performance]: 'Performance',
};

export const BG_STATUS_TEXT: Record<BankGuaranteeStatus, string> = {
  [BankGuaranteeStatus.Active]: 'Active',
  [BankGuaranteeStatus.DueForReturn]: 'Due for return',
  [BankGuaranteeStatus.Returned]: 'Returned',
  [BankGuaranteeStatus.Invoked]: 'Invoked',
  [BankGuaranteeStatus.Expired]: 'Expired',
};

export const BG_STATUS_TONE: Record<BankGuaranteeStatus, ChipTone> = {
  [BankGuaranteeStatus.Active]: 'teal',
  [BankGuaranteeStatus.DueForReturn]: 'amber',
  [BankGuaranteeStatus.Returned]: 'good',
  [BankGuaranteeStatus.Invoked]: 'bad',
  [BankGuaranteeStatus.Expired]: 'neutral',
};

export const BG_RETURN_TEXT: Record<BankGuaranteeReturnCondition, string> = {
  [BankGuaranteeReturnCondition.AdvanceAdjusted]: 'When the advance is adjusted',
  [BankGuaranteeReturnCondition.RetentionReleased]: 'When the retention is released',
  [BankGuaranteeReturnCondition.OnDate]: 'On a date',
};

/** The return condition that usually goes with a kind of guarantee. */
export function defaultReturn(kind: BankGuaranteeKind): BankGuaranteeReturnCondition {
  return kind === BankGuaranteeKind.Advance
    ? BankGuaranteeReturnCondition.AdvanceAdjusted
    : BankGuaranteeReturnCondition.RetentionReleased;
}

/** A guarantee ending soon reads amber at 30 days, red at 7. */
export function expiryTone(daysToExpiry: number): 'bad' | 'warn' | null {
  return daysToExpiry <= 7 ? 'bad' : daysToExpiry <= 30 ? 'warn' : null;
}
