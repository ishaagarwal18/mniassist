import { mapEnumToOptions } from '@abp/ng.core';

export enum BreachState {
  Detected = 0,
  Contained = 1,
  Notified = 2,
  Closed = 3,
}

export const breachStateOptions = mapEnumToOptions(BreachState);
