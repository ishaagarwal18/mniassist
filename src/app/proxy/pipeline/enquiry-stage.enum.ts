import { mapEnumToOptions } from '@abp/ng.core';

export enum EnquiryStage {
  New = 0,
  Qualified = 1,
  SiteVisit = 2,
  Quoted = 3,
  Negotiation = 4,
  Won = 5,
  Lost = 6,
}

export const enquiryStageOptions = mapEnumToOptions(EnquiryStage);
