import { mapEnumToOptions } from '@abp/ng.core';

export enum ConsentScope {
  UtilityOnly = 0,
  MarketingAndUtility = 1,
}

export const consentScopeOptions = mapEnumToOptions(ConsentScope);
