import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { Customer360Dto } from './customer-360.models';

@Injectable({
  providedIn: 'root',
})
export class Customer360Service {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (customerId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Customer360Dto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/app/customer360/${customerId}`,
      },
      { apiName: this.apiName, ...config },
    );

  getByAccount = (accountId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Customer360Dto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/app/customer360/account/${accountId}`,
      },
      { apiName: this.apiName, ...config },
    );
}
