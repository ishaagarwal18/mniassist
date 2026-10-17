import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { UpdateWorkspaceProfileInput, WorkspaceProfileDto } from './models';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceProfileService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceProfileDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/workspace-profile',
      },
      { apiName: this.apiName, ...config },
    );

  update = (input: UpdateWorkspaceProfileInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceProfileDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/workspace-profile',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
