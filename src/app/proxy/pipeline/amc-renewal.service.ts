import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { QuotationState } from './quotation-state.enum';

export enum RenewalStatus {
  Due = 0,
  Contacted = 1,
  Interested = 2,
  Quoted = 3,
  Won = 4,
  Lost = 5,
  Lapsed = 6,
}

export interface AmcRenewalDto {
  id: string;
  installedAssetId: string;
  assetDescription: string;
  serialNumber?: string | null;
  siteName?: string | null;
  contactId: string;
  contactName?: string | null;
  currentEndsOn: string;
  proposedEndsOn: string;
  valueInPaise?: number | null;
  status: RenewalStatus;
  enquiryId?: string | null;
  enquiryReference?: string | null;
  quotationId?: string | null;
  quotationReference?: string | null;
  quotationState?: QuotationState | null;
  lastContactedAtUtc?: string | null;
  interestedAtUtc?: string | null;
  callRequestedAtUtc?: string | null;
  closedAtUtc?: string | null;
  renewedValueInPaise?: number | null;
  lostReason?: string | null;
}

export interface GetAmcRenewalListInput {
  openOnly?: boolean;
  status?: RenewalStatus | null;
  endingWithinDays?: number | null;
  filter?: string | null;
}

export interface RenewalSummaryDto {
  dueIn30Count: number;
  dueIn30InPaise: number;
  dueIn60Count: number;
  dueIn60InPaise: number;
  dueIn90Count: number;
  dueIn90InPaise: number;
  atRiskCount: number;
  atRiskInPaise: number;
  renewedThisQuarterCount: number;
  renewedThisQuarterInPaise: number;
  renewalRatePercent?: number | null;
}

export interface RenewalSettingsDto {
  pipelineId?: string | null;
  upliftBasisPoints: number;
  serviceItemCode: string;
}

/** The AMC Renewal Desk. */
@Injectable({ providedIn: 'root' })
export class AmcRenewalService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetAmcRenewalListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, { items: AmcRenewalDto[] }>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/amc-renewal',
        params: {
          openOnly: input.openOnly,
          status: input.status ?? undefined,
          endingWithinDays: input.endingWithinDays ?? undefined,
          filter: input.filter || undefined,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getSummary = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, RenewalSummaryDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/amc-renewal/summary',
      },
      { apiName: this.apiName, ...config },
    );

  draftQuote = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AmcRenewalDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/amc-renewal/${id}/draft-quote`,
      },
      { apiName: this.apiName, ...config },
    );

  markLost = (id: string, reason: string | null, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AmcRenewalDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/amc-renewal/${id}/mark-lost`,
        body: { reason },
      },
      { apiName: this.apiName, ...config },
    );

  refresh = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, { added: number }>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/amc-renewal/refresh',
      },
      { apiName: this.apiName, ...config },
    );

  getSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, RenewalSettingsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/amc-renewal/settings',
      },
      { apiName: this.apiName, ...config },
    );

  updateSettings = (input: RenewalSettingsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RenewalSettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/amc-renewal/settings',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
