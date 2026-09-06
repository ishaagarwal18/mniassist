import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** M01-8: agency mode. */
export enum AgencyLinkStatus {
  Pending = 0,
  Active = 1,
  Revoked = 2,
}

export interface AgencyLinkDto {
  id: string;
  clientTenantId: string;
  clientDisplayName: string;
  agencyTenantId?: string | null;
  agencyDisplayName?: string | null;
  status: AgencyLinkStatus;
  createdAtUtc: string;
  redeemedAtUtc?: string | null;
  revokedAtUtc?: string | null;
}

export interface AgencyInviteDto {
  linkId: string;
  code: string;
}

export interface AgencyClientSnapshotDto {
  linkId: string;
  clientTenantId: string;
  clientDisplayName: string;
  linkedAtUtc: string;
  openConversations: number;
  runningCampaigns: number;
  spendThisMonthInPaise: number;
  actingNow: boolean;
}

export interface AgencySessionDto {
  id: string;
  linkId: string;
  clientTenantId: string;
  clientDisplayName: string;
  agencyDisplayName?: string | null;
  agencyUserName: string;
  startedAtUtc: string;
  expiresAtUtc: string;
  endedAtUtc?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AgencyService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  issueInvite = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, AgencyInviteDto>(
      { method: 'POST', url: '/api/auto-reach/agency/issue-invite' },
      { apiName: this.apiName, ...config },
    );

  getIssuedLinks = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<AgencyLinkDto>>(
      { method: 'GET', url: '/api/auto-reach/agency/issued-links' },
      { apiName: this.apiName, ...config },
    );

  revokeLink = (linkId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'POST', url: `/api/auto-reach/agency/revoke-link/${linkId}` },
      { apiName: this.apiName, ...config },
    );

  redeemInvite = (code: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AgencyLinkDto>(
      { method: 'POST', url: '/api/auto-reach/agency/redeem-invite', body: { code } },
      { apiName: this.apiName, ...config },
    );

  getClients = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<AgencyClientSnapshotDto>>(
      { method: 'GET', url: '/api/auto-reach/agency/clients' },
      { apiName: this.apiName, ...config },
    );

  leaveClient = (linkId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'POST', url: `/api/auto-reach/agency/leave-client/${linkId}` },
      { apiName: this.apiName, ...config },
    );

  enterClient = (linkId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AgencySessionDto>(
      { method: 'POST', url: `/api/auto-reach/agency/enter-client/${linkId}` },
      { apiName: this.apiName, ...config },
    );

  endActingSession = (sessionId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'POST', url: `/api/auto-reach/agency/end-acting-session/${sessionId}` },
      { apiName: this.apiName, ...config },
    );

  getMyActingSession = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, AgencySessionDto | null>(
      { method: 'GET', url: '/api/auto-reach/agency/my-acting-session' },
      { apiName: this.apiName, ...config },
    );

  getActingSessionsForClient = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<AgencySessionDto>>(
      { method: 'GET', url: '/api/auto-reach/agency/acting-sessions-for-client' },
      { apiName: this.apiName, ...config },
    );
}
