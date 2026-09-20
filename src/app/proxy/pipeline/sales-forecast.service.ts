import type {
  ForecastHistoryDto,
  GetForecastHistoryInput,
  GetSalesForecastInput,
  GetSalesQuotasInput,
  SalesForecastDto,
  SalesForecastSettingsDto,
  SalesQuotaDto,
  SetSalesQuotaInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SalesForecastService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (input: GetSalesForecastInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesForecastDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sales-forecast',
        params: {
          kind: input.kind,
          periodStart: input.periodStart,
          pipelineId: input.pipelineId,
          ownerUserId: input.ownerUserId,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getQuotas = (input: GetSalesQuotasInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesQuotaDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sales-forecast/quotas',
        params: { kind: input.kind, periodStart: input.periodStart },
      },
      { apiName: this.apiName, ...config },
    );

  setQuota = (input: SetSalesQuotaInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesQuotaDto[]>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sales-forecast/set-quota',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesForecastSettingsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sales-forecast/settings',
      },
      { apiName: this.apiName, ...config },
    );

  getHistory = (input: GetForecastHistoryInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ForecastHistoryDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sales-forecast/history',
        params: { kind: input.kind, periodStart: input.periodStart, ownerUserId: input.ownerUserId },
      },
      { apiName: this.apiName, ...config },
    );

  takeSnapshot = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        url: '/api/auto-reach/sales-forecast/take-snapshot',
      },
      { apiName: this.apiName, ...config },
    );

  saveSettings = (input: SalesForecastSettingsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesForecastSettingsDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sales-forecast/save-settings',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
