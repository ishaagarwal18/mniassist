import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type {
  EnquiryEventKind,
  EnquiryStage,
  LeadSource,
  QuotationState,
  ReminderKind,
  ReminderState,
} from './enums';

export interface EnquiryDto extends FullAuditedEntityDto<string> {
  reference: string;
  contactId: string;
  contactDisplayName?: string;
  contactCompanyName?: string;
  conversationId?: string;
  stage: EnquiryStage;
  source: LeadSource;
  sourceRef?: string;
  title?: string;
  requirement?: string;
  ownerUserId?: string;
  ownerUserName?: string;
  estimatedValueInPaise?: number;
  expectedCloseDate?: string;
  stageChangedAtUtc?: string;
  daysInStage: number;
  lostReason?: string;
  attributes: Record<string, string>;
}

export interface EnquiryEventDto extends EntityDto<string> {
  kind: EnquiryEventKind;
  occurredAtUtc: string;
  byUserId?: string;
  byUserName?: string;
  summary?: string;
  payloadJson?: string;
}

export interface EnquiryDetailDto extends EnquiryDto {
  timeline: EnquiryEventDto[];
  quotations: QuotationDto[];
}

export interface CreateUpdateEnquiryDto {
  contactId: string;
  source: LeadSource;
  sourceRef?: string;
  title?: string;
  requirement?: string;
  ownerUserId?: string;
  estimatedValueInPaise?: number;
  expectedCloseDate?: string;
  attributes: Record<string, string>;
}

export interface GetEnquiryListInput extends PagedAndSortedResultRequestDto {
  stage?: EnquiryStage;
  ownerUserId?: string;
  filter?: string;
}

export interface GetEnquiryBoardInput {
  ownerUserId?: string;
  source?: LeadSource;
  openOnly?: boolean;
}

export interface EnquiryBoardColumnDto {
  stage: EnquiryStage;
  count: number;
  totalValueInPaise: number;
  cards: EnquiryDto[];
}

export interface MoveEnquiryInput {
  stage: EnquiryStage;
  note?: string;
}

export interface QuotationLineDto extends EntityDto<string> {
  order: number;
  partNumber?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceInPaise: number;
  discountBasisPoints: number;
  lineTotalInPaise: number;
}

export interface QuotationDto extends FullAuditedEntityDto<string> {
  reference: string;
  enquiryId: string;
  contactId: string;
  state: QuotationState;
  revisionNumber: number;
  subtotalInPaise: number;
  taxInPaise: number;
  totalInPaise: number;
  issuedAtUtc?: string;
  validUntilUtc?: string;
  decidedAtUtc?: string;
  cadenceStepsCompleted: number;
  lastFollowUpAtUtc?: string;
  nextFollowUpAtUtc?: string;
  daysSinceIssue: number;
  lostReason?: string;
  lines: QuotationLineDto[];
}

export interface CreateUpdateQuotationLineDto {
  order: number;
  partNumber?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceInPaise: number;
  discountBasisPoints: number;
}

export interface CreateUpdateQuotationDto {
  enquiryId: string;
  lines: CreateUpdateQuotationLineDto[];
  taxRateBasisPoints: number;
}

export interface IssueQuotationInput {
  validUntilUtc: string;
  sendOnWhatsApp: boolean;
  templateId?: string;
}

export interface GetQuotationListInput extends PagedAndSortedResultRequestDto {
  state?: QuotationState;
  enquiryId?: string;
  filter?: string;
}

export interface InstalledAssetDto extends FullAuditedEntityDto<string> {
  contactId: string;
  contactDisplayName?: string;
  serialNumber?: string;
  partNumber?: string;
  description: string;
  make?: string;
  model?: string;
  siteName?: string;
  siteCity?: string;
  commissionedOn?: string;
  warrantyEndsOn?: string;
  amcEndsOn?: string;
  calibrationDueOn?: string;
  preventiveMaintenanceIntervalDays?: number;
  lastServicedOn?: string;
  isRetired: boolean;
  nextDueKind?: ReminderKind;
  nextDueOn?: string;
}

export interface CreateUpdateInstalledAssetDto {
  contactId: string;
  description: string;
  serialNumber?: string;
  partNumber?: string;
  make?: string;
  model?: string;
  siteName?: string;
  siteCity?: string;
  commissionedOn?: string;
  warrantyEndsOn?: string;
  amcEndsOn?: string;
  calibrationDueOn?: string;
  preventiveMaintenanceIntervalDays?: number;
}

export interface GetInstalledAssetListInput extends PagedAndSortedResultRequestDto {
  contactId?: string;
  filter?: string;
  includeRetired?: boolean;
}

export interface ReminderDto extends EntityDto<string> {
  kind: ReminderKind;
  contactId: string;
  contactDisplayName?: string;
  installedAssetId?: string;
  assetDescription?: string;
  templateId: string;
  dueAtUtc: string;
  leadDays: number;
  state: ReminderState;
  sentAtUtc?: string;
  haltReason?: string;
}

export interface GetReminderListInput extends PagedAndSortedResultRequestDto {
  state?: ReminderState;
  kind?: ReminderKind;
  fromUtc?: string;
  toUtc?: string;
}
