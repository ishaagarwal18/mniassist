import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter, withNavigationErrorHandler, withPreloading } from '@angular/router';
import { IdlePreloading } from './core/util/idle-preloading';
import { DISABLE_PROJECT_NAME, PermissionService, provideAbpCore, withOptions } from '@abp/ng.core';
import { provideAbpOAuth } from '@abp/ng.oauth';

import { routes } from './app.routes';
import { HostBrandStore } from './core/services/host-brand.store';
import { environment } from '../environments/environment';
import { AgencyActingInterceptor } from './core/http/agency-acting.interceptor';
import { ApiFeedbackInterceptor } from './core/http/api-feedback.interceptor';
import { AutoReachPermissionService } from './core/auth/auto-reach-permission.service';
import {
  isMixedDevBuildError,
  isStaleChunkError,
  reloadForStaleChunk,
} from './core/util/stale-chunk';

/** Dev server only: an open tab mixing two copies of Angular after Vite re-bundled reloads once (see stale-chunk.ts). */
class DevRebundleErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    if (isMixedDevBuildError(error, isDevMode()) && reloadForStaleChunk()) {
      console.warn(
        '[dev] The dev server re-bundled its libraries; reloading this tab once.',
        error,
      );
      return;
    }
    super.handleError(error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // On a reseller's domain, show their brand from the first screen; never hold the app up for long.
    provideAppInitializer(() =>
      Promise.race([
        inject(HostBrandStore).load(),
        new Promise<void>((done) => setTimeout(done, 2500)),
      ]),
    ),
    provideRouter(
      routes,
      withPreloading(IdlePreloading),
      // A tab from before a deploy asks for chunk files the server no longer has: reload once.
      // In dev, the same after `ng serve` re-bundled its libraries (two copies of Angular → NG0203).
      withNavigationErrorHandler((e) => {
        if (isStaleChunkError(e.error) || isMixedDevBuildError(e.error, isDevMode())) {
          reloadForStaleChunk();
        }
      }),
    ),
    { provide: ErrorHandler, useClass: DevRebundleErrorHandler },
    provideHttpClient(withInterceptorsFromDi()),
    { provide: PermissionService, useClass: AutoReachPermissionService },
    { provide: HTTP_INTERCEPTORS, useClass: AgencyActingInterceptor, multi: true },
    // Toasts for every create/update/delete and for every server error.
    { provide: HTTP_INTERCEPTORS, useClass: ApiFeedbackInterceptor, multi: true },
    // Route titles already carry the brand ("Inbox · MNI Assist"). Without this ABP
    // appends " | " plus the API's AppName, or "MyProjectName" when it has none.
    { provide: DISABLE_PROJECT_NAME, useValue: true },
    provideAbpCore(
      withOptions({
        environment,
        registerLocaleFn: (culture) => {
          switch (culture.toLowerCase().split(/[-_]/)[0]) {
            case 'hi':
              return import('@angular/common/locales/hi');
            case 'mr':
              return import('@angular/common/locales/mr');
            case 'gu':
              return import('@angular/common/locales/gu');
            default:
              return import('@angular/common/locales/en');
          }
        },

        skipGetAppConfiguration: false,
        skipInitAuthService: false,
      }),
    ),

    // Authorization-code flow with PKCE against the issuer in the environment.
    provideAbpOAuth(),
  ],
};
