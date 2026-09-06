import { mapEnumToOptions } from '@abp/ng.core';

export enum ConversationStatus {
  Open = 0,
  Pending = 1,
  Resolved = 2,
}

export const conversationStatusOptions = mapEnumToOptions(ConversationStatus);
