import { mapEnumToOptions } from '@abp/ng.core';

export enum SubscriptionPlan {
  Starter = 0,
  Growth = 1,
  Pro = 2,
  Enterprise = 3,
}

export const subscriptionPlanOptions = mapEnumToOptions(SubscriptionPlan);
