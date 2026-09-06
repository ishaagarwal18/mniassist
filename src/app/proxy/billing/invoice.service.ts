import type {
  CreditNoteDto,
  GenerateInvoiceDto,
  InvoiceDto,
  InvoiceListRequestDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/invoice/${id}/cancel`,
      },
      { apiName: this.apiName, ...config },
    );

  createCreditNote = (input: CreditNoteDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/invoice/credit-note',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  downloadPdf = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'POST',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/invoice/${id}/download-pdf`,
      },
      { apiName: this.apiName, ...config },
    );

  generate = (input: GenerateInvoiceDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/invoice/generate',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/invoice/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: InvoiceListRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<InvoiceDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/invoice',
        params: {
          state: input.state,
          fromUtc: input.fromUtc,
          toUtc: input.toUtc,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  issue = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/invoice/${id}/issue`,
      },
      { apiName: this.apiName, ...config },
    );

  markPaid = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/invoice/${id}/mark-paid`,
      },
      { apiName: this.apiName, ...config },
    );
}
