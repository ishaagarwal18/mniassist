import { mapEnumToOptions } from '@abp/ng.core';

export enum ForecastChanceBasis {
  Configured = 0,
  Workspace = 1,
  Pipeline = 2,
  Person = 3,
}

export const forecastChanceBasisOptions = mapEnumToOptions(ForecastChanceBasis);
