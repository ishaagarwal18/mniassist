/**
 * "Sign in with Google / Microsoft" (M01-7). The browser goes to the provider with a fresh
 * state and nonce, comes back to /login/external with an ID token in the fragment, and
 * trades it at the auth server's `external_login` grant for AutoReach's own tokens — or,
 * from Settings, links it to the signed-in account.
 */
import type { ExternalLoginProviderDto } from '../../proxy/identity/external-login.service';

export const EXTERNAL_LOGIN_GRANT = 'external_login';
export const EXTERNAL_LOGIN_CALLBACK = '/login/external';
const STORAGE_KEY = 'ar.externalLogin';

/** What the round trip to the provider must remember; kept in this tab's session storage. */
export interface ExternalLoginState {
  provider: string;
  state: string;
  nonce: string;
  /** Sign in, or link to the account already signed in. */
  mode: 'signin' | 'link';
  rememberMe: boolean;
  /** The workspace typed on the sign-in screen; blank for the host. */
  workspace: string;
  startedAt: number;
}

/** The round trip must finish within this long, so an old tab cannot replay a stale start. */
export const EXTERNAL_LOGIN_MAX_AGE_MS = 10 * 60 * 1000;

export function randomToken(bytes = 24): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The provider's sign-in page: an ID token straight back (no secret to keep in a browser). */
export function authorizeUrl(
  provider: ExternalLoginProviderDto,
  redirectUri: string,
  s: Pick<ExternalLoginState, 'state' | 'nonce'>,
): string {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    response_type: 'id_token',
    response_mode: 'fragment',
    scope: 'openid email profile',
    redirect_uri: redirectUri,
    state: s.state,
    nonce: s.nonce,
    prompt: 'select_account',
  });
  return `${provider.authorizeEndpoint}?${params.toString()}`;
}

export type CallbackResult =
  { ok: true; idToken: string; start: ExternalLoginState } | { ok: false; reason: string };

/**
 * Reads the provider's answer from the URL fragment and checks it belongs to the start this
 * tab made. The nonce inside the token is the server's to check; the state is ours.
 */
export function readCallback(
  hash: string,
  start: ExternalLoginState | null,
  now = Date.now(),
): CallbackResult {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const error = params.get('error');
  if (error) {
    return {
      ok: false,
      reason:
        error === 'access_denied'
          ? 'Sign-in was cancelled.'
          : params.get('error_description') || 'The provider refused the sign-in.',
    };
  }
  if (!start || params.get('state') !== start.state) {
    return { ok: false, reason: 'This sign-in was not started here. Start again.' };
  }
  if (now - start.startedAt > EXTERNAL_LOGIN_MAX_AGE_MS) {
    return { ok: false, reason: 'The sign-in took too long. Start again.' };
  }
  const idToken = params.get('id_token');
  if (!idToken) return { ok: false, reason: 'The provider did not send a sign-in.' };
  return { ok: true, idToken, start };
}

export function saveStart(start: ExternalLoginState): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(start));
}

/** The start, removed as it is read: a callback is good once. */
export function takeStart(): ExternalLoginState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExternalLoginState) : null;
  } catch {
    return null;
  }
}

/** Sends the browser to the provider. */
export function beginExternalLogin(
  provider: ExternalLoginProviderDto,
  options: Pick<ExternalLoginState, 'mode' | 'rememberMe' | 'workspace'>,
): void {
  const start: ExternalLoginState = {
    provider: provider.name,
    state: randomToken(),
    nonce: randomToken(),
    startedAt: Date.now(),
    ...options,
  };
  saveStart(start);
  window.location.assign(
    authorizeUrl(provider, `${window.location.origin}${EXTERNAL_LOGIN_CALLBACK}`, start),
  );
}
