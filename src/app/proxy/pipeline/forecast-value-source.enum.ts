import { mapEnumToOptions } from '@abp/ng.core';

export enum ForecastValueSource {
  None = 0,
  Estimate = 1,
  Quotation = 2,
}

export const forecastValueSourceOptions = mapEnumToOptions(ForecastValueSource);
