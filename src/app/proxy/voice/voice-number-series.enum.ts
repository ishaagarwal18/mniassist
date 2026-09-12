import { mapEnumToOptions } from '@abp/ng.core';

export enum VoiceNumberSeries {
  Transactional = 0,
  Promotional = 1,
}

export const voiceNumberSeriesOptions = mapEnumToOptions(VoiceNumberSeries);
