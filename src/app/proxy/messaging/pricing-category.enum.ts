import { mapEnumToOptions } from '@abp/ng.core';

export enum PricingCategory {
  Unknown = 0,
  Marketing = 1,
  Utility = 2,
  Authentication = 3,
  Service = 4,
  /** A utility template sent inside the customer-service window, when priced separately (Q2). */
  UtilityInWindow = 5,
}

export const pricingCategoryOptions = mapEnumToOptions(PricingCategory);
