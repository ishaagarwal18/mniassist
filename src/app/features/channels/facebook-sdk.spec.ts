import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseEmbeddedSignupMessage } from './facebook-sdk';

const msg = (origin: string, data: unknown) => new MessageEvent('message', { origin, data });

describe('parseEmbeddedSignupMessage', () => {
  it('reads the WABA, number and business from a FINISH message', () => {
    const r = parseEmbeddedSignupMessage(
      msg(
        'https://www.facebook.com',
        JSON.stringify({
          type: 'WA_EMBEDDED_SIGNUP',
          event: 'FINISH',
          data: { phone_number_id: '111', waba_id: '222', business_id: '333' },
        }),
      ),
    );
    expect(r).toEqual({
      kind: 'finish',
      data: { phoneNumberId: '111', wabaId: '222', businessId: '333' },
    });
  });

  it('reports a cancel with the step it stopped at', () => {
    const r = parseEmbeddedSignupMessage(
      msg('https://web.facebook.com', {
        type: 'WA_EMBEDDED_SIGNUP',
        event: 'CANCEL',
        data: { current_step: 'PHONE_NUMBER_SETUP' },
      }),
    );
    expect(r).toEqual({ kind: 'cancel', step: 'PHONE_NUMBER_SETUP' });
  });

  it('treats a FINISH without a number as an error', () => {
    const r = parseEmbeddedSignupMessage(
      msg('https://www.facebook.com', { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: {} }),
    );
    expect(r?.kind).toBe('error');
  });

  it('ignores messages from other origins and other message types', () => {
    const body = JSON.stringify({
      type: 'WA_EMBEDDED_SIGNUP',
      event: 'FINISH',
      data: { phone_number_id: '1', waba_id: '2' },
    });
    expect(parseEmbeddedSignupMessage(msg('https://evil-facebook.com', body))).toBeNull();
    expect(parseEmbeddedSignupMessage(msg('https://facebook.com.evil.io', body))).toBeNull();
    expect(parseEmbeddedSignupMessage(msg('https://www.facebook.com', 'not json'))).toBeNull();
    expect(
      parseEmbeddedSignupMessage(msg('https://www.facebook.com', { type: 'OTHER' })),
    ).toBeNull();
  });
});

describe('Facebook sign-in readiness', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    delete window.FB;
    delete window.fbAsyncInit;
    document
      .querySelectorAll('script[src="https://connect.facebook.net/en_US/sdk.js"]')
      .forEach((s) => s.remove());
    vi.useRealTimers();
  });

  function sdk() {
    const fb: NonNullable<Window['FB']> = {
      init: vi.fn(),
      getLoginStatus: vi.fn((callback) => callback({ status: 'unknown' })),
      login: vi.fn(),
    };
    return fb;
  }

  it('prepares login status before reporting readiness and reuses the prepared SDK', async () => {
    const fb = sdk();
    let statusReady!: () => void;
    fb.getLoginStatus = vi.fn((callback) => (statusReady = () => callback({ status: 'unknown' })));
    window.FB = fb;
    const { loadFacebookSdk } = await import('./facebook-sdk');
    let ready = false;
    const loading = loadFacebookSdk('app', 'v25.0').then(() => (ready = true));
    await Promise.resolve();
    expect(ready).toBe(false);
    expect(fb.getLoginStatus).toHaveBeenCalledOnce();
    statusReady();
    await loading;
    await loadFacebookSdk('app', 'v25.0');
    expect(fb.init).toHaveBeenCalledOnce();
    expect(fb.getLoginStatus).toHaveBeenCalledOnce();
  });

  it('waits for the SDK ready callback rather than assuming a downloaded script is ready', async () => {
    const { loadFacebookSdk } = await import('./facebook-sdk');
    const loading = loadFacebookSdk('app', 'v25.0');
    const script = document.querySelector(
      'script[src="https://connect.facebook.net/en_US/sdk.js"]',
    )!;
    expect(script).not.toBeNull();
    window.FB = sdk();
    window.fbAsyncInit!();
    await loading;
    expect(window.FB.init).toHaveBeenCalledWith({
      appId: 'app',
      autoLogAppEvents: true,
      xfbml: false,
      version: 'v25.0',
    });
  });

  it('allows a fresh script load after a network failure', async () => {
    const { loadFacebookSdk } = await import('./facebook-sdk');
    const failed = loadFacebookSdk('app', 'v25.0');
    const firstScript = document.querySelector(
      'script[src="https://connect.facebook.net/en_US/sdk.js"]',
    )!;
    firstScript.dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow('could not load');
    const retry = loadFacebookSdk('app', 'v25.0');
    const retryScript = document.querySelector(
      'script[src="https://connect.facebook.net/en_US/sdk.js"]',
    );
    expect(retryScript).not.toBeNull();
    expect(retryScript).not.toBe(firstScript);
    window.FB = sdk();
    window.fbAsyncInit!();
    await retry;
  });

  it('bounds SDK loading so a failed network does not leave the dialog stuck', async () => {
    vi.useFakeTimers();
    const { loadFacebookSdk } = await import('./facebook-sdk');
    const failed = expect(loadFacebookSdk('app', 'v25.0')).rejects.toThrow('too long');
    await vi.advanceTimersByTimeAsync(15000);
    await failed;
    expect(
      document.querySelector('script[src="https://connect.facebook.net/en_US/sdk.js"]'),
    ).toBeNull();
  });

  it('goes ahead without login status when Facebook never answers it', async () => {
    vi.useFakeTimers();
    const fb = sdk();
    fb.getLoginStatus = vi.fn(); // never calls back, as when third-party cookies are blocked
    window.FB = fb;
    const { loadFacebookSdk } = await import('./facebook-sdk');
    const loading = loadFacebookSdk('app', 'v25.0');
    await vi.advanceTimersByTimeAsync(10000);
    await expect(loading).resolves.toBeUndefined();
  });

  it('marks a refused script as blocked', async () => {
    const { loadFacebookSdk, FacebookSdkError } = await import('./facebook-sdk');
    const failed = loadFacebookSdk('app', 'v25.0');
    document
      .querySelector('script[src="https://connect.facebook.net/en_US/sdk.js"]')!
      .dispatchEvent(new Event('error'));
    const error = await failed.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FacebookSdkError);
    expect((error as InstanceType<typeof FacebookSdkError>).reason).toBe('blocked');
  });

  it('launches Facebook synchronously with the Embedded Signup configuration', async () => {
    window.FB = sdk();
    vi.mocked(window.FB.login).mockImplementation((callback) =>
      callback({ authResponse: { code: 'one-time-code' }, status: 'connected' }),
    );
    const { openEmbeddedSignup } = await import('./facebook-sdk');
    const login = openEmbeddedSignup('configuration');
    expect(window.FB.login).toHaveBeenCalledWith(expect.any(Function), {
      config_id: 'configuration',
      response_type: 'code',
      override_default_response_type: true,
      extras: { sessionInfoVersion: '3' },
    });
    await expect(login).resolves.toEqual({ code: 'one-time-code', status: 'connected' });
  });

  it('does not interpret an immediate unknown response as proof of a blocked popup', async () => {
    window.FB = sdk();
    vi.mocked(window.FB.login).mockImplementation((callback) => callback({ status: 'unknown' }));
    const { openEmbeddedSignup } = await import('./facebook-sdk');
    await expect(openEmbeddedSignup('configuration')).resolves.toEqual({
      code: null,
      status: 'unknown',
    });
  });
});
