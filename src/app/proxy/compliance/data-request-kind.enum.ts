import { mapEnumToOptions } from '@abp/ng.core';

export enum DataRequestKind {
  Access = 0,
  Correction = 1,
  Erasure = 2,
  ConsentWithdrawal = 3,
}

export const dataRequestKindOptions = mapEnumToOptions(DataRequestKind);
