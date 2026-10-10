import type { CreateDelegationInput, DelegateCandidateDto, DelegationDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DelegationService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getMyDelegations = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<DelegationDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/delegation/my-delegations',
      },
      { apiName: this.apiName, ...config },
    );

  getDelegatedToMe = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<DelegationDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/delegation/delegated-to-me',
      },
      { apiName: this.apiName, ...config },
    );

  getCandidates = (filter?: string | null, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<DelegateCandidateDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/delegation/candidates',
        params: { filter: filter || undefined },
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateDelegationInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DelegationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/delegation',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/delegation/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
}
