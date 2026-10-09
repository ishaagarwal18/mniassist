import { Rest, RestService } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type {
  AllocateNumberInput,
  CreateResellerNumberInput,
  GetResellerNumbersInput,
  ReleaseNumberInput,
  ResellerNumberDto,
  TelecomComplianceAuditResultDto,
  TelecomEntitySettingsDto,
  UpdateNumberKycInput,
  UpdateTelecomEntitySettingsDto,
} from './telecom.models';

@Injectable({
  providedIn: 'root',
})
export class TelecomService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getEntitySettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, TelecomEntitySettingsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/telecom/entity-settings',
      },
      { apiName: this.apiName, ...config },
    );

  updateEntitySettings = (input: UpdateTelecomEntitySettingsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TelecomEntitySettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/telecom/entity-settings',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getNumbers = (input: GetResellerNumbersInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ResellerNumberDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/telecom/numbers',
        params: {
          filter: input.filter,
          status: input.status,
          tspCarrier: input.tspCarrier,
          kycStatus: input.kycStatus,
          tenantId: input.tenantId,
          availableOnly: input.availableOnly,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getNumber = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerNumberDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/telecom/numbers/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getAvailablePoolNumbers = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerNumberDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/telecom/available-pool',
      },
      { apiName: this.apiName, ...config },
    );

  createNumber = (input: CreateResellerNumberInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerNumberDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/telecom/numbers',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  allocateNumber = (id: string, input: AllocateNumberInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerNumberDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/telecom/numbers/${id}/allocate`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  releaseNumber = (id: string, input: ReleaseNumberInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerNumberDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/telecom/numbers/${id}/release`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateNumberKyc = (id: string, input: UpdateNumberKycInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerNumberDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/telecom/numbers/${id}/kyc`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  runComplianceAudit = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, TelecomComplianceAuditResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/telecom/compliance-audit',
      },
      { apiName: this.apiName, ...config },
    );
}
