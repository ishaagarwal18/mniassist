import { mapEnumToOptions } from '@abp/ng.core';

export enum TeamAssignmentStrategy {
  RoundRobin = 0,
  LeastBusy = 1,
  Manual = 2,
}

export const teamAssignmentStrategyOptions = mapEnumToOptions(TeamAssignmentStrategy);
