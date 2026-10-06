import type { GetSecurityLogsInput, SecurityLogDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SecurityLogService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getMyList = (input: GetSecurityLogsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<SecurityLogDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/security-log/my-list',
        params: this.params(input),
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetSecurityLogsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<SecurityLogDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/security-log',
        params: this.params(input),
      },
      { apiName: this.apiName, ...config },
    );

  private params(input: GetSecurityLogsInput) {
    return {
      skipCount: input.skipCount,
      maxResultCount: input.maxResultCount,
      startTime: input.startTime,
      endTime: input.endTime,
      action: input.action,
      userName: input.userName,
      clientIpAddress: input.clientIpAddress,
    };
  }
}
