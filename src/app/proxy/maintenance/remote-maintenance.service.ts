import { Rest, RestService, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type {
  EscalateToFieldTicketInput,
  GetRemoteMaintenanceListInput,
  InitiateRemoteMaintenanceInput,
  RemoteMaintenanceSessionDto,
  RemoteMaintenanceStatsDto,
  ResolveRemotelyInput,
  SimulateChannelTurnInput,
  SwitchChannelInput,
} from './maintenance.models';

@Injectable({
  providedIn: 'root',
})
export class RemoteMaintenanceService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetRemoteMaintenanceListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<RemoteMaintenanceSessionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/remote-maintenance',
        params: {
          channel: input.channel,
          status: input.status,
          severity: input.severity,
          searchFilter: input.searchFilter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RemoteMaintenanceSessionDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/remote-maintenance/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  initiateSession = (input: InitiateRemoteMaintenanceInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RemoteMaintenanceSessionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/remote-maintenance/initiate-session',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  sendChannelTurn = (input: SimulateChannelTurnInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RemoteMaintenanceSessionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/remote-maintenance/send-channel-turn',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  switchChannel = (input: SwitchChannelInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RemoteMaintenanceSessionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/remote-maintenance/switch-channel',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  escalateToFieldTicket = (input: EscalateToFieldTicketInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RemoteMaintenanceSessionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/remote-maintenance/escalate-to-field-ticket',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  resolveRemotely = (input: ResolveRemotelyInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RemoteMaintenanceSessionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/remote-maintenance/resolve-remotely',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getStats = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, RemoteMaintenanceStatsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/remote-maintenance/stats',
      },
      { apiName: this.apiName, ...config },
    );
}
