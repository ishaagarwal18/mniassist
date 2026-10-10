import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BalanceSheetResultDto,
  GetFinancialStatementInput,
  ProfitAndLossResultDto,
  TrialBalanceResultDto,
} from './financial-statement.models';

@Injectable({
  providedIn: 'root',
})
export class FinancialStatementService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getTrialBalance(input: GetFinancialStatementInput, config?: Partial<Rest.Config>): Observable<TrialBalanceResultDto> {
    return this.restService.request<any, TrialBalanceResultDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/financial-statement/trial-balance',
        params: {
          fromDateUtc: input.fromDateUtc,
          toDateUtc: input.toDateUtc,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  getProfitAndLoss(input: GetFinancialStatementInput, config?: Partial<Rest.Config>): Observable<ProfitAndLossResultDto> {
    return this.restService.request<any, ProfitAndLossResultDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/financial-statement/profit-and-loss',
        params: {
          fromDateUtc: input.fromDateUtc,
          toDateUtc: input.toDateUtc,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  getBalanceSheet(input: GetFinancialStatementInput, config?: Partial<Rest.Config>): Observable<BalanceSheetResultDto> {
    return this.restService.request<any, BalanceSheetResultDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/financial-statement/balance-sheet',
        params: {
          fromDateUtc: input.fromDateUtc,
          toDateUtc: input.toDateUtc,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }
}
