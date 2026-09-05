import { mapEnumToOptions } from '@abp/ng.core';

export enum InvoiceLineKind {
  Subscription = 0,
  MessageUsage = 1,
  Adjustment = 2,
  Credit = 3,
}

export const invoiceLineKindOptions = mapEnumToOptions(InvoiceLineKind);
