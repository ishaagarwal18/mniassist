import type { EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { PricingCategory } from '../messaging/pricing-category.enum';
import type { SubscriptionPlan } from './subscription-plan.enum';
import type { WalletTransactionType } from './wallet-transaction-type.enum';

export interface BillingSummaryDto {
  periodStartUtc?: string;
  periodEndUtc?: string;
  usage: UsageByCategoryDto[];
  totalBilledInPaise: number;
  taxInPaise: number;
  totalWithTaxInPaise: number;
  /** Reported as a count and an avoided charge, never as spend. */
  freeMessageCount: number;
  avoidedChargeInPaise: number;
  plan: SubscriptionPlan;
  subscriptionFeeInPaise: number;
  currentPeriodEndUtc?: string;
}

export interface ChangePlanInput {
  plan: SubscriptionPlan;
}

export interface ConfigureAutoTopUpInput {
  enabled: boolean;
  amountInPaise: number;
  thresholdInPaise: number;
}

export interface GetWalletTransactionsInput extends PagedAndSortedResultRequestDto {
  type?: WalletTransactionType;
  fromUtc?: string;
  toUtc?: string;
}

export interface RateCardDto extends EntityDto<string> {
  countryCode?: string;
  category: PricingCategory;
  metaRateInPaise: number;
  sellRateInPaise: number;
  marginInPaise: number;
  effectiveFromUtc?: string;
  effectiveToUtc?: string;
}

export interface SubscriptionDto extends EntityDto<string> {
  plan: SubscriptionPlan;
  monthlyFeeInPaise: number;
  includedAgentSeats: number;
  startedAtUtc?: string;
  currentPeriodEndUtc?: string;
  endedAtUtc?: string;
  isTrial: boolean;
  taxRateBasisPoints: number;
}

export interface TopUpInput {
  amountInPaise: number;
  reference?: string;
}

export interface UsageByCategoryDto {
  category: PricingCategory;
  messageCount: number;
  metaCostInPaise: number;
  billedInPaise: number;
}

export interface WalletDto extends EntityDto<string> {
  balanceInPaise: number;
  lowBalanceThresholdInPaise: number;
  autoTopUpEnabled: boolean;
  autoTopUpAmountInPaise: number;
  lastTopUpAtUtc?: string;
  isLow: boolean;
  /** Null when there is no recent spend to project from. */
  estimatedDaysRemaining?: number;
}

export interface WalletTransactionDto extends EntityDto<string> {
  type: WalletTransactionType;
  amountInPaise: number;
  balanceAfterInPaise: number;
  reference?: string;
  description?: string;
  occurredAtUtc?: string;
}
