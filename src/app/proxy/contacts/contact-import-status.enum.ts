import { mapEnumToOptions } from '@abp/ng.core';

export enum ContactImportStatus {
  Pending = 0,
  Running = 1,
  Completed = 2,
  Failed = 3,
}

export const contactImportStatusOptions = mapEnumToOptions(ContactImportStatus);
