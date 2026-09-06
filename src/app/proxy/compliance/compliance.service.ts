import type {
  BreachIncidentDto,
  ComplianceOverviewDto,
  CreateBreachIncidentDto,
  CreateDataPrincipalRequestDto,
  DataPrincipalRequestDto,
  FulfilDataRequestInput,
  GetDataRequestListInput,
  RecordBreachNotificationDto,
  RejectDataRequestInput,
  RetentionPolicyDto,
  UpdateRetentionPolicyInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ComplianceService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  assignRequest = (id: string, userId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DataPrincipalRequestDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/compliance/${id}/assign-request/${userId}`,
      },
      { apiName: this.apiName, ...config },
    );

  closeBreach = (id: string, remediationNotes: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BreachIncidentDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/compliance/${id}/close-breach`,
        params: { remediationNotes },
      },
      { apiName: this.apiName, ...config },
    );

  containBreach = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BreachIncidentDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/compliance/${id}/contain-breach`,
      },
      { apiName: this.apiName, ...config },
    );

  createBreach = (input: CreateBreachIncidentDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BreachIncidentDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/compliance/breach',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  createRequest = (input: CreateDataPrincipalRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DataPrincipalRequestDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/compliance/request',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  downloadResponse = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'POST',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/compliance/${id}/download-response`,
      },
      { apiName: this.apiName, ...config },
    );

  fulfilRequest = (id: string, input: FulfilDataRequestInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DataPrincipalRequestDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/compliance/${id}/fulfil-request`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getBreaches = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<BreachIncidentDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/compliance/breaches',
        params: {
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getOverview = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ComplianceOverviewDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/compliance/overview',
      },
      { apiName: this.apiName, ...config },
    );

  getRequest = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DataPrincipalRequestDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/compliance/${id}/request`,
      },
      { apiName: this.apiName, ...config },
    );

  getRequests = (input: GetDataRequestListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<DataPrincipalRequestDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/compliance/requests',
        params: {
          state: input.state,
          kind: input.kind,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getRetentionPolicies = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<RetentionPolicyDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/compliance/retention-policies',
      },
      { apiName: this.apiName, ...config },
    );

  recordBreachNotification = (
    id: string,
    input: RecordBreachNotificationDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, BreachIncidentDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/compliance/${id}/record-breach-notification`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  rejectRequest = (id: string, input: RejectDataRequestInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DataPrincipalRequestDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/compliance/${id}/reject-request`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateRetentionPolicy = (
    id: string,
    input: UpdateRetentionPolicyInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, RetentionPolicyDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/compliance/${id}/retention-policy`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
