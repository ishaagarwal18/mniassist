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
}

declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}

let scriptLoading: Promise<void> | null = null;
let initialisedFor: string | null = null;

/** Loads the SDK once and initialises it for the app; safe to call again. */
export function loadFacebookSdk(appId: string, graphVersion: string): Promise<void> {
  scriptLoading ??= new Promise<void>((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = FACEBOOK_SDK;
    s.async = true;
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => {
      scriptLoading = null;
      reject(new Error('The Facebook SDK failed to load'));
    };
    document.head.appendChild(s);
  });
  return scriptLoading.then(() => {
    if (!window.FB) throw new Error('The Facebook SDK failed to load');
    const key = `${appId}|${graphVersion}`;
    if (initialisedFor !== key) {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
      initialisedFor = key;
    }
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
 * be loaded) or the browser blocks the window. Resolves with the OAuth code, or null when the
 * popup was closed without one.
 */
export function openEmbeddedSignup(configId: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve(null);
      return;
    }
    window.FB.login((response) => resolve(response.authResponse?.code ?? null), {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
    });
  });
}
