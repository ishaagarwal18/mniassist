import { Rest, RestService, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type {
  CreateSalesInvoiceDto,
  GetSalesInvoicesInput,
  RecordSalesInvoicePaymentDto,
  SalesInvoiceDto,
} from './sales-invoice.models';

@Injectable({
  providedIn: 'root',
})
export class SalesInvoiceService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetSalesInvoicesInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<SalesInvoiceDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/app/sales-invoice',
        params: {
          filter: input.filter,
          status: input.status,
          kind: input.kind,
          customerId: input.customerId,
          salesOrderId: input.salesOrderId,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesInvoiceDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/app/sales-invoice/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateSalesInvoiceDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesInvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/app/sales-invoice',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  createFromSalesOrder = (salesOrderId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesInvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/app/sales-invoice/from-sales-order/${salesOrderId}`,
      },
      { apiName: this.apiName, ...config },
    );

  createFromChallan = (challanId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesInvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/app/sales-invoice/from-challan/${challanId}`,
      },
      { apiName: this.apiName, ...config },
    );

  issue = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesInvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/app/sales-invoice/${id}/issue`,
      },
      { apiName: this.apiName, ...config },
    );

  recordPayment = (id: string, input: RecordSalesInvoicePaymentDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesInvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/app/sales-invoice/${id}/payment`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesInvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/app/sales-invoice/${id}/cancel`,
      },
      { apiName: this.apiName, ...config },
    );
}
