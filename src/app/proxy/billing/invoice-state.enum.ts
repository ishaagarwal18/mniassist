import { mapEnumToOptions } from '@abp/ng.core';

export enum InvoiceState {
  Draft = 0,
  Issued = 1,
  Paid = 2,
  Cancelled = 3,
  Credited = 4,
}

export const invoiceStateOptions = mapEnumToOptions(InvoiceState);
