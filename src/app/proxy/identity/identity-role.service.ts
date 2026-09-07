import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { IdentityRoleDto, PagedResult } from './identity-user.service';

export interface IdentityRoleCreateDto {
  name: string;
  isDefault: boolean;
  isPublic: boolean;
}

/** ABP Identity's role-management endpoints (`/api/identity/roles`). */
@Injectable({ providedIn: 'root' })
export class IdentityRoleService {
  private readonly rest = inject(RestService);
  private readonly apiName = 'default';

  getList = (config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, PagedResult<IdentityRoleDto>>(
      { method: 'GET', url: '/api/identity/roles', params: { maxResultCount: 100 } },
      { apiName: this.apiName, ...config },
    );

  getAllList = (config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, { items: IdentityRoleDto[] }>(
      { method: 'GET', url: '/api/identity/roles/all' },
      { apiName: this.apiName, ...config },
    );

  create = (input: IdentityRoleCreateDto, config?: Partial<Rest.Config>) =>
    this.rest.request<IdentityRoleCreateDto, IdentityRoleDto>(
      { method: 'POST', url: '/api/identity/roles', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: IdentityRoleCreateDto, config?: Partial<Rest.Config>) =>
    this.rest.request<IdentityRoleCreateDto, IdentityRoleDto>(
      { method: 'PUT', url: `/api/identity/roles/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, void>(
      { method: 'DELETE', url: `/api/identity/roles/${id}` },
      { apiName: this.apiName, ...config },
    );
}
