import type {
  AgentPerformanceDto,
  CategoryBreakdownDto,
  DashboardDto,
  GetAnalyticsInput,
  TemplatePerformanceDto,
  TrendPointDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  apiName = 'AutoReach';

  export = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, string>(
      { method: 'POST', url: '/api/auto-reach/analytics/export', body: input },
      { apiName: this.apiName, ...config },
    );

  getAgentPerformance = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<AgentPerformanceDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/analytics/agent-performance',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc, channelId: input.channelId },
      },
      { apiName: this.apiName, ...config },
    );

  getCategoryBreakdown = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<CategoryBreakdownDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/analytics/category-breakdown',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc, channelId: input.channelId },
      },
      { apiName: this.apiName, ...config },
    );

  /** Everything the dashboard needs in one round trip. */
  getDashboard = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, DashboardDto>(
      { method: 'GET', url: '/api/auto-reach/analytics/dashboard' },
      { apiName: this.apiName, ...config },
    );

  getTemplatePerformance = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<TemplatePerformanceDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/analytics/template-performance',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc, channelId: input.channelId },
      },
      { apiName: this.apiName, ...config },
    );

  getVolumeTrend = (input: GetAnalyticsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<TrendPointDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/analytics/volume-trend',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc, channelId: input.channelId },
      },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
