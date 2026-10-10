import type {
  SubscribeWebPushInput,
  UnsubscribeWebPushInput,
  WebPushConfigDto,
  WebPushSubscriptionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WebPushService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getConfig = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebPushConfigDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/web-push/config',
      },
      { apiName: this.apiName, ...config },
    );

  subscribe = (input: SubscribeWebPushInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebPushSubscriptionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/web-push/subscribe',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  unsubscribe = (input: UnsubscribeWebPushInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'POST', url: '/api/auto-reach/web-push/unsubscribe', body: input },
      { apiName: this.apiName, ...config },
    );

  getMySubscriptions = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebPushSubscriptionDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/web-push/my-subscriptions',
      },
      { apiName: this.apiName, ...config },
    );

  sendTest = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'POST', url: '/api/auto-reach/web-push/send-test' },
      { apiName: this.apiName, ...config },
    );
}
