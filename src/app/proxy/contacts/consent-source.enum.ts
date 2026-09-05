import { mapEnumToOptions } from '@abp/ng.core';

export enum ConsentSource {
  Website = 0,
  WhatsAppOptIn = 1,
  Import = 2,
  ClickToWhatsApp = 3,
  QrCode = 4,
  Manual = 5,
  Api = 6,
}

export const consentSourceOptions = mapEnumToOptions(ConsentSource);
