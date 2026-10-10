import type { GetAuditLogsInput } from '../auditing/models';
import type { ReportExportDto, RequestAnalyticsExportInput } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** Report exports built in the background, fetched later (M12-6). */
@Injectable({
  providedIn: 'root',
})
export class ReportExportService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  requestAnalytics = (input: RequestAnalyticsExportInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReportExportDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/report-export/request-analytics',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  requestAuditLog = (input: GetAuditLogsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReportExportDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/report-export/request-audit-log',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getMyList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ReportExportDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/report-export/my-list',
      },
      { apiName: this.apiName, ...config },
    );

  getMyFile = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'GET',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/report-export/${id}/my-file`,
      },
      { apiName: this.apiName, ...config },
    );
}
