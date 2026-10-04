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
import type { ChannelKind } from '../channels/channel-kind.enum';
import type { ChannelMergeMode } from './channel-merge-mode.enum';
import type { DuplicateConfidence } from './duplicate-confidence.enum';
import type { DuplicateReason } from './duplicate-reason.enum';
import type { MessageDirection } from '../messaging/message-direction.enum';
import type { MessageStatus } from '../messaging/message-status.enum';
import type { CustomFieldEntity } from './custom-field-entity.enum';
import type { CustomFieldType } from './custom-field-type.enum';

export interface CustomerAccountDto extends FullAuditedEntityDto<string> {
  name?: string;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  ownerUserId?: string | null;
  notes?: string | null;
  /** The account this one sits under; null/absent for a top-level account. */
  parentAccountId?: string | null;
  /** Accounts directly under this one. */
  childCount?: number;
  contactCount?: number;
}

export interface CreateUpdateCustomerAccountDto {
  name: string;
  /** Refused by the server if it would create a loop or nest deeper than five levels. */
  parentAccountId?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  ownerUserId?: string | null;
  notes?: string | null;
}

export interface GetCustomerAccountListInput extends PagedAndSortedResultRequestDto {
  filter?: string | null;
  ownerUserId?: string | null;
  parentAccountId?: string | null;
  rootsOnly?: boolean;
}

export interface AccountContactDto {
  id?: string;
  displayName?: string | null;
  waId?: string;
  designation?: string | null;
  lifecycle?: ContactLifecycle;
  lastInboundAtUtc?: string | null;
  accountId?: string | null;
  accountName?: string | null;
}

/** One account in the tree, in reading order (a parent, then its subtree). */
export interface AccountTreeNodeDto {
  id: string;
  parentAccountId?: string | null;
  name: string;
  city?: string | null;
  industry?: string | null;
  ownerUserId?: string | null;
  /** 1 for a top-level account, 2 for its child, and so on. */
  depth: number;
  childCount: number;
  contactCount: number;
  /** Contacts on this account and everything below it. */
  subtreeContactCount: number;
}

export interface CustomerAccountRollupDto {
  accountId?: string;
  /** True when the figures include every account under this one. */
  includesSubsidiaries?: boolean;
  subsidiaryCount?: number;
  contactCount?: number;
  openEnquiryCount?: number;
  wonEnquiryCount?: number;
  lostEnquiryCount?: number;
  pipelineValueInPaise?: number;
  lastActivityUtc?: string | null;
  lifecycleBreakdown?: Record<string, number>;
  contacts?: AccountContactDto[];
}

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
  accountId?: string | null;
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
  engagementScore?: number;
  scoreUpdatedAtUtc?: string | null;
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
  channels?: ChannelConsentOutcomeDto[];
  addressesGained?: string[];
  crmRecordsHandedOver?: number;
  crmDuplicatesLeft?: number;
  conversationsToMove?: number;
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
  accountId?: string | null;
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
  minScore?: number | null;
  /** Only contacts on this company account. */
  accountId?: string | null;
  /** With accountId: also contacts on every account beneath it, at any depth. */
  includeSubsidiaries?: boolean;
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

export interface ChannelConsentOutcomeDto {
  channel?: ChannelKind;
  mode?: ChannelMergeMode;
  resultingScope?: ConsentScope;
  resultingSuppression?: SuppressionReason;
  narrowed?: boolean;
  suppressionAdded?: boolean;
}

export interface GetContactDuplicatesInput {
  highConfidenceOnly?: boolean;
  skipCount?: number;
  maxResultCount?: number;
}

export interface DuplicateContactDto {
  id?: string;
  displayName?: string | null;
  companyName?: string | null;
  waId?: string | null;
  emailAddress?: string | null;
  hasInstagram?: boolean;
  hasMessenger?: boolean;
  creationTime?: string;
  lastActivityUtc?: string | null;
}

export interface ContactDuplicatePairDto {
  confidence?: DuplicateConfidence;
  reasons?: DuplicateReason[];
  first?: DuplicateContactDto;
  second?: DuplicateContactDto;
  suggestedSurvivorId?: string;
}

export interface DismissDuplicateInput {
  contactAId?: string;
  contactBId?: string;
}

export interface BusinessCardDto {
  name?: string | null;
  designation?: string | null;
  company?: string | null;
  phones?: string[];
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  note?: string | null;
}

export interface ReadBusinessCardInput {
  content: string;
  mediaType: string;
}
