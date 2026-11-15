import { snoozeUntil } from './snooze.logic';

describe('snoozeUntil', () => {
  // Wednesday 12 Nov 2025, 15:30 local time.
  const now = new Date(2025, 10, 12, 15, 30);

  it('adds hours', () => {
    expect(snoozeUntil('1h', now).getTime() - now.getTime()).toBe(3_600_000);
  });

  it('is 9:00 the next day for tomorrow', () => {
    const d = snoozeUntil('tomorrow', now);
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([13, 9, 0]);
  });

  it('is the coming Monday at 9:00', () => {
    const d = snoozeUntil('monday', now);
    expect([d.getDay(), d.getDate(), d.getHours()]).toEqual([1, 17, 9]);
  });

  it('is next week when today is Monday', () => {
    const d = snoozeUntil('monday', new Date(2025, 10, 17, 8, 0));
    expect(d.getDate()).toBe(24);
  });
});
