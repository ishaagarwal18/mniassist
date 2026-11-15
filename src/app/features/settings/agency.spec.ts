import { visitState } from './agency';

describe('visitState', () => {
  const now = new Date('2026-11-15T10:00:00Z');

  it('reports a session the agency ended', () => {
    expect(
      visitState({ endedAtUtc: '2026-11-15T09:30:00Z', expiresAtUtc: '2026-11-15T11:00:00Z' }, now),
    ).toBe('ended');
  });

  it('tells a session still open from one that ran out', () => {
    expect(visitState({ expiresAtUtc: '2026-11-15T11:00:00Z' }, now)).toBe('open');
    expect(visitState({ expiresAtUtc: '2026-11-15T09:00:00Z' }, now)).toBe('expired');
  });
});
