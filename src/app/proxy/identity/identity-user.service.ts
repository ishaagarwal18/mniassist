import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** A page of results from an ABP list endpoint. */
export interface PagedResult<T> {
  totalCount: number;
  items: T[];
}

export interface IdentityUserDto {
  id: string;
  userName: string;
  name?: string;
  surname?: string;
  email: string;
  phoneNumber?: string;
  isActive: boolean;
  lockoutEnabled?: boolean;
  roleNames?: string[];
}

export interface IdentityRoleDto {
  id: string;
  name: string;
  isDefault: boolean;
  isStatic: boolean;
  isPublic: boolean;
}

export interface GetIdentityUsersInput {
  filter?: string;
  sorting?: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface IdentityUserCreateDto {
  userName: string;
  name?: string;
  surname?: string;
  email: string;
  phoneNumber?: string;
  password: string;
  isActive: boolean;
  lockoutEnabled: boolean;
  roleNames: string[];
}

export type IdentityUserUpdateDto = Omit<IdentityUserCreateDto, 'password'> & { password?: string };

/**
 * ABP Identity's user-management endpoints (`/api/identity/users`). Hand-written
 * rather than generated so the Angular app does not have to pull in ABP's
 * bootstrap-themed `@abp/ng.identity` package.
 */
@Injectable({ providedIn: 'root' })
export class IdentityUserService {
  private readonly rest = inject(RestService);
  private readonly apiName = 'default';

  getList = (input: GetIdentityUsersInput, config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, PagedResult<IdentityUserDto>>(
      { method: 'GET', url: '/api/identity/users', params: { ...input } },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, IdentityUserDto>(
      { method: 'GET', url: `/api/identity/users/${id}` },
      { apiName: this.apiName, ...config },
    );

  getRoles = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, { items: IdentityRoleDto[] }>(
      { method: 'GET', url: `/api/identity/users/${id}/roles` },
      { apiName: this.apiName, ...config },
    );

  getAssignableRoles = (config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, { items: IdentityRoleDto[] }>(
      { method: 'GET', url: '/api/identity/users/assignable-roles' },
      { apiName: this.apiName, ...config },
    );

  create = (input: IdentityUserCreateDto, config?: Partial<Rest.Config>) =>
    this.rest.request<IdentityUserCreateDto, IdentityUserDto>(
      { method: 'POST', url: '/api/identity/users', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: IdentityUserUpdateDto, config?: Partial<Rest.Config>) =>
    this.rest.request<IdentityUserUpdateDto, IdentityUserDto>(
      { method: 'PUT', url: `/api/identity/users/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, void>(
      { method: 'DELETE', url: `/api/identity/users/${id}` },
      { apiName: this.apiName, ...config },
    );
}
