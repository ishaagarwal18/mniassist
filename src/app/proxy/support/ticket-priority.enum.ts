import { mapEnumToOptions } from '@abp/ng.core';

export enum TicketPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Urgent = 3,
}

export const ticketPriorityOptions = mapEnumToOptions(TicketPriority);
