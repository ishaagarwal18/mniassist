import type { CannedReplyDto, CreateUpdateCannedReplyDto, RenderCannedReplyDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CannedReplyService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateCannedReplyDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CannedReplyDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/canned-reply',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/canned-reply/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CannedReplyDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/canned-reply/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getFolders = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<string>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/canned-reply/folders',
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<CannedReplyDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/canned-reply',
        params: {
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  render = (input: RenderCannedReplyDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, string>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/canned-reply/render',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  search = (filter: string, folder: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<CannedReplyDto>>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/canned-reply/search',
        params: { filter, folder },
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateCannedReplyDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CannedReplyDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/canned-reply/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
