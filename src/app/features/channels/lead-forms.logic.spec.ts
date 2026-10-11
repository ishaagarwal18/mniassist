import { LeadAdImportStatus } from '../../proxy/lead-ads/lead-ads.service';
import { platformLabel, readCallback, statusLabel, statusTone } from './lead-forms.logic';

describe('lead forms logic', () => {
  it('accepts Facebook’s answer to the sign-in this tab started', () => {
    expect(readCallback({ code: 'abc', state: 's1' }, 's1')).toEqual({ ok: true, code: 'abc' });
  });

  it('refuses another tab’s sign-in, a cancelled one, or one with no code', () => {
    expect(readCallback({ code: 'abc', state: 'other' }, 's1')).toMatchObject({ ok: false });
    expect(readCallback({ code: 'abc', state: 's1' }, null)).toMatchObject({ ok: false });
    expect(
      readCallback({ error: 'access_denied', error_reason: 'user_denied', state: 's1' }, 's1'),
    ).toEqual({ ok: false, reason: 'Facebook sign-in was cancelled. Nothing was connected.' });
    expect(readCallback({ state: 's1' }, 's1')).toMatchObject({ ok: false });
  });

  it('words each lead’s state and platform', () => {
    expect(statusLabel(LeadAdImportStatus.Imported)).toBe('Imported');
    expect(statusTone(LeadAdImportStatus.Failed)).toBe('bad');
    expect(platformLabel('ig')).toBe('Instagram');
    expect(platformLabel(null)).toBe('—');
  });
});
