import { mapEnumToOptions } from '@abp/ng.core';

export enum RecurrenceKind {
  Once = 0,
  Daily = 1,
  Weekly = 2,
  Monthly = 3,
}

export const recurrenceKindOptions = mapEnumToOptions(RecurrenceKind);
