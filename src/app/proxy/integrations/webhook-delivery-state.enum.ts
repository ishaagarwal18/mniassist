import { mapEnumToOptions } from '@abp/ng.core';

export enum WebhookDeliveryState {
  Pending = 0,
  Delivered = 1,
  Failed = 2,
  /** Retries exhausted. Kept rather than deleted so a tenant can see what was lost. */
  Abandoned = 3,
}

export const webhookDeliveryStateOptions = mapEnumToOptions(WebhookDeliveryState);
