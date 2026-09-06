import type { EntityDto, FullAuditedEntityDto } from '@abp/ng.core';
import type { IntegrationKind } from './integration-kind.enum';
import type { WebhookEvent } from './webhook-event.enum';
import type { IntegrationState } from './integration-state.enum';
import type { WebhookDeliveryState } from './webhook-delivery-state.enum';

export interface ApiKeyDto extends EntityDto<string> {
  name?: string;
  prefix?: string;
  createdAtUtc?: string;
  lastUsedAtUtc?: string | null;
  revokedAtUtc?: string | null;
}

export interface CreateApiKeyDto {
  name: string;
}

export interface CreateUpdateIntegrationDto {
  kind?: IntegrationKind;
  name: string;
  configJson?: string;
  credential?: string | null;
}

export interface CreateUpdateWebhookSubscriptionDto {
  url: string;
  description?: string | null;
  events?: WebhookEvent[];
  isEnabled?: boolean;
}

export interface CreatedApiKeyDto extends ApiKeyDto {
  secret?: string;
}

export interface IntegrationConnectionDto extends FullAuditedEntityDto<string> {
  kind?: IntegrationKind;
  name?: string;
  state?: IntegrationState;
  configJson?: string;
  lastSyncAtUtc?: string | null;
  lastError?: string | null;
}

export interface RotateWebhookSecretResultDto {
  signingSecret?: string;
}

export interface WebhookDeliveryDto extends EntityDto<string> {
  subscriptionId?: string;
  event?: WebhookEvent;
  state?: WebhookDeliveryState;
  attemptCount?: number;
  createdAtUtc?: string;
  nextAttemptAtUtc?: string | null;
  deliveredAtUtc?: string | null;
  responseStatusCode?: number | null;
  lastError?: string | null;
  payloadJson?: string;
}

export interface WebhookSubscriptionDto extends EntityDto<string> {
  url?: string;
  description?: string | null;
  isEnabled?: boolean;
  events?: WebhookEvent[];
  lastSuccessAtUtc?: string | null;
  lastFailureAtUtc?: string | null;
  consecutiveFailureCount?: number;
  lastError?: string | null;
  hasSigningSecret?: boolean;
}
