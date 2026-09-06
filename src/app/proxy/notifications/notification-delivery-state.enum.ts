import { mapEnumToOptions } from '@abp/ng.core';

export enum NotificationDeliveryState {
  Pending = 0,
  Sent = 1,
  Failed = 2,
  Skipped = 3,
}

export const notificationDeliveryStateOptions = mapEnumToOptions(NotificationDeliveryState);
