import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { IntegrationKind } from './integration-kind.enum';
import type { IntegrationState } from './integration-state.enum';

export interface CrmSyncConnectionStatusDto {
  connectionId: string;
  kind: IntegrationKind;
  name: string;
  state: IntegrationState;
  supportsDealSync: boolean;
  linkedEnquiries: number;
  linkedQuotations: number;
  lastOutboundAtUtc?: string | null;
  lastInboundAtUtc?: string | null;
  inboundWebhookPath: string;
}

export interface CrmSyncStatusDto {
  connections: CrmSyncConnectionStatusDto[];
}

export interface CrmSyncResyncResultDto {
  pushed: number;
}

/**
 * Two-way CRM sync of enquiries and quotations (M10-9).
 */
@Injectable({ providedIn: 'root' })
export class CrmSyncService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getStatus = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrmSyncStatusDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/crm-sync/status',
      },
      { apiName: this.apiName, ...config },
    );

  resync = (connectionId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrmSyncResyncResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/crm-sync/resync',
        params: { connectionId },
      },
      { apiName: this.apiName, ...config },
    );
}
