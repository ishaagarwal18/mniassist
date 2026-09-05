import type {
  EntityDto,
  FullAuditedEntityDto,
  PagedAndSortedResultRequestDto,
  PagedResultDto,
  PagedResultRequestDto,
} from '@abp/ng.core';
import { RestService, Rest, mapEnumToOptions } from '@abp/ng.core';
import { Injectable } from '@angular/core';

export enum FlowState {
  Draft = 0,
  Published = 1,
  Deprecated = 2,
  Blocked = 3,
}
export const flowStateOptions = mapEnumToOptions(FlowState);

export interface FlowScreenDto extends EntityDto<string> {
  screenId: string;
  title?: string;
  order: number;
  entryCount: number;
  completionCount: number;
  dropOffRate: number;
}

export interface FlowDto extends FullAuditedEntityDto<string> {
  name: string;
  channelId: string;
  metaFlowId?: string;
  state: FlowState;
  version: number;
  definitionJson: string;
  dataEndpointUrl?: string;
  publishedAtUtc?: string;
  blockReason?: string;
  screens: FlowScreenDto[];
}

export interface CreateUpdateFlowDto {
  name: string;
  channelId: string;
  definitionJson: string;
  dataEndpointUrl?: string;
}

export interface GetFlowListInput extends PagedAndSortedResultRequestDto {
  state?: FlowState;
  filter?: string;
}

export interface FlowResponseDto extends EntityDto<string> {
  flowId: string;
  contactId: string;
  contactDisplayName?: string;
  payloadJson: string;
  submittedAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class FlowService {
  apiName = 'AutoReach';
  private c = (config?: Partial<Rest.Config>) => ({ apiName: this.apiName, ...config });

  getList = (input: GetFlowListInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, PagedResultDto<FlowDto>>(
      { method: 'GET', url: '/api/auto-reach/flow', params: { ...input } },
      this.c(config),
    );

  create = (input: CreateUpdateFlowDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, FlowDto>(
      { method: 'POST', url: '/api/auto-reach/flow', body: input },
      this.c(config),
    );

  update = (id: string, input: CreateUpdateFlowDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, FlowDto>(
      { method: 'PUT', url: `/api/auto-reach/flow/${id}`, body: input },
      this.c(config),
    );

  publish = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, FlowDto>(
      { method: 'POST', url: `/api/auto-reach/flow/${id}/publish` },
      this.c(config),
    );

  deprecate = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, FlowDto>(
      { method: 'POST', url: `/api/auto-reach/flow/${id}/deprecate` },
      this.c(config),
    );

  getResponses = (id: string, input: PagedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, PagedResultDto<FlowResponseDto>>(
      { method: 'GET', url: `/api/auto-reach/flow/${id}/responses`, params: { ...input } },
      this.c(config),
    );

  constructor(private rest: RestService) {}
}
