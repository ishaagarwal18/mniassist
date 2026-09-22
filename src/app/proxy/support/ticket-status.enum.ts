import { mapEnumToOptions } from '@abp/ng.core';

export enum TicketStatus {
  Open = 0,
  Pending = 1,
  Resolved = 2,
  Closed = 3,
}

export const ticketStatusOptions = mapEnumToOptions(TicketStatus);
