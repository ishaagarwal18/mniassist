import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WhatsAppWebhookService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  handle = (rawPayload: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/whats-app-webhook/handle',
        params: { rawPayload },
      },
      { apiName: this.apiName, ...config },
    );

  ingest = (rawPayload: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, boolean>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-webhook/ingest',
        params: { rawPayload },
      },
      { apiName: this.apiName, ...config },
    );
}
