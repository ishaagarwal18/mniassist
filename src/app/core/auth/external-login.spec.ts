import {
  EXTERNAL_LOGIN_MAX_AGE_MS,
  type ExternalLoginState,
  authorizeUrl,
  readCallback,
} from './external-login';

const start: ExternalLoginState = {
  provider: 'Google',
  state: 'st-1',
  nonce: 'n-1',
  mode: 'signin',
  rememberMe: true,
  workspace: 'vertex',
  startedAt: 1_000,
};

describe('external login', () => {
  it('asks the provider for an ID token bound to this start', () => {
    const url = new URL(
      authorizeUrl(
        {
          name: 'Google',
          clientId: 'cid',
          authorizeEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        },
        'https://mniassist.com/login/external',
        start,
      ),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('response_type')).toBe('id_token');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('state')).toBe('st-1');
    expect(url.searchParams.get('nonce')).toBe('n-1');
    expect(url.searchParams.get('redirect_uri')).toBe('https://mniassist.com/login/external');
  });

  it('accepts the answer to its own start', () => {
    const r = readCallback('#id_token=abc.def.ghi&state=st-1', start, 2_000);
    expect(r).toMatchObject({ ok: true, idToken: 'abc.def.ghi' });
  });

  it('refuses an answer to someone else’s start, a stale one, or a cancelled one', () => {
    expect(readCallback('#id_token=x&state=other', start, 2_000)).toMatchObject({ ok: false });
    expect(readCallback('#id_token=x&state=st-1', null, 2_000)).toMatchObject({ ok: false });
    expect(
      readCallback('#id_token=x&state=st-1', start, 1_000 + EXTERNAL_LOGIN_MAX_AGE_MS + 1),
    ).toMatchObject({ ok: false, reason: 'The sign-in took too long. Start again.' });
    expect(readCallback('#error=access_denied&state=st-1', start, 2_000)).toMatchObject({
      ok: false,
      reason: 'Sign-in was cancelled.',
    });
    expect(readCallback('#state=st-1', start, 2_000)).toMatchObject({ ok: false });
  });
});
