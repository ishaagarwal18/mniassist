/**
 * Meta's JavaScript SDK, loaded on demand for WhatsApp Embedded Signup. The SDK opens the
 * signup popup (FB.login with the Embedded Signup configuration) and returns an OAuth code;
 * the popup separately posts a WA_EMBEDDED_SIGNUP message naming the WABA and number picked.
 */

const FACEBOOK_SDK = 'https://connect.facebook.net/en_US/sdk.js';

interface FacebookLoginResponse {
  authResponse?: { code?: string } | null;
  status?: string;
}

interface FacebookSdk {
  init(options: {
    appId: string;
    autoLogAppEvents?: boolean;
    xfbml?: boolean;
    version: string;
  }): void;
  login(
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>,
  ): void;
  getLoginStatus(callback: (response: FacebookLoginResponse) => void): void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

/**
 * The SDK script never became usable. `blocked`: the browser refused the script (an ad or
 * tracker blocker, strict tracking prevention, a network filter). `timeout`: it neither loaded
 * nor failed within the limit, which blockers that stall requests also cause.
 */
export class FacebookSdkError extends Error {
  constructor(
    readonly reason: 'blocked' | 'timeout',
    message: string,
  ) {
    super(message);
    this.name = 'FacebookSdkError';
  }
}

let scriptLoading: Promise<void> | null = null;
let initialisedFor: string | null = null;
let loginStatusLoading: Promise<void> | null = null;

/** Prepares the SDK and its login status before enabling the user's sign-in button. */
export function loadFacebookSdk(appId: string, graphVersion: string): Promise<void> {
  scriptLoading ??= new Promise<void>((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    const previousInit = window.fbAsyncInit;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      s.onerror = null;
      window.fbAsyncInit = previousInit;
      if (error) {
        s.remove();
        reject(error);
      } else resolve();
    };
    const timer = setTimeout(
      () =>
        finish(
          new FacebookSdkError(
            'timeout',
            'Facebook sign-in took too long to load. Please try again.',
          ),
        ),
      15000,
    );
    window.fbAsyncInit = () => {
      try {
        previousInit?.();
      } finally {
        finish();
      }
    };
    s.src = FACEBOOK_SDK;
    s.async = true;
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.onerror = () =>
      finish(new FacebookSdkError('blocked', 'Facebook sign-in could not load. Please try again.'));
    document.head.appendChild(s);
  });
  return scriptLoading
    .then(async () => {
      if (!window.FB) throw new FacebookSdkError('blocked', 'The Facebook SDK failed to load');
      const key = `${appId}|${graphVersion}`;
      if (initialisedFor !== key) {
        window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
        initialisedFor = key;
        loginStatusLoading = null;
      }
      // The SDK can otherwise fetch login status during FB.login and lose the original
      // browser click before opening its window. Do this while the dialog is preparing. It is
      // only a head start: browsers that block third-party cookies may never answer it, so
      // after a wait sign-in goes ahead without it rather than failing.
      loginStatusLoading ??= new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 10000);
        window.FB!.getLoginStatus(() => {
          clearTimeout(timer);
          resolve();
        });
      });
      await loginStatusLoading;
    })
    .catch((error: unknown) => {
      scriptLoading = null;
      loginStatusLoading = null;
      throw error;
    });
}

/** What the popup reports once the business has picked (or created) its WABA and number. */
export interface EmbeddedSignupFinish {
  wabaId: string;
  phoneNumberId: string;
  businessId: string | null;
}

export type EmbeddedSignupEvent =
  | { kind: 'finish'; data: EmbeddedSignupFinish }
  | { kind: 'cancel'; step: string | null }
  | { kind: 'error'; message: string | null };

/**
 * Reads one WA_EMBEDDED_SIGNUP postMessage from a facebook.com window; anything else is
 * ignored (null). sessionInfoVersion 3 shape.
 */
export function parseEmbeddedSignupMessage(event: MessageEvent): EmbeddedSignupEvent | null {
  let host: string;
  try {
    host = new URL(event.origin).hostname;
  } catch {
    return null;
  }
  if (host !== 'facebook.com' && !host.endsWith('.facebook.com')) return null;

  let payload: { type?: string; event?: string; data?: Record<string, unknown> };
  try {
    payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
  } catch {
    return null;
  }
  if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return null;

  const data = payload.data ?? {};
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const ev = payload.event ?? '';
  if (ev.startsWith('FINISH')) {
    const wabaId = text(data['waba_id']);
    const phoneNumberId = text(data['phone_number_id']);
    if (!wabaId || !phoneNumberId) {
      return { kind: 'error', message: 'Meta finished without naming a phone number.' };
    }
    return {
      kind: 'finish',
      data: { wabaId, phoneNumberId, businessId: text(data['business_id']) },
    };
  }
  if (ev === 'CANCEL') return { kind: 'cancel', step: text(data['current_step']) };
  if (ev === 'ERROR') return { kind: 'error', message: text(data['error_message']) };
  return null;
}

/**
 * Opens the Embedded Signup popup. Call it straight from a click handler (the SDK must already
 * be loaded) or the browser blocks the window. Resolves with the OAuth code (null when the popup
 * closed without one) and Meta's login status. A quick response alone does not prove that
 * the browser blocked a popup: cancellation and Meta configuration failures can also be immediate.
 */
export function openEmbeddedSignup(
  configId: string,
): Promise<{ code: string | null; status: string | null }> {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve({ code: null, status: 'sdk_missing' });
      return;
    }
    window.FB.login(
      (response) =>
        resolve({
          code: response?.authResponse?.code ?? null,
          status: response?.status ?? null,
        }),
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      },
    );
  });
}
