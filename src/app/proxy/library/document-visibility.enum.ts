import { mapEnumToOptions } from '@abp/ng.core';

export enum DocumentVisibility {
  Public = 0,
  VerifiedDealers = 1,
  NamedAccounts = 2,
}

export const documentVisibilityOptions = mapEnumToOptions(DocumentVisibility);
