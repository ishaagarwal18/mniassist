import type { SalesPeriodKind } from './sales-period-kind.enum';
import type { ForecastChanceBasis } from './forecast-chance-basis.enum';
import type { ForecastValueSource } from './forecast-value-source.enum';
import type { LeadRotationMode } from './lead-rotation-mode.enum';
import type { DealScoreBand } from './deal-score-band.enum';
import type { LeadSource } from './lead-source.enum';
import type { EnquiryStage } from './enquiry-stage.enum';
import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { EnquiryEventKind } from './enquiry-event-kind.enum';
import type { QuotationState } from './quotation-state.enum';
import type { QuotePriceSource } from './quote-price-source.enum';
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
  /** The current AMC term's value in paise, before GST — the renewal quote starts from it. */
  amcValueInPaise?: number | null;
  /** AMC term in months; empty means twelve. */
  amcTermMonths?: number | null;
}

export interface CreateUpdateQuotationDto {
  enquiryId?: string;
  priceListId?: string | null;
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
  useCataloguePrice?: boolean;
  taxRateBasisPoints?: number | null;
  keepPricing?: boolean;
  priceSource?: QuotePriceSource;
  priceListId?: string | null;
  listPriceInPaise?: number | null;
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
  /** The machine this enquiry renews the AMC of, when it came from the Renewal Desk. */
  renewalOf?: RenewalAssetDto | null;
}

export interface RenewalAssetDto {
  installedAssetId: string;
  description: string;
  serialNumber?: string | null;
  siteName?: string | null;
  amcEndsOn?: string | null;
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
  amcValueInPaise?: number | null;
  amcTermMonths?: number | null;
  /** Where the machine's latest AMC renewal stands (RenewalStatus), when the Renewal Desk tracks one. */
  renewalStatus?: number | null;
  renewalEndsOn?: string | null;
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
  /** Only on the response to issuing: whether it went to the customer on WhatsApp, and what happened. */
  sentOnWhatsApp?: boolean | null;
  whatsAppNote?: string | null;
  reference?: string;
  enquiryId?: string;
  contactId?: string;
  state?: QuotationState;
  revisionNumber?: number;
  subtotalInPaise?: number;
  taxRateBasisPoints?: number;
  taxInPaise?: number;
  totalInPaise?: number;
  taxBreakdown?: QuotationTaxLineDto[];
  issuedAtUtc?: string | null;
  validUntilUtc?: string | null;
  decidedAtUtc?: string | null;
  cadenceStepsCompleted?: number;
  lastFollowUpAtUtc?: string | null;
  nextFollowUpAtUtc?: string | null;
  daysSinceIssue?: number;
  lostReason?: string | null;
  priceListId?: string | null;
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
  productId?: string | null;
  priceSource?: QuotePriceSource;
  priceListId?: string | null;
  listPriceInPaise?: number | null;
  taxRateBasisPoints?: number | null;
}

export interface QuotationTaxLineDto {
  rateBasisPoints?: number;
  netInPaise?: number;
  taxInPaise?: number;
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

export interface LeadRotationMemberDto {
  userId?: string;
  userName?: string;
  name?: string | null;
  isActive?: boolean;
  isPaused?: boolean;
  weight?: number;
  maxOpenDeals?: number | null;
  openDeals?: number;
  atCap?: boolean;
}

export interface LeadRotationDto {
  pipelineId?: string;
  isEnabled?: boolean;
  mode?: LeadRotationMode;
  sources?: LeadSource[];
  assignContact?: boolean;
  emailAssignee?: boolean;
  members?: LeadRotationMemberDto[];
  nextUserId?: string | null;
}

export interface LeadRotationMemberInput {
  userId: string;
  isPaused: boolean;
  weight: number;
  maxOpenDeals?: number | null;
}

export interface SaveLeadRotationInput {
  isEnabled: boolean;
  mode: LeadRotationMode;
  sources: LeadSource[];
  assignContact: boolean;
  emailAssignee: boolean;
  members: LeadRotationMemberInput[];
}

export interface GetSalesForecastInput {
  kind?: SalesPeriodKind;
  periodStart?: string | null;
  pipelineId?: string | null;
  ownerUserId?: string | null;
}

export interface ForecastOwnerDto {
  ownerUserId?: string | null;
  ownerName?: string;
  targetInPaise?: number;
  closedInPaise?: number;
  commitInPaise?: number;
  expectedInPaise?: number;
  bestCaseInPaise?: number;
  openDeals?: number;
  attainment?: number | null;
  projectedAttainment?: number | null;
  gapInPaise?: number;
}

export interface ForecastDealDto {
  enquiryId?: string;
  reference?: string;
  title?: string | null;
  contactName?: string | null;
  ownerName?: string;
  stage?: EnquiryStage;
  valueInPaise?: number;
  weightedInPaise?: number;
  expectedClose?: string;
  valueSource?: ForecastValueSource;
  quotationReference?: string | null;
  chancePercent?: number;
  chanceBasis?: ForecastChanceBasis;
}

export interface StageChanceDto {
  stage?: EnquiryStage;
  configuredPercent?: number;
  effectivePercent?: number;
  sample?: number;
  basis?: ForecastChanceBasis;
}

export interface StageWeightsDto {
  new: number;
  qualified: number;
  siteVisit: number;
  quoted: number;
  negotiation: number;
}

export interface SalesForecastDto {
  kind?: SalesPeriodKind;
  periodStart?: string;
  periodEnd?: string;
  label?: string;
  previousPeriodStart?: string;
  nextPeriodStart?: string;
  team?: ForecastOwnerDto;
  owners?: ForecastOwnerDto[];
  deals?: ForecastDealDto[];
  unscheduledDeals?: number;
  unscheduledValueInPaise?: number;
  overdueDeals?: number;
  overdueValueInPaise?: number;
  unvaluedDeals?: number;
  fiscalYearStartMonth?: number;
  weights?: StageWeightsDto;
  learnFromHistory?: boolean;
  chances?: StageChanceDto[];
}

export interface GetSalesQuotasInput {
  kind?: SalesPeriodKind;
  periodStart?: string | null;
}

export interface SalesQuotaDto {
  id?: string;
  userId?: string | null;
  ownerName?: string;
  kind?: SalesPeriodKind;
  periodStart?: string;
  targetInPaise?: number;
}

export interface SetSalesQuotaInput {
  userId?: string | null;
  kind: SalesPeriodKind;
  periodStart: string;
  targetInPaise: number;
}

export interface PipelineWeightsDto {
  pipelineId: string;
  weights: StageWeightsDto;
}

export interface SalesForecastSettingsDto {
  fiscalYearStartMonth: number;
  weights: StageWeightsDto;
  learnFromHistory: boolean;
  pipelineWeights: PipelineWeightsDto[];
}

export interface GetForecastHistoryInput {
  kind?: SalesPeriodKind;
  periodStart?: string | null;
  ownerUserId?: string | null;
}

export interface ForecastPointDto {
  date?: string;
  targetInPaise?: number;
  closedInPaise?: number;
  commitInPaise?: number;
  expectedInPaise?: number;
  bestCaseInPaise?: number;
  openDeals?: number;
}

export interface ForecastAccuracyDto {
  label?: string;
  periodStart?: string;
  targetInPaise?: number;
  expectedAtStartInPaise?: number | null;
  expectedAtMidpointInPaise?: number | null;
  actualInPaise?: number;
  midpointError?: number | null;
}

export interface ForecastHistoryDto {
  label?: string;
  points?: ForecastPointDto[];
  changeOverDays?: number | null;
  expectedChangeInPaise?: number | null;
  closedChangeInPaise?: number | null;
  accuracy?: ForecastAccuracyDto[];
}

export interface AmcImportProblemDto {
  line: number;
  serialNumber?: string | null;
  problem: string;
}

export interface AmcImportResultDto {
  dryRun: boolean;
  rows: number;
  updated: number;
  unchanged: number;
  problems: AmcImportProblemDto[];
}
