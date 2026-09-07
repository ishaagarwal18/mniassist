import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface PermissionGrantInfo {
  name: string;
  displayName: string;
  parentName?: string;
  isGranted: boolean;
  allowedProviders: string[];
  grantedProviders: { providerName: string; providerKey: string }[];
}

export interface PermissionGroup {
  name: string;
  displayName: string;
  permissions: PermissionGrantInfo[];
}

export interface GetPermissionListResultDto {
  entityDisplayName: string;
  groups: PermissionGroup[];
}

export interface UpdatePermissionsDto {
  permissions: { name: string; isGranted: boolean }[];
}

/**
 * ABP's permission-management endpoint. `providerName`/`providerKey` identify what
 * the grants are for — `R`/`<roleName>` for a role, `U`/`<userId>` for a user.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly rest = inject(RestService);
  private readonly apiName = 'default';

  get = (providerName: string, providerKey: string, config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, GetPermissionListResultDto>(
      {
        method: 'GET',
        url: '/api/permission-management/permissions',
        params: { providerName, providerKey },
      },
      { apiName: this.apiName, ...config },
    );

  update = (
    providerName: string,
    providerKey: string,
    body: UpdatePermissionsDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<UpdatePermissionsDto, void>(
      {
        method: 'PUT',
        url: '/api/permission-management/permissions',
        params: { providerName, providerKey },
        body,
      },
      { apiName: this.apiName, ...config },
    );
}
