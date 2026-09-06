import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { IActionResult } from '../microsoft/asp-net-core/mvc/models';

@Injectable({
  providedIn: 'root',
})
export class WhatsAppWebhookService {
  private restService = inject(RestService);
  apiName = 'Default';

  receive = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, IActionResult>(
      {
        method: 'POST',
        url: '/api/webhooks/whatsapp',
      },
      { apiName: this.apiName, ...config },
    );

  verify = (mode: string, verifyToken: string, challenge: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IActionResult>(
      {
        method: 'GET',
        url: '/api/webhooks/whatsapp',
        params: { 'hub.mode': mode, 'hub.verify_token': verifyToken, 'hub.challenge': challenge },
      },
      { apiName: this.apiName, ...config },
    );
}
