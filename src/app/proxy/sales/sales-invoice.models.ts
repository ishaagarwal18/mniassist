import { PagedAndSortedResultRequestDto, FullAuditedEntityDto, EntityDto } from '@abp/ng.core';
import { SalesInvoiceKind, SalesInvoiceStatus, SalesPaymentMode } from './sales-enums';

export interface SalesInvoiceLineDto extends EntityDto<string> {
  /** The special price agreement line it is sold under, from the quote. */
  spaLineId?: string | null;
  salesInvoiceId: string;
  lineNumber: number;
  productId?: string;
  partNumber: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPriceInPaise: number;
  discountPercent: number;
  taxableAmountInPaise: number;
  taxRateBasisPoints: number;
  cgstRateBasisPoints: number;
  sgstRateBasisPoints: number;
  igstRateBasisPoints: number;
  cgstAmountInPaise: number;
  sgstAmountInPaise: number;
  igstAmountInPaise: number;
  lineTotalInPaise: number;
}

export interface SalesInvoicePaymentDto extends EntityDto<string> {
  salesInvoiceId: string;
  paymentDateUtc: string;
  amountInPaise: number;
  paymentMode: SalesPaymentMode;
  referenceNumber?: string;
  remarks?: string;
}

export interface SalesInvoiceDto extends FullAuditedEntityDto<string> {
  invoiceNumber: string;
  kind: SalesInvoiceKind;
  status: SalesInvoiceStatus;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  deliveryChallanId?: string;
  deliveryChallanNumber?: string;
  customerId: string;
  customerName: string;
  customerAccountId?: string;
  customerAccountName?: string;
  customerGstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  placeOfSupplyStateCode?: string;
  isInterState: boolean;
  issueDateUtc: string;
  dueDateUtc: string;
  subtotalInPaise: number;
  discountInPaise: number;
  cgstInPaise: number;
  sgstInPaise: number;
  igstInPaise: number;
  totalTaxInPaise: number;
  grandTotalInPaise: number;
  paidAmountInPaise: number;
  balanceDueInPaise: number;
  irn?: string;
  qrCodeData?: string;
  eWayBillNumber?: string;
  notes?: string;
  termsAndConditions?: string;
  lines: SalesInvoiceLineDto[];
  payments: SalesInvoicePaymentDto[];
}

export interface CreateSalesInvoiceLineDto {
  /** The special price agreement line it is sold under, from the quote. */
  spaLineId?: string | null;
  productId?: string;
  partNumber: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPriceInPaise: number;
  discountPercent: number;
  taxRateBasisPoints: number;
}

export interface CreateSalesInvoiceDto {
  invoiceNumber?: string;
  kind?: SalesInvoiceKind;
  originalInvoiceId?: string;
  salesOrderId?: string;
  deliveryChallanId?: string;
  customerId: string;
  customerAccountId?: string;
  customerGstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  placeOfSupplyStateCode?: string;
  isInterState: boolean;
  issueDateUtc?: string;
  dueDateUtc?: string;
  discountInPaise: number;
  irn?: string;
  qrCodeData?: string;
  eWayBillNumber?: string;
  notes?: string;
  termsAndConditions?: string;
  lines: CreateSalesInvoiceLineDto[];
}

export interface RecordSalesInvoicePaymentDto {
  amountInPaise: number;
  paymentMode: SalesPaymentMode;
  referenceNumber?: string;
  paymentDateUtc?: string;
  remarks?: string;
}

export interface GetSalesInvoicesInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: SalesInvoiceStatus;
  kind?: SalesInvoiceKind;
  customerId?: string;
  salesOrderId?: string;
  /** Every invoice for the account's contacts. */
  customerAccountId?: string;
}
