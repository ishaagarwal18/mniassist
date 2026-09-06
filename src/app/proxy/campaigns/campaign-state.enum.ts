import { mapEnumToOptions } from '@abp/ng.core';

export enum CampaignState {
  Draft = 0,
  Scheduled = 1,
  Running = 2,
  Paused = 3,
  Completed = 4,
  Cancelled = 5,
  Suspended = 6,
}

export const campaignStateOptions = mapEnumToOptions(CampaignState);
