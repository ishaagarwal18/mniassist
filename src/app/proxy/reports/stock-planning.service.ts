import type { StockPlanDto, StockPlanInput } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StockPlanningService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (input: StockPlanInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockPlanDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/stock-planning',
        params: {
          lookbackDays: input.lookbackDays,
          horizonDays: input.horizonDays,
          safetyDays: input.safetyDays,
          defaultLeadDays: input.defaultLeadDays,
          coverDays: input.coverDays,
        },
      },
      { apiName: this.apiName, ...config },
    );
}
