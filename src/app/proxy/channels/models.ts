import type { AuditedEntityDto, EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { DisplayNameStatus } from './display-name-status.enum';
import type { QualityRating } from './quality-rating.enum';
import type { MessagingTier } from './messaging-tier.enum';
import type { ChannelState } from './channel-state.enum';
import type { OnboardingStep } from './onboarding-step.enum';
import type { GupshupOnboardingStep } from './gupshup-onboarding-step.enum';

export interface ChannelDto extends AuditedEntityDto<string> {
  wabaId?: string;
  phoneNumberId?: string;
  businessPortfolioId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  displayNameStatus?: DisplayNameStatus;
  quality?: QualityRating;
  tier?: MessagingTier;
  state?: ChannelState;
  throughputMps?: number;
  reservedFraction?: number;
  registeredAtUtc?: string | null;
  lastQualityChangeUtc?: string | null;
  restrictionReason?: string | null;
}

export interface ChannelHealthDto {
  channelId?: string;
  displayPhoneNumber?: string;
  quality?: QualityRating;
  tier?: MessagingTier;
  state?: ChannelState;
  dailyLimit?: number | null;
  used24h?: number;
  reserved?: number;
  marketingAvailable?: number | null;
  utilisationFraction?: number;
  canSend?: boolean;
  blockedReason?: string | null;
  safeThroughputMps?: number;
}

export interface ChannelQualitySnapshotDto extends EntityDto<string> {
  capturedAtUtc?: string;
  quality?: QualityRating;
  tier?: MessagingTier;
  uniqueRecipients24h?: number;
  note?: string | null;
}

export interface CompleteEmbeddedSignupInput {
  authorizationCode?: string | null;
  wabaId: string;
  phoneNumberId: string;
  businessPortfolioId: string;
  twoStepPin?: string;
}

export interface CompleteOnboardingStepInput {
  step?: OnboardingStep;
  payloadJson?: string | null;
}

export interface GetChannelListInput extends PagedAndSortedResultRequestDto {
  state?: ChannelState | null;
  filter?: string | null;
}

export interface NumberManagementDto {
  channelId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  nameReviewState?: DisplayNameStatus;
  requestedName?: string | null;
  nameRequestedAtUtc?: string | null;
  nameRejectionReason?: string | null;
  hasTwoStepPin?: boolean;
  pinUpdatedAtUtc?: string | null;
  isRegistered?: boolean;
}

export interface OnboardingSessionDto extends EntityDto<string> {
  channelId?: string | null;
  completedThrough?: OnboardingStep;
  nextStep?: OnboardingStep;
  lastError?: string | null;
  startedAtUtc?: string;
  completedAtUtc?: string | null;
  /** What the browser opens Meta's Embedded Signup popup with; null when the platform hasn't set them. */
  metaAppId?: string | null;
  embeddedSignupConfigurationId?: string | null;
  graphVersion?: string | null;
}

// ---- Solution Partner onboarding (Gupshup, decision D-01, spec §4.2) ----------

export interface SolutionPartnerOnboardingSessionDto extends EntityDto<string> {
  channelId?: string | null;
  completedThrough?: GupshupOnboardingStep;
  nextStep?: GupshupOnboardingStep;
  lastError?: string | null;
  startedAtUtc?: string;
  completedAtUtc?: string | null;
  /** The link to send the tenant to. Present once EmbedLinkIssued is reached, and
   *  re-shown on a resumed session rather than re-issued — it stays valid five days. */
  embedLink?: string | null;
}

export interface RegenerateEmbedLinkInput {
  /** True once the tenant reports the previous link expired or failed. */
  regenerate: boolean;
}

export interface RequestDisplayNameChangeInput {
  displayName: string;
}

export interface SetTwoStepPinInput {
  pin: string;
  currentPin?: string | null;
}

export interface UpdateBusinessProfileInput {
  about?: string | null;
  address?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  vertical?: string | null;
}

export interface UpdateChannelInput {
  reservedFraction?: number;
  throughputMps?: number;
}
