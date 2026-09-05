import { mapEnumToOptions } from '@abp/ng.core';

export enum NotificationDeliveryState {
  Pending = 0,
  Sent = 1,
  Failed = 2,
  /** Nothing was tried, and the reason is recorded. Distinct from Failed on purpose. */
  Skipped = 3,
}

export const notificationDeliveryStateOptions = mapEnumToOptions(NotificationDeliveryState);
