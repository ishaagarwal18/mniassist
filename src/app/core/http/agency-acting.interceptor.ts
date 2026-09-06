import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AgencyActingStore } from '../services/agency-acting.store';

/**
 * While an agency user has an open acting session (M01-8), stamps every AutoReach
 * API call with X-AutoReach-Client-Tenant so the server resolves the request to
 * that client's workspace. Agency-management calls (/api/auto-reach/agency/…) are
 * skipped — those run in the agency's own tenant.
 */
@Injectable()
export class AgencyActingInterceptor implements HttpInterceptor {
  private readonly acting = inject(AgencyActingStore);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const clientTenantId = this.acting.clientTenantId();

    if (
      clientTenantId &&
      req.url.includes('/api/auto-reach/') &&
      !req.url.includes('/api/auto-reach/agency/')
    ) {
      return next.handle(
        req.clone({ setHeaders: { 'X-AutoReach-Client-Tenant': clientTenantId } }),
      );
    }

    return next.handle(req);
  }
}
