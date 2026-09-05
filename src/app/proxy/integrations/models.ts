import type { EntityDto, PagedResultRequestDto } from '@abp/ng.core';
import type { WebhookDeliveryState } from './webhook-delivery-state.enum';
import type { WebhookEvent } from './webhook-event.enum';

export interface WebhookSubscriptionDto extends EntityDto<string> {
  url: string;
  description?: string;
  isEnabled: boolean;
  events: WebhookEvent[];
  lastSuccessAtUtc?: string;
  lastFailureAtUtc?: string;
  consecutiveFailureCount: number;
  lastError?: string;
  /** Never the secret itself — only whether one is set. There is no read path. */
  hasSigningSecret: boolean;
}

export interface CreateUpdateWebhookSubscriptionDto {
  /** Must be HTTPS. Plain HTTP would put the tenant's own customer data on the wire in clear. */
  url: string;
  description?: string;
  events: WebhookEvent[];
  isEnabled: boolean;
}

export interface WebhookDeliveryDto extends EntityDto<string> {
  subscriptionId: string;
  event: WebhookEvent;
  state: WebhookDeliveryState;
  attemptCount: number;
  createdAtUtc: string;
  nextAttemptAtUtc?: string;
  deliveredAtUtc?: string;
  responseStatusCode?: number;
  lastError?: string;
  /** The payload as sent, so a tenant debugging their endpoint can see it. */
  payloadJson: string;
}

export interface RotateWebhookSecretResultDto {
  /** Shown exactly once. It is not retrievable afterwards. */
  signingSecret: string;
}

export interface GetWebhookDeliveriesInput extends PagedResultRequestDto {}
