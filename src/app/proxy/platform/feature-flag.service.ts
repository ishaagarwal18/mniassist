import type { ListResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface FeatureFlagDto {
  id?: string;
  key?: string;
  tenantId?: string | null;
  tenantName?: string | null;
  enabled?: boolean;
  rolloutPercent?: number;
  note?: string | null;
  lastModified?: string;
}

export interface ResolvedFeatureFlagDto {
  key?: string;
  enabled?: boolean;
}

export interface SetFeatureFlagInput {
  key: string;
  tenantId?: string | null;
  enabled: boolean;
  rolloutPercent: number;
  note?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getAll = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<FeatureFlagDto>>(
      { method: 'GET', url: '/api/auto-reach/feature-flag' },
      { apiName: this.apiName, ...config },
    );

  set = (input: SetFeatureFlagInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FeatureFlagDto>(
      { method: 'POST', url: '/api/auto-reach/feature-flag', body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/feature-flag/${id}` },
      { apiName: this.apiName, ...config },
    );

  getMyFlags = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ResolvedFeatureFlagDto>>(
      { method: 'GET', url: '/api/auto-reach/feature-flag/my-flags' },
      { apiName: this.apiName, ...config },
    );
}
