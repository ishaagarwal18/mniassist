import { mapEnumToOptions } from '@abp/ng.core';

export enum AutomationTriggerKind {
  InboundKeyword = 0,
  ButtonReply = 1,
  ContactCreated = 2,
  AttributeChanged = 3,
  EnquiryStageChanged = 4,
  ScheduledDate = 5,
  FlowCompleted = 6,
  CampaignReply = 7,
  SegmentEntered = 8,
  AiCallCompleted = 9,
  AiCallNotConnected = 10,
}

export const automationTriggerKindOptions = mapEnumToOptions(AutomationTriggerKind);
