import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export type DealerLinkState = 'Invited' | 'Active' | 'Suspended' | 'Ended';
export type NetworkLeadState = 'Unrouted' | 'Offered' | 'Accepted' | 'Won' | 'Lost' | 'Closed';

export interface TerritoryDto {
  states: string[];
  cities: string[];
  /** 1 to 6 digits each: "4110" covers every PIN starting 4110. */
  pinPrefixes: string[];
  /** Empty: every product line. */
  productLines: string[];
}

export interface DealerLinkDto {
  id: string;
  dealerName: string;
  state: DealerLinkState;
  /** Only while the invite is waiting to be used. */
  inviteCode?: string | null;
  inviteExpiresAtUtc?: string | null;
  joinedAtUtc?: string | null;
  lastRoutedAtUtc?: string | null;
  territory: TerritoryDto;
  openLeads: number;
  wonLeads: number;
  lostLeads: number;
}

export interface InviteDealerInput {
  dealerName: string;
  territory: TerritoryDto;
}

export interface NetworkLeadDto {
  id: string;
  oemEnquiryId: string;
  oemEnquiryReference: string;
  state: NetworkLeadState;
  linkId?: string | null;
  dealerName?: string | null;
  offeredAtUtc?: string | null;
  answerByUtc?: string | null;
  acceptedAtUtc?: string | null;
  note?: string | null;
  customerState?: string | null;
  customerCity?: string | null;
  customerPin?: string | null;
  productLine?: string | null;
  title?: string | null;
  estimatedValueInPaise?: number | null;
  /** From the dealer's enquiry, once accepted. */
  dealerStage?: string | null;
  quotedInPaise?: number | null;
  snapshotAtUtc?: string | null;
  creationTime: string;
}

export interface NetworkSnapshotLineDto {
  partNumber?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPriceInPaise: number;
  discountBasisPoints: number;
}

export interface NetworkSnapshotQuoteDto {
  reference: string;
  state: string;
  subtotalInPaise: number;
  taxInPaise: number;
  issuedAtUtc?: string | null;
  lines: NetworkSnapshotLineDto[];
}

export interface NetworkSnapshotEventDto {
  atUtc: string;
  kind: string;
  summary?: string | null;
}

export interface NetworkSnapshotDto {
  dealerEnquiryReference: string;
  stage: string;
  title?: string | null;
  ownerName?: string | null;
  estimatedValueInPaise?: number | null;
  lostReason?: string | null;
  firstResponseMinutes?: number | null;
  quotations: NetworkSnapshotQuoteDto[];
  activity: NetworkSnapshotEventDto[];
}

export interface NetworkLeadDetailDto extends NetworkLeadDto {
  consentNote: string;
  requirement?: string | null;
  skippedDealers: string[];
  snapshot?: NetworkSnapshotDto | null;
}

export interface RoutingCandidateDto {
  linkId: string;
  dealerName: string;
  score: number;
  reason: string;
  lastRoutedAtUtc?: string | null;
}

export interface RoutingSuggestionDto {
  state?: string | null;
  city?: string | null;
  pin?: string | null;
  productLine?: string | null;
  lead?: NetworkLeadDto | null;
  candidates: RoutingCandidateDto[];
  consentNote: string;
  /** The dealer who accepts also gets the customer's WhatsApp conversation with the OEM. */
  sharesConversation?: boolean;
}

export interface RouteLeadInput {
  enquiryId: string;
  /** Empty: the best territory match. */
  linkId?: string | null;
  consentConfirmed: boolean;
}

export interface NetworkReasonInput {
  reason?: string | null;
}

export interface NetworkSettingsDto {
  rerouteAutomatically: boolean;
  answerWithinHours: number;
  consentNote?: string | null;
  /** Give the dealer who accepts a copy of the customer's WhatsApp conversation (last 100 messages). */
  shareConversation?: boolean;
  /** Read only: Enterprise, or the OEM network add-on. Joining a network as a dealer needs no plan. */
  canRunNetwork?: boolean;
}

/** S3, the OEM's side of the dealer network. */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  private restService = inject(RestService);
  apiName = 'AutoReach';
  private base = '/api/auto-reach/network';

  getDealers = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, DealerLinkDto[]>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/dealers` },
      { apiName: this.apiName, ...config },
    );

  invite = (input: InviteDealerInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DealerLinkDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/invite`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateTerritory = (id: string, input: TerritoryDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DealerLinkDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/territory`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  renewInvite = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DealerLinkDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/renew-invite`,
      },
      { apiName: this.apiName, ...config },
    );

  suspend = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DealerLinkDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/suspend`,
      },
      { apiName: this.apiName, ...config },
    );

  resume = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DealerLinkDto>(
      { method: 'POST', headers: { Accept: 'application/json' }, url: `${this.base}/${id}/resume` },
      { apiName: this.apiName, ...config },
    );

  end = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DealerLinkDto>(
      { method: 'POST', headers: { Accept: 'application/json' }, url: `${this.base}/${id}/end` },
      { apiName: this.apiName, ...config },
    );

  getLeads = (state?: NetworkLeadState | null, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkLeadDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/leads`,
        params: { state: state ?? undefined },
      },
      { apiName: this.apiName, ...config },
    );

  getLead = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkLeadDetailDto>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/${id}/lead` },
      { apiName: this.apiName, ...config },
    );

  getForEnquiry = (enquiryId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkLeadDto | null>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/for-enquiry/${enquiryId}`,
      },
      { apiName: this.apiName, ...config },
    );

  suggest = (enquiryId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RoutingSuggestionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/suggest/${enquiryId}`,
      },
      { apiName: this.apiName, ...config },
    );

  route = (input: RouteLeadInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkLeadDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/route`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  recall = (id: string, input: NetworkReasonInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkLeadDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/recall`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  close = (id: string, input: NetworkReasonInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkLeadDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/close`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  refresh = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkLeadDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/refresh`,
      },
      { apiName: this.apiName, ...config },
    );

  getSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkSettingsDto>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/settings` },
      { apiName: this.apiName, ...config },
    );

  updateSettings = (input: NetworkSettingsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NetworkSettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `${this.base}/settings`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
