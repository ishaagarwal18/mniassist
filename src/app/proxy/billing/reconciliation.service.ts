import type {
  AcknowledgeReconciliationDto,
  ReconciliationRunDto,
  RunReconciliationDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ReconciliationService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  acknowledge = (id: string, input: AcknowledgeReconciliationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReconciliationRunDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/reconciliation/${id}/acknowledge`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReconciliationRunDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/reconciliation/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getLatestPerChannel = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ReconciliationRunDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/reconciliation/latest-per-channel',
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ReconciliationRunDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/reconciliation',
        params: {
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  run = (input: RunReconciliationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReconciliationRunDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/reconciliation/run',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
