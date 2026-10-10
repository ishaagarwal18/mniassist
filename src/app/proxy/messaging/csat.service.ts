import type { CsatSettingsDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CsatService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, CsatSettingsDto>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: '/api/auto-reach/csat' },
      { apiName: this.apiName, ...config },
    );

  update = (input: CsatSettingsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CsatSettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/csat',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
