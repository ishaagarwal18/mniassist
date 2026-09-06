import type {
  AdAttributionDto,
  AgentPerformanceDto,
  CategoryBreakdownDto,
  DashboardDto,
  GetAnalyticsInput,
  TemplatePerformanceDto,
  TrendPointDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  export = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, string>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/analytics/export',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getAdAttribution = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<AdAttributionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/analytics/ad-attribution',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc, channelId: input.channelId },
      },
      { apiName: this.apiName, ...config },
    );

  getAgentPerformance = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<AgentPerformanceDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/analytics/agent-performance',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc, channelId: input.channelId },
      },
      { apiName: this.apiName, ...config },
    );

  getCategoryBreakdown = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<CategoryBreakdownDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/analytics/category-breakdown',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc, channelId: input.channelId },
      },
      { apiName: this.apiName, ...config },
    );

  getDashboard = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, DashboardDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/analytics/dashboard',
      },
      { apiName: this.apiName, ...config },
    );

  getTemplatePerformance = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<TemplatePerformanceDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/analytics/template-performance',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc, channelId: input.channelId },
      },
      { apiName: this.apiName, ...config },
    );

  getVolumeTrend = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<TrendPointDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/analytics/volume-trend',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc, channelId: input.channelId },
      },
      { apiName: this.apiName, ...config },
    );
}
