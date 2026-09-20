import { mapEnumToOptions } from '@abp/ng.core';

export enum ChannelMergeMode {
  Unchanged = 0,
  MostRestrictive = 1,
  AdoptFromLoser = 2,
}

export const channelMergeModeOptions = mapEnumToOptions(ChannelMergeMode);
