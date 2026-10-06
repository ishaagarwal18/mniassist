import type { SecurityPolicyDto, UpdateSecurityPolicyDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SecurityPolicyService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SecurityPolicyDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/security-policy',
      },
      { apiName: this.apiName, ...config },
    );

  update = (input: UpdateSecurityPolicyDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SecurityPolicyDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/security-policy',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
