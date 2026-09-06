import type {
  CreateUpdateFlowDto,
  FlowDto,
  FlowFunnelDto,
  FlowResponseDto,
  GetFlowListInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto, PagedResultRequestDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FlowService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateFlowDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FlowDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/flow',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/flow/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  deprecate = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FlowDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/flow/${id}/deprecate`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FlowDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/flow/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetFlowListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<FlowDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/flow',
        params: {
          state: input.state,
          filter: input.filter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getResponses = (id: string, input: PagedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<FlowResponseDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/flow/${id}/responses`,
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  getFunnel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FlowFunnelDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/flow/${id}/funnel`,
      },
      { apiName: this.apiName, ...config },
    );

  publish = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FlowDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/flow/${id}/publish`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateFlowDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FlowDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/flow/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
