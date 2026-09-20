import { mapEnumToOptions } from '@abp/ng.core';

export enum SalesPeriodKind {
  Month = 0,
  Quarter = 1,
}

export const salesPeriodKindOptions = mapEnumToOptions(SalesPeriodKind);
