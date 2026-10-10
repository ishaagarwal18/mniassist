import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto, PagedResultRequestDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** How bad an incident is (T-19). */
export enum StatusImpact {
  Maintenance = 0,
  Minor = 1,
  Major = 2,
}

/** The platform's parts, as flags. */
export enum StatusComponents {
  None = 0,
  App = 1,
  Messaging = 2,
  Campaigns = 4,
  Payments = 8,
  Integrations = 16,
}

export enum ComponentState {
  Operational = 0,
  Maintenance = 1,
  Degraded = 2,
  Outage = 3,
}

export interface ComponentStatusDto {
  component: StatusComponents;
  name: string;
  state: ComponentState;
}

export interface StatusIncidentDto {
  id: string;
  title: string;
  impact: StatusImpact;
  components: StatusComponents;
  message: string;
  startsAtUtc: string;
  plannedEndUtc?: string | null;
  resolvedAtUtc?: string | null;
  lastUpdatedAtUtc: string;
}

export interface PlatformStatusDto {
  overall: ComponentState;
  components: ComponentStatusDto[];
  active: StatusIncidentDto[];
  upcoming: StatusIncidentDto[];
  recent: StatusIncidentDto[];
  checkedAtUtc: string;
  /** Null when the deployment has not set Support:Email. */
  supportEmail?: string | null;
}

export interface SaveStatusIncidentInput {
  title: string;
  impact: StatusImpact;
  components: StatusComponents;
  message: string;
  startsAtUtc?: string | null;
  plannedEndUtc?: string | null;
}

/** The public status page and the platform team's incidents (T-19). */
@Injectable({ providedIn: 'root' })
export class PlatformStatusService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  /** Anonymous. */
  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, PlatformStatusDto>(
      { method: 'GET', url: '/api/auto-reach/platform-status' },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getIncidents = (input: PagedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<StatusIncidentDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/platform-status/incidents',
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: SaveStatusIncidentInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SaveStatusIncidentInput, StatusIncidentDto>(
      { method: 'POST', url: '/api/auto-reach/platform-status', body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  update = (id: string, input: SaveStatusIncidentInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SaveStatusIncidentInput, StatusIncidentDto>(
      { method: 'PUT', url: `/api/auto-reach/platform-status/${id}`, body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  resolve = (id: string, message: string, config?: Partial<Rest.Config>) =>
    this.restService.request<{ message: string }, StatusIncidentDto>(
      { method: 'POST', url: `/api/auto-reach/platform-status/${id}/resolve`, body: { message } },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/platform-status/${id}` },
      { apiName: this.apiName, ...config },
    );
}
