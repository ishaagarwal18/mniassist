import { mapEnumToOptions } from '@abp/ng.core';

export enum LeadRotationMode {
  RoundRobin = 0,
  LeastOpenDeals = 1,
}

export const leadRotationModeOptions = mapEnumToOptions(LeadRotationMode);
