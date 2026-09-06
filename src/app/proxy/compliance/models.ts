import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { BreachSeverity } from './breach-severity.enum';
import type { BreachState } from './breach-state.enum';
import type { DataRequestKind } from './data-request-kind.enum';
import type { FullAuditedAggregateRoot } from '../volo/abp/domain/entities/auditing/models';
import type { DataRequestState } from './data-request-state.enum';
import type { RetainedDataClass } from './retained-data-class.enum';

export interface BreachIncidentDto extends FullAuditedEntityDto<string> {
  title?: string;
  severity?: BreachSeverity;
  state?: BreachState;
  detectedAtUtc?: string;
  containedAtUtc?: string | null;
  boardNotifiedAtUtc?: string | null;
  principalsNotifiedAtUtc?: string | null;
  closedAtUtc?: string | null;
  affectedPrincipalCount?: number;
  description?: string | null;
  remediationNotes?: string | null;
  boardNotificationDeadlineUtc?: string;
  boardNotificationOutstanding?: boolean;
  principalsNotificationOutstanding?: boolean;
  hoursToBoardDeadline?: number;
}

export interface ComplianceOverviewDto {
  openRequests?: number;
  requestsBreachingSla?: number;
  requestsDueThisWeek?: number;
  openBreaches?: number;
  consentRecordsHeld?: number;
  contactsWithMarketingConsent?: number;
  contactsUtilityOnly?: number;
  suppressedContacts?: number;
  lastRetentionRunUtc?: string | null;
}

export interface ConsentTextVersionDto extends EntityDto<string> {
  key?: string;
  version?: number;
  languageCode?: string;
  noticeText?: string;
  purposesText?: string;
  affirmativeActionLabel?: string | null;
  withdrawalInstructions?: string | null;
  publishedAtUtc?: string | null;
  retiredAtUtc?: string | null;
  isPublished?: boolean;
  isCurrent?: boolean;
  reference?: string;
  consentCount?: number;
}

export interface CreateBreachIncidentDto {
  title: string;
  severity?: BreachSeverity;
  detectedAtUtc?: string;
  description?: string | null;
  affectedPrincipalCount?: number;
}

export interface CreateConsentTextVersionDto {
  key: string;
  languageCode: string;
  noticeText: string;
  purposesText: string;
  affirmativeActionLabel?: string | null;
  withdrawalInstructions?: string | null;
}

export interface CreateDataPrincipalRequestDto {
  kind?: DataRequestKind;
  requesterIdentifier: string;
  contactId?: string | null;
}

export interface DataPrincipalRequest extends FullAuditedAggregateRoot<string> {
  tenantId?: string | null;
  kind?: DataRequestKind;
  state?: DataRequestState;
  contactId?: string | null;
  requesterIdentifier?: string;
  receivedAtUtc?: string;
  dueAtUtc?: string;
  fulfilledAtUtc?: string | null;
  assignedUserId?: string | null;
  responseBlobRef?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
}

export interface DataPrincipalRequestDto extends FullAuditedEntityDto<string> {
  kind?: DataRequestKind;
  state?: DataRequestState;
  contactId?: string | null;
  contactDisplayName?: string | null;
  requesterIdentifier?: string;
  receivedAtUtc?: string;
  dueAtUtc?: string;
  fulfilledAtUtc?: string | null;
  assignedUserId?: string | null;
  responseBlobRef?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  daysRemaining?: number;
  isBreached?: boolean;
}

export interface FulfilDataRequestInput {
  notes?: string | null;
}

export interface GetDataRequestListInput extends PagedAndSortedResultRequestDto {
  state?: DataRequestState | null;
  kind?: DataRequestKind | null;
}

export interface RecordBreachNotificationDto {
  boardNotified?: boolean;
  principalsNotified?: boolean;
}

export interface RejectDataRequestInput {
  reason: string;
}

export interface RetentionPolicyDto extends EntityDto<string> {
  dataClass?: RetainedDataClass;
  retentionDays?: number;
  isEnabled?: boolean;
  lastPurgeAtUtc?: string | null;
  lastPurgedRowCount?: number;
}

export interface UpdateConsentTextVersionDto {
  noticeText: string;
  purposesText: string;
  affirmativeActionLabel?: string | null;
  withdrawalInstructions?: string | null;
}

export interface UpdateRetentionPolicyInput {
  retentionDays?: number;
  isEnabled?: boolean;
}
