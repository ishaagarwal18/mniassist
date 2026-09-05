import { mapEnumToOptions } from '@abp/ng.core';

export enum DataRequestKind {
  Access = 0,
  Correction = 1,
  Erasure = 2,
  ConsentWithdrawal = 3,
}
export const dataRequestKindOptions = mapEnumToOptions(DataRequestKind);

export enum DataRequestState {
  Received = 0,
  InProgress = 1,
  Fulfilled = 2,
  Rejected = 3,
}
export const dataRequestStateOptions = mapEnumToOptions(DataRequestState);

export enum RetainedDataClass {
  Conversations = 0,
  Media = 1,
  RawWebhookPayloads = 2,
  Exports = 3,
  AuditLog = 4,
  ConsentRecords = 5,
}
export const retainedDataClassOptions = mapEnumToOptions(RetainedDataClass);

export enum BreachSeverity {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3,
}
export const breachSeverityOptions = mapEnumToOptions(BreachSeverity);

export enum BreachState {
  Detected = 0,
  Contained = 1,
  Notified = 2,
  Closed = 3,
}
export const breachStateOptions = mapEnumToOptions(BreachState);
