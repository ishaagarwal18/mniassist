import { versionState } from '../compliance/consent-texts';
import { toggleId } from '../inbox/conversation-label-picker';
import { labelProblem } from './conversation-labels';

describe('labelProblem', () => {
  const existing = [{ id: 'a', name: 'Hot lead' }];

  it('needs a name of at most 32 characters', () => {
    expect(labelProblem(' ', existing, null)).toMatch(/name/);
    expect(labelProblem('x'.repeat(33), existing, null)).toMatch(/32/);
  });

  it('refuses a name already used, ignoring case', () => {
    expect(labelProblem('hot LEAD', existing, null)).toMatch(/already/);
  });

  it('lets a label keep its own name while being edited', () => {
    expect(labelProblem('Hot lead', existing, 'a')).toBeNull();
  });
});

describe('toggleId', () => {
  it('adds a missing id and removes a present one', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('versionState', () => {
  it('tells drafts, current and retired versions apart', () => {
    expect(versionState({ isPublished: false })).toBe('draft');
    expect(versionState({ isPublished: true })).toBe('current');
    expect(versionState({ isPublished: true, retiredAtUtc: '2026-11-01T00:00:00Z' })).toBe(
      'retired',
    );
  });
});
