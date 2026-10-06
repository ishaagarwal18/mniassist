import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ToastService } from '../ui/toast.service';
import { errorFor, isQuietFailure, successFor } from './api-feedback';

/** Set on a request to keep it out of the toasts entirely (success and failure). */
export const QUIET_REQUEST = new HttpContextToken<boolean>(() => false);

/**
 * App-wide feedback for API calls: a toast when something is created, changed
 * or deleted, and a toast with the server's own message when a call fails. Rules
 * for which calls count (previews and reads sent as POST do not) live in
 * api-feedback.ts. Only AutoReach/ABP API calls under /api/ are considered; the
 * sign-in token call has its own messages on the sign-in page.
 */
@Injectable()
export class ApiFeedbackInterceptor implements HttpInterceptor {
  private readonly toasts = inject(ToastService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (req.context.get(QUIET_REQUEST) || !req.url.includes('/api/')) return next.handle(req);
    return next.handle(req).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            const ok = successFor(req.method, req.urlWithParams);
            if (ok) this.toasts.success(ok.content, ok.title);
          }
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && !isQuietFailure(req.method, err, req.url)) {
            const e = errorFor(err);
            this.toasts.error(e.content, e.title);
          }
        },
      }),
    );
  }
}
