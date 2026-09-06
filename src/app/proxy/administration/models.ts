import type { EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { SubscriptionPlan } from '../billing/subscription-plan.enum';
import type { QualityRating } from '../channels/quality-rating.enum';
import type { MessagingTier } from '../channels/messaging-tier.enum';

export interface GetTenantOverviewInput extends PagedAndSortedResultRequestDto {
  filter?: string | null;
  plan?: SubscriptionPlan | null;
  trialsOnly?: boolean | null;
  atRiskOnly?: boolean | null;
}

export interface PlatformMetricsDto {
  totalTenants?: number;
  activeTenants?: number;
  trialTenants?: number;
  tenantsAtRisk?: number;
  monthlyRecurringRevenueInPaise?: number;
  messageMarginMonthInPaise?: number;
  messagesMonth?: number;
  averageDeliveryRate?: number;
  openComplianceRequests?: number;
  tenantsToBreakEven?: number;
}

export interface TenantOverviewDto extends EntityDto<string> {
  name?: string;
  plan?: SubscriptionPlan;
  isTrial?: boolean;
  creationTime?: string;
  channelCount?: number;
  worstQuality?: QualityRating;
  bestTier?: MessagingTier;
  messages30d?: number;
  spend30dInPaise?: number;
  walletBalanceInPaise?: number;
  activeUsers?: number;
  lastActivityUtc?: string | null;
}
