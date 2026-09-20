import { mapEnumToOptions } from '@abp/ng.core';

export enum ChannelKind {
  WhatsApp = 0,
  Instagram = 1,
  Messenger = 2,
  Sms = 3,
  Email = 4,
  Voice = 5,
}

export const channelKindOptions = mapEnumToOptions(ChannelKind);
