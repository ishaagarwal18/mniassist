import { mapEnumToOptions } from '@abp/ng.core';

export enum WalletTransactionType {
  TopUp = 0,
  MessageCharge = 1,
  Refund = 2,
  Adjustment = 3,
}

export const walletTransactionTypeOptions = mapEnumToOptions(WalletTransactionType);
