import type {
  CreateUpdateCustomerAccountDto,
  CustomerAccountDto,
  CustomerAccountRollupDto,
  GetCustomerAccountListInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CustomerAccountService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetCustomerAccountListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<CustomerAccountDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/customer-account',
        params: {
          filter: input.filter,
          ownerUserId: input.ownerUserId,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomerAccountDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/customer-account/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateCustomerAccountDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomerAccountDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/customer-account',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateCustomerAccountDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomerAccountDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/customer-account/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/customer-account/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getRollup = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomerAccountRollupDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/customer-account/${id}/rollup`,
      },
      { apiName: this.apiName, ...config },
    );

  setContactAccount = (contactIds: string[], accountId?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/customer-account/set-contact-account',
        params: { accountId },
        body: contactIds,
      },
      { apiName: this.apiName, ...config },
    );
}
