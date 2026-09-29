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
  /** Offered, Accepted, Won or Lost (Declined only in the answer to a decline). */
  state: 'Offered' | 'Accepted' | 'Won' | 'Lost' | 'Declined';
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
}
