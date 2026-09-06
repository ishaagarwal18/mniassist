import type {
  BillingSummaryDto,
  ChangePlanInput,
  RateCardDto,
  RateHistoryDto,
  SubscriptionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BillingService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  changePlan = (input: ChangePlanInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SubscriptionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/billing/change-plan',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getRateCards = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<RateCardDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/billing/rate-cards',
      },
      { apiName: this.apiName, ...config },
    );

  getRateHistory = (countryCode: string = 'IN', config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<RateHistoryDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/billing/rate-history',
        params: { countryCode },
      },
      { apiName: this.apiName, ...config },
    );

  getSubscription = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SubscriptionDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/billing/subscription',
      },
      { apiName: this.apiName, ...config },
    );

  getSummary = (fromUtc?: string, toUtc?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BillingSummaryDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/billing/summary',
        params: { fromUtc, toUtc },
      },
      { apiName: this.apiName, ...config },
    );
}
