import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export type HealthBand = 'Healthy' | 'Watch' | 'AtRisk';

export interface HealthReasonDto {
  text: string;
  points: number;
}

export interface AccountHealthDto {
  customerId: string;
  isAccount: boolean;
  name: string;
  score: number;
  band: HealthBand;
  reasons: HealthReasonDto[];
  machines: number;
  openRenewalValueInPaise: number;
  computedAtUtc: string;
}

export interface RenewalForecastMonthDto {
  month: string;
  count: number;
  openValueInPaise: number;
  expectedValueInPaise: number;
}

export interface RenewalForecastRowDto {
  renewalId: string;
  contactId: string;
  customer: string;
  endsOn: string;
  status: string;
  valueInPaise?: number | null;
  probability: number;
  band?: HealthBand | null;
}

export interface RenewalForecastDto {
  months: number;
  openValueInPaise: number;
  expectedValueInPaise: number;
  withoutValue: number;
  byMonth: RenewalForecastMonthDto[];
  renewals: RenewalForecastRowDto[];
}

/** The points behind the health score. Penalties are positive numbers that are subtracted. All 0–100. */
export interface HealthWeightsDto {
  start: number;
  healthyFrom: number;
  watchFrom: number;
  neverMessaged: number;
  silentOver90Days: number;
  silentOver180Days: number;
  inTouchThisMonth: number;
  perOpenTicket: number;
  openTicketsCap: number;
  perOverdueTicket: number;
  overdueTicketsCap: number;
  lowSatisfaction: number;
  highSatisfaction: number;
  overdueInvoices: number;
  perRenewalLost: number;
  renewalsLostCap: number;
  perRenewalWon: number;
  renewalsWonCap: number;
  perQuoteWon: number;
  quotesWonCap: number;
  perQuoteLost: number;
  quotesLostCap: number;
}

/** S1: customer health and the AMC renewal forecast. */
@Injectable({ providedIn: 'root' })
export class AccountHealthService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (band?: HealthBand | null, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AccountHealthDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/account-health',
        params: { band: band ?? undefined },
      },
      { apiName: this.apiName, ...config },
    );

  getForCustomer = (customerId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AccountHealthDto | null>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/account-health/for-customer/${customerId}`,
      },
      { apiName: this.apiName, ...config },
    );

  recompute = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/account-health/recompute',
      },
      { apiName: this.apiName, ...config },
    );

  getWeights = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, HealthWeightsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/account-health/weights',
      },
      { apiName: this.apiName, ...config },
    );

  /** Saves the workspace's points and recomputes every score with them. */
  updateWeights = (input: HealthWeightsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, HealthWeightsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/account-health/weights',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getRenewalForecast = (months = 3, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RenewalForecastDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/account-health/renewal-forecast',
        params: { months },
      },
      { apiName: this.apiName, ...config },
    );
}
