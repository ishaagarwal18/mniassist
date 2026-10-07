import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface FeatureValueType {
  name: string;
  properties?: Record<string, unknown>;
  validator?: {
    name: string;
    properties?: Record<string, unknown>;
  };
}

export interface FeatureDto {
  name: string;
  displayName: string;
  value: string;
  description?: string;
  valueType?: FeatureValueType;
  depth?: number;
  parentName?: string;
}

export interface FeatureGroupDto {
  name: string;
  displayName: string;
  features: FeatureDto[];
}

export interface GetFeatureListResultDto {
  groups: FeatureGroupDto[];
}

export interface UpdateFeatureDto {
  name: string;
  value: string;
}

export interface UpdateFeaturesDto {
  features: UpdateFeatureDto[];
}

/**
 * ABP's feature-management endpoint (`/api/feature-management/features`).
 * `providerName`/`providerKey`: 'T' for Tenant, 'E' for Edition, etc.
 */
@Injectable({ providedIn: 'root' })
export class FeaturesService {
  private readonly rest = inject(RestService);
  private readonly apiName = 'default';

  get = (providerName: string, providerKey?: string, config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, GetFeatureListResultDto>(
      {
        method: 'GET',
        url: '/api/feature-management/features',
        params: { providerName, providerKey },
      },
      { apiName: this.apiName, ...config },
    );

  update = (
    providerName: string,
    providerKey: string | undefined,
    body: UpdateFeaturesDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<UpdateFeaturesDto, void>(
      {
        method: 'PUT',
        url: '/api/feature-management/features',
        params: { providerName, providerKey },
        body,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (providerName: string, providerKey?: string, config?: Partial<Rest.Config>) =>
    this.rest.request<unknown, void>(
      {
        method: 'DELETE',
        url: '/api/feature-management/features',
        params: { providerName, providerKey },
      },
      { apiName: this.apiName, ...config },
    );
}
