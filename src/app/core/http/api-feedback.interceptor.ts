import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Observable, tap } from 'rxjs';

import { CurrentUserService } from '../services/current-user.service';
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
  // Looked up when needed: the user service sits on HttpClient, which sits on this interceptor.
  private readonly injector = inject(Injector);

  /** A sign-in token is stored, so this browser believes it is signed in. */
  private holdsSignIn(): boolean {
    try {
      return !!this.injector.get(OAuthService).getAccessToken();
    } catch {
      return false;
    }
  }

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
          // A sign-in this browser still holds was refused: it expired or was revoked. Showing
          // "signed out" and leaving the page up only leads to more failures, so end it properly.
          if (err instanceof HttpErrorResponse && err.status === 401 && this.holdsSignIn()) {
            this.injector.get(CurrentUserService).sessionEnded();
            return;
          }
          if (err instanceof HttpErrorResponse && !isQuietFailure(req.method, err, req.url)) {
            const e = errorFor(err);
            this.toasts.error(e.content, e.title);
          }
        },
      }),
    );
  }
}
