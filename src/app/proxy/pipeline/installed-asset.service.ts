import type {
  CreateUpdateInstalledAssetDto,
  GetInstalledAssetListInput,
  InstalledAssetDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class InstalledAssetService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateInstalledAssetDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InstalledAssetDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/installed-asset',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/installed-asset/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InstalledAssetDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/installed-asset/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetInstalledAssetListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<InstalledAssetDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/installed-asset',
        params: {
          contactId: input.contactId,
          filter: input.filter,
          includeRetired: input.includeRetired,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  recordService = (id: string, servicedOn: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InstalledAssetDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/installed-asset/${id}/record-service`,
        params: { servicedOn },
      },
      { apiName: this.apiName, ...config },
    );

  retire = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InstalledAssetDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/installed-asset/${id}/retire`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateInstalledAssetDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InstalledAssetDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/installed-asset/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
