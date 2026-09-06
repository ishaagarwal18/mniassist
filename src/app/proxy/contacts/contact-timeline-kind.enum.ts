import { mapEnumToOptions } from '@abp/ng.core';

export enum ContactTimelineKind {
  Message = 0,
  CampaignSend = 1,
  Note = 2,
  ConsentChange = 3,
  EnquiryEvent = 4,
  Quotation = 5,
  FlowSubmission = 6,
  Reminder = 7,
  AutomationStep = 8,
}

export const contactTimelineKindOptions = mapEnumToOptions(ContactTimelineKind);
