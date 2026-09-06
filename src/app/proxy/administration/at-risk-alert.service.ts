import type { AtRiskAlertDto, GetAtRiskAlertsInput } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AtRiskAlertService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetAtRiskAlertsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<AtRiskAlertDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/at-risk-alert',
        params: {
          status: input.status,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  acknowledge = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AtRiskAlertDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/at-risk-alert/${id}/acknowledge`,
      },
      { apiName: this.apiName, ...config },
    );

  assign = (id: string, userId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AtRiskAlertDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/at-risk-alert/${id}/assign`,
        params: { userId },
      },
      { apiName: this.apiName, ...config },
    );

  addNote = (id: string, note: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AtRiskAlertDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/at-risk-alert/${id}/add-note`,
        params: { note },
      },
      { apiName: this.apiName, ...config },
    );

  resolve = (id: string, note: string | undefined, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AtRiskAlertDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/at-risk-alert/${id}/resolve`,
        params: { note },
      },
      { apiName: this.apiName, ...config },
    );
}
