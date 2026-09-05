import { mapEnumToOptions } from '@abp/ng.core';

export enum EnquiryStage {
  New = 0,
  Qualified = 1,
  SiteVisit = 2,
  Quoted = 3,
  Negotiation = 4,
  Won = 5,
  Lost = 6,
}
export const enquiryStageOptions = mapEnumToOptions(EnquiryStage);

export enum LeadSource {
  Manual = 0,
  Website = 1,
  ClickToWhatsApp = 2,
  Exhibition = 3,
  QrCode = 4,
  Referral = 5,
  Import = 6,
  Dealer = 7,
}
export const leadSourceOptions = mapEnumToOptions(LeadSource);

export enum QuotationState {
  Draft = 0,
  Issued = 1,
  Revised = 2,
  Won = 3,
  Lost = 4,
  Expired = 5,
}
export const quotationStateOptions = mapEnumToOptions(QuotationState);

export enum ReminderKind {
  AmcRenewal = 0,
  WarrantyExpiry = 1,
  CalibrationDue = 2,
  PreventiveMaintenance = 3,
  QuotationFollowUp = 4,
}
export const reminderKindOptions = mapEnumToOptions(ReminderKind);

export enum ReminderState {
  Scheduled = 0,
  Sent = 1,
  Halted = 2,
  Failed = 3,
}
export const reminderStateOptions = mapEnumToOptions(ReminderState);

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
}
