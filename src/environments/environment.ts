import { Environment } from '@abp/ng.core';

/**
 * Production environment. `rootNamespace` must match the RootNamespace in
 * Directory.Build.props — `abp generate-proxy -t ng` reads it to work out the
 * folder layout under src/app/proxy.
 */
export const environment = {
  production: true,

  /** Set false once the API is running to bind the UI to live data. */
  useMockData: false,

  application: {
    baseUrl: 'https://mniassist.com',
    name: 'MNI Assist',
  },

  oAuthConfig: {
    issuer: 'https://api.mniassist.com/',
    redirectUri: 'https://mniassist.com',
    clientId: 'AutoReach_App',
    // Resource-owner password grant — the in-app /login form posts straight to
    // /connect/token. See environment.development.ts.
    responseType: 'password',
    scope: 'openid profile offline_access AutoReach',
    requireHttps: true,
  },

  apis: {
    default: {
      url: 'https://api.mniassist.com',
      rootNamespace: 'Mni.AutoReach',
    },
    AutoReach: {
      url: 'https://api.mniassist.com',
      rootNamespace: 'Mni.AutoReach',
    },
  },
} as Environment & { useMockData: boolean };
