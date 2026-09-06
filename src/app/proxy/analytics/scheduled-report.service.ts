import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum ScheduledReportKind {
  ExecutiveSummary = 0,
  CampaignPerformance = 1,
  AgentPerformance = 2,
  PipelineConversion = 3,
}

export enum ReportCadence {
  Daily = 0,
  Weekly = 1,
  Monthly = 2,
}

export enum ReportDeliveryChannel {
  None = 0,
  Email = 1,
  WhatsApp = 2,
  InApp = 4,
}

export interface ScheduledReportDto {
  id?: string;
  name?: string;
  kind?: ScheduledReportKind;
  cadence?: ReportCadence;
  sendHourLocal?: number;
  timeZoneId?: string;
  channels?: number;
  emailRecipients?: string | null;
  whatsAppNumber?: string | null;
  isActive?: boolean;
  lastRunAtUtc?: string | null;
  nextRunAtUtc?: string;
}

export interface CreateUpdateScheduledReportDto {
  name: string;
  kind: ScheduledReportKind;
  cadence: ReportCadence;
  sendHourLocal: number;
  timeZoneId: string;
  channels: number;
  emailRecipients?: string | null;
  whatsAppNumber?: string | null;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class ScheduledReportService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ScheduledReportDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/scheduled-report',
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateScheduledReportDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ScheduledReportDto>(
      { method: 'POST', url: '/api/auto-reach/scheduled-report', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateScheduledReportDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ScheduledReportDto>(
      { method: 'PUT', url: `/api/auto-reach/scheduled-report/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/scheduled-report/${id}` },
      { apiName: this.apiName, ...config },
    );

  runNow = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ScheduledReportDto>(
      { method: 'POST', url: `/api/auto-reach/scheduled-report/${id}/run-now` },
      { apiName: this.apiName, ...config },
    );
}
