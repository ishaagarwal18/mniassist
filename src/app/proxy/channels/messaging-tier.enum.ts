import { mapEnumToOptions } from '@abp/ng.core';

export enum MessagingTier {
  Starting = 0,
  Tier1 = 1,
  Tier2 = 2,
  Tier3 = 3,
  Tier4 = 4,
}

export const messagingTierOptions = mapEnumToOptions(MessagingTier);
