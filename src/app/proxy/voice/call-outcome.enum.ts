import { mapEnumToOptions } from '@abp/ng.core';

export enum CallOutcome {
  None = 0,
  Connected = 1,
  NoAnswer = 2,
  LeftMessage = 3,
  CallBackLater = 4,
  WrongNumber = 5,
  NotInterested = 6,
}

export const callOutcomeOptions = mapEnumToOptions(CallOutcome);
