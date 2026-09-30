import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { DealerLinkState, NetworkReasonInput, TerritoryDto } from './network.service';

export interface NetworkMembershipDto {
  id: string;
  oemName: string;
  state: DealerLinkState;
  joinedAtUtc?: string | null;
  territory: TerritoryDto;
}

export interface NetworkOfferDto {
  id: string;
  oemName: string;
  oemEnquiryReference: string;
  /** Offered, Accepted, Won or Lost (Declined and HandedBack only in the answer to those actions). */
  state: 'Offered' | 'Accepted' | 'Won' | 'Lost' | 'Declined' | 'HandedBack';
  offeredAtUtc?: string | null;
  answerByUtc?: string | null;
  acceptedAtUtc?: string | null;
  customerState?: string | null;
  customerCity?: string | null;
  customerPin?: string | null;
  productLine?: string | null;
  title?: string | null;
  requirement?: string | null;
  estimatedValueInPaise?: number | null;
  consentNote: string;
  /** The enquiry made in this workspace on accepting. */
  dealerEnquiryId?: string | null;
  /** The OEM shared its WhatsApp conversation with the customer (see getConversation). */
  hasConversation?: boolean;
}

/** One message of the OEM's conversation with the customer, as shared with the dealer. */
export interface NetworkTranscriptLineDto {
  atUtc: string;
  /** True for the customer, false for the OEM's team. */
  fromCustomer: boolean;
  text: string;
}

/** S3, the dealer's side: join an OEM's network and answer the leads it offers. */
@Injectable({ providedIn: 'root' })
export class DealerNetworkService {
  private restService = inject(RestService);
  apiName = 'AutoReach';
  private base = '/api/auto-reach/dealer-network';

  getMemberships = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkMembershipDto[]>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/memberships` },
      { apiName: this.apiName, ...config },
    );

  join = (code: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkMembershipDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/join`,
        body: { code },
      },
      { apiName: this.apiName, ...config },
    );

  leave = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkMembershipDto>(
      { method: 'POST', headers: { Accept: 'application/json' }, url: `${this.base}/${id}/leave` },
      { apiName: this.apiName, ...config },
    );

  getOffers = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkOfferDto[]>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/offers` },
      { apiName: this.apiName, ...config },
    );

  accept = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkOfferDto>(
      { method: 'POST', headers: { Accept: 'application/json' }, url: `${this.base}/${id}/accept` },
      { apiName: this.apiName, ...config },
    );

  decline = (id: string, input: NetworkReasonInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkOfferDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/decline`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  handBack = (id: string, input: NetworkReasonInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkOfferDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/hand-back`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getConversation = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkTranscriptLineDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/conversation`,
      },
      { apiName: this.apiName, ...config },
    );
}
