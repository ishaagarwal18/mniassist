import { mapEnumToOptions } from '@abp/ng.core';

export enum InvoiceState {
  Draft = 0,
  Issued = 1,
  Paid = 2,
  Cancelled = 3,
  /** Reversed by a credit note. The original is never edited or deleted. */
  Credited = 4,
}

export const invoiceStateOptions = mapEnumToOptions(InvoiceState);
