import { Environment } from '@abp/ng.core';

/**
 * Staging environment: the production build, pointed at staging (api.staging.mniassist.com). `rootNamespace` must match the RootNamespace in
 * Directory.Build.props — `abp generate-proxy -t ng` reads it to work out the
 * folder layout under src/app/proxy.
 */
export const environment = {
  production: true,
  /** The sales team's WhatsApp number, digits with country code (e.g. 919812345678).
   *  Shows "Talk to us on WhatsApp" in the public footer; blank hides it. */
  salesWhatsApp: '',
  /** Full profile URLs for the public footer's social icons; a blank one is not shown. */
  social: { linkedin: '', youtube: '', x: '', instagram: '', facebook: '' },
  /** The registered office and Corporate Identity Number shown in the public footer; blank hides each. */
  company: { address: '', cin: '' },

  /** Set false once the API is running to bind the UI to live data. */
  /** Syncfusion licence key (paste yours here). Empty shows Syncfusion's licence notice. */
  syncfusionLicenseKey:
    'Ngo9BigBOggjHTQxAR8/V1JBaF5cXmRCd1p/TH5YfUNzdUVEY1ZUTXxaS1ZhSXxVd0VjXX9ecXJUQmJVVkF9XEc=',

  application: {
    baseUrl: 'https://staging.mniassist.com',
    name: 'MNI Assist',
  },

  oAuthConfig: {
    issuer: 'https://api.staging.mniassist.com/',
    redirectUri: 'https://staging.mniassist.com',
    clientId: 'AutoReach_App',
    // Resource-owner password grant — the in-app /login form posts straight to
    // /connect/token. See environment.development.ts.
    responseType: 'password',
    // Sign-in is the password grant (and our account_switch / external_login grants), none of
    // which sends a nonce, so the library's ID-token check would always report "Wrong nonce:
    // undefined". The app authorises with the access token alone and never reads the ID token.
    oidc: false,
    scope: 'openid profile offline_access AutoReach',
    requireHttps: true,
  },

  apis: {
    default: {
      url: 'https://api.staging.mniassist.com',
      rootNamespace: 'Mni.AutoReach',
    },
    AutoReach: {
      url: 'https://api.staging.mniassist.com',
      rootNamespace: 'Mni.AutoReach',
    },
  },
} as Environment & { syncfusionLicenseKey: string; salesWhatsApp: string; social: Record<string, string>; company: { address: string; cin: string } };
