import type {
  BreachIncidentDto,
  ComplianceOverviewDto,
  CreateBreachIncidentDto,
  CreateDataPrincipalRequestDto,
  DataPrincipalRequestDto,
  FulfilDataRequestInput,
  GetDataRequestListInput,
  RejectDataRequestInput,
  RetentionPolicyDto,
  UpdateRetentionPolicyInput,
} from './dpdp-models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

const api = '/api/auto-reach/compliance';

@Injectable({ providedIn: 'root' })
export class ComplianceService {
  apiName = 'AutoReach';
  private c = (config?: Partial<Rest.Config>) => ({ apiName: this.apiName, ...config });

  getOverview = (config?: Partial<Rest.Config>) =>
    this.rest.request<any, ComplianceOverviewDto>(
      { method: 'GET', url: `${api}/overview` },
      this.c(config),
    );

  getRequests = (input: GetDataRequestListInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, PagedResultDto<DataPrincipalRequestDto>>(
      { method: 'GET', url: `${api}/requests`, params: { ...input } },
      this.c(config),
    );

  createRequest = (input: CreateDataPrincipalRequestDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, DataPrincipalRequestDto>(
      { method: 'POST', url: `${api}/requests`, body: input },
      this.c(config),
    );

  fulfilRequest = (id: string, input: FulfilDataRequestInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, DataPrincipalRequestDto>(
      { method: 'POST', url: `${api}/requests/${id}/fulfil`, body: input },
      this.c(config),
    );

  rejectRequest = (id: string, input: RejectDataRequestInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, DataPrincipalRequestDto>(
      { method: 'POST', url: `${api}/requests/${id}/reject`, body: input },
      this.c(config),
    );

  getRetentionPolicies = (config?: Partial<Rest.Config>) =>
    this.rest.request<any, ListResultDto<RetentionPolicyDto>>(
      { method: 'GET', url: `${api}/retention-policies` },
      this.c(config),
    );

  updateRetentionPolicy = (
    id: string,
    input: UpdateRetentionPolicyInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<any, RetentionPolicyDto>(
      { method: 'PUT', url: `${api}/retention-policies/${id}`, body: input },
      this.c(config),
    );

  getBreaches = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, PagedResultDto<BreachIncidentDto>>(
      { method: 'GET', url: `${api}/breaches`, params: { ...input } },
      this.c(config),
    );

  createBreach = (input: CreateBreachIncidentDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, BreachIncidentDto>(
      { method: 'POST', url: `${api}/breaches`, body: input },
      this.c(config),
    );

  containBreach = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, BreachIncidentDto>(
      { method: 'POST', url: `${api}/breaches/${id}/contain` },
      this.c(config),
    );

  closeBreach = (id: string, remediationNotes: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, BreachIncidentDto>(
      { method: 'POST', url: `${api}/breaches/${id}/close`, params: { remediationNotes } },
      this.c(config),
    );

  constructor(private rest: RestService) {}
}
