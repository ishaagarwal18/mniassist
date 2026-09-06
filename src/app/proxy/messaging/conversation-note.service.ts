import type { ConversationNoteDto, CreateConversationNoteDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto, PagedResultRequestDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConversationNoteService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (
    conversationId: string,
    input: CreateConversationNoteDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ConversationNoteDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/conversation-note',
        params: { conversationId },
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/conversation-note/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ConversationNoteDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/conversation-note',
        params: { conversationId },
      },
      { apiName: this.apiName, ...config },
    );

  getMyMentions = (input: PagedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ConversationNoteDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/conversation-note/my-mentions',
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );
}
