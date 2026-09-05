import type {
  CreateSupportGrantDto,
  GetSupportSessionsInput,
  SupportImpersonationGrantDto,
  SupportSessionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

/**
 * The tenant's own control over support access to their account.
 *
 * Everything here is tenant-side: the grant is theirs to give and theirs to take
 * back at any moment, which is what makes it consent rather than a formality.
 */
@Injectable({
  providedIn: 'root',
})
export class SupportAccessService {
  apiName = 'AutoReach';

  getMyGrants = (onlyActive: boolean, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<SupportImpersonationGrantDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/support-access/my-grants',
        params: { onlyActive },
      },
      { apiName: this.apiName, ...config },
    );

  grant = (input: CreateSupportGrantDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SupportImpersonationGrantDto>(
      { method: 'POST', url: '/api/auto-reach/support-access/grant', body: input },
      { apiName: this.apiName, ...config },
    );

  /** Ends any open session too. Revoking while someone is inside must actually remove them. */
  revoke = (grantId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SupportImpersonationGrantDto>(
      { method: 'POST', url: `/api/auto-reach/support-access/${grantId}/revoke` },
      { apiName: this.apiName, ...config },
    );

  getSessionHistory = (input: GetSupportSessionsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<SupportSessionDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/support-access/sessions',
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
