import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** Who issued the mailbox access token, when the mailbox was signed into through a consent screen instead of a typed password. */
export enum EmailOAuthProvider {
  None = 0,
  Google = 1,
  Microsoft = 2,
}

export interface EmailOAuthStartResultDto {
  authorizeUrl: string;
}

/**
 * The interactive OAuth connect flow for the mailbox a workspace reads replies from. Not a conventional ABP proxy — the backend serves
 * this behind an explicit controller (EmailOAuthController), since the callback half of the flow has to answer a browser redirect, not
 * a JSON envelope. This service only ever calls the "start" half; the callback is Google's or Microsoft's own server redirecting the
 * browser straight to the backend, never through this service.
 */
@Injectable({ providedIn: 'root' })
export class EmailOAuthService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  start = (provider: EmailOAuthProvider, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailOAuthStartResultDto>(
      { method: 'POST', url: `/api/auto-reach/email-oauth/${provider}/start` },
      { apiName: this.apiName, ...config },
    );
}
