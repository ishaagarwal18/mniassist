import type { NotificationDto, NotificationListRequestDto, NotificationSummaryDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: NotificationListRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<NotificationDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/notification',
        params: {
          unreadOnly: input.unreadOnly,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getSummary = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, NotificationSummaryDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/notification/summary',
      },
      { apiName: this.apiName, ...config },
    );

  markAllRead = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/notification/mark-all-read',
      },
      { apiName: this.apiName, ...config },
    );

  markRead = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NotificationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/notification/${id}/mark-read`,
      },
      { apiName: this.apiName, ...config },
    );
}
