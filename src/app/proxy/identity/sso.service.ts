import type { SaveSsoConfigurationInput, SsoDiscoveryDto, TenantSsoConfigurationDto } from './sso.models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable } from '@angular/core';

/** Routes are fixed by SsoController on the API side. */
const api = '/api/auto-reach/sso';

@Injectable({ providedIn: 'root' })
export class SsoService {
  apiName = 'AutoReach';

  get = (config?: Partial<Rest.Config>) =>
    this.rest.request<any, TenantSsoConfigurationDto>(
      { method: 'GET', url: api },
      { apiName: this.apiName, ...config },
    );

  save = (input: SaveSsoConfigurationInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, TenantSsoConfigurationDto>(
      { method: 'PUT', url: api, body: input },
      { apiName: this.apiName, ...config },
    );

  disable = (config?: Partial<Rest.Config>) =>
    this.rest.request<any, void>(
      { method: 'POST', url: `${api}/disable` },
      { apiName: this.apiName, ...config },
    );

  /** Anonymous — called from the sign-in screen. */
  discover = (email: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, SsoDiscoveryDto>(
      { method: 'GET', url: `${api}/discover`, params: { email } },
      { apiName: this.apiName, ...config },
    );

  constructor(private rest: RestService) {}
}
