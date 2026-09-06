import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { ConsentScope } from './consent-scope.enum';
import type { ConsentSource } from './consent-source.enum';
import type { DecisionRole } from './decision-role.enum';
import type { SuppressionReason } from './suppression-reason.enum';
import type { ContactLifecycle } from './contact-lifecycle.enum';
import type { QuotationState } from '../pipeline/quotation-state.enum';
import type { CampaignResponse } from './campaign-response.enum';
import type { ContactExportStatus } from './contact-export-status.enum';
import type { ContactTimelineKind } from './contact-timeline-kind.enum';
import type { MessageDirection } from '../messaging/message-direction.enum';
import type { MessageStatus } from '../messaging/message-status.enum';
import type { CustomFieldEntity } from './custom-field-entity.enum';
import type { CustomFieldType } from './custom-field-type.enum';

export interface ConsentRecordDto extends EntityDto<string> {
  scope?: ConsentScope;
  source?: ConsentSource;
  granted?: boolean;
  recordedAtUtc?: string;
  evidenceRef?: string | null;
  recordedByUserId?: string | null;
}

export interface ContactDto extends FullAuditedEntityDto<string> {
  waId?: string;
  displayName?: string | null;
  companyName?: string | null;
  role?: DecisionRole;
  languageCode?: string;
  consentScope?: ConsentScope;
  consentSource?: ConsentSource | null;
  consentAtUtc?: string | null;
  suppression?: SuppressionReason;
  lastInboundAtUtc?: string | null;
  lastOutboundAtUtc?: string | null;
  ownerUserId?: string | null;
  city?: string | null;
  state?: string | null;
  designation?: string | null;
  tags?: string[];
  attributes?: Record<string, string>;
  lifecycle?: ContactLifecycle;
  quotationState?: QuotationState;
  lastQuotedAtUtc?: string | null;
  lastQuotedValuePaise?: number | null;
  lastCampaignResponse?: CampaignResponse;
  lastCampaignAtUtc?: string | null;
  campaignsReceived?: number;
  canReceiveMarketing?: boolean;
}

export interface ContactExportRequestDto extends EntityDto<string> {
  status?: ContactExportStatus;
  rowCount?: number;
  sizeBytes?: number;
  fileName?: string | null;
  requestedAtUtc?: string;
  completedAtUtc?: string | null;
  expiresAtUtc?: string | null;
  error?: string | null;
  downloadUrl?: string | null;
}

export interface ContactFieldConflictDto {
  field?: string;
  survivorValue?: string | null;
  loserValue?: string | null;
  needsChoice?: boolean;
}

export interface ContactMergeDto {
  survivorId?: string;
  loserId?: string;
  takeFromLoser?: string[];
}

export interface ContactMergePreviewDto {
  survivorId?: string;
  loserId?: string;
  conflicts?: ContactFieldConflictDto[];
  resultingScope?: ConsentScope;
  resultingSuppression?: SuppressionReason;
  resultingTags?: string[];
  consentNarrowed?: boolean;
  suppressionAdded?: boolean;
  messagesToMove?: number;
  enquiriesToMove?: number;
  quotationsToMove?: number;
  assetsToMove?: number;
}

export interface ContactTimelineEntryDto {
  kind?: ContactTimelineKind;
  occurredAtUtc?: string;
  title?: string;
  detail?: string | null;
  subjectId?: string | null;
  actorName?: string | null;
  direction?: MessageDirection | null;
  status?: MessageStatus | null;
}

export interface ContactTimelineRequestDto {
  fromUtc?: string | null;
  toUtc?: string | null;
  kinds?: ContactTimelineKind[];
  maxResultCount?: number;
}

export interface CreateUpdateContactDto {
  waId: string;
  displayName?: string | null;
  companyName?: string | null;
  role?: DecisionRole;
  languageCode?: string;
  city?: string | null;
  state?: string | null;
  designation?: string | null;
  ownerUserId?: string | null;
  tags?: string[];
  attributes?: Record<string, string>;
}

export interface CreateUpdateCustomFieldDto {
  appliesTo?: CustomFieldEntity;
  key: string;
  label: string;
  type?: CustomFieldType;
  isRequired?: boolean;
  order?: number;
  helpText?: string | null;
  options?: string[];
}

export interface CreateUpdateSegmentDto {
  name: string;
  description?: string | null;
  ruleJson: string;
  isDynamic?: boolean;
}

export interface CustomFieldDefinitionDto extends EntityDto<string> {
  appliesTo?: CustomFieldEntity;
  key?: string;
  label?: string;
  type?: CustomFieldType;
  isRequired?: boolean;
  isSystem?: boolean;
  order?: number;
  helpText?: string | null;
  options?: CustomFieldOptionDto[];
}

export interface CustomFieldOptionDto {
  value?: string;
  order?: number;
}

export interface ExportContactsDto {
  filter?: string | null;
  tag?: string | null;
  scope?: ConsentScope | null;
  suppression?: SuppressionReason | null;
}

export interface GetContactListInput extends PagedAndSortedResultRequestDto {
  filter?: string | null;
  tag?: string | null;
  consentScope?: ConsentScope | null;
  suppression?: SuppressionReason | null;
}

export interface GrantConsentInput {
  scope?: ConsentScope;
  source?: ConsentSource;
  evidenceRef?: string | null;
}

export interface ImportDryRunDto {
  totalRows?: number;
  willCreate?: number;
  willUpdate?: number;
  duplicatesInFile?: number;
  rejectedCount?: number;
  countryCodeAdded?: number;
  rejected?: ImportRejectionDto[];
}

export interface ImportFieldDto {
  value?: string;
  label?: string;
  isRequired?: boolean;
  isCustomField?: boolean;
}

export interface ImportFileDto {
  content: string;
}

export interface ImportPreviewDto {
  headers?: string[];
  rowCount?: number;
  suggestedMapping?: Record<string, string>;
  sampleRows?: [string][];
  availableFields?: ImportFieldDto[];
}

export interface ImportRejectionDto {
  rowNumber?: number;
  rawValue?: string | null;
  reason?: string;
}

export interface ImportResultDto {
  totalRows?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  consentScopeApplied?: ConsentScope;
  consentScopeDowngraded?: boolean;
  errors?: string[];
}

export interface RunImportDto {
  content: string;
  columnMapping: Record<string, string>;
  consentSource: ConsentSource;
  consentScope?: ConsentScope;
  evidenceReference?: string | null;
  consentTextRef?: string | null;
  defaultCountryCode?: string;
}

export interface SegmentCostLineDto {
  category?: string;
  recipients?: number;
  rateInPaise?: number;
  estimatedTotalInPaise?: number;
  pricedAtUtc?: string;
  exceedsWalletBalance?: boolean;
}

export interface SegmentDto extends FullAuditedEntityDto<string> {
  name?: string;
  description?: string | null;
  ruleJson?: string;
  isDynamic?: boolean;
  cachedMemberCount?: number;
  lastEvaluatedAtUtc?: string | null;
  isCountStale?: boolean;
}

export interface SegmentPreviewDto {
  totalMatching?: number;
  marketingEligible?: number;
  utilityEligible?: number;
  suppressed?: number;
  optedOut?: number;
  insideServiceWindow?: number;
  sample?: ContactDto[];
  problems?: string[];
  matchesEveryone?: boolean;
  cost?: SegmentCostLineDto[];
}
