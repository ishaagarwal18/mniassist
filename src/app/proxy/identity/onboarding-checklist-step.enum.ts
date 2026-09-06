import { mapEnumToOptions } from '@abp/ng.core';

export enum OnboardingChecklistStep {
  VerifyEmail = 0,
  VerifyMobile = 1,
  CompleteProfile = 2,
  ConnectChannel = 3,
  ReviewConsentPolicy = 4,
  ImportContacts = 5,
  SubmitTemplate = 6,
  FundWallet = 7,
  InviteTeam = 8,
}

export const onboardingChecklistStepOptions = mapEnumToOptions(OnboardingChecklistStep);
