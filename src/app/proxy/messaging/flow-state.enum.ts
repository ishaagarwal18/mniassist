import { mapEnumToOptions } from '@abp/ng.core';

export enum FlowState {
  Draft = 0,
  Published = 1,
  Deprecated = 2,
  Blocked = 3,
}

export const flowStateOptions = mapEnumToOptions(FlowState);
