import type {
  AssignConversationInput,
  ConversationContextDto,
  ConversationDto,
  GetInboxInput,
  InboxCountsDto,
  InboxPollDto,
  InboxPollInput,
  MessageDto,
  SearchConversationsInput,
  SendInteractiveInput,
  SendLocationInput,
  SendMessageInput,
  SnoozeConversationInput,
  SuggestedRepliesDto,
  ConversationSummaryDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto, PagedResultRequestDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class InboxService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  assign = (
    conversationId: string,
    input: AssignConversationInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/assign/${conversationId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  autoAssign = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/auto-assign/${conversationId}`,
      },
      { apiName: this.apiName, ...config },
    );

  close = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/close/${conversationId}`,
      },
      { apiName: this.apiName, ...config },
    );

  getContext = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationContextDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/context/${conversationId}`,
      },
      { apiName: this.apiName, ...config },
    );

  getConversation = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/${id}/conversation`,
      },
      { apiName: this.apiName, ...config },
    );

  getConversations = (input: GetInboxInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ConversationDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/inbox/conversations',
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
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/inbox/counts',
      },
      { apiName: this.apiName, ...config },
    );

  getMessages = (
    conversationId: string,
    input: PagedResultRequestDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, PagedResultDto<MessageDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/messages/${conversationId}`,
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  markRead = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/mark-read/${conversationId}`,
      },
      { apiName: this.apiName, ...config },
    );

  poll = (input: InboxPollInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InboxPollDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/inbox/poll',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  reopen = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/reopen/${conversationId}`,
      },
      { apiName: this.apiName, ...config },
    );

  search = (input: SearchConversationsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ConversationDto>>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/inbox/search',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  /** Q5: a few lines for whoever picks the conversation up next. summary is null without a model. */
  summarise = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConversationSummaryDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/summarise/${conversationId}`,
      },
      { apiName: this.apiName, ...config },
    );

  suggestReplies = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SuggestedRepliesDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/suggest-replies/${conversationId}`,
      },
      { apiName: this.apiName, ...config },
    );

  send = (conversationId: string, input: SendMessageInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MessageDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/send/${conversationId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  sendMedia = (conversationId: string, formData: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MessageDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/send-media/${conversationId}`,
        body: formData,
      },
      { apiName: this.apiName, ...config },
    );

  sendLocation = (
    conversationId: string,
    input: SendLocationInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, MessageDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/send-location/${conversationId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  sendInteractive = (
    conversationId: string,
    input: SendInteractiveInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, MessageDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/send-interactive/${conversationId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  snooze = (
    conversationId: string,
    input: SnoozeConversationInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ConversationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/inbox/snooze/${conversationId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
