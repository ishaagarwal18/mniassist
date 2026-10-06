import { browserSummary, securityActionLabel, securityActionTone } from './security-log.util';

describe('sign-in history wording', () => {
  it('names the actions people look for', () => {
    expect(securityActionLabel('LoginSucceeded')).toBe('Signed in');
    expect(securityActionLabel('LoginLockedout')).toBe('Locked out');
    expect(securityActionTone('LoginLockedout')).toBe('bad');
    expect(securityActionTone('LoginInvalidUserNameOrPassword')).toBe('amber');
  });

  it('spells out an action it has no words for, rather than hiding it', () => {
    expect(securityActionLabel('ChangeEmail')).toBe('Change email');
    expect(securityActionTone('ChangeEmail')).toBe('neutral');
    expect(securityActionLabel(null)).toBe('—');
  });

  it('describes the browser in a few words', () => {
    expect(
      browserSummary(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36',
      ),
    ).toBe('Chrome · Windows');
    expect(
      browserSummary('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Version/17.5 Safari/604.1'),
    ).toBe('Safari · iOS');
    expect(browserSummary(undefined)).toBe('—');
  });
});
