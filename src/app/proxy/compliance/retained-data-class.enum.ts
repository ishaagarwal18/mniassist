import { mapEnumToOptions } from '@abp/ng.core';

export enum RetainedDataClass {
  Conversations = 0,
  Media = 1,
  RawWebhookPayloads = 2,
  Exports = 3,
  AuditLog = 4,
  ConsentRecords = 5,
  CallRecordings = 6,
}

export const retainedDataClassOptions = mapEnumToOptions(RetainedDataClass);
