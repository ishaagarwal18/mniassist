import { mapEnumToOptions } from '@abp/ng.core';

export enum SuppressionReason {
  None = 0,
  OptedOut = 1,
  InvalidNumber = 2,
  BlockedByUser = 3,
  HardBounced = 4,
  ManuallyExcluded = 5,
  Complained = 6,
  RepeatedSoftBounce = 7,
}

export const suppressionReasonOptions = mapEnumToOptions(SuppressionReason);
