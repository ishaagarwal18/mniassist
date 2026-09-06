import { mapEnumToOptions } from '@abp/ng.core';

export enum ConversationPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Urgent = 3,
}

export const conversationPriorityOptions = mapEnumToOptions(ConversationPriority);
