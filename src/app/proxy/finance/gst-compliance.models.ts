import { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import {
  EInvoiceStatus,
  EWayBillStatus,
  EWayTransportMode,
  GstCancelReason,
  GstPortalMode,
  Gstr1Section,
  Gstr2bDocumentType,
  Gstr2bLineMatch,
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
  totalCessInPaise?: number;
  /** Taxable value by table: B2B (4), B2C (5 + 7), credit/debit notes (9B). Absent from an older API. */
  b2bTaxableValueInPaise?: number;
  b2cTaxableValueInPaise?: number;
  cdnrTaxableValueInPaise?: number;
}

/** An amount split by tax head, in paise. */
export interface GstHeadsDto {
  igstInPaise: number;
  cgstInPaise: number;
  sgstInPaise: number;
  cessInPaise: number;
  totalInPaise: number;
}

/** GSTR-3B for a return period, as the form's tables 3.1 and 4 and the set-off. */
export interface Gstr3bSummaryDto {
  returnPeriod: string;
  outwardTaxableInPaise: number;
  outwardTaxPayableInPaise: number;
  /** Net input tax credit, Table 4(C). */
  eligibleItcInPaise: number;
  itcIgstInPaise: number;
  itcCgstInPaise: number;
  itcSgstInPaise: number;
  /** Tax left to pay in cash after the set-off, reverse-charge tax included. */
  netGstPayableInCashInPaise: number;
  /** Credit left after the set-off. */
  electronicCreditLedgerBalanceInPaise: number;
  outwardTax: GstHeadsDto;
  nilRatedInPaise: number;
  reverseChargeTaxableInPaise: number;
  reverseChargeTax: GstHeadsDto;
  itcImports: GstHeadsDto;
  itcReverseCharge: GstHeadsDto;
  itcAllOther: GstHeadsDto;
  /** 4(A)(4): credit passed on by the business's Input Service Distributor. */
  itcIsd: GstHeadsDto;
  /** The electronic credit ledger's balance at the start of the month, as entered. */
  openingCreditBalance: GstHeadsDto;
  hasOpeningCreditBalance: boolean;
  itcReversed: GstHeadsDto;
  netItc: GstHeadsDto;
  itcIneligible: GstHeadsDto;
  paidFromCredit: GstHeadsDto;
  payableInCash: GstHeadsDto;
  creditCarriedForward: GstHeadsDto;
  hasGstr2b: boolean;
  gstr2bGeneratedOn?: string;
  billsMatched: number;
  billsWithTaxMismatch: number;
  billsMissingIn2b: number;
  gstr2bInvoicesNotInBooks: number;
  gstr2bNotInBooksTaxInPaise: number;
  notes: string[];
}

/** The electronic credit ledger's opening balance for a month. Paise. */
export interface GstCreditOpeningDto {
  returnPeriod: string;
  igstInPaise: number;
  cgstInPaise: number;
  sgstInPaise: number;
  cessInPaise: number;
  note?: string;
  updatedAtUtc?: string;
}

export interface SetGstCreditOpeningInput {
  returnPeriod: string;
  igstInPaise: number;
  cgstInPaise: number;
  sgstInPaise: number;
  cessInPaise: number;
  note?: string;
}

/** Whether GSTR-2B can be pulled from the GST portal, and the open session. */
export interface GstPortalSessionDto {
  isConfigured: boolean;
  providerName: string;
  isSignedIn: boolean;
  portalUsername?: string;
  expiresAtUtc?: string;
  gstin?: string;
}

export interface ImportGstr2bInput {
  returnPeriod: string;
  fileName?: string;
  json: string;
}

export interface Gstr2bStatementDto {
  returnPeriod: string;
  gstin: string;
  generatedOn?: string;
  fileName?: string;
  importedAtUtc: string;
  invoices: number;
  creditNotes: number;
  debitNotes: number;
  imports: number;
  isdDocuments: number;
  matched: number;
  taxMismatch: number;
  notInBooks: number;
  billsMissing: number;
  reportedItcInPaise: number;
  skippedSections: Record<string, number>;
}

export interface Gstr2bLineDto {
  id: string;
  documentType: Gstr2bDocumentType;
  supplierGstin: string;
  supplierName?: string;
  documentNumber: string;
  documentDateUtc?: string;
  invoiceValueInPaise: number;
  taxableInPaise: number;
  igstInPaise: number;
  cgstInPaise: number;
  sgstInPaise: number;
  cessInPaise: number;
  isReverseCharge: boolean;
  isItcAvailable: boolean;
  itcUnavailableReason?: string;
  match: Gstr2bLineMatch;
  vendorBillId?: string;
  vendorBillNumber?: string;
  billTaxInPaise?: number;
}

export interface GetGstr2bLinesInput {
  returnPeriod: string;
  match?: Gstr2bLineMatch;
  filter?: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface Gstr2bMissingBillDto {
  id: string;
  billNumber: string;
  vendorInvoiceNumber: string;
  vendorInvoiceDateUtc: string;
  supplierName: string;
  supplierGstin?: string;
  taxInPaise: number;
}
