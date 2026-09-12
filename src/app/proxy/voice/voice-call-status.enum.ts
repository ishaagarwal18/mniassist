import { mapEnumToOptions } from '@abp/ng.core';

export enum VoiceCallStatus {
  Queued = 0,
  Ringing = 1,
  InProgress = 2,
  Completed = 3,
  Busy = 4,
  Failed = 5,
  NoAnswer = 6,
  Canceled = 7,
}

export const voiceCallStatusOptions = mapEnumToOptions(VoiceCallStatus);
