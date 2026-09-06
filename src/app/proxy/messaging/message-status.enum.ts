import { mapEnumToOptions } from '@abp/ng.core';

export enum MessageStatus {
  Queued = 0,
  Sent = 1,
  Delivered = 2,
  Read = 3,
  Failed = 4,
  Withheld = 5,
}

export const messageStatusOptions = mapEnumToOptions(MessageStatus);
