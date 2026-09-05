import { Environment } from '@abp/ng.core';

/**
 * Development environment.
 * <p>
 * `useMockData` starts true so the UI runs standalone against the seeded signal
 * stores — the design work does not need a database to be reviewable. Flip it to
 * false once `dotnet run` is up on 44320 and the same screens bind to real data.
 * </p>
 */
export const environment = {
  production: false,

  useMockData: true,

  application: {
    baseUrl: 'http://localhost:4200',
    name: 'AutoReach',
  },

  oAuthConfig: {
    issuer: 'https://localhost:44321/',
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
