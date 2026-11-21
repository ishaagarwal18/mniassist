import { Environment } from '@abp/ng.core';

/**
 * Development environment.
 * <p>
 * The screens bind to the real API on 44320, which also issues its own tokens
 * (OpenIddict password grant) — sign-in on `/login` goes through that.
 * </p>
 */
export const environment = {
  production: false,
  /** The sales team's WhatsApp number, digits with country code (e.g. 919812345678).
   *  Shows "Talk to us on WhatsApp" in the public footer; blank hides it. */
  salesWhatsApp: '',
  /** Full profile URLs for the public footer's social icons; a blank one is not shown. */
  social: { linkedin: '', youtube: '', x: '', instagram: '', facebook: '' },
  /** The registered office and Corporate Identity Number shown in the public footer; blank hides each. */
  company: { address: '', cin: '' },

  /** Syncfusion licence key (paste yours here). Empty shows Syncfusion's licence notice. */
  syncfusionLicenseKey:
    'Ngo9BigBOggjHTQxAR8/V1JBaF5cXmRCd1p/TH5YfUNzdUVEY1ZUTXxaS1ZhSXxVd0VjXX9ecXJUQmJVVkF9XEc=',

  application: {
    baseUrl: 'https://localhost:4200',
    name: 'MNI Assist',
  },

  oAuthConfig: {
    issuer: 'https://localhost:44320/',
    redirectUri: 'https://localhost:4200',
    clientId: 'AutoReach_App',
    // Resource-owner password grant: the /login form posts credentials straight
    // to /connect/token. "code" would make @abp/ng.oauth redirect to the host's
    // /connect/authorize, which has no login page to render.
    responseType: 'password',
    // Sign-in is the password grant (and our account_switch / external_login grants), none of
    // which sends a nonce, so the library's ID-token check would always report "Wrong nonce:
    // undefined". The app authorises with the access token alone and never reads the ID token.
    oidc: false,
    scope: 'openid profile offline_access AutoReach',
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
} as Environment & { syncfusionLicenseKey: string; salesWhatsApp: string; social: Record<string, string>; company: { address: string; cin: string } };
