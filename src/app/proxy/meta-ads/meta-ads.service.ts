import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface MetaAdsLoginStartDto {
  authorizeUrl: string;
  state: string;
}

export interface MetaAdAccountOptionDto {
  adAccountId: string;
  name: string;
  currency: string;
  businessName?: string | null;
  isActiveOnMeta: boolean;
  alreadyConnected: boolean;
}

export interface MetaAdAccountChoiceDto {
  selectionId: string;
  accounts: MetaAdAccountOptionDto[];
}

export interface MetaAdAccountDto {
  id: string;
  adAccountId: string;
  name: string;
  currency: string;
  isActive: boolean;
  connectedAtUtc: string;
  tokenExpiresAtUtc: string;
  syncedThroughDate?: string | null;
  lastSyncedAtUtc?: string | null;
  lastError?: string | null;
  needsReconnect: boolean;
  /** In the account's currency, minor units (paise for INR). */
  spendLast30DaysMinor: number;
}

export interface MetaAdsSyncResultDto {
  days: number;
  rows: number;
  spendMinor: number;
  currency: string;
}

/** The workspace's Meta ad accounts, read with ads_read, for ad spend in Ad attribution. */
@Injectable({ providedIn: 'root' })
export class MetaAdsService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getLoginStart = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, MetaAdsLoginStartDto>(
      { method: 'GET', url: '/api/auto-reach/meta-ads/login-start' },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  completeLogin = (code: string, state: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MetaAdAccountChoiceDto>(
      { method: 'POST', url: '/api/auto-reach/meta-ads/complete-login', body: { code, state } },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  connectAccounts = (selectionId: string, adAccountIds: string[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<MetaAdAccountDto>>(
      {
        method: 'POST',
        url: '/api/auto-reach/meta-ads/connect-accounts',
        body: { selectionId, adAccountIds },
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getAccounts = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<MetaAdAccountDto>>(
      { method: 'GET', url: '/api/auto-reach/meta-ads/accounts' },
      { apiName: this.apiName, ...config },
    );

  disconnectAccount = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'POST', url: `/api/auto-reach/meta-ads/${id}/disconnect-account` },
      { apiName: this.apiName, ...config },
    );

  syncAccount = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MetaAdsSyncResultDto>(
      { method: 'POST', url: `/api/auto-reach/meta-ads/${id}/sync-account` },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );
}
