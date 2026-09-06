import { mapEnumToOptions } from '@abp/ng.core';

export enum AutomationState {
  Draft = 0,
  Active = 1,
  Paused = 2,
}

export const automationStateOptions = mapEnumToOptions(AutomationState);
