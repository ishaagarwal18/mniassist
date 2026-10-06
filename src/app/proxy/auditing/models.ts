import type { EntityChangeType } from './entity-change-type.enum';

export interface GetAuditLogsInput {
  skipCount?: number;
  maxResultCount?: number;
  sorting?: string;
  startTime?: string;
  endTime?: string;
  userName?: string;
  url?: string;
  httpMethod?: string;
  httpStatusCode?: number;
  hasException?: boolean;
  minExecutionDuration?: number;
  maxExecutionDuration?: number;
  clientIpAddress?: string;
  correlationId?: string;
}

export interface AuditLogListItemDto {
  id: string;
  executionTime: string;
  executionDuration: number;
  userName?: string;
  userId?: string;
  impersonatorUserName?: string;
  httpMethod?: string;
  url?: string;
  httpStatusCode?: number;
  hasException: boolean;
  clientIpAddress?: string;
  browserInfo?: string;
  correlationId?: string;
}

export interface AuditLogDto extends AuditLogListItemDto {
  applicationName?: string;
  clientName?: string;
  clientId?: string;
  tenantName?: string;
  impersonatorTenantName?: string;
  exceptions?: string;
  comments?: string;
  actions: AuditLogActionDto[];
  entityChanges: EntityChangeDto[];
}

export interface AuditLogActionDto {
  serviceName?: string;
  methodName?: string;
  parameters?: string;
  executionTime: string;
  executionDuration: number;
}

export interface GetEntityChangesInput {
  skipCount?: number;
  maxResultCount?: number;
  sorting?: string;
  auditLogId?: string;
  startTime?: string;
  endTime?: string;
  changeType?: EntityChangeType;
  entityId?: string;
  entityTypeFullName?: string;
}

export interface EntityChangeDto {
  id: string;
  auditLogId: string;
  changeTime: string;
  changeType: EntityChangeType;
  entityId?: string;
  entityTypeFullName?: string;
  userName?: string;
  propertyChanges: EntityPropertyChangeDto[];
}

export interface EntityPropertyChangeDto {
  propertyName?: string;
  propertyTypeFullName?: string;
  originalValue?: string;
  newValue?: string;
}

export interface GetAuditLogSummaryInput {
  startTime?: string;
  endTime?: string;
}

export interface AuditLogSummaryDto {
  startTime: string;
  endTime: string;
  totalRequests: number;
  failedRequests: number;
  dailyAverageDuration: AuditLogDailyDurationDto[];
}

export interface AuditLogDailyDurationDto {
  day: string;
  averageDurationMs: number;
}
