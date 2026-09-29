import type { SubscriptionPlan } from './subscription-plan.enum';
import type { EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { WalletTransactionType } from './wallet-transaction-type.enum';
import type { InvoiceState } from './invoice-state.enum';
import type { InvoiceLineKind } from './invoice-line-kind.enum';
import type { PricingCategory } from '../messaging/pricing-category.enum';

export interface AcknowledgeReconciliationDto {
  note?: string | null;
}

export interface BillingSummaryDto {
  periodStartUtc?: string;
  periodEndUtc?: string;
  usage?: UsageByCategoryDto[];
  totalBilledInPaise?: number;
  taxInPaise?: number;
  totalWithTaxInPaise?: number;
  freeMessageCount?: number;
  avoidedChargeInPaise?: number;
  plan?: SubscriptionPlan;
  subscriptionFeeInPaise?: number;
  currentPeriodEndUtc?: string | null;
}

export interface ChangePlanInput {
  plan?: SubscriptionPlan;
}

export interface PlanUsageDto {
  channelLimit?: number;
  channelsUsed?: number;
  seatLimit?: number;
  seatsUsed?: number;
  contactLimit?: number;
  contactsUsed?: number;
  features?: string[];
}

export interface ConfigureAutoTopUpInput {
  enabled?: boolean;
  amountInPaise?: number;
  thresholdInPaise?: number;
}

export interface CreditNoteDto {
  invoiceId?: string;
  reason: string;
}

export interface GenerateInvoiceDto {
  periodStartUtc?: string;
  periodEndUtc?: string;
  placeOfSupplyStateCode: string;
  customerGstin?: string | null;
  customerLegalName: string;
  customerAddress?: string | null;
}

export interface GetWalletTransactionsInput extends PagedAndSortedResultRequestDto {
  type?: WalletTransactionType | null;
  fromUtc?: string | null;
  toUtc?: string | null;
}

export interface InvoiceDto extends EntityDto<string> {
  number?: string;
  financialYear?: string;
  state?: InvoiceState;
  periodStartUtc?: string;
  periodEndUtc?: string;
  issuedAtUtc?: string | null;
  dueAtUtc?: string | null;
  paidAtUtc?: string | null;
  supplierGstin?: string;
  supplierLegalName?: string;
  customerGstin?: string | null;
  customerLegalName?: string;
  customerAddress?: string | null;
  placeOfSupplyStateCode?: string;
  isInterState?: boolean;
  reverseCharge?: boolean;
  taxableValueInPaise?: number;
  cgstInPaise?: number;
  sgstInPaise?: number;
  igstInPaise?: number;
  roundOffInPaise?: number;
  totalInPaise?: number;
  currencyCode?: string;
  creditsInvoiceId?: string | null;
  creditedByInvoiceId?: string | null;
  notes?: string | null;
  lines?: InvoiceLineDto[];
}

export interface InvoiceLineDto extends EntityDto<string> {
  lineNumber?: number;
  kind?: InvoiceLineKind;
  description?: string;
  hsnOrSacCode?: string;
  quantity?: number;
  unitPriceInPaise?: number;
  taxableValueInPaise?: number;
  gstRateBasisPoints?: number;
  taxInPaise?: number;
  totalInPaise?: number;
  usagePeriodLabel?: string | null;
}

export interface InvoiceListRequestDto extends PagedAndSortedResultRequestDto {
  state?: InvoiceState | null;
  fromUtc?: string | null;
  toUtc?: string | null;
}

export interface MetaBilledFigureDto {
  /** Paid messages on the invoice line (Meta bills per message since 1 July 2025). */
  messageCount?: number;
  /** Only for statements from before per-message pricing. */
  conversationCount?: number;
  costInPaise?: number;
}

export interface RateCardDto extends EntityDto<string> {
  countryCode?: string;
  category?: PricingCategory;
  metaRateInPaise?: number;
  sellRateInPaise?: number;
  marginInPaise?: number;
  effectiveFromUtc?: string;
  effectiveToUtc?: string | null;
}

export interface RateHistoryDto {
  countryCode?: string;
  category?: PricingCategory;
  points?: RateHistoryPointDto[];
  currentRateInPaise?: number;
  nextChangeFromUtc?: string | null;
  nextRateInPaise?: number | null;
}

export interface RateHistoryPointDto {
  effectiveFromUtc?: string;
  effectiveToUtc?: string | null;
  rateInPaise?: number;
  changeInPaise?: number;
  changePercent?: number;
  isCurrent?: boolean;
}

export interface ReconciliationRunDto extends EntityDto<string> {
  channelId?: string;
  channelDisplayNumber?: string | null;
  periodStartUtc?: string;
  periodEndUtc?: string;
  runAtUtc?: string;
  source?: string;
  ourConversationCount?: number;
  metaConversationCount?: number;
  /** True for runs in paid messages; older runs compared conversations. */
  countsMessages?: boolean;
  ourMessageCount?: number;
  metaMessageCount?: number;
  ourCostInPaise?: number;
  metaCostInPaise?: number;
  costVarianceInPaise?: number;
  costVarianceBasisPoints?: number;
  toleranceBasisPoints?: number;
  withinTolerance?: boolean;
  needsAttention?: boolean;
  acknowledgedAtUtc?: string | null;
  acknowledgedByName?: string | null;
  acknowledgementNote?: string | null;
  variances?: ReconciliationVarianceDto[];
}

export interface ReconciliationVarianceDto extends EntityDto<string> {
  category?: PricingCategory;
  ourCount?: number;
  metaCount?: number;
  ourCostInPaise?: number;
  metaCostInPaise?: number;
  costVarianceInPaise?: number;
  countVariance?: number;
  likelyCause?: string | null;
}

export interface RunReconciliationDto {
  channelId?: string;
  periodStartUtc?: string;
  periodEndUtc?: string;
  /** Keyed by the category's name (Marketing, Utility, Authentication). */
  metaFigures?: Partial<Record<keyof typeof PricingCategory, MetaBilledFigureDto>>;
  source: string;
  toleranceBasisPoints?: number | null;
}

export interface SubscriptionDto extends EntityDto<string> {
  plan?: SubscriptionPlan;
  monthlyFeeInPaise?: number;
  includedAgentSeats?: number;
  startedAtUtc?: string;
  currentPeriodEndUtc?: string;
  endedAtUtc?: string | null;
  isTrial?: boolean;
  taxRateBasisPoints?: number;
}

export interface TopUpInput {
  amountInPaise?: number;
  reference?: string | null;
}

export interface UsageByCategoryDto {
  category?: PricingCategory;
  messageCount?: number;
  metaCostInPaise?: number;
  billedInPaise?: number;
}

export interface WalletDto extends EntityDto<string> {
  balanceInPaise?: number;
  lowBalanceThresholdInPaise?: number;
  autoTopUpEnabled?: boolean;
  autoTopUpAmountInPaise?: number;
  lastTopUpAtUtc?: string | null;
  isLow?: boolean;
  estimatedDaysRemaining?: number | null;
}

export interface WalletTransactionDto extends EntityDto<string> {
  type?: WalletTransactionType;
  amountInPaise?: number;
  balanceAfterInPaise?: number;
  reference?: string | null;
  description?: string | null;
  occurredAtUtc?: string;
}

export interface CreateUpdateRateCardDto {
  countryCode: string;
  category?: PricingCategory;
  metaRateInPaise?: number;
  sellRateInPaise?: number;
  effectiveFromUtc?: string;
}
