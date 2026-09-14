import { mapEnumToOptions } from '@abp/ng.core';

/** Resumable steps of Gupshup's Solution Partner onboarding (spec §4.2, decision D-01). */
export enum GupshupOnboardingStep {
  AppCreated = 1,
  CallbackConfigured = 2,
  EmbedLinkIssued = 3,
  TenantLinked = 4,
  AppTokenObtained = 5,
  ChannelSeeded = 6,
}

export const gupshupOnboardingStepOptions = mapEnumToOptions(GupshupOnboardingStep);
