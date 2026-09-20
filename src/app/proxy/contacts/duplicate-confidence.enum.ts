import { mapEnumToOptions } from '@abp/ng.core';

export enum DuplicateConfidence {
  Medium = 1,
  High = 2,
}

export const duplicateConfidenceOptions = mapEnumToOptions(DuplicateConfidence);
