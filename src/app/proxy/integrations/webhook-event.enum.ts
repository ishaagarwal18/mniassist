import { mapEnumToOptions } from '@abp/ng.core';

/**
 * The set is closed on purpose: each event has a defined payload shape that is part
 * of the public contract a tenant's endpoint is written against.
 */
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
