import { mapEnumToOptions } from '@abp/ng.core';

export enum ContactExportStatus {
  Pending = 0,
  Running = 1,
  Completed = 2,
  Failed = 3,
  Expired = 4,
}

export const contactExportStatusOptions = mapEnumToOptions(ContactExportStatus);
