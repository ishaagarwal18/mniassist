import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { ConsentScope } from './consent-scope.enum';
import type { ConsentSource } from './consent-source.enum';
import type { DecisionRole } from './decision-role.enum';
import type { SuppressionReason } from './suppression-reason.enum';

export interface ConsentRecordDto extends EntityDto<string> {
  scope: ConsentScope;
  source: ConsentSource;
  granted: boolean;
  recordedAtUtc?: string;
  evidenceRef?: string;
  recordedByUserId?: string;
}

export interface ContactDto extends FullAuditedEntityDto<string> {
  waId?: string;
  displayName?: string;
  companyName?: string;
  role: DecisionRole;
  languageCode?: string;
  consentScope: ConsentScope;
  consentSource?: ConsentSource;
  consentAtUtc?: string;
  suppression: SuppressionReason;
  lastInboundAtUtc?: string;
  lastOutboundAtUtc?: string;
  ownerUserId?: string;
  city?: string;
  state?: string;
  tags: string[];
  attributes: Record<string, string>;
  canReceiveMarketing: boolean;
}

export interface CreateUpdateContactDto {
  waId: string;
  displayName?: string;
  companyName?: string;
  role: DecisionRole;
  languageCode: string;
  city?: string;
  state?: string;
  ownerUserId?: string;
  tags: string[];
  attributes: Record<string, string>;
}

export interface CreateUpdateSegmentDto {
  name: string;
  description?: string;
  ruleJson: string;
  isDynamic: boolean;
}

export interface GetContactListInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  tag?: string;
  consentScope?: ConsentScope;
  suppression?: SuppressionReason;
}

export interface GrantConsentInput {
  scope: ConsentScope;
  source: ConsentSource;
  evidenceRef?: string;
}

// ---- CSV import / export (IContactImportAppService) -----------------------

export interface ImportFileDto {
  content: string;
}

export interface ImportFieldDto {
  value: string;
  label: string;
  isRequired: boolean;
  isCustomField: boolean;
}

export interface ImportPreviewDto {
  headers: string[];
  rowCount: number;
  suggestedMapping: Record<string, string>;
  sampleRows: string[][];
  availableFields: ImportFieldDto[];
}

export interface RunImportDto {
  content: string;
  columnMapping: Record<string, string>;
  consentSource: ConsentSource;
  consentScope: ConsentScope;
  evidenceReference?: string;
  consentTextRef?: string;
  defaultCountryCode: string;
}

export interface ImportRejectionDto {
  rowNumber: number;
  rawValue?: string;
  reason: string;
}

export interface ImportDryRunDto {
  totalRows: number;
  willCreate: number;
  willUpdate: number;
  duplicatesInFile: number;
  rejectedCount: number;
  countryCodeAdded: number;
  rejected: ImportRejectionDto[];
}

export interface ImportResultDto {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  consentScopeApplied: ConsentScope;
  consentScopeDowngraded: boolean;
  errors: string[];
}

export interface ExportContactsDto {
  filter?: string;
  tag?: string;
  scope?: ConsentScope;
  suppression?: SuppressionReason;
}

export interface SegmentDto extends FullAuditedEntityDto<string> {
  name?: string;
  description?: string;
  ruleJson?: string;
  isDynamic: boolean;
  cachedMemberCount: number;
  lastEvaluatedAtUtc?: string;
  /** True when the cached count is old enough that showing it as fact would mislead. */
  isCountStale: boolean;
}

export interface SegmentPreviewDto {
  totalMatching: number;
  /** Of those, how many may receive marketing. The gap is the number that surprises people. */
  marketingEligible: number;
  suppressed: number;
  sample: ContactDto[];
}
