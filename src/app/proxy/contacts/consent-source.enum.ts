import { mapEnumToOptions } from '@abp/ng.core';

export enum ConsentSource {
  Website = 0,
  WhatsAppOptIn = 1,
  Import = 2,
  ClickToWhatsApp = 3,
  QrCode = 4,
  Manual = 5,
  Api = 6,
  EmailOptIn = 7,
  SmsOptIn = 8,
  VoiceOptIn = 9,
  InstagramOptIn = 10,
  MessengerOptIn = 11,
  ConsentManager = 12,
  LeadAd = 13,
}

export const consentSourceOptions = mapEnumToOptions(ConsentSource);
