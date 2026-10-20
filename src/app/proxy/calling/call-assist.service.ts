import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** One record found. */
export interface CallAssistHitDto {
  kind: 'Customer' | 'Product' | 'Order' | 'Ticket' | 'PurchaseOrder' | 'Machine';
  id: string;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  /** Where the record opens in the app. */
  link?: string | null;
  /** The record is the caller's own. */
  ofCaller: boolean;
}

export interface CallAssistSearchResultDto {
  hits: CallAssistHitDto[];
  /** Kinds of record this agent may not see ("sales orders"), so the panel can say why they are missing. */
  hidden: string[];
}

export interface CallerSummaryDto {
  contactId: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  accountName?: string | null;
  link?: string | null;
  openTickets: CallAssistHitDto[];
  recentOrders: CallAssistHitDto[];
  machines: CallAssistHitDto[];
}

export interface TechSupportAnswerDto {
  answer?: string | null;
  /** From the workspace's knowledge base rather than general guidance. */
  fromKnowledgeBase: boolean;
  sources: string[];
  /** Why there is no answer. */
  unavailable?: string | null;
}

/** The call bar's look-up panel (CallAssistAppService). */
@Injectable({ providedIn: 'root' })
export class CallAssistService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getCaller = (contactId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallerSummaryDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/call-assist/caller/${contactId}`,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  search = (input: { query: string; contactId?: string | null }, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallAssistSearchResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/call-assist/search',
        body: input,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  ask = (input: { question: string; contactId?: string | null }, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TechSupportAnswerDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/call-assist/ask',
        body: input,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );
}
