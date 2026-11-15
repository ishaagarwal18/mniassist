import { teamRole } from './my-teams-card';

describe('my teams card', () => {
  it('marks the teams the signed-in person leads', () => {
    expect(teamRole({ leadUserId: 'u1' }, 'u1')).toBe('Lead');
    expect(teamRole({ leadUserId: 'u2' }, 'u1')).toBeNull();
    expect(teamRole({ leadUserId: 'u1' }, null)).toBeNull();
  });
});
