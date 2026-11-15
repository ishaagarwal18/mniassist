import type { AuditedEntityDto, EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { DisplayNameStatus } from './display-name-status.enum';
import type { QualityRating } from './quality-rating.enum';
import type { MessagingTier } from './messaging-tier.enum';
import type { ChannelState } from './channel-state.enum';
import type { OnboardingStep } from './onboarding-step.enum';

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

export interface RequestDisplayNameChangeInput {
  displayName: string;
}

export interface ReleaseChannelInput {
  /** The number as shown, typed back to confirm. */
  confirmPhoneNumber: string;
  /** Also take the number off Meta's Cloud API, so it can be registered elsewhere. */
  deregisterAtMeta?: boolean;
}

export interface SetTwoStepPinInput {
  pin: string;
  currentPin?: string | null;
}

export interface BusinessProfileDto {
  about?: string | null;
  address?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  vertical?: string | null;
  profilePictureUrl?: string | null;
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
export interface ConnectExistingWhatsAppInput {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
}
