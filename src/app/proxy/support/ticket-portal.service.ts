import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type {
  PublicTicketPortalDto,
  SubmitPublicTicketInput,
  SubmitPublicTicketResultDto,
} from './ticket-portal.models';

/**
 * What a visitor's browser calls to raise a ticket of their own. Anonymous: the portal's address is the only thing they hold. Errors
 * are handled by the page itself, so the app-wide handler (which would talk about sessions) is skipped.
 */
@Injectable({ providedIn: 'root' })
export class ServiceTicketPublicService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  private readonly own: Partial<Rest.Config> = { skipHandleError: true };

  get = (code: string) =>
    this.restService.request<any, PublicTicketPortalDto>(
      { method: 'GET', url: `/api/tickets/public/${code}` },
      { apiName: this.apiName, ...this.own },
    );

  submit = (code: string, input: SubmitPublicTicketInput) =>
    this.restService.request<SubmitPublicTicketInput, SubmitPublicTicketResultDto>(
      { method: 'POST', url: `/api/tickets/public/${code}`, body: input },
      { apiName: this.apiName, ...this.own },
    );
}
