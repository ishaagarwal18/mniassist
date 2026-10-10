import type { AutoReplySettingsDto, UpdateAutoReplySettingsInput } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AutoReplyService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, AutoReplySettingsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/auto-reply',
      },
      { apiName: this.apiName, ...config },
    );

  update = (input: UpdateAutoReplySettingsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AutoReplySettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/auto-reply',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
