import type { AutomationDto, CreateUpdateAutomationDto, GetAutomationListInput } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AutomationService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  activate = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AutomationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/automation/${id}/activate`,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateAutomationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AutomationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/automation',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/automation/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AutomationDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/automation/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetAutomationListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<AutomationDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/automation',
        params: {
          state: input.state,
          trigger: input.trigger,
          filter: input.filter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  pause = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AutomationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/automation/${id}/pause`,
      },
      { apiName: this.apiName, ...config },
    );

  simulate = (id: string, contactId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, string[]>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/automation/${id}/simulate/${contactId}`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateAutomationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AutomationDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/automation/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
