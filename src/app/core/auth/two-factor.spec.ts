import { isTwoFactorChallenge, secondFactorParameters } from './two-factor';

describe('the two-factor challenge', () => {
  it('is recognised from the token endpoint’s error', () => {
    expect(
      isTwoFactorChallenge({
        error: { error: 'invalid_grant', error_description: 'RequiresTwoFactor' },
      }),
    ).toBe(true);
  });

  it('is not a wrong password or anything else', () => {
    expect(
      isTwoFactorChallenge({
        error: { error: 'invalid_grant', error_description: 'Invalid username or password!' },
      }),
    ).toBe(false);
    expect(isTwoFactorChallenge(new Error('network'))).toBe(false);
    expect(isTwoFactorChallenge(null)).toBe(false);
  });
});

describe('the second attempt', () => {
  it('sends an authenticator code without the spaces people type', () => {
    expect(secondFactorParameters({ code: '123 456' })).toEqual({
      TwoFactorProvider: 'Authenticator',
      TwoFactorCode: '123456',
    });
  });

  it('sends a recovery code as typed, trimmed', () => {
    expect(secondFactorParameters({ recoveryCode: ' ab12c-3de45 ' })).toEqual({
      RecoveryCode: 'ab12c-3de45',
    });
  });
});
