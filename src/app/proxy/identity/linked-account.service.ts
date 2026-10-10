import type { LinkAccountInput, LinkedAccountDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LinkedAccountService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<LinkedAccountDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/linked-account',
      },
      { apiName: this.apiName, ...config },
    );

  link = (input: LinkAccountInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LinkedAccountDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/linked-account/link',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  unlink = (userId: string, tenantId?: string | null, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/linked-account/unlink',
        params: { userId, tenantId: tenantId ?? undefined },
      },
      { apiName: this.apiName, ...config },
    );
}
