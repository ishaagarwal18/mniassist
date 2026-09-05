import type { NotificationDto, NotificationListRequestDto, NotificationSummaryDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  apiName = 'AutoReach';

  getList = (input: NotificationListRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<NotificationDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/notification',
        params: {
          unreadOnly: input.unreadOnly,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  /** The bell's poll. Two counts and one row — cheap enough to run every 30s. */
  getSummary = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, NotificationSummaryDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/notification/summary',
      },
      { apiName: this.apiName, ...config },
    );

  markRead = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NotificationDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/notification/${id}/read`,
      },
      { apiName: this.apiName, ...config },
    );

  markAllRead = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        url: '/api/auto-reach/notification/all-read',
      },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
