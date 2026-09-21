import { mapEnumToOptions } from '@abp/ng.core';

export enum QuotePriceSource {
  Manual = 0,
  PriceList = 1,
  Catalogue = 2,
}

export const quotePriceSourceOptions = mapEnumToOptions(QuotePriceSource);
