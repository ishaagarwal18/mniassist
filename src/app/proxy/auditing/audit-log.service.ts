import type {
  AuditLogDto,
  AuditLogListItemDto,
  AuditLogSummaryDto,
  EntityChangeDto,
  GetAuditLogSummaryInput,
  GetAuditLogsInput,
  GetEntityChangesInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetAuditLogsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<AuditLogListItemDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/audit-log',
        params: {
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
          sorting: input.sorting,
          startTime: input.startTime,
          endTime: input.endTime,
          userName: input.userName,
          url: input.url,
          httpMethod: input.httpMethod,
          httpStatusCode: input.httpStatusCode,
          hasException: input.hasException,
          minExecutionDuration: input.minExecutionDuration,
          maxExecutionDuration: input.maxExecutionDuration,
          clientIpAddress: input.clientIpAddress,
          correlationId: input.correlationId,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AuditLogDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/audit-log/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getSummary = (input: GetAuditLogSummaryInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AuditLogSummaryDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/audit-log/summary',
        params: { startTime: input.startTime, endTime: input.endTime },
      },
      { apiName: this.apiName, ...config },
    );

  getEntityChanges = (input: GetEntityChangesInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<EntityChangeDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/audit-log/entity-changes',
        params: {
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
          sorting: input.sorting,
          auditLogId: input.auditLogId,
          startTime: input.startTime,
          endTime: input.endTime,
          changeType: input.changeType,
          entityId: input.entityId,
          entityTypeFullName: input.entityTypeFullName,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getEntityHistory = (
    entityTypeFullName: string,
    entityId: string,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ListResultDto<EntityChangeDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/audit-log/entity-history/${encodeURIComponent(entityId)}`,
        params: { entityTypeFullName },
      },
      { apiName: this.apiName, ...config },
    );
}
