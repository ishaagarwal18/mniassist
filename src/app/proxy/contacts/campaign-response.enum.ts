import { mapEnumToOptions } from '@abp/ng.core';

export enum CampaignResponse {
  NotTargeted = 0,
  NotDelivered = 1,
  Delivered = 2,
  Read = 3,
  Clicked = 4,
  Replied = 5,
}

export const campaignResponseOptions = mapEnumToOptions(CampaignResponse);
