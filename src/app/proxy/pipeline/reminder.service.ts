import type { GetReminderListInput, PlanRemindersInput, ReminderDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ReminderService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetReminderListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ReminderDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/reminder',
        params: {
          state: input.state,
          kind: input.kind,
          fromUtc: input.fromUtc,
          toUtc: input.toUtc,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  halt = (id: string, reason: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReminderDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/reminder/${id}/halt`,
        params: { reason },
      },
      { apiName: this.apiName, ...config },
    );

  plan = (input: PlanRemindersInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/reminder/plan',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  reschedule = (id: string, dueAtUtc: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReminderDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/reminder/${id}/reschedule`,
        params: { dueAtUtc },
      },
      { apiName: this.apiName, ...config },
    );
}
