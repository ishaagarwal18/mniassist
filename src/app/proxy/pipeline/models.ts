import type { DealScoreBand } from './deal-score-band.enum';
import type { LeadSource } from './lead-source.enum';
import type { EnquiryStage } from './enquiry-stage.enum';
import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { EnquiryEventKind } from './enquiry-event-kind.enum';
import type { QuotationState } from './quotation-state.enum';
import type { ReminderState } from './reminder-state.enum';
import type { ReminderKind } from './reminder-kind.enum';
import type { LostReasonCategory } from './lost-reason-category.enum';

export interface CreateUpdateEnquiryDto {
  contactId?: string;
  pipelineId?: string | null;
  source?: LeadSource;
  sourceRef?: string | null;
  title?: string | null;
  requirement?: string | null;
  ownerUserId?: string | null;
  estimatedValueInPaise?: number | null;
  expectedCloseDate?: string | null;
  attributes?: Record<string, string>;
}

export interface CreateUpdateInstalledAssetDto {
  contactId?: string;
  description: string;
  serialNumber?: string | null;
  partNumber?: string | null;
  make?: string | null;
  model?: string | null;
  siteName?: string | null;
  siteCity?: string | null;
  commissionedOn?: string | null;
  warrantyEndsOn?: string | null;
  amcEndsOn?: string | null;
  calibrationDueOn?: string | null;
  preventiveMaintenanceIntervalDays?: number | null;
}

export interface CreateUpdateQuotationDto {
  enquiryId?: string;
  lines?: CreateUpdateQuotationLineDto[];
  taxRateBasisPoints?: number;
}

export interface CreateUpdateQuotationLineDto {
  order?: number;
  partNumber?: string | null;
  description: string;
  quantity?: number;
  unit?: string;
  unitPriceInPaise?: number;
  discountBasisPoints?: number;
}

export interface EnquiryBoardColumnDto {
  stage?: EnquiryStage;
  stageId?: string;
  stageName?: string;
  count?: number;
  totalValueInPaise?: number;
  cards?: EnquiryDto[];
}

export interface EnquiryDetailDto extends EnquiryDto {
  timeline?: EnquiryEventDto[];
  quotations?: QuotationDto[];
  scoreFactors?: EnquiryScoreFactorDto[];
}

export interface EnquiryScoreFactorDto {
  key?: string;
  points?: number;
  max?: number;
  note?: string;
}

export interface EnquiryDto extends FullAuditedEntityDto<string> {
  reference?: string;
  contactId?: string;
  contactDisplayName?: string | null;
  contactCompanyName?: string | null;
  conversationId?: string | null;
  stage?: EnquiryStage;
  pipelineId?: string | null;
  pipelineName?: string | null;
  stageId?: string | null;
  stageName?: string | null;
  source?: LeadSource;
  sourceRef?: string | null;
  title?: string | null;
  requirement?: string | null;
  ownerUserId?: string | null;
  ownerUserName?: string | null;
  estimatedValueInPaise?: number | null;
  expectedCloseDate?: string | null;
  stageChangedAtUtc?: string | null;
  daysInStage?: number;
  score?: number | null;
  scoreBand?: DealScoreBand | null;
  lostReason?: string | null;
  lostCategory?: LostReasonCategory;
  wonReason?: string | null;
  attributes?: Record<string, string>;
}

export interface EnquiryEventDto extends EntityDto<string> {
  kind?: EnquiryEventKind;
  occurredAtUtc?: string;
  byUserId?: string | null;
  byUserName?: string | null;
  summary?: string | null;
  payloadJson?: string | null;
}

export interface GetEnquiryBoardInput {
  pipelineId?: string | null;
  ownerUserId?: string | null;
  source?: LeadSource | null;
  openOnly?: boolean;
}

export interface GetEnquiryListInput extends PagedAndSortedResultRequestDto {
  stage?: EnquiryStage | null;
  pipelineId?: string | null;
  ownerUserId?: string | null;
  filter?: string | null;
}

export interface GetInstalledAssetListInput extends PagedAndSortedResultRequestDto {
  contactId?: string | null;
  filter?: string | null;
  includeRetired?: boolean;
}

export interface GetQuotationListInput extends PagedAndSortedResultRequestDto {
  state?: QuotationState | null;
  enquiryId?: string | null;
  filter?: string | null;
}

export interface GetReminderListInput extends PagedAndSortedResultRequestDto {
  state?: ReminderState | null;
  kind?: ReminderKind | null;
  fromUtc?: string | null;
  toUtc?: string | null;
}

export interface InstalledAssetDto extends FullAuditedEntityDto<string> {
  contactId?: string;
  contactDisplayName?: string | null;
  serialNumber?: string | null;
  partNumber?: string | null;
  description?: string;
  make?: string | null;
  model?: string | null;
  siteName?: string | null;
  siteCity?: string | null;
  commissionedOn?: string | null;
  warrantyEndsOn?: string | null;
  amcEndsOn?: string | null;
  calibrationDueOn?: string | null;
  preventiveMaintenanceIntervalDays?: number | null;
  lastServicedOn?: string | null;
  isRetired?: boolean;
  nextDueKind?: ReminderKind | null;
  nextDueOn?: string | null;
}

export interface IssueQuotationInput {
  validUntilUtc?: string;
  sendOnWhatsApp?: boolean;
  templateId?: string | null;
}

export interface MoveEnquiryInput {
  stageId?: string | null;
  stage?: EnquiryStage;
  note?: string | null;
  lostCategory?: LostReasonCategory | null;
}

export interface PlanRemindersInput {
  templateId?: string;
  horizonDays?: number;
  leadDays?: number[];
}

export interface QuotationDto extends FullAuditedEntityDto<string> {
  reference?: string;
  enquiryId?: string;
  contactId?: string;
  state?: QuotationState;
  revisionNumber?: number;
  subtotalInPaise?: number;
  taxInPaise?: number;
  totalInPaise?: number;
  issuedAtUtc?: string | null;
  validUntilUtc?: string | null;
  decidedAtUtc?: string | null;
  cadenceStepsCompleted?: number;
  lastFollowUpAtUtc?: string | null;
  nextFollowUpAtUtc?: string | null;
  daysSinceIssue?: number;
  lostReason?: string | null;
  lines?: QuotationLineDto[];
}

export interface QuotationLineDto extends EntityDto<string> {
  order?: number;
  partNumber?: string | null;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPriceInPaise?: number;
  discountBasisPoints?: number;
  lineTotalInPaise?: number;
}

export interface ReminderDto extends EntityDto<string> {
  kind?: ReminderKind;
  contactId?: string;
  contactDisplayName?: string | null;
  installedAssetId?: string | null;
  assetDescription?: string | null;
  templateId?: string;
  dueAtUtc?: string;
  leadDays?: number;
  state?: ReminderState;
  sentAtUtc?: string | null;
  haltReason?: string | null;
}

export interface PipelineStageDto {
  id?: string;
  name?: string;
  order?: number;
  bucket?: EnquiryStage;
  isFixed?: boolean;
  enquiryCount?: number;
}

export interface SalesPipelineDto {
  id?: string;
  name?: string;
  isDefault?: boolean;
  enquiryCount?: number;
  stages?: PipelineStageDto[];
}

export interface CreateSalesPipelineInput {
  name: string;
  copyStagesFromPipelineId?: string | null;
}

export interface UpdateSalesPipelineInput {
  name: string;
}

export interface DeleteSalesPipelineInput {
  moveEnquiriesToPipelineId?: string | null;
}

export interface SavePipelineStageInput {
  name: string;
  bucket?: EnquiryStage;
  position?: number | null;
}

export interface ReorderPipelineStagesInput {
  stageIds: string[];
}

export interface DeletePipelineStageInput {
  moveEnquiriesToStageId?: string | null;
}

export interface MoveEnquiryToPipelineInput {
  pipelineId: string;
  stageId?: string | null;
}
