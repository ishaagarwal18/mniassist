import type {
  AcknowledgeReconciliationDto,
  CreditNoteDto,
  GenerateInvoiceDto,
  InvoiceDto,
  InvoiceListRequestDto,
  ReconciliationRunDto,
  RunReconciliationDto,
} from './invoice-models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  apiName = 'AutoReach';

  getList = (input: InvoiceListRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<InvoiceDto>>(
      {
        method: 'GET',
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

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      { method: 'GET', url: `/api/auto-reach/invoice/${id}` },
      { apiName: this.apiName, ...config },
    );

  /** Builds a draft. No number is drawn and nothing is billed until it is issued. */
  generate = (input: GenerateInvoiceDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      { method: 'POST', url: '/api/auto-reach/invoice/generate', body: input },
      { apiName: this.apiName, ...config },
    );

  /** Irreversible: the number series gains a permanent entry. */
  issue = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      { method: 'POST', url: `/api/auto-reach/invoice/${id}/issue` },
      { apiName: this.apiName, ...config },
    );

  markPaid = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      { method: 'POST', url: `/api/auto-reach/invoice/${id}/paid` },
      { apiName: this.apiName, ...config },
    );

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      { method: 'POST', url: `/api/auto-reach/invoice/${id}/cancel` },
      { apiName: this.apiName, ...config },
    );

  createCreditNote = (input: CreditNoteDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      { method: 'POST', url: '/api/auto-reach/invoice/credit-note', body: input },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}

@Injectable({
  providedIn: 'root',
})
export class ReconciliationService {
  apiName = 'AutoReach';

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ReconciliationRunDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/reconciliation',
        params: {
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReconciliationRunDto>(
      { method: 'GET', url: `/api/auto-reach/reconciliation/${id}` },
      { apiName: this.apiName, ...config },
    );

  run = (input: RunReconciliationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReconciliationRunDto>(
      { method: 'POST', url: '/api/auto-reach/reconciliation/run', body: input },
      { apiName: this.apiName, ...config },
    );

  acknowledge = (id: string, input: AcknowledgeReconciliationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReconciliationRunDto>(
      { method: 'POST', url: `/api/auto-reach/reconciliation/${id}/acknowledge`, body: input },
      { apiName: this.apiName, ...config },
    );

  /** Latest run per channel, for the billing dashboard's variance tile. */
  getLatestPerChannel = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ReconciliationRunDto>>(
      { method: 'GET', url: '/api/auto-reach/reconciliation/latest-per-channel' },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
