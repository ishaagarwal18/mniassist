import type { GetTenantOverviewInput, PlatformMetricsDto, TenantOverviewDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { CreateUpdateRateCardDto, RateCardDto } from '../billing/models';

@Injectable({
  providedIn: 'root',
})
export class PlatformAdminService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  createRateCard = (input: CreateUpdateRateCardDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RateCardDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/platform-admin/rate-card',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getMetrics = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, PlatformMetricsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/platform-admin/metrics',
      },
      { apiName: this.apiName, ...config },
    );

  getRateCards = (includeExpired?: boolean, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<RateCardDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/platform-admin/rate-cards',
        params: { includeExpired },
      },
      { apiName: this.apiName, ...config },
    );

  getTenants = (input: GetTenantOverviewInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<TenantOverviewDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/platform-admin/tenants',
        params: {
          filter: input.filter,
          plan: input.plan,
          trialsOnly: input.trialsOnly,
          atRiskOnly: input.atRiskOnly,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  supersedeRateCard = (id: string, input: CreateUpdateRateCardDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RateCardDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/platform-admin/${id}/supersede-rate-card`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
