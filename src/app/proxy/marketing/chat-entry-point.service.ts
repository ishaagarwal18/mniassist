import type {
  ChatEntryPointAssetsDto,
  ChatEntryPointDto,
  CreateUpdateChatEntryPointDto,
  GetChatEntryPointListInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ChatEntryPointService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetChatEntryPointListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ChatEntryPointDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/chat-entry-point',
        params: {
          channelId: input.channelId,
          activeOnly: input.activeOnly,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ChatEntryPointDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/chat-entry-point/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateChatEntryPointDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ChatEntryPointDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/chat-entry-point',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateChatEntryPointDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ChatEntryPointDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/chat-entry-point/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/chat-entry-point/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getAssets = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ChatEntryPointAssetsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/chat-entry-point/${id}/assets`,
      },
      { apiName: this.apiName, ...config },
    );
}
