import type {
  StartSupportSessionDto,
  SupportImpersonationGrantDto,
  SupportSessionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto, PagedResultRequestDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SupportImpersonationService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  endSession = (sessionId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SupportSessionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/support-impersonation/end-session/${sessionId}`,
      },
      { apiName: this.apiName, ...config },
    );

  getActiveGrants = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<SupportImpersonationGrantDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/support-impersonation/active-grants',
      },
      { apiName: this.apiName, ...config },
    );

  getMyOpenSession = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SupportSessionDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/support-impersonation/my-open-session',
      },
      { apiName: this.apiName, ...config },
    );

  getSessions = (tenantId: string, input: PagedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<SupportSessionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/support-impersonation/sessions/${tenantId}`,
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  startSession = (input: StartSupportSessionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SupportSessionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/support-impersonation/start-session',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
