import type {
  CreateUpdateWebhookSubscriptionDto,
  GetWebhookDeliveriesInput,
  RotateWebhookSecretResultDto,
  WebhookDeliveryDto,
  WebhookSubscriptionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WebhookSubscriptionService {
  apiName = 'AutoReach';

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookSubscriptionDto>(
      { method: 'GET', url: `/api/auto-reach/webhook-subscription/${id}` },
      { apiName: this.apiName, ...config },
    );

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<WebhookSubscriptionDto>>(
      { method: 'GET', url: '/api/auto-reach/webhook-subscription' },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateWebhookSubscriptionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookSubscriptionDto>(
      { method: 'POST', url: '/api/auto-reach/webhook-subscription', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateWebhookSubscriptionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookSubscriptionDto>(
      { method: 'PUT', url: `/api/auto-reach/webhook-subscription/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/webhook-subscription/${id}` },
      { apiName: this.apiName, ...config },
    );

  /** Returns the new secret once. The old one stops working immediately. */
  rotateSecret = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RotateWebhookSecretResultDto>(
      { method: 'POST', url: `/api/auto-reach/webhook-subscription/${id}/rotate-secret` },
      { apiName: this.apiName, ...config },
    );

  sendTest = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookDeliveryDto>(
      { method: 'POST', url: `/api/auto-reach/webhook-subscription/${id}/test` },
      { apiName: this.apiName, ...config },
    );

  getDeliveries = (id: string, input: GetWebhookDeliveriesInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<WebhookDeliveryDto>>(
      {
        method: 'GET',
        url: `/api/auto-reach/webhook-subscription/${id}/deliveries`,
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  retryDelivery = (deliveryId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookDeliveryDto>(
      { method: 'POST', url: `/api/auto-reach/webhook-subscription/deliveries/${deliveryId}/retry` },
      { apiName: this.apiName, ...config },
    );

  reenable = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookSubscriptionDto>(
      { method: 'POST', url: `/api/auto-reach/webhook-subscription/${id}/reenable` },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
