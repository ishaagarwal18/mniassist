import { mapEnumToOptions } from '@abp/ng.core';

export enum EnquiryEventKind {
  Created = 0,
  StageChange = 1,
  Note = 2,
  MessageSent = 3,
  MessageReceived = 4,
  QuotationIssued = 5,
  DocumentShared = 6,
  OwnerChanged = 7,
  FlowSubmitted = 8,
  TaskCompleted = 9,
  MeetingScheduled = 10,
}

export const enquiryEventKindOptions = mapEnumToOptions(EnquiryEventKind);
