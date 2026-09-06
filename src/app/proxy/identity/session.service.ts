import type { UserSessionDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getMySessions = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<UserSessionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/session/my-sessions',
      },
      { apiName: this.apiName, ...config },
    );

  revokeMySession = (sessionId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: `/api/auto-reach/session/revoke-my-session/${sessionId}`,
      },
      { apiName: this.apiName, ...config },
    );

  revokeMyOtherSessions = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/session/revoke-my-other-sessions',
      },
      { apiName: this.apiName, ...config },
    );
}
