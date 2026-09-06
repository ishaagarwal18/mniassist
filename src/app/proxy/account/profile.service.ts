import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { ChangePasswordInput, ProfileDto, UpdateProfileDto } from './models';

/** ABP Account module endpoints for the current user's own profile. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private restService = inject(RestService);
  apiName = 'default';

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProfileDto>(
      { method: 'GET', url: '/api/account/my-profile' },
      { apiName: this.apiName, ...config },
    );

  update = (input: UpdateProfileDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProfileDto>(
      { method: 'PUT', url: '/api/account/my-profile', body: input },
      { apiName: this.apiName, ...config },
    );

  changePassword = (input: ChangePasswordInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'POST', url: '/api/account/my-profile/change-password', body: input },
      { apiName: this.apiName, ...config },
    );
}
