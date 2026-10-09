import { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { EInvoiceStatus, EWayBillStatus, Gstr1Section } from './finance-enums';

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
  eWayBillStatus: EWayBillStatus;
  ewayBillNumber?: string;
  ewayBillValidUntilUtc?: string;
  transporterGstin?: string;
  vehicleNumber?: string;
  distanceInKm?: number;
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
  vehicleNumber: string;
  transporterGstin?: string;
  distanceInKm: number;
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
  netGstPayableInCashInPaise: number;
  electronicCreditLedgerBalanceInPaise: number;
}
