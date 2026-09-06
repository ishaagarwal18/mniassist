import { mapEnumToOptions } from '@abp/ng.core';

export enum NotificationChannels {
  None = 0,
  InApp = 1,
  Email = 2,
  WhatsApp = 4,
}

export const notificationChannelsOptions = mapEnumToOptions(NotificationChannels);
