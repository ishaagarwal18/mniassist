import type { BillingSummaryDto, ChangePlanInput, RateCardDto, SubscriptionDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BillingService {
  apiName = 'AutoReach';

  changePlan = (input: ChangePlanInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SubscriptionDto>(
      { method: 'POST', url: '/api/auto-reach/billing/change-plan', body: input },
      { apiName: this.apiName, ...config },
    );

  getRateCards = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<RateCardDto>>(
      { method: 'GET', url: '/api/auto-reach/billing/rate-cards' },
      { apiName: this.apiName, ...config },
    );

  getSubscription = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SubscriptionDto>(
      { method: 'GET', url: '/api/auto-reach/billing/subscription' },
      { apiName: this.apiName, ...config },
    );

  getSummary = (fromUtc?: string, toUtc?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BillingSummaryDto>(
      { method: 'GET', url: '/api/auto-reach/billing/summary', params: { fromUtc, toUtc } },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
