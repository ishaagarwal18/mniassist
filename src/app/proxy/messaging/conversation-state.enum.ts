import { mapEnumToOptions } from '@abp/ng.core';

export enum ConversationState {
  Open = 0,
  Snoozed = 1,
  Closed = 2,
}

export const conversationStateOptions = mapEnumToOptions(ConversationState);
