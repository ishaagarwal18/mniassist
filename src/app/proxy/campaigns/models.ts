import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { MessageStatus } from '../messaging/message-status.enum';
import type { CampaignState } from './campaign-state.enum';
import type { PreflightCheck } from './preflight-check.enum';

export interface CampaignDto extends FullAuditedEntityDto<string> {
  name?: string;
  channelId?: string;
  templateId?: string;
  templateName?: string;
  segmentId?: string;
  segmentName?: string;
  state: CampaignState;
  scheduledAtUtc?: string;
  startedAtUtc?: string;
  completedAtUtc?: string;
  throttlePerSecond: number;
  estimatedRecipients: number;
  estimatedCostInPaise: number;
  actualCostInPaise: number;
  dispatchedCount: number;
  optOutCount: number;
  optOutRate: number;
  suspendReason?: string;
  variableMappingJson?: string;
}

export interface CampaignErrorBreakdownDto {
  errorCode: number;
  title?: string;
  count: number;
  /** Plain-language cause and what to do about it, keyed off the code. */
  guidance?: string;
}

export interface CampaignPreflightDto {
  outcomes: PreflightOutcomeDto[];
  recipients: number;
  marketingHeadroom?: number;
  estimatedCostInPaise: number;
  walletBalanceInPaise: number;
  canSend: boolean;
  canSendImmediately: boolean;
  daysRequired: number;
}

export interface CampaignRecipientDto extends EntityDto<string> {
  contactId?: string;
  contactWaId?: string;
  contactDisplayName?: string;
  status: MessageStatus;
  dispatchedAtUtc?: string;
  errorCode?: number;
  skipReason?: string;
}

export interface CampaignReportDto {
  campaignId?: string;
  name?: string;
  state: CampaignState;
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  /** Held back by Meta's per-user cap. Not billed, and kept out of the delivery rate. */
  withheld: number;
  replied: number;
  optedOut: number;
  spendInPaise: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  optOutRate: number;
  errors: CampaignErrorBreakdownDto[];
}

export interface CreateUpdateCampaignDto {
  name: string;
  channelId: string;
  templateId: string;
  segmentId?: string;
  throttlePerSecond: number;
  variableMappingJson: string;
}

export interface GetCampaignListInput extends PagedAndSortedResultRequestDto {
  state?: CampaignState;
  channelId?: string;
  filter?: string;
}

export interface GetCampaignRecipientsInput extends PagedAndSortedResultRequestDto {
  status?: MessageStatus;
}

export interface PreflightOutcomeDto {
  check: PreflightCheck;
  passed: boolean;
  isBlocking: boolean;
  detail?: string;
}

export interface ScheduleCampaignInput {
  scheduledAtUtc: string;
}
