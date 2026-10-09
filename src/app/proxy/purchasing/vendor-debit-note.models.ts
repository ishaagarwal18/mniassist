import { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { VendorDebitNoteStatus } from './purchasing-enums';

export interface VendorDebitNoteLineDto extends EntityDto<string> {
  vendorDebitNoteId: string;
  lineNumber: number;
  partNumber: string;
  description: string;
  quantity: number;
  unitPriceInPaise: number;
  taxableAmountInPaise: number;
  taxRateBasisPoints: number;
  cgstAmountInPaise: number;
  sgstAmountInPaise: number;
  igstAmountInPaise: number;
  lineTotalInPaise: number;
}

export interface VendorDebitNoteDto extends FullAuditedEntityDto<string> {
  debitNoteNumber: string;
  supplierId: string;
  supplierName: string;
  vendorBillId?: string;
  vendorBillNumber?: string;
  goodsReceiptNoteId?: string;
  goodsReceiptNoteNumber?: string;
  status: VendorDebitNoteStatus;
  issueDateUtc: string;
  reason: string;
  isInterState: boolean;
  taxableAmountInPaise: number;
  cgstInPaise: number;
  sgstInPaise: number;
  igstInPaise: number;
  grandTotalInPaise: number;
  remarks?: string;
  lines: VendorDebitNoteLineDto[];
}

export interface CreateVendorDebitNoteLineDto {
  partNumber: string;
  description: string;
  quantity: number;
  unitPriceInPaise: number;
  taxRateBasisPoints: number;
}

export interface CreateVendorDebitNoteDto {
  debitNoteNumber?: string;
  supplierId: string;
  supplierName: string;
  reason: string;
  isInterState: boolean;
  vendorBillId?: string;
  vendorBillNumber?: string;
  goodsReceiptNoteId?: string;
  goodsReceiptNoteNumber?: string;
  remarks?: string;
  lines: CreateVendorDebitNoteLineDto[];
}

export interface GetVendorDebitNotesInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: VendorDebitNoteStatus;
  supplierId?: string;
  vendorBillId?: string;
}
