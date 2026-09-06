import { mapEnumToOptions } from '@abp/ng.core';

export enum BreachSeverity {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3,
}

export const breachSeverityOptions = mapEnumToOptions(BreachSeverity);
