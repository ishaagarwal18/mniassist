import { futureUtc } from './follow-up-reminders';

describe('futureUtc', () => {
  const now = new Date(2026, 10, 15, 10, 0);

  it('turns a future local time into UTC', () => {
    expect(futureUtc('2026-11-16T09:30', now)).toBe(new Date(2026, 10, 16, 9, 30).toISOString());
  });

  it('refuses a time that is not in the future', () => {
    expect(futureUtc('2026-11-15T10:00', now)).toBeNull();
    expect(futureUtc('2026-11-14T09:00', now)).toBeNull();
  });

  it('refuses empty or broken input', () => {
    expect(futureUtc('', now)).toBeNull();
    expect(futureUtc('not a date', now)).toBeNull();
  });
});
