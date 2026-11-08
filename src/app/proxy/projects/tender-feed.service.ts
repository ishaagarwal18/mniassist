import { PagedResultDto, RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum TenderAlertSource {
  Mailbox = 0,
  Inbound = 1,
  Pasted = 2,
}

export enum TenderAlertStatus {
  Queued = 0,
  Suggested = 1,
  BelowMatch = 2,
  ProjectCreated = 3,
  NotRelevant = 4,
  Merged = 5,
  Failed = 6,
}

export interface TenderKeywordDto {
  word: string;
  weight: number;
}

export interface TenderFeedSettingsDto {
  enabled: boolean;
  keywords: TenderKeywordDto[];
  senders: string[];
  hasInboundAddress: boolean;
  inboundAddressHint?: string | null;
  inboundAddressSetAtUtc?: string | null;
  alertsToday: number;
  dailyLimit: number;
  aiConfigured: boolean;
}

export interface UpdateTenderFeedSettingsInput {
  enabled: boolean;
  keywords: string[];
  senders: string[];
}

export interface TenderAlertDto {
  id: string;
  source: TenderAlertSource;
  status: TenderAlertStatus;
  fromAddress?: string | null;
  subject: string;
  receivedAtUtc: string;
  tenderNumber?: string | null;
  buyer?: string | null;
  title?: string | null;
  location?: string | null;
  closingOn?: string | null;
  estimatedValueInPaise?: number | null;
  documentsUrl?: string | null;
  scope?: string | null;
  score: number;
  matchedWords: string[];
  seenCount: number;
  projectId?: string | null;
  problem?: string | null;
}

export interface CreateProjectFromTenderResultDto {
  projectId: string;
  reference: string;
  accountAdded: boolean;
}

/** The tender feed: alerts read by the model, matched to keywords, offered on the projects board. */
@Injectable({ providedIn: 'root' })
export class TenderFeedService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  getSettings = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, TenderFeedSettingsDto>(
      { method: 'GET', url: '/api/auto-reach/tender-feed/settings' },
      { apiName: this.apiName, ...config },
    );

  updateSettings = (input: UpdateTenderFeedSettingsInput, config?: Partial<Rest.Config>) =>
    this.rest.request<UpdateTenderFeedSettingsInput, TenderFeedSettingsDto>(
      { method: 'PUT', url: '/api/auto-reach/tender-feed/settings', body: input },
      { apiName: this.apiName, ...config },
    );

  createInboundAddress = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, { url: string }>(
      { method: 'POST', url: '/api/auto-reach/tender-feed/inbound-address' },
      { apiName: this.apiName, ...config },
    );

  getSuggestions = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, TenderAlertDto[]>(
      { method: 'GET', url: '/api/auto-reach/tender-feed/suggestions' },
      { apiName: this.apiName, ...config },
    );

  getAlerts = (
    input: { status?: TenderAlertStatus | null; skipCount?: number; maxResultCount?: number },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<void, PagedResultDto<TenderAlertDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/tender-feed/alerts',
        params: {
          status: input.status ?? undefined,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  paste = (input: { subject?: string | null; text: string }, config?: Partial<Rest.Config>) =>
    this.rest.request<{ subject?: string | null; text: string }, TenderAlertDto>(
      { method: 'POST', url: '/api/auto-reach/tender-feed/paste', body: input },
      { apiName: this.apiName, ...config },
    );

  createProject = (
    id: string,
    input: { endUserAccountId?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<{ endUserAccountId?: string | null }, CreateProjectFromTenderResultDto>(
      { method: 'POST', url: `/api/auto-reach/tender-feed/${id}/project`, body: input },
      { apiName: this.apiName, ...config },
    );

  notRelevant = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, TenderAlertDto>(
      { method: 'POST', url: `/api/auto-reach/tender-feed/${id}/not-relevant` },
      { apiName: this.apiName, ...config },
    );
}
