import { mapEnumToOptions } from '@abp/ng.core';

export enum QuotationState {
  Draft = 0,
  Issued = 1,
  Revised = 2,
  Won = 3,
  Lost = 4,
  Expired = 5,
}

export const quotationStateOptions = mapEnumToOptions(QuotationState);
