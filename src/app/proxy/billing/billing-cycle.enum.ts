import { mapEnumToOptions } from '@abp/ng.core';

export enum BillingCycle {
  Monthly = 0,
  Annual = 1,
}

export const billingCycleOptions = mapEnumToOptions(BillingCycle);
