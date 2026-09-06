import type { DataPrincipalRequest } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DataRequestFulfilmentService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  fulfil = (request: DataPrincipalRequest, config?: Partial<Rest.Config>) =>
    this.restService.request<any, string>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/data-request-fulfilment/fulfil',
        body: request,
      },
      { apiName: this.apiName, ...config },
    );
}
