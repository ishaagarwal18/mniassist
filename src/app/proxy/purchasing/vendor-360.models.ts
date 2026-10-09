import { EntityDto } from '@abp/ng.core';
import { MsmeClassification } from './purchasing-enums';
import { GoodsReceiptNoteDto } from './goods-receipt-note.models';
import { VendorBillDto } from './vendor-bill.models';
import { VendorDebitNoteDto } from './vendor-debit-note.models';

export interface Vendor360PoSummaryDto {
  id: string;
  reference: string;
  state: string;
  creationTime: string;
  expectedOn?: string;
  subtotalInPaise: number;
  lineCount: number;
}

export interface Vendor360Dto extends EntityDto<string> {
  name: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  msmeCategory: MsmeClassification;
  udyamRegistrationNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  totalPurchasesInPaise: number;
  totalPaidInPaise: number;
  outstandingPayableInPaise: number;
  msmeOverdueInPaise: number;
  leadDays: number;
  qualityAcceptancePercent: number;
  recentPurchaseOrders: Vendor360PoSummaryDto[];
  recentGoodsReceiptNotes: GoodsReceiptNoteDto[];
  recentVendorBills: VendorBillDto[];
  recentDebitNotes: VendorDebitNoteDto[];
}
