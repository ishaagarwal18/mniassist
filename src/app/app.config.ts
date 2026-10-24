import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter, withNavigationErrorHandler, withPreloading } from '@angular/router';
import { IdlePreloading } from './core/util/idle-preloading';
import { DISABLE_PROJECT_NAME, PermissionService, provideAbpCore, withOptions } from '@abp/ng.core';
import { provideAbpOAuth } from '@abp/ng.oauth';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AgencyActingInterceptor } from './core/http/agency-acting.interceptor';
import { ApiFeedbackInterceptor } from './core/http/api-feedback.interceptor';
import { AutoReachPermissionService } from './core/auth/auto-reach-permission.service';
import { isStaleChunkError, reloadForStaleChunk } from './core/util/stale-chunk';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withPreloading(IdlePreloading),
      // A tab from before a deploy asks for chunk files the server no longer has: reload once.
      withNavigationErrorHandler((e) => {
        if (isStaleChunkError(e.error)) reloadForStaleChunk();
      }),
    ),
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

        // While the UI runs on seeded data there is no API to ask for the
        // application configuration, and firing that request would leave the app
        // stuck on a failed boot. Both flip automatically once the API is wired.
        skipGetAppConfiguration: environment.useMockData,
        skipInitAuthService: environment.useMockData,
      }),
    ),

    // Authorization-code flow with PKCE against the issuer in the environment.
    // Registered even in mock mode so the two builds differ only in data source,
    // not in which providers exist — a provider that appears only in production
    // is a provider nobody has ever exercised.
    provideAbpOAuth(),
  ],
};
