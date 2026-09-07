import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { PagedResult } from '../identity/identity-user.service';

export interface TenantDto {
  id: string;
  name: string;
}

export interface GetTenantsInput {
  filter?: string;
  sorting?: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface TenantCreateDto {
  name: string;
  adminEmailAddress: string;
  adminPassword: string;
}

/** ABP's tenant CRUD (`/api/multi-tenancy/tenants`). Host-side only. */
@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly rest = inject(RestService);
  private readonly apiName = 'default';

  getList = (input: GetTenantsInput, config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, PagedResult<TenantDto>>(
      { method: 'GET', url: '/api/multi-tenancy/tenants', params: { ...input } },
      { apiName: this.apiName, ...config },
    );

  create = (input: TenantCreateDto, config?: Partial<Rest.Config>) =>
    this.rest.request<TenantCreateDto, TenantDto>(
      { method: 'POST', url: '/api/multi-tenancy/tenants', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: { name: string }, config?: Partial<Rest.Config>) =>
    this.rest.request<{ name: string }, TenantDto>(
      { method: 'PUT', url: `/api/multi-tenancy/tenants/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, void>(
      { method: 'DELETE', url: `/api/multi-tenancy/tenants/${id}` },
      { apiName: this.apiName, ...config },
    );
}
