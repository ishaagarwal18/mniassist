import { mapEnumToOptions } from '@abp/ng.core';

export enum LeadSource {
  Manual = 0,
  Website = 1,
  ClickToWhatsApp = 2,
  Exhibition = 3,
  QrCode = 4,
  Referral = 5,
  Import = 6,
  Dealer = 7,
  Renewal = 8,
}

export const leadSourceOptions = mapEnumToOptions(LeadSource);
