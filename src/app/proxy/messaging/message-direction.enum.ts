import { mapEnumToOptions } from '@abp/ng.core';

export enum MessageDirection {
  Inbound = 0,
  Outbound = 1,
}

export const messageDirectionOptions = mapEnumToOptions(MessageDirection);
