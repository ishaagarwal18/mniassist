import type { CreateUpdateSegmentDto, SegmentDto, SegmentPreviewDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SegmentService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateSegmentDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SegmentDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/segment',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/segment/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  evaluate = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SegmentPreviewDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/segment/${id}/evaluate`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SegmentDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/segment/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<SegmentDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/segment',
        params: {
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  preview = (input: CreateUpdateSegmentDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SegmentPreviewDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/segment/preview',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateSegmentDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SegmentDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/segment/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
