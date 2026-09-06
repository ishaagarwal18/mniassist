import type {
  CreateUpdateWebhookSubscriptionDto,
  RotateWebhookSecretResultDto,
  WebhookDeliveryDto,
  WebhookSubscriptionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type {
  PagedAndSortedResultRequestDto,
  PagedResultDto,
  PagedResultRequestDto,
} from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WebhookSubscriptionService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateWebhookSubscriptionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookSubscriptionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/webhook-subscription',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/webhook-subscription/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookSubscriptionDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/webhook-subscription/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getDeliveries = (id: string, input: PagedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<WebhookDeliveryDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/webhook-subscription/${id}/deliveries`,
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<WebhookSubscriptionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/webhook-subscription',
        params: {
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  reenable = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookSubscriptionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/webhook-subscription/${id}/reenable`,
      },
      { apiName: this.apiName, ...config },
    );

  retryDelivery = (deliveryId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookDeliveryDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/webhook-subscription/retry-delivery/${deliveryId}`,
      },
      { apiName: this.apiName, ...config },
    );

  rotateSecret = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RotateWebhookSecretResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/webhook-subscription/${id}/rotate-secret`,
      },
      { apiName: this.apiName, ...config },
    );

  sendTest = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookDeliveryDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/webhook-subscription/${id}/send-test`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateWebhookSubscriptionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebhookSubscriptionDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/webhook-subscription/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
