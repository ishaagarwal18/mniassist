import type { PagedResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type {
  AddServiceTicketCommentInput,
  AssignTicketInput,
  CreateServiceTicketInput,
  GetServiceTicketsInput,
  LinkTicketInput,
  RecordTicketSatisfactionInput,
  ServiceTicketCommentDto,
  ServiceTicketDetailDto,
  ServiceTicketDto,
  ServiceTicketSettingsDto,
  ServiceTicketSummaryDto,
  SetServiceTicketSettingsInput,
  SetTicketPriorityInput,
  SetTicketStatusInput,
  UpdateServiceTicketDetailsInput,
} from './service-ticket.models';

/** Raising, working and closing service tickets. Routes follow ABP's conventional-controller naming for ServiceTicketAppService. */
@Injectable({ providedIn: 'root' })
export class ServiceTicketService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateServiceTicketInput, config?: Partial<Rest.Config>) =>
    this.restService.request<CreateServiceTicketInput, ServiceTicketDto>(
      { method: 'POST', url: '/api/auto-reach/service-ticket', body: input },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ServiceTicketDetailDto>(
      { method: 'GET', url: `/api/auto-reach/service-ticket/${id}` },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetServiceTicketsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ServiceTicketDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/service-ticket',
        params: {
          status: input.status,
          priority: input.priority,
          contactId: input.contactId,
          enquiryId: input.enquiryId,
          assignedUserId: input.assignedUserId,
          mine: input.mine,
          unassigned: input.unassigned,
          overdue: input.overdue,
          filter: input.filter,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getSummary = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ServiceTicketSummaryDto>(
      { method: 'GET', url: '/api/auto-reach/service-ticket/summary' },
      { apiName: this.apiName, ...config },
    );

  updateDetails = (
    id: string,
    input: UpdateServiceTicketDetailsInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<UpdateServiceTicketDetailsInput, ServiceTicketDto>(
      { method: 'PUT', url: `/api/auto-reach/service-ticket/${id}/details`, body: input },
      { apiName: this.apiName, ...config },
    );

  setPriority = (id: string, input: SetTicketPriorityInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetTicketPriorityInput, ServiceTicketDto>(
      { method: 'POST', url: `/api/auto-reach/service-ticket/${id}/set-priority`, body: input },
      { apiName: this.apiName, ...config },
    );

  setStatus = (id: string, input: SetTicketStatusInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetTicketStatusInput, ServiceTicketDto>(
      { method: 'POST', url: `/api/auto-reach/service-ticket/${id}/set-status`, body: input },
      { apiName: this.apiName, ...config },
    );

  assign = (id: string, input: AssignTicketInput, config?: Partial<Rest.Config>) =>
    this.restService.request<AssignTicketInput, ServiceTicketDto>(
      { method: 'POST', url: `/api/auto-reach/service-ticket/${id}/assign`, body: input },
      { apiName: this.apiName, ...config },
    );

  link = (id: string, input: LinkTicketInput, config?: Partial<Rest.Config>) =>
    this.restService.request<LinkTicketInput, ServiceTicketDto>(
      { method: 'POST', url: `/api/auto-reach/service-ticket/${id}/link`, body: input },
      { apiName: this.apiName, ...config },
    );

  addComment = (id: string, input: AddServiceTicketCommentInput, config?: Partial<Rest.Config>) =>
    this.restService.request<AddServiceTicketCommentInput, ServiceTicketCommentDto>(
      { method: 'POST', url: `/api/auto-reach/service-ticket/${id}/comment`, body: input },
      { apiName: this.apiName, ...config },
    );

  recordSatisfaction = (
    id: string,
    input: RecordTicketSatisfactionInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<RecordTicketSatisfactionInput, ServiceTicketDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/service-ticket/${id}/record-satisfaction`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ServiceTicketSettingsDto>(
      { method: 'GET', url: '/api/auto-reach/service-ticket/settings' },
      { apiName: this.apiName, ...config },
    );

  setSettings = (input: SetServiceTicketSettingsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetServiceTicketSettingsInput, ServiceTicketSettingsDto>(
      { method: 'POST', url: '/api/auto-reach/service-ticket/set-settings', body: input },
      { apiName: this.apiName, ...config },
    );
}
