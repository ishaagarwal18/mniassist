import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** Mirrors Mni.AutoReach.Newsletter.NewsletterSubscriberStatus. */
export enum NewsletterSubscriberStatus {
  Pending = 0,
  Confirmed = 1,
  Unsubscribed = 2,
}

/** Mirrors Mni.AutoReach.Newsletter.NewsletterIssueStatus. */
export enum NewsletterIssueStatus {
  Draft = 0,
  Sending = 1,
  Sent = 2,
}

export interface NewsletterSubscribeInput {
  email: string;
  consent: boolean;
  captchaToken?: string | null;
}

export interface NewsletterLinkResultDto {
  email: string;
  status: NewsletterSubscriberStatus;
}

export interface NewsletterSubscriberDto {
  id: string;
  email: string;
  status: NewsletterSubscriberStatus;
  consentNoticeVersion: string;
  requestedAtUtc: string;
  confirmedAtUtc?: string | null;
  unsubscribedAtUtc?: string | null;
}

export interface GetNewsletterSubscribersInput {
  status?: NewsletterSubscriberStatus | null;
  filter?: string | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface NewsletterCountsDto {
  pending: number;
  confirmed: number;
  unsubscribed: number;
}

export interface NewsletterExportDto {
  fileName: string;
  csv: string;
}

export interface NewsletterIssueDto {
  id: string;
  subject: string;
  bodyHtml: string;
  status: NewsletterIssueStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sendStartedAtUtc?: string | null;
  sentAtUtc?: string | null;
  creationTime: string;
  lastModificationTime?: string | null;
}

export interface SaveNewsletterIssueInput {
  subject: string;
  bodyHtml: string;
}

/** The public footer sign-up and the confirm / unsubscribe links. Anonymous, rate-limited on the API. */
@Injectable({ providedIn: 'root' })
export class NewsletterPublicService {
  private readonly rest = inject(RestService);
  apiName = 'AutoReach';

  subscribe = (input: NewsletterSubscribeInput, config?: Partial<Rest.Config>) =>
    this.rest.request<NewsletterSubscribeInput, void>(
      { method: 'POST', url: '/api/auto-reach/newsletter/subscribe', body: input },
      { apiName: this.apiName, ...config },
    );

  confirm = (token: string, config?: Partial<Rest.Config>) =>
    this.rest.request<{ token: string }, NewsletterLinkResultDto>(
      { method: 'POST', url: '/api/auto-reach/newsletter/confirm', body: { token } },
      { apiName: this.apiName, ...config },
    );

  unsubscribe = (token: string, config?: Partial<Rest.Config>) =>
    this.rest.request<{ token: string }, NewsletterLinkResultDto>(
      { method: 'POST', url: '/api/auto-reach/newsletter/unsubscribe', body: { token } },
      { apiName: this.apiName, ...config },
    );
}

/** Platform › Newsletter. Platform team only. */
@Injectable({ providedIn: 'root' })
export class NewsletterAdminService {
  private readonly rest = inject(RestService);
  apiName = 'AutoReach';
  private readonly base = '/api/auto-reach/newsletter-admin';

  getSubscribers = (input: GetNewsletterSubscribersInput, config?: Partial<Rest.Config>) =>
    this.rest.request<void, PagedResultDto<NewsletterSubscriberDto>>(
      {
        method: 'GET',
        url: `${this.base}/subscribers`,
        params: {
          status: input.status ?? undefined,
          filter: input.filter || undefined,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getCounts = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, NewsletterCountsDto>(
      { method: 'GET', url: `${this.base}/counts` },
      { apiName: this.apiName, ...config },
    );

  getSubscriberExport = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, NewsletterExportDto>(
      { method: 'GET', url: `${this.base}/subscriber-export` },
      { apiName: this.apiName, ...config },
    );

  deleteSubscriber = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, void>(
      { method: 'DELETE', url: `${this.base}/${id}/subscriber` },
      { apiName: this.apiName, ...config },
    );

  getIssues = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, ListResultDto<NewsletterIssueDto>>(
      { method: 'GET', url: `${this.base}/issues` },
      { apiName: this.apiName, ...config },
    );

  getIssue = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, NewsletterIssueDto>(
      { method: 'GET', url: `${this.base}/${id}/issue` },
      { apiName: this.apiName, ...config },
    );

  createIssue = (input: SaveNewsletterIssueInput, config?: Partial<Rest.Config>) =>
    this.rest.request<SaveNewsletterIssueInput, NewsletterIssueDto>(
      { method: 'POST', url: `${this.base}/issue`, body: input },
      { apiName: this.apiName, ...config },
    );

  updateIssue = (id: string, input: SaveNewsletterIssueInput, config?: Partial<Rest.Config>) =>
    this.rest.request<SaveNewsletterIssueInput, NewsletterIssueDto>(
      { method: 'PUT', url: `${this.base}/${id}/issue`, body: input },
      { apiName: this.apiName, ...config },
    );

  deleteIssue = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, void>(
      { method: 'DELETE', url: `${this.base}/${id}/issue` },
      { apiName: this.apiName, ...config },
    );

  sendTest = (id: string, email: string, config?: Partial<Rest.Config>) =>
    this.rest.request<{ email: string }, void>(
      { method: 'POST', url: `${this.base}/${id}/send-test`, body: { email } },
      { apiName: this.apiName, ...config },
    );

  send = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, NewsletterIssueDto>(
      { method: 'POST', url: `${this.base}/${id}/send` },
      { apiName: this.apiName, ...config },
    );
}
