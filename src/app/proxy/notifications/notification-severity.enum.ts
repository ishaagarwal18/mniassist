import { mapEnumToOptions } from '@abp/ng.core';

export enum NotificationSeverity {
  Info = 0,
  Warning = 1,
  Critical = 2,
}

export const notificationSeverityOptions = mapEnumToOptions(NotificationSeverity);
