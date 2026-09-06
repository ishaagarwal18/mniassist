import type {
  AssignmentRuleDto,
  CreateUpdateAssignmentRuleDto,
  CreateUpdateTeamDto,
  TeamDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateTeamDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TeamDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/team',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  createRule = (input: CreateUpdateAssignmentRuleDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AssignmentRuleDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/team/rule',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/team/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  deleteRule = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/team/${id}/rule`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TeamDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/team/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<TeamDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/team',
        params: {
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getMine = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<TeamDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/team/mine',
      },
      { apiName: this.apiName, ...config },
    );

  getRules = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<AssignmentRuleDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/team/rules',
      },
      { apiName: this.apiName, ...config },
    );

  reorderRules = (orderedRuleIds: readonly string[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/team/reorder-rules',
        body: orderedRuleIds,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateTeamDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TeamDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/team/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateRule = (id: string, input: CreateUpdateAssignmentRuleDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AssignmentRuleDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/team/${id}/rule`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
