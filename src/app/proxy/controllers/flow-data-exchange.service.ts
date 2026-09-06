import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { FlowExchangeEnvelope } from '../flows/models';
import type { IActionResult } from '../microsoft/asp-net-core/mvc/models';

@Injectable({
  providedIn: 'root',
})
export class FlowDataExchangeService {
  private restService = inject(RestService);
  apiName = 'Default';

  exchange = (channelId: string, envelope: FlowExchangeEnvelope, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IActionResult>(
      {
        method: 'POST',
        url: `/api/flow-data/${channelId}`,
        body: envelope,
      },
      { apiName: this.apiName, ...config },
    );
}
