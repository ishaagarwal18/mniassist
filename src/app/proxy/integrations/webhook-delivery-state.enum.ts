import { mapEnumToOptions } from '@abp/ng.core';

export enum WebhookDeliveryState {
  Pending = 0,
  Delivered = 1,
  Failed = 2,
  Abandoned = 3,
}

export const webhookDeliveryStateOptions = mapEnumToOptions(WebhookDeliveryState);
