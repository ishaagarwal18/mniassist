import type {
  AssignConversationInput,
  ConversationDto,
  GetInboxInput,
  InboxCountsDto,
  MessageDto,
  SendMessageInput,
  SnoozeConversationInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto, PagedResultRequestDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class InboxService {
  apiName = 'AutoReach';

  assign = (conversationId: string, input: AssignConversationInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/inbox/${conversationId}/assign`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  close = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/inbox/${conversationId}/close`,
      },
      { apiName: this.apiName, ...config },
    );

  getConversation = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'GET',
        url: `/api/auto-reach/inbox/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getConversations = (input: GetInboxInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ConversationDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/inbox',
        params: {
          state: input.state,
          assignedUserId: input.assignedUserId,
          unreadOnly: input.unreadOnly,
          windowClosingSoon: input.windowClosingSoon,
          filter: input.filter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getCounts = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, InboxCountsDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/inbox/counts',
      },
      { apiName: this.apiName, ...config },
    );

  getMessages = (conversationId: string, input: PagedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<MessageDto>>(
      {
        method: 'GET',
        url: `/api/auto-reach/inbox/${conversationId}/messages`,
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  markRead = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/inbox/${conversationId}/mark-read`,
      },
      { apiName: this.apiName, ...config },
    );

  reopen = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/inbox/${conversationId}/reopen`,
      },
      { apiName: this.apiName, ...config },
    );

  send = (conversationId: string, input: SendMessageInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MessageDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/inbox/${conversationId}/send`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  snooze = (conversationId: string, input: SnoozeConversationInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/inbox/${conversationId}/snooze`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
