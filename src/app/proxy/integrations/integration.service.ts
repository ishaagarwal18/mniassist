import type {
  ApiKeyDto,
  CreateApiKeyDto,
  CreateUpdateIntegrationDto,
  CreatedApiKeyDto,
  IntegrationConnectionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IntegrationService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateIntegrationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IntegrationConnectionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/integration',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  createApiKey = (input: CreateApiKeyDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CreatedApiKeyDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/integration/api-key',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/integration/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IntegrationConnectionDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/integration/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getApiKeys = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ApiKeyDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/integration/api-keys',
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<IntegrationConnectionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/integration',
        params: {
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  revokeApiKey = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: `/api/auto-reach/integration/${id}/revoke-api-key`,
      },
      { apiName: this.apiName, ...config },
    );

  test = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IntegrationConnectionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/integration/${id}/test`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateIntegrationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IntegrationConnectionDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/integration/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
