import { mapEnumToOptions } from '@abp/ng.core';

export enum DuplicateReason {
  SamePhone = 0,
  SameEmail = 1,
  SameNameAndCompany = 2,
  SameNameOnDifferentChannels = 3,
  SameEmailDifferentPhones = 4,
}

export const duplicateReasonOptions = mapEnumToOptions(DuplicateReason);
