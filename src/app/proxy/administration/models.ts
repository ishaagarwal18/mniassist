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

import type { AtRiskAlertStatus, AtRiskReason } from './at-risk-reason.enum';

export interface GetAtRiskAlertsInput {
  status?: AtRiskAlertStatus | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface AtRiskAlertDto {
  id?: string;
  tenantId?: string;
  tenantName?: string;
  reason?: AtRiskReason;
  detail?: string;
  status?: AtRiskAlertStatus;
  detectedAtUtc?: string;
  lastSeenAtUtc?: string;
  acknowledgedAtUtc?: string | null;
  resolvedAtUtc?: string | null;
  resolvedByRecovery?: boolean;
  assignedToUserId?: string | null;
  assignedToUserName?: string | null;
  notes?: string | null;
  ticketRef?: string | null;
}

import type { BillingCycle } from '../billing/billing-cycle.enum';
import type { PlanFeature } from '../billing/plan-feature.enum';
import type { WorkspaceFeatureMode } from './workspace-feature-mode.enum';

export interface SuspendWorkspaceInput {
  reason: string;
}

export interface AssignPlanInput {
  plan: SubscriptionPlan;
  cycle: BillingCycle;
  isTrial: boolean;
  currentPeriodEndUtc?: string | null;
  expiresAtUtc?: string | null;
  monthlyFeeInPaise?: number | null;
  includedAgentSeats?: number | null;
}

export interface SetWorkspaceFeatureInput {
  feature: PlanFeature;
  mode: WorkspaceFeatureMode;
}

export interface SetWorkspaceDatabaseInput {
  connectionString: string;
}

export interface WorkspaceSubscriptionDto {
  plan: SubscriptionPlan;
  cycle: BillingCycle;
  isTrial: boolean;
  startedAtUtc: string;
  currentPeriodEndUtc: string;
  expiresAtUtc?: string | null;
  monthlyFeeInPaise: number;
  includedAgentSeats: number;
}

export interface WorkspaceFeatureDto {
  feature: PlanFeature;
  includedByPlan: boolean;
  mode: WorkspaceFeatureMode;
  effective: boolean;
}

export interface WorkspaceDetailDto {
  id: string;
  name: string;
  creationTime: string;
  isSuspended: boolean;
  suspendedReason?: string | null;
  suspendedAtUtc?: string | null;
  suspendedBy?: string | null;
  subscription?: WorkspaceSubscriptionDto | null;
  features: WorkspaceFeatureDto[];
  hasOwnDatabase: boolean;
  databaseLocation?: string | null;
  memberCount: number;
}
