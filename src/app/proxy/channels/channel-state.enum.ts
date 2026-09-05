import { mapEnumToOptions } from '@abp/ng.core';

export enum ChannelState {
  Onboarding = 0,
  Active = 1,
  Suspended = 2,
  Restricted = 3,
}

export const channelStateOptions = mapEnumToOptions(ChannelState);
