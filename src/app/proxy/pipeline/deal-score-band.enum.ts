import { mapEnumToOptions } from '@abp/ng.core';

export enum DealScoreBand {
  Cold = 0,
  Warm = 1,
  Hot = 2,
}

export const dealScoreBandOptions = mapEnumToOptions(DealScoreBand);
