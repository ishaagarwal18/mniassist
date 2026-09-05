import { mapEnumToOptions } from '@abp/ng.core';

export enum OnboardingStep {
  FacebookLogin = 1,
  WabaCreated = 2,
  NumberVerified = 3,
  AccessGranted = 4,
  WebhooksSubscribed = 5,
  NumberRegistered = 6,
  MetadataRead = 7,
  StarterTemplatesSubmitted = 8,
}

export const onboardingStepOptions = mapEnumToOptions(OnboardingStep);
