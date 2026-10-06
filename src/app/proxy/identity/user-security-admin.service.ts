import type { AdminSetPasswordInput, LockUserInput, UserSecurityStatusDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserSecurityAdminService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, UserSecurityStatusDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/user-security-admin/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  lock = (id: string, input: LockUserInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, UserSecurityStatusDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/user-security-admin/${id}/lock`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  unlock = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, UserSecurityStatusDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/user-security-admin/${id}/unlock`,
      },
      { apiName: this.apiName, ...config },
    );

  setPassword = (id: string, input: AdminSetPasswordInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, UserSecurityStatusDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/user-security-admin/${id}/set-password`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
