import {
  SSO_PROVIDER,
  authorizeUrl,
  readCallback,
  type ExternalLoginState,
} from './external-login';
import { looksLikeEmail } from '../../features/account/login';
import { workChipFor } from '../../features/inbox/conversation-work-status';
import { toConversation } from '../api/mapping';

describe('sign in with SSO', () => {
  const start: ExternalLoginState = {
    provider: SSO_PROVIDER,
    state: 's-1',
    nonce: 'n-1',
    mode: 'signin',
    rememberMe: true,
    workspace: 'acme',
    ssoEmail: 'asha@acme.example',
    startedAt: 1_000,
  };

  it('asks the IdP for an ID token for our client id, hinting the typed address', () => {
    const url = new URL(
      authorizeUrl(
        {
          name: SSO_PROVIDER,
          clientId: 'mni',
          authorizeEndpoint: 'https://idp.acme.example/authorize',
        },
        'https://app.example/login/external',
        start,
        'asha@acme.example',
      ),
    );
    expect(url.origin + url.pathname).toBe('https://idp.acme.example/authorize');
    expect(url.searchParams.get('client_id')).toBe('mni');
    expect(url.searchParams.get('response_type')).toBe('id_token');
    expect(url.searchParams.get('nonce')).toBe('n-1');
    expect(url.searchParams.get('login_hint')).toBe('asha@acme.example');
  });

  it('leaves out the hint for Google / Microsoft', () => {
    const url = new URL(
      authorizeUrl(
        { name: 'Google', clientId: 'g', authorizeEndpoint: 'https://accounts.google.com/auth' },
        'https://app.example/login/external',
        start,
      ),
    );
    expect(url.searchParams.has('login_hint')).toBe(false);
  });

  it('keeps the SSO email through the round trip', () => {
    const result = readCallback('#state=s-1&id_token=t', start, 2_000);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.start.ssoEmail).toBe('asha@acme.example');
  });

  it('only looks up SSO for email addresses', () => {
    expect(looksLikeEmail('asha@acme.example')).toBe(true);
    expect(looksLikeEmail('asha')).toBe(false);
    expect(looksLikeEmail('+91 98765 43210')).toBe(false);
    expect(looksLikeEmail('asha@acme')).toBe(false);
  });
});

describe('conversation status and priority', () => {
  it('maps the API numbers to names', () => {
    const c = toConversation({ id: 'c1', status: 1, priority: 3 } as never);
    expect(c.status).toBe('pending');
    expect(c.priority).toBe('urgent');
  });

  it('defaults an older API to open / normal', () => {
    const c = toConversation({ id: 'c1' } as never);
    expect(c.status).toBe('open');
    expect(c.priority).toBe('normal');
  });

  it('shows a list chip only when it is worth the space', () => {
    expect(workChipFor({ status: 'open', priority: 'normal' })).toBeNull();
    expect(workChipFor({ priority: 'urgent' })?.tone).toBe('bad');
    expect(workChipFor({ priority: 'high' })?.label).toBe('High priority');
    expect(workChipFor({ status: 'pending', priority: 'low' })?.label).toBe('Waiting on customer');
  });
});
