import type {
  AssignPlanInput,
  SetWorkspaceDatabaseInput,
  SetWorkspaceFeatureInput,
  SuspendWorkspaceInput,
  WorkspaceDetailDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HostWorkspaceService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  suspend = (id: string, input: SuspendWorkspaceInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/suspend`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  reactivate = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/reactivate`,
      },
      { apiName: this.apiName, ...config },
    );

  assignPlan = (id: string, input: AssignPlanInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/assign-plan`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setFeature = (id: string, input: SetWorkspaceFeatureInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/set-feature`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setDatabase = (id: string, input: SetWorkspaceDatabaseInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/set-database`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  removeDatabase = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/database`,
      },
      { apiName: this.apiName, ...config },
    );

  migrateDatabase = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/migrate-database`,
      },
      { apiName: this.apiName, ...config },
    );
}
