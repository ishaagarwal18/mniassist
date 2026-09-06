import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** M12-7: tenant-defined analytics dashboards. */
export enum DashboardWidgetKind {
  StatTile = 0,
  RateBar = 1,
}

export enum DashboardMetricUnit {
  Count = 0,
  Rate = 1,
  Rupees = 2,
}

export interface DashboardMetricDto {
  key: string;
  label: string;
  unit: DashboardMetricUnit;
  category: string;
}

export interface DashboardWidgetDto {
  id: string;
  metricKey: string;
  title?: string | null;
  kind: DashboardWidgetKind;
  order: number;
  columnSpan: number;
}

export interface CustomDashboardDto {
  id: string;
  name: string;
  ownerUserId?: string | null;
  isShared: boolean;
  widgets: DashboardWidgetDto[];
}

export interface CreateUpdateDashboardWidgetDto {
  metricKey: string;
  title?: string | null;
  kind: DashboardWidgetKind;
  order: number;
  columnSpan: number;
}

export interface CreateUpdateCustomDashboardDto {
  name: string;
  isShared: boolean;
  widgets: CreateUpdateDashboardWidgetDto[];
}

export interface RenderedWidgetDto {
  id: string;
  metricKey: string;
  title: string;
  kind: DashboardWidgetKind;
  unit: DashboardMetricUnit;
  order: number;
  columnSpan: number;
  value: number;
}

export interface DashboardRenderDto {
  id: string;
  name: string;
  generatedAtUtc: string;
  widgets: RenderedWidgetDto[];
}

@Injectable({ providedIn: 'root' })
export class CustomDashboardService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<CustomDashboardDto>>(
      { method: 'GET', url: '/api/auto-reach/custom-dashboard', params: { maxResultCount: 100 } },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomDashboardDto>(
      { method: 'GET', url: `/api/auto-reach/custom-dashboard/${id}` },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateCustomDashboardDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomDashboardDto>(
      { method: 'POST', url: '/api/auto-reach/custom-dashboard', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateCustomDashboardDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomDashboardDto>(
      { method: 'PUT', url: `/api/auto-reach/custom-dashboard/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/custom-dashboard/${id}` },
      { apiName: this.apiName, ...config },
    );

  metricCatalog = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<DashboardMetricDto>>(
      { method: 'GET', url: '/api/auto-reach/custom-dashboard/metric-catalog' },
      { apiName: this.apiName, ...config },
    );

  render = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DashboardRenderDto>(
      { method: 'POST', url: `/api/auto-reach/custom-dashboard/${id}/render` },
      { apiName: this.apiName, ...config },
    );
}
