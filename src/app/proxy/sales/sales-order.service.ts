import { Rest, RestService, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type {
  CreateOrderFromQuotationDto,
  CreateSalesOrderDto,
  GetSalesOrdersInput,
  SalesOrderDto,
  UpdateSalesOrderDto,
} from './sales-order.models';

@Injectable({
  providedIn: 'root',
})
export class SalesOrderService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetSalesOrdersInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<SalesOrderDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/app/sales-order',
        params: {
          filter: input.filter,
          status: input.status,
          customerId: input.customerId,
          customerAccountId: input.customerAccountId,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesOrderDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/app/sales-order/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateSalesOrderDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesOrderDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/app/sales-order',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: UpdateSalesOrderDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesOrderDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/app/sales-order/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/app/sales-order/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  confirm = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesOrderDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/app/sales-order/${id}/confirm`,
      },
      { apiName: this.apiName, ...config },
    );

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesOrderDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/app/sales-order/${id}/cancel`,
      },
      { apiName: this.apiName, ...config },
    );

  createFromQuotation = (input: CreateOrderFromQuotationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesOrderDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/app/sales-order/from-quotation',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
