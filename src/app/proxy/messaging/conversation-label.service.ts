import type {
  ConversationLabelDto,
  CreateUpdateConversationLabelDto,
  SetConversationLabelsDto,
  SetConversationStatusDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConversationLabelService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateConversationLabelDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationLabelDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/conversation-label',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/conversation-label/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationLabelDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/conversation-label/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ConversationLabelDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/conversation-label',
        params: {
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  setForConversation = (
    conversationId: string,
    input: SetConversationLabelsDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: `/api/auto-reach/conversation-label/set-for-conversation/${conversationId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setStatus = (
    conversationId: string,
    input: SetConversationStatusDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: `/api/auto-reach/conversation-label/set-status/${conversationId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateConversationLabelDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationLabelDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/conversation-label/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
