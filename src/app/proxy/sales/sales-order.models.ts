import { PagedAndSortedResultRequestDto, FullAuditedEntityDto, EntityDto } from '@abp/ng.core';
import { SalesOrderStatus } from './sales-enums';

export interface SalesOrderLineDto extends EntityDto<string> {
  /** The special price agreement line it is sold under, from the quote. */
  spaLineId?: string | null;
  salesOrderId: string;
  lineNumber: number;
  productId?: string;
  partNumber: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPriceInPaise: number;
  discountPercent: number;
  taxRateBasisPoints: number;
  lineTotalInPaise: number;
  dispatchedQuantity: number;
  invoicedQuantity: number;
  outstandingDispatch: number;
  outstandingInvoice: number;
}

export interface SalesOrderDto extends FullAuditedEntityDto<string> {
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerAccountId?: string;
  customerAccountName?: string;
  customerPoNumber?: string;
  customerPoDate?: string;
  quotationId?: string;
  quotationReference?: string;
  status: SalesOrderStatus;
  paymentTermsDays?: number;
  deliveryTerms?: string;
  billingAddress?: string;
  shippingAddress?: string;
  orderDateUtc: string;
  expectedDeliveryDateUtc?: string;
  confirmedAtUtc?: string;
  cancelledAtUtc?: string;
  subtotalInPaise: number;
  discountInPaise: number;
  taxInPaise: number;
  grandTotalInPaise: number;
  notes?: string;
  internalNotes?: string;
  lines: SalesOrderLineDto[];
}

export interface CreateSalesOrderLineDto {
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

export interface CreateSalesOrderDto {
  orderNumber?: string;
  customerId: string;
  customerAccountId?: string;
  customerPoNumber?: string;
  customerPoDate?: string;
  quotationId?: string;
  paymentTermsDays?: number;
  deliveryTerms?: string;
  billingAddress?: string;
  shippingAddress?: string;
  orderDateUtc?: string;
  expectedDeliveryDateUtc?: string;
  discountInPaise: number;
  notes?: string;
  internalNotes?: string;
  lines: CreateSalesOrderLineDto[];
}

export interface UpdateSalesOrderDto {
  customerPoNumber?: string;
  customerPoDate?: string;
  paymentTermsDays?: number;
  deliveryTerms?: string;
  billingAddress?: string;
  shippingAddress?: string;
  expectedDeliveryDateUtc?: string;
  discountInPaise: number;
  notes?: string;
  internalNotes?: string;
  lines?: CreateSalesOrderLineDto[];
}

export interface CreateOrderFromQuotationDto {
  quotationId: string;
  customerPoNumber?: string;
  customerPoDate?: string;
  paymentTermsDays?: number;
  deliveryTerms?: string;
}

export interface GetSalesOrdersInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: SalesOrderStatus;
  customerId?: string;
  customerAccountId?: string;
}
