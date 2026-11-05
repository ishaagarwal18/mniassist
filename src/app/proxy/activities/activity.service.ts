import type { PagedResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type {
  ActivityUserDto,
  CheckConflictsInput,
  CreateUpdateCrmTaskDto,
  CreateUpdateMeetingDto,
  CrmTaskDto,
  CrmTaskSummaryDto,
  GetCrmTasksInput,
  GetMeetingsInput,
  IcsFileDto,
  MeetingConflictDto,
  MeetingDto,
  SlotDto,
  SuggestSlotsInput,
  AttendeeResponse,
  ActivityLinkDto,
  ActivityMessagingSettingsDto,
  ActivitySendResultDto,
  SearchActivityLinksInput,
  ShareActivityInput,
  UpdateActivityMessagingSettingsInput,
} from './activity.models';

/** The workspace's active members, for choosing who does a task or who is in a meeting. */
@Injectable({ providedIn: 'root' })
export class ActivityDirectoryService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getUsers = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ActivityUserDto[]>(
      { method: 'GET', url: '/api/auto-reach/activity-directory/users' },
      { apiName: this.apiName, ...config },
    );
}

@Injectable({ providedIn: 'root' })
export class CrmTaskService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetCrmTasksInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<CrmTaskDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/crm-task',
        params: {
          assigneeUserId: input.assigneeUserId,
          mine: input.mine,
          status: input.status,
          contactId: input.contactId,
          enquiryId: input.enquiryId,
          quotationId: input.quotationId,
          overdueOnly: input.overdueOnly,
          dueBeforeUtc: input.dueBeforeUtc,
          filter: input.filter,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrmTaskDto>(
      { method: 'GET', url: `/api/auto-reach/crm-task/${id}` },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateCrmTaskDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrmTaskDto>(
      { method: 'POST', url: '/api/auto-reach/crm-task', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateCrmTaskDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrmTaskDto>(
      { method: 'PUT', url: `/api/auto-reach/crm-task/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/crm-task/${id}` },
      { apiName: this.apiName, ...config },
    );

  complete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrmTaskDto>(
      { method: 'POST', url: `/api/auto-reach/crm-task/${id}/complete` },
      { apiName: this.apiName, ...config },
    );

  reopen = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrmTaskDto>(
      { method: 'POST', url: `/api/auto-reach/crm-task/${id}/reopen` },
      { apiName: this.apiName, ...config },
    );

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrmTaskDto>(
      { method: 'POST', url: `/api/auto-reach/crm-task/${id}/cancel` },
      { apiName: this.apiName, ...config },
    );

  share = (id: string, input: ShareActivityInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ActivitySendResultDto>(
      { method: 'POST', url: `/api/auto-reach/crm-task/${id}/share`, body: input },
      { apiName: this.apiName, ...config },
    );

  getSummary = (
    utcOffsetMinutes: number,
    assigneeUserId?: string | null,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, CrmTaskSummaryDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/crm-task/summary',
        params: { utcOffsetMinutes, assigneeUserId },
      },
      { apiName: this.apiName, ...config },
    );
}

@Injectable({ providedIn: 'root' })
export class MeetingService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  share = (id: string, input: ShareActivityInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ActivitySendResultDto>(
      { method: 'POST', url: `/api/auto-reach/meeting/${id}/share`, body: input },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetMeetingsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MeetingDto[]>(
      {
        method: 'GET',
        url: '/api/auto-reach/meeting',
        params: {
          fromUtc: input.fromUtc,
          toUtc: input.toUtc,
          userId: input.userId,
          everyone: input.everyone,
          enquiryId: input.enquiryId,
          contactId: input.contactId,
          includeCancelled: input.includeCancelled,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MeetingDto>(
      { method: 'GET', url: `/api/auto-reach/meeting/${id}` },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateMeetingDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MeetingDto>(
      { method: 'POST', url: '/api/auto-reach/meeting', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateMeetingDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MeetingDto>(
      { method: 'PUT', url: `/api/auto-reach/meeting/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  checkConflicts = (input: CheckConflictsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MeetingConflictDto[]>(
      { method: 'POST', url: '/api/auto-reach/meeting/check-conflicts', body: input },
      { apiName: this.apiName, ...config },
    );

  suggestSlots = (input: SuggestSlotsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SlotDto[]>(
      { method: 'POST', url: '/api/auto-reach/meeting/suggest-slots', body: input },
      { apiName: this.apiName, ...config },
    );

  complete = (id: string, outcome: string | null, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MeetingDto>(
      { method: 'POST', url: `/api/auto-reach/meeting/${id}/complete`, body: { outcome } },
      { apiName: this.apiName, ...config },
    );

  cancel = (
    id: string,
    reason: string | null,
    thisAndFollowing = false,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, MeetingDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/meeting/${id}/cancel`,
        body: { reason, thisAndFollowing },
      },
      { apiName: this.apiName, ...config },
    );

  markNoShow = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MeetingDto>(
      { method: 'POST', url: `/api/auto-reach/meeting/${id}/mark-no-show` },
      { apiName: this.apiName, ...config },
    );

  respond = (id: string, response: AttendeeResponse, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MeetingDto>(
      { method: 'POST', url: `/api/auto-reach/meeting/${id}/respond`, body: { response } },
      { apiName: this.apiName, ...config },
    );

  getIcs = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IcsFileDto>(
      { method: 'GET', url: `/api/auto-reach/meeting/${id}/ics` },
      { apiName: this.apiName, ...config },
    );
}

@Injectable({ providedIn: 'root' })
export class ActivityLinkService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  search = (input: SearchActivityLinksInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ActivityLinkDto[]>(
      {
        method: 'GET',
        url: '/api/auto-reach/activity-link/search',
        params: { type: input.type, filter: input.filter, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  getMessagingSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ActivityMessagingSettingsDto>(
      { method: 'GET', url: '/api/auto-reach/activity-link/messaging-settings' },
      { apiName: this.apiName, ...config },
    );

  updateMessagingSettings = (
    input: UpdateActivityMessagingSettingsInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ActivityMessagingSettingsDto>(
      { method: 'PUT', url: '/api/auto-reach/activity-link/messaging-settings', body: input },
      { apiName: this.apiName, ...config },
    );
}
