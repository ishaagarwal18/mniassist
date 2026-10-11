import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum LeadAdImportStatus {
  Received = 0,
  Imported = 1,
  Failed = 2,
}

export interface LeadAdsLoginStartDto {
  authorizeUrl: string;
  state: string;
}

export interface LeadAdsPageOptionDto {
  pageId: string;
  pageName: string;
  category?: string | null;
  alreadyConnected: boolean;
}

export interface LeadAdsPageChoiceDto {
  selectionId: string;
  pages: LeadAdsPageOptionDto[];
}

export interface LeadAdsPageDto {
  id: string;
  pageId: string;
  pageName: string;
  isActive: boolean;
  createEnquiries: boolean;
  connectedAtUtc: string;
  syncedThroughUtc?: string | null;
  lastError?: string | null;
  leadsLast30Days: number;
}

export interface LeadAdsSyncResultDto {
  found: number;
  imported: number;
  failed: number;
}

export interface LeadAdsLeadDto {
  id: string;
  leadAdsPageId: string;
  pageName?: string | null;
  formName?: string | null;
  adName?: string | null;
  campaignName?: string | null;
  platform?: string | null;
  submittedAtUtc?: string | null;
  creationTime: string;
  status: LeadAdImportStatus;
  error?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  enquiryId?: string | null;
  enquiryReference?: string | null;
}

/** Facebook and Instagram lead forms (Lead Ads) feeding the workspace. */
@Injectable({ providedIn: 'root' })
export class LeadAdsService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getLoginStart = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, LeadAdsLoginStartDto>(
      { method: 'GET', url: '/api/auto-reach/lead-ads/login-start' },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  completeLogin = (code: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LeadAdsPageChoiceDto>(
      { method: 'POST', url: '/api/auto-reach/lead-ads/complete-login', body: { code } },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  connectPages = (selectionId: string, pageIds: string[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<LeadAdsPageDto>>(
      {
        method: 'POST',
        url: '/api/auto-reach/lead-ads/connect-pages',
        body: { selectionId, pageIds },
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getPages = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<LeadAdsPageDto>>(
      { method: 'GET', url: '/api/auto-reach/lead-ads/pages' },
      { apiName: this.apiName, ...config },
    );

  updatePage = (id: string, createEnquiries: boolean, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LeadAdsPageDto>(
      { method: 'PUT', url: `/api/auto-reach/lead-ads/${id}/page`, body: { createEnquiries } },
      { apiName: this.apiName, ...config },
    );

  disconnectPage = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'POST', url: `/api/auto-reach/lead-ads/${id}/disconnect-page` },
      { apiName: this.apiName, ...config },
    );

  syncPage = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LeadAdsSyncResultDto>(
      { method: 'POST', url: `/api/auto-reach/lead-ads/${id}/sync-page` },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getLeads = (
    input: {
      skipCount?: number;
      maxResultCount?: number;
      pageId?: string;
      status?: LeadAdImportStatus;
    },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, PagedResultDto<LeadAdsLeadDto>>(
      { method: 'GET', url: '/api/auto-reach/lead-ads/leads', params: input },
      { apiName: this.apiName, ...config },
    );

  retryLead = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LeadAdsLeadDto>(
      { method: 'POST', url: `/api/auto-reach/lead-ads/${id}/retry-lead` },
      { apiName: this.apiName, ...config },
    );
}
