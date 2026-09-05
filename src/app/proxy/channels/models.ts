import type { AuditedEntityDto, EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { ChannelState } from './channel-state.enum';
import type { DisplayNameStatus } from './display-name-status.enum';
import type { MessagingTier } from './messaging-tier.enum';
import type { OnboardingStep } from './onboarding-step.enum';
import type { QualityRating } from './quality-rating.enum';

export interface ChannelDto extends AuditedEntityDto<string> {
  wabaId?: string;
  phoneNumberId?: string;
  businessPortfolioId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  displayNameStatus: DisplayNameStatus;
  quality: QualityRating;
  tier: MessagingTier;
  state: ChannelState;
  throughputMps: number;
  reservedFraction: number;
  registeredAtUtc?: string;
  lastQualityChangeUtc?: string;
  restrictionReason?: string;
}

export interface ChannelHealthDto {
  channelId?: string;
  displayPhoneNumber?: string;
  quality: QualityRating;
  tier: MessagingTier;
  state: ChannelState;
  /** null when the tier is unlimited. */
  dailyLimit?: number;
  used24h: number;
  reserved: number;
  /** What a marketing campaign may actually address right now. */
  marketingAvailable?: number;
  utilisationFraction: number;
  canSend: boolean;
  blockedReason?: string;
  safeThroughputMps: number;
}

export interface ChannelQualitySnapshotDto extends EntityDto<string> {
  capturedAtUtc?: string;
  quality: QualityRating;
  tier: MessagingTier;
  uniqueRecipients24h: number;
  note?: string;
}

export interface CompleteOnboardingStepInput {
  step: OnboardingStep;
  payloadJson?: string;
}

export interface GetChannelListInput extends PagedAndSortedResultRequestDto {
  state?: ChannelState;
  filter?: string;
}

export interface OnboardingSessionDto extends EntityDto<string> {
  channelId?: string;
  completedThrough: OnboardingStep;
  nextStep: OnboardingStep;
  lastError?: string;
  startedAtUtc?: string;
  completedAtUtc?: string;
}

export interface UpdateChannelInput {
  reservedFraction: number;
  throughputMps: number;
}
