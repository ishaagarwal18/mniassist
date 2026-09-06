import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type {
  SaveSsoConfigurationInput,
  SsoDiscoveryDto,
  TenantSsoConfigurationDto,
} from '../identity/models';

@Injectable({
  providedIn: 'root',
})
export class SsoService {
  private restService = inject(RestService);
  apiName = 'Default';

  disable = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/sso/disable',
      },
      { apiName: this.apiName, ...config },
    );

  discover = (email: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SsoDiscoveryDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sso/discover',
        params: { email },
      },
      { apiName: this.apiName, ...config },
    );

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, TenantSsoConfigurationDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sso',
      },
      { apiName: this.apiName, ...config },
    );

  save = (input: SaveSsoConfigurationInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TenantSsoConfigurationDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sso',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
