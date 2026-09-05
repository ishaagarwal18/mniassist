import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAbpCore, withOptions } from '@abp/ng.core';
import { provideAbpOAuth } from '@abp/ng.oauth';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAbpCore(
      withOptions({
        environment,
        registerLocaleFn: () => Promise.resolve(),

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
