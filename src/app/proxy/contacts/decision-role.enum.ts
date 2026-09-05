import { mapEnumToOptions } from '@abp/ng.core';

export enum DecisionRole {
  Unknown = 0,
  Maintenance = 1,
  Purchase = 2,
  Engineering = 3,
  PlantHead = 4,
  Dealer = 5,
}

export const decisionRoleOptions = mapEnumToOptions(DecisionRole);
