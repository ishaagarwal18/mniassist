import { mapEnumToOptions } from '@abp/ng.core';

export enum VoiceCallDirection {
  Outbound = 0,
  Inbound = 1,
}

export const voiceCallDirectionOptions = mapEnumToOptions(VoiceCallDirection);
