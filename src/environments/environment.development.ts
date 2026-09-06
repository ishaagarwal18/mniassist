import { Environment } from '@abp/ng.core';

/**
 * Development environment.
 * <p>
 * `useMockData` is false: the screens bind to the real API on 44320, which also
 * issues its own tokens (OpenIddict password grant) — sign-in on `/login` goes
 * through that. Set it back to true to review the UI against the seeded signal
 * stores without a database.
 * </p>
 */
export const environment = {
  production: false,

  useMockData: false,

  application: {
    baseUrl: 'http://localhost:4200',
    name: 'AutoReach',
  },

  oAuthConfig: {
    issuer: 'https://localhost:44320/',
    redirectUri: 'http://localhost:4200',
    clientId: 'AutoReach_App',
    responseType: 'code',
    scope: 'offline_access AutoReach',
    requireHttps: false,
  },

  apis: {
    default: {
      url: 'https://localhost:44320',
      rootNamespace: 'Mni.AutoReach',
    },
    AutoReach: {
      url: 'https://localhost:44320',
      rootNamespace: 'Mni.AutoReach',
    },
  },
} as Environment & { useMockData: boolean };
