import { mapEnumToOptions } from '@abp/ng.core';

export enum AtRiskReason {
  NumberQualityDegraded = 0,
  StoppedSending = 1,
  TrialNeverSent = 2,
}

export const atRiskReasonOptions = mapEnumToOptions(AtRiskReason);

export enum AtRiskAlertStatus {
  Open = 0,
  Acknowledged = 1,
  Resolved = 2,
}

export const atRiskAlertStatusOptions = mapEnumToOptions(AtRiskAlertStatus);
