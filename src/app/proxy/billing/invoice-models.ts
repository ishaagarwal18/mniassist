import type { EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { InvoiceLineKind } from './invoice-line-kind.enum';
import type { InvoiceState } from './invoice-state.enum';
import type { PricingCategory } from '../messaging/pricing-category.enum';

export interface InvoiceLineDto extends EntityDto<string> {
  lineNumber: number;
  kind: InvoiceLineKind;
  description: string;
  /** SAC for a service, HSN for goods. Required on every line by GST rules. */
  hsnOrSacCode: string;
  quantity: number;
  unitPriceInPaise: number;
  taxableValueInPaise: number;
  /** Basis points. 1800 = 18%. */
  gstRateBasisPoints: number;
  taxInPaise: number;
  totalInPaise: number;
  usagePeriodLabel?: string;
}

export interface InvoiceDto extends EntityDto<string> {
  number: string;
  financialYear: string;
  state: InvoiceState;
  periodStartUtc: string;
  periodEndUtc: string;
  issuedAtUtc?: string;
  dueAtUtc?: string;
  paidAtUtc?: string;

  supplierGstin: string;
  supplierLegalName: string;
  customerGstin?: string;
  customerLegalName: string;
  customerAddress?: string;
  placeOfSupplyStateCode: string;

  /** Drives whether the client shows one IGST line or a CGST/SGST pair. */
  isInterState: boolean;
  reverseCharge: boolean;

  taxableValueInPaise: number;
  cgstInPaise: number;
  sgstInPaise: number;
  igstInPaise: number;
  roundOffInPaise: number;
  totalInPaise: number;
  currencyCode: string;

  creditsInvoiceId?: string;
  creditedByInvoiceId?: string;
  notes?: string;
  lines: InvoiceLineDto[];
}

export interface InvoiceListRequestDto extends PagedAndSortedResultRequestDto {
  state?: InvoiceState;
  fromUtc?: string;
  toUtc?: string;
}

export interface GenerateInvoiceDto {
  periodStartUtc: string;
  periodEndUtc: string;
  /** Two-digit GST state code. Decides CGST/SGST versus IGST, and is frozen on the invoice. */
  placeOfSupplyStateCode: string;
  customerGstin?: string;
  customerLegalName: string;
  customerAddress?: string;
}

export interface CreditNoteDto {
  invoiceId: string;
  reason: string;
}

export interface ReconciliationVarianceDto extends EntityDto<string> {
  category: PricingCategory;
  ourCount: number;
  metaCount: number;
  ourCostInPaise: number;
  metaCostInPaise: number;
  costVarianceInPaise: number;
  countVariance: number;
  /** A hint from the shape of the difference, not a verdict. */
  likelyCause?: string;
}

export interface ReconciliationRunDto extends EntityDto<string> {
  channelId: string;
  channelDisplayNumber?: string;
  periodStartUtc: string;
  periodEndUtc: string;
  runAtUtc: string;
  source: string;
  ourConversationCount: number;
  metaConversationCount: number;
  ourCostInPaise: number;
  metaCostInPaise: number;
  costVarianceInPaise: number;
  costVarianceBasisPoints: number;
  toleranceBasisPoints: number;
  withinTolerance: boolean;
  needsAttention: boolean;
  acknowledgedAtUtc?: string;
  acknowledgedByName?: string;
  acknowledgementNote?: string;
  variances: ReconciliationVarianceDto[];
}

export interface MetaBilledFigureDto {
  conversationCount: number;
  costInPaise: number;
}

export interface RunReconciliationDto {
  channelId: string;
  periodStartUtc: string;
  periodEndUtc: string;
  /**
   * Meta's own figures, entered from the statement. There is no API that returns
   * billed volume, so this is a manual input rather than a fetch pretending not to be.
   */
  metaFigures: Record<number, MetaBilledFigureDto>;
  source: string;
  toleranceBasisPoints?: number;
}

export interface AcknowledgeReconciliationDto {
  note?: string;
}
