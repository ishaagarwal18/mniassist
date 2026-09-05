import { mapEnumToOptions } from '@abp/ng.core';

export enum QualityRating {
  Unknown = 0,
  Green = 1,
  Yellow = 2,
  Red = 3,
}

export const qualityRatingOptions = mapEnumToOptions(QualityRating);
