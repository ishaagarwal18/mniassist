import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { CampaignState } from './campaign-state.enum';
import type { MessageStatus } from '../messaging/message-status.enum';
import type { RecurrenceKind } from './recurrence-kind.enum';
import type { PreflightCheck } from './preflight-check.enum';
import type { AbTestMetric } from './ab-test-metric.enum';

export interface CampaignCostLineDto {
  category?: string;
  recipients?: number;
  rateInPaise?: number;
  subtotalInPaise?: number;
  isMetaAssigned?: boolean;
  freeWithinWindow?: number;
}

export interface CampaignDto extends FullAuditedEntityDto<string> {
  name?: string;
  channelId?: string;
  templateId?: string;
  templateName?: string | null;
  segmentId?: string | null;
  segmentName?: string | null;
  state?: CampaignState;
  scheduledAtUtc?: string | null;
  startedAtUtc?: string | null;
  completedAtUtc?: string | null;
  throttlePerSecond?: number;
  estimatedRecipients?: number;
  estimatedCostInPaise?: number;
  actualCostInPaise?: number;
  dispatchedCount?: number;
  optOutCount?: number;
  optOutRate?: number;
  suspendReason?: string | null;
  variableMappingJson?: string;
  matchRecipientLanguage?: boolean;
  sendViaMarketingLite?: boolean;
  abMetric?: AbTestMetric;
  abTestPercent?: number;
  winnerVariantId?: string | null;
  schedule?: CampaignScheduleDto | null;
  costLines?: CampaignCostLineDto[];
}

export interface CampaignErrorBreakdownDto {
  errorCode?: number;
  title?: string;
  count?: number;
  guidance?: string;
}

export interface CampaignPreflightDto {
  outcomes?: PreflightOutcomeDto[];
  recipients?: number;
  marketingHeadroom?: number | null;
  estimatedCostInPaise?: number;
  walletBalanceInPaise?: number;
  canSend?: boolean;
  canSendImmediately?: boolean;
  daysRequired?: number;
  costLines?: CampaignCostLineDto[];
}

export interface CampaignRecipientDto extends EntityDto<string> {
  contactId?: string;
  contactWaId?: string;
  contactDisplayName?: string | null;
  status?: MessageStatus;
  dispatchedAtUtc?: string | null;
  errorCode?: number | null;
  skipReason?: string | null;
}

export interface CampaignReportDto {
  campaignId?: string;
  name?: string;
  state?: CampaignState;
  queued?: number;
  sent?: number;
  delivered?: number;
  read?: number;
  failed?: number;
  withheld?: number;
  replied?: number;
  optedOut?: number;
  spendInPaise?: number;
  deliveryRate?: number;
  readRate?: number;
  replyRate?: number;
  optOutRate?: number;
  errors?: CampaignErrorBreakdownDto[];
}

export interface CampaignScheduleDto {
  timeZoneId?: string;
  recurrence?: RecurrenceKind;
  localSendTime?: string;
  daysOfWeek?: any[];
  dayOfMonth?: number | null;
  endsAtUtc?: string | null;
  maxOccurrences?: number | null;
  occurrencesSent?: number;
  lastOccurrenceAtUtc?: string | null;
  nextOccurrenceAtUtc?: string | null;
  quietHoursEnabled?: boolean;
  quietFrom?: string;
  quietUntil?: string;
  blackoutDays?: any[];
  wasDeferredByQuietHours?: boolean;
}

export interface CampaignScheduleInput {
  timeZoneId?: string;
  recurrence?: RecurrenceKind;
  localSendTime?: string;
  daysOfWeek?: any[];
  dayOfMonth?: number | null;
  endsAtUtc?: string | null;
  maxOccurrences?: number | null;
  quietHoursEnabled?: boolean;
  quietFrom?: string;
  quietUntil?: string;
  blackoutDays?: any[];
}

export interface AbTestVariantInput {
  label: string;
  templateId: string;
  weight?: number;
}

export interface ConfigureAbTestInput {
  metric?: AbTestMetric;
  testPercent?: number;
  variants: AbTestVariantInput[];
}

export interface CampaignAbVariantRowDto {
  variantId?: string;
  label?: string;
  templateId?: string;
  templateName?: string | null;
  weight?: number;
  sent?: number;
  delivered?: number;
  read?: number;
  replied?: number;
  rate?: number;
  isWinner?: boolean;
}

export interface CampaignAbTestReportDto {
  metric?: AbTestMetric;
  testPercent?: number;
  winnerVariantId?: string | null;
  decidedAtUtc?: string | null;
  variants?: CampaignAbVariantRowDto[];
}

export interface CreateUpdateCampaignDto {
  name: string;
  channelId?: string;
  templateId?: string;
  segmentId?: string | null;
  throttlePerSecond?: number;
  variableMappingJson?: string;
  matchRecipientLanguage?: boolean;
  sendViaMarketingLite?: boolean;
}

export interface GetCampaignListInput extends PagedAndSortedResultRequestDto {
  state?: CampaignState | null;
  channelId?: string | null;
  filter?: string | null;
}

export interface GetCampaignRecipientsInput extends PagedAndSortedResultRequestDto {
  status?: MessageStatus | null;
}

export interface PreflightOutcomeDto {
  check?: PreflightCheck;
  passed?: boolean;
  isBlocking?: boolean;
  detail?: string;
}

export interface ScheduleCampaignInput {
  scheduledAtUtc?: string;
  schedule?: CampaignScheduleInput | null;
}
