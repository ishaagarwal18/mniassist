import { mapEnumToOptions } from '@abp/ng.core';

export enum PricingCategory {
  Unknown = 0,
  Marketing = 1,
  Utility = 2,
  Authentication = 3,
  Service = 4,
}

export const pricingCategoryOptions = mapEnumToOptions(PricingCategory);
