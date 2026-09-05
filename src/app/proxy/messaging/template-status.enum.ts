import { mapEnumToOptions } from '@abp/ng.core';

export enum TemplateStatus {
  Draft = 0,
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Paused = 4,
  Disabled = 5,
}

export const templateStatusOptions = mapEnumToOptions(TemplateStatus);
