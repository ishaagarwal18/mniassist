import { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import {
  EInvoiceStatus,
  EWayBillStatus,
  EWayTransportMode,
  GstCancelReason,
  GstPortalMode,
  Gstr1Section,
} from './finance-enums';

export interface GstAuditRegisterDto extends FullAuditedEntityDto<string> {
  documentNumber: string;
  documentDateUtc: string;
  returnPeriod: string;
  section: Gstr1Section;
  counterpartyGstin: string;
  counterpartyLegalName: string;
  placeOfSupplyStateCode: string;
  isReverseChargeApplicable: boolean;
  taxableAmountInPaise: number;
  gstRatePercent: number;
  igstAmountInPaise: number;
  cgstAmountInPaise: number;
  sgstAmountInPaise: number;
  cessAmountInPaise: number;
  totalInvoiceValueInPaise: number;
  eInvoiceStatus: EInvoiceStatus;
  irnHash?: string;
  eInvoiceAckNo?: string;
  eInvoiceAckDateUtc?: string;
  signedQrCode?: string;
  /** Where the IRN was registered. Only Live is a real e-invoice; unset means it did not come from the portal. */
  eInvoiceMode?: GstPortalMode;
  eInvoiceCancelledAtUtc?: string;
  eInvoiceCancelRemarks?: string;
  eInvoiceLastError?: string;
  canGenerateEInvoice?: boolean;
  eWayBillStatus: EWayBillStatus;
  eWayBillNumber?: string;
  eWayBillValidUntilUtc?: string;
  transporterGstin?: string;
  vehicleNumber?: string;
  distanceInKm?: number;
  /** Where the e-way bill was generated. Only Live is a real e-way bill. */
  eWayBillMode?: GstPortalMode;
  eWayBillGeneratedAtUtc?: string;
  eWayBillCancelledAtUtc?: string;
  eWayBillCancelRemarks?: string;
  eWayBillLastError?: string;
  transporterName?: string;
  transportMode?: EWayTransportMode;
  transportDocumentNumber?: string;
  transportDocumentDateUtc?: string;
  canGenerateEWayBill?: boolean;
}

export interface CreateGstAuditRegisterDto {
  documentNumber: string;
  documentDateUtc: string;
  returnPeriod: string;
  section: Gstr1Section;
  counterpartyGstin: string;
  counterpartyLegalName: string;
  placeOfSupplyStateCode: string;
  isReverseChargeApplicable: boolean;
  taxableAmountInPaise: number;
  gstRatePercent: number;
  igstAmountInPaise: number;
  cgstAmountInPaise: number;
  sgstAmountInPaise: number;
  cessAmountInPaise: number;
  totalInvoiceValueInPaise: number;
}

export interface GenerateEWayBillInput {
  transportMode: EWayTransportMode;
  /** Needed for road transport unless a transporter is named. */
  vehicleNumber?: string;
  transporterGstin?: string;
  transporterName?: string;
  /** The LR, RR, airway bill or bill of lading number. */
  transportDocumentNumber?: string;
  transportDocumentDateUtc?: string;
  distanceInKm: number;
}

export interface CancelGstDocumentInput {
  reason: GstCancelReason;
  remarks: string;
}

/** Whether a register row can go to the portal now, and what is missing if it cannot. */
export interface GstPortalReadinessDto {
  mode: GstPortalMode;
  isConnected: boolean;
  eInvoiceProblems: string[];
  eWayBillProblems: string[];
}

export interface GstPortalSettingsDto {
  mode: GstPortalMode;
  username?: string;
  /** A password is stored. It is never sent back. */
  hasPassword: boolean;
  sellerGstin?: string;
  isProfileReady: boolean;
  isConnected: boolean;
}

export interface UpdateGstPortalSettingsInput {
  mode: GstPortalMode;
  username?: string;
  /** Leave empty to keep the stored password. */
  password?: string;
}

export interface GstPortalTestResultDto {
  succeeded: boolean;
  message: string;
}

export interface GetGstAuditRegistersInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  returnPeriod?: string;
  section?: Gstr1Section;
  eInvoiceStatus?: EInvoiceStatus;
  eWayBillStatus?: EWayBillStatus;
}

export interface Gstr1SummaryDto {
  returnPeriod: string;
  totalInvoiceCount: number;
  b2bInvoiceCount: number;
  b2cInvoiceCount: number;
  cdnrCount: number;
  totalTaxableValueInPaise: number;
  totalIgstInPaise: number;
  totalCgstInPaise: number;
  totalSgstInPaise: number;
  totalTaxValueInPaise: number;
  totalInvoiceValueInPaise: number;
}

export interface Gstr3bSummaryDto {
  returnPeriod: string;
  outwardTaxableInPaise: number;
  outwardTaxPayableInPaise: number;
  eligibleItcInPaise: number;
  itcIgstInPaise: number;
  itcCgstInPaise: number;
  itcSgstInPaise: number;
  netGstPayableInCashInPaise: number;
  electronicCreditLedgerBalanceInPaise: number;
}
