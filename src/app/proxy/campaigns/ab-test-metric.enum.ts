import { mapEnumToOptions } from '@abp/ng.core';

export enum AbTestMetric {
  None = 0,
  ReplyRate = 1,
  ReadRate = 2,
  ClickRate = 3,
}

export const abTestMetricOptions = mapEnumToOptions(AbTestMetric);
