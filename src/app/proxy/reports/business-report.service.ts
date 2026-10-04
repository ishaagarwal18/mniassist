import type { PaymentReportDto, ReportRangeInput, StockReportDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BusinessReportService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getPayments = (input: ReportRangeInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PaymentReportDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/business-report/payments',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc },
      },
      { apiName: this.apiName, ...config },
    );

  getStock = (input: ReportRangeInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockReportDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/business-report/stock',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc },
      },
      { apiName: this.apiName, ...config },
    );
}
