import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** The business's SIP trunk (carrier or PBX) as a phone line for AI voice agents, both ways. */
export interface SipTrunkDto {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string | null;
  hasPassword: boolean;
  /** The IPv4 addresses the trunk sends calls from. */
  allowedAddresses: string[];
  callerId?: string | null;
  /** The WhatsApp number whose agent answers the trunk's calls and calls out over it. */
  agentChannelId?: string | null;
  enabled: boolean;
}

export interface SaveSipTrunkInput {
  name: string;
  host: string;
  port: number;
  username?: string | null;
  /** Blank on an update keeps the saved one. */
  password?: string | null;
  allowedAddresses: string[];
  callerId?: string | null;
  agentChannelId?: string | null;
  enabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class SipTrunkService {
  private readonly rest = inject(RestService);
  apiName = 'AutoReach';

  getList = (config?: Partial<Rest.Config>) =>
    this.rest.request<any, SipTrunkDto[]>(
      { method: 'GET', url: '/api/auto-reach/sip-trunk' },
      { apiName: this.apiName, ...config },
    );

  create = (input: SaveSipTrunkInput, config?: Partial<Rest.Config>) =>
    this.rest.request<SaveSipTrunkInput, SipTrunkDto>(
      { method: 'POST', url: '/api/auto-reach/sip-trunk', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: SaveSipTrunkInput, config?: Partial<Rest.Config>) =>
    this.rest.request<SaveSipTrunkInput, SipTrunkDto>(
      { method: 'PUT', url: `/api/auto-reach/sip-trunk/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/sip-trunk/${id}` },
      { apiName: this.apiName, ...config },
    );
}
