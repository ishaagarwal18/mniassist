import { mapEnumToOptions } from '@abp/ng.core';

export enum WebhookEvent {
  InboundMessage = 0,
  CampaignCompleted = 1,
  FlowSubmitted = 2,
  EnquiryCreated = 3,
  QuotationStatusChanged = 4,
  ContactOptedOut = 5,
  AutomationStep = 6,
  MessageStatusChanged = 7,
  ReminderSent = 8,
}

export const webhookEventOptions = mapEnumToOptions(WebhookEvent);
