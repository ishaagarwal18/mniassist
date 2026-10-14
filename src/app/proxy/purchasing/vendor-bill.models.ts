import { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import {
  Gstr2bMatchStatus,
  ThreeWayMatchStatus,
  VendorBillStatus,
  VendorPaymentMode,
} from './purchasing-enums';

export interface VendorBillLineDto extends EntityDto<string> {
  vendorBillId: string;
  lineNumber: number;
  purchaseOrderLineId?: string;
  goodsReceiptNoteLineId?: string;
  partNumber: string;
  description: string;
  hsnCode?: string;
  billedQuantity: number;
  unitPriceInPaise: number;
  discountPercent: number;
  taxableAmountInPaise: number;
  taxRateBasisPoints: number;
  cgstAmountInPaise: number;
  sgstAmountInPaise: number;
  igstAmountInPaise: number;
  lineTotalInPaise: number;
}

export interface VendorBillPaymentDto extends EntityDto<string> {
  vendorBillId: string;
  paymentDateUtc: string;
  amountInPaise: number;
  paymentMode: VendorPaymentMode;
  referenceNumber?: string;
  tdsCertificateNumber?: string;
  remarks?: string;
}

export interface VendorBillDto extends FullAuditedEntityDto<string> {
  billNumber: string;
  vendorInvoiceNumber: string;
  vendorInvoiceDateUtc: string;
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  purchaseOrderId?: string;
  purchaseOrderReference?: string;
  goodsReceiptNoteId?: string;
  goodsReceiptNoteNumber?: string;
  status: VendorBillStatus;
  threeWayMatchStatus: ThreeWayMatchStatus;
  dueDateUtc: string;
  subtotalInPaise: number;
  discountInPaise: number;
  cgstInPaise: number;
  sgstInPaise: number;
  igstInPaise: number;
  totalTaxInPaise: number;
  tdsSection?: string;
  tdsRateBasisPoints: number;
  tdsDeductedInPaise: number;
  grandTotalInPaise: number;
  netPayableInPaise: number;
  paidAmountInPaise: number;
  balanceDueInPaise: number;
  gstr2bMatchStatus: Gstr2bMatchStatus;
  isReverseCharge: boolean;
  remarks?: string;
  lines: VendorBillLineDto[];
  payments: VendorBillPaymentDto[];
}

export interface CreateVendorBillLineDto {
  purchaseOrderLineId?: string;
  goodsReceiptNoteLineId?: string;
  partNumber: string;
  description: string;
  hsnCode?: string;
  billedQuantity: number;
  unitPriceInPaise: number;
  discountPercent: number;
  taxRateBasisPoints: number;
}

export interface CreateVendorBillDto {
  billNumber?: string;
  vendorInvoiceNumber: string;
  vendorInvoiceDateUtc: string;
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  dueDateUtc: string;
  isInterState: boolean;
  purchaseOrderId?: string;
  purchaseOrderReference?: string;
  goodsReceiptNoteId?: string;
  goodsReceiptNoteNumber?: string;
  tdsSection?: string;
  tdsRateBasisPoints: number;
  isReverseCharge: boolean;
  remarks?: string;
  discountInPaise: number;
  lines: CreateVendorBillLineDto[];
}

export interface RecordVendorBillPaymentDto {
  amountInPaise: number;
  paymentMode: VendorPaymentMode;
  referenceNumber?: string;
  tdsCertificateNumber?: string;
  remarks?: string;
  paymentDateUtc?: string;
}

export interface GetVendorBillsInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: VendorBillStatus;
  threeWayMatchStatus?: ThreeWayMatchStatus;
  gstr2bMatchStatus?: Gstr2bMatchStatus;
  supplierId?: string;
  purchaseOrderId?: string;
}
