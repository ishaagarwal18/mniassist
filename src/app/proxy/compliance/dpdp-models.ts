import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type {
  BreachSeverity,
  BreachState,
  DataRequestKind,
  DataRequestState,
  RetainedDataClass,
} from './dpdp-enums';

export interface DataPrincipalRequestDto extends FullAuditedEntityDto<string> {
  kind: DataRequestKind;
  state: DataRequestState;
  contactId?: string;
  contactDisplayName?: string;
  requesterIdentifier: string;
  receivedAtUtc: string;
  dueAtUtc: string;
  fulfilledAtUtc?: string;
  assignedUserId?: string;
  responseBlobRef?: string;
  rejectionReason?: string;
  notes?: string;
  daysRemaining: number;
  isBreached: boolean;
}

export interface CreateDataPrincipalRequestDto {
  kind: DataRequestKind;
  requesterIdentifier: string;
  contactId?: string;
}

export interface FulfilDataRequestInput {
  notes?: string;
}
export interface RejectDataRequestInput {
  reason: string;
}
export interface GetDataRequestListInput extends PagedAndSortedResultRequestDto {
  state?: DataRequestState;
  kind?: DataRequestKind;
}

export interface RetentionPolicyDto extends EntityDto<string> {
  dataClass: RetainedDataClass;
  retentionDays: number;
  isEnabled: boolean;
  lastPurgeAtUtc?: string;
  lastPurgedRowCount: number;
}
export interface UpdateRetentionPolicyInput {
  retentionDays: number;
  isEnabled: boolean;
}

export interface BreachIncidentDto extends FullAuditedEntityDto<string> {
  title: string;
  severity: BreachSeverity;
  state: BreachState;
  detectedAtUtc: string;
  containedAtUtc?: string;
  boardNotifiedAtUtc?: string;
  principalsNotifiedAtUtc?: string;
  closedAtUtc?: string;
  affectedPrincipalCount: number;
  description?: string;
  remediationNotes?: string;
}
export interface CreateBreachIncidentDto {
  title: string;
  severity: BreachSeverity;
  detectedAtUtc: string;
  description?: string;
  affectedPrincipalCount: number;
}

export interface ComplianceOverviewDto {
  openRequests: number;
  requestsBreachingSla: number;
  requestsDueThisWeek: number;
  openBreaches: number;
  consentRecordsHeld: number;
  contactsWithMarketingConsent: number;
  contactsUtilityOnly: number;
  suppressedContacts: number;
  lastRetentionRunUtc?: string;
}
