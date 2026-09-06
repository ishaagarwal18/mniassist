import { mapEnumToOptions } from '@abp/ng.core';

export enum ReminderState {
  Scheduled = 0,
  Sent = 1,
  Halted = 2,
  Failed = 3,
}

export const reminderStateOptions = mapEnumToOptions(ReminderState);
