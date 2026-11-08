import { mapEnumToOptions } from '@abp/ng.core';

export enum TicketSource {
  Manual = 0,
  WhatsAppFlow = 1,
  Email = 2,
  WebForm = 3,
  Voice = 4,
  QrScan = 5,
}

export const ticketSourceOptions = mapEnumToOptions(TicketSource);
