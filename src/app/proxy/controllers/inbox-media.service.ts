import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { IActionResult } from '../microsoft/asp-net-core/mvc/models';

@Injectable({
  providedIn: 'root',
})
export class InboxMediaService {
  private restService = inject(RestService);
  apiName = 'Default';

  get = (conversationId: string, messageId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IActionResult>(
      {
        method: 'GET',
        url: `/api/auto-reach/inbox/${conversationId}/messages/${messageId}/media`,
      },
      { apiName: this.apiName, ...config },
    );
}
