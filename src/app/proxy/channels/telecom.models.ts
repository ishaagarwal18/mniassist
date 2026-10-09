import type { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { DisplayNameStatus } from './display-name-status.enum';
import type { MessagingTier } from './messaging-tier.enum';
import type { QualityRating } from './quality-rating.enum';
import type {
  ResellerNumberStatus,
  ResellerNumberType,
  SimBindingStatus,
  TelecomEntityClassification,
  TelecomKycStatus,
} from './telecom-enums';

export interface ResellerNumberDto extends FullAuditedEntityDto<string> {
  tenantId?: string;
  e164: string;
  countryCode: string;
  nationalNumber: string;
  tspCarrier: string;
  numberType: ResellerNumberType;
  status: ResellerNumberStatus;
  allocatedTenantName?: string;
  allocatedAtUtc?: string;
  allocatedByUserId?: string;
  monthlyRentalPaise: number;
  monthlyRentalInr: number;
  setupFeePaise: number;
  setupFeeInr: number;
  verifiedName?: string;
  displayNameStatus: DisplayNameStatus;
  isRegisteredWithMeta: boolean;
  metaPhoneNumberId?: string;
  metaWabaId?: string;
  quality: QualityRating;
  tier: MessagingTier;
  kycStatus: TelecomKycStatus;
  kycDocumentRef?: string;
  simBindingStatus: SimBindingStatus;
  simBindingCertRef?: string;
  quarantinedUntilUtc?: string;
  notes?: string;
}

export interface GetResellerNumbersInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: ResellerNumberStatus;
  tspCarrier?: string;
  kycStatus?: TelecomKycStatus;
  tenantId?: string;
  availableOnly?: boolean;
}

export interface CreateResellerNumberInput {
  e164: string;
  countryCode: string;
  nationalNumber: string;
  tspCarrier: string;
  numberType?: ResellerNumberType;
  monthlyRentalPaise?: number;
  setupFeePaise?: number;
  notes?: string;
}

export interface AllocateNumberInput {
  tenantId?: string;
  tenantName?: string;
  verifiedName?: string;
}

export interface ReleaseNumberInput {
  reason?: string;
  quarantineDays?: number;
}

export interface UpdateNumberKycInput {
  status: TelecomKycStatus;
  documentRef?: string;
  notes?: string;
}

export interface TelecomEntitySettingsDto extends FullAuditedEntityDto<string> {
  tenantId?: string;
  legalEntityName: string;
  classification: TelecomEntityClassification;
  dotRegistrationNumber: string;
  dltPrincipalEntityId: string;
  telemarketerId: string;
  primaryTspCarrier: string;
  secondaryTspCarrier?: string;
  interconnectPoint?: string;
  ctsoName: string;
  ctsoEmail: string;
  ctsoPhone: string;
  ctsoDesignation: string;
  simBindingEnforced: boolean;
  antiSpoofingAuditPassed: boolean;
  lawfulInterceptionLogging: boolean;
  metaTechProviderAgreementSigned: boolean;
  prohibitionOfDisposableNumbersAcknowledged: boolean;
  lastComplianceAuditUtc?: string;
  auditNotes?: string;
}

export interface UpdateTelecomEntitySettingsDto {
  legalEntityName: string;
  classification: TelecomEntityClassification;
  dotRegistrationNumber: string;
  dltPrincipalEntityId: string;
  telemarketerId: string;
  primaryTspCarrier: string;
  secondaryTspCarrier?: string;
  interconnectPoint?: string;
  ctsoName: string;
  ctsoEmail: string;
  ctsoPhone: string;
  ctsoDesignation: string;
  simBindingEnforced: boolean;
  antiSpoofingAuditPassed: boolean;
  lawfulInterceptionLogging: boolean;
  metaTechProviderAgreementSigned: boolean;
  prohibitionOfDisposableNumbersAcknowledged: boolean;
  auditNotes?: string;
}

export interface TelecomComplianceAuditResultDto {
  totalInventoryCount: number;
  allocatedCount: number;
  availableCount: number;
  quarantinedCount: number;
  simBoundCount: number;
  kycVerifiedCount: number;
  entityLicenseValid: boolean;
  ctsoAppointed: boolean;
  antiSpoofingCompliant: boolean;
  metaTechProviderCompliant: boolean;
  auditTimestampUtc: string;
  checks: string[];
}
