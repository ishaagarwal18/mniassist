import { mapEnumToOptions } from '@abp/ng.core';

export enum IntegrationKind {
  OutboundWebhook = 0,
  Tally = 1,
  ZohoCrm = 2,
  SapB1 = 3,
  GoogleSheets = 4,
  RestApi = 5,
  HubSpot = 6,
  ZohoBooks = 7,
  Zapier = 8,
}

export const integrationKindOptions = mapEnumToOptions(IntegrationKind);
