import { mapEnumToOptions } from '@abp/ng.core';

export enum LostReasonCategory {
  Unspecified = 0,
  PriceTooHigh = 1,
  LostToCompetitor = 2,
  ProjectCancelledOrDeferred = 3,
  NoBudget = 4,
  TimelineTooLong = 5,
  TechnicalFit = 6,
  NoResponse = 7,
  Other = 8,
  AnotherBidderWon = 9,
}

export const lostReasonCategoryOptions = mapEnumToOptions(LostReasonCategory);
