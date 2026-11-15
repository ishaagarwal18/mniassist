import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { IntegrationKind } from './integration-kind.enum';

export interface StartCrmOAuthDto {
  name?: string | null;
  connectionId?: string | null;
  /** Salesforce only: true signs in to a sandbox org; null keeps what the connection has. */
  sandbox?: boolean | null;
}

export interface CrmOAuthStartResultDto {
  authorizeUrl: string;
}

/**
 * The interactive OAuth connect flow (M10-9). Not a conventional ABP proxy — the
 * backend serves this behind an explicit controller (CrmOAuthController), since the
 * callback half of the flow has to answer a browser redirect, not a JSON envelope.
 * This service only ever calls the "start" half; the callback is the CRM's own server
 * redirecting the browser straight to the backend, never through this service.
 */
@Injectable({ providedIn: 'root' })
export class CrmOAuthService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  start = (kind: IntegrationKind, input: StartCrmOAuthDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrmOAuthStartResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/crm-oauth/${kind}/start`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
