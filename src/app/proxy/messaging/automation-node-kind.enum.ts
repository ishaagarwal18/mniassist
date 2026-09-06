import { mapEnumToOptions } from '@abp/ng.core';

export enum AutomationNodeKind {
  Trigger = 0,
  SendTemplate = 1,
  SendSessionMessage = 2,
  Condition = 3,
  Wait = 4,
  AssignAgent = 5,
  UpdateAttribute = 6,
  CreateEnquiry = 7,
  Webhook = 8,
  End = 9,
  StartFlow = 10,
}

export const automationNodeKindOptions = mapEnumToOptions(AutomationNodeKind);
