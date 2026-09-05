import type {
  ConfigureAutoTopUpInput,
  GetWalletTransactionsInput,
  TopUpInput,
  WalletDto,
  WalletTransactionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  apiName = 'AutoReach';

  configureAutoTopUp = (input: ConfigureAutoTopUpInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WalletDto>(
      { method: 'POST', url: '/api/auto-reach/wallet/auto-top-up', body: input },
      { apiName: this.apiName, ...config },
    );

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WalletDto>(
      { method: 'GET', url: '/api/auto-reach/wallet' },
      { apiName: this.apiName, ...config },
    );

  getTransactions = (input: GetWalletTransactionsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<WalletTransactionDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/wallet/transactions',
        params: {
          type: input.type,
          fromUtc: input.fromUtc,
          toUtc: input.toUtc,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  topUp = (input: TopUpInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WalletDto>(
      { method: 'POST', url: '/api/auto-reach/wallet/top-up', body: input },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
