import { mapEnumToOptions } from '@abp/ng.core';

export enum CampaignState {
  Draft = 0,
  Scheduled = 1,
  Running = 2,
  Paused = 3,
  Completed = 4,
  Cancelled = 5,
  /** Halted automatically on a quality downgrade or an opt-out breach. */
  Suspended = 6,
}

export const campaignStateOptions = mapEnumToOptions(CampaignState);
