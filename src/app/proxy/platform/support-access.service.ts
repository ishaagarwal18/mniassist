import type {
  CreateSupportGrantDto,
  SupportImpersonationGrantDto,
  SupportSessionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto, PagedResultRequestDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface SupportEngineerDto {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class SupportAccessService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getMyGrants = (onlyActive: boolean, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<SupportImpersonationGrantDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/support-access/my-grants',
        params: { onlyActive },
      },
      { apiName: this.apiName, ...config },
    );

  getSessionHistory = (input: PagedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<SupportSessionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/support-access/session-history',
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  /** Platform support engineers a grant can name (names only). */
  getSupportEngineers = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<SupportEngineerDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/support-access/support-engineers',
      },
      { apiName: this.apiName, ...config },
    );

  grant = (input: CreateSupportGrantDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SupportImpersonationGrantDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/support-access/grant',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  revoke = (grantId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SupportImpersonationGrantDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/support-access/revoke/${grantId}`,
      },
      { apiName: this.apiName, ...config },
    );
}
