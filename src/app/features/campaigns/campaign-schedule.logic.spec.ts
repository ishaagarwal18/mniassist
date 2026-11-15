import { RecurrenceKind } from '../../proxy/campaigns/recurrence-kind.enum';
import { defaultScheduleDraft, scheduleProblem, toScheduleInput } from './campaign-schedule.logic';

describe('campaign schedule', () => {
  const now = new Date('2026-11-15T10:00:00');

  it('starts tomorrow at 10:00 with quiet hours and no Sunday sends', () => {
    const d = defaultScheduleDraft(now);
    expect(d.date).toBe('2026-11-16');
    expect(d.time).toBe('10:00');
    expect(scheduleProblem(d, now)).toBeNull();
    const input = toScheduleInput(d);
    expect(input.schedule?.recurrence).toBe(RecurrenceKind.Once);
    expect(input.schedule?.blackoutDays).toEqual([0]);
    expect(input.schedule?.localSendTime).toBe('10:00:00');
  });

  it('refuses a time in the past and a weekly repeat with no day', () => {
    const d = defaultScheduleDraft(now);
    expect(scheduleProblem({ ...d, date: '2026-11-14' }, now)).toMatch(/future/);
    expect(
      scheduleProblem({ ...d, recurrence: RecurrenceKind.Weekly, daysOfWeek: [] }, now),
    ).toMatch(/day of the week/);
    expect(
      scheduleProblem({ ...d, recurrence: RecurrenceKind.Monthly, dayOfMonth: '31' }, now),
    ).toMatch(/1 to 28/);
  });

  it('sends repeat details only for the chosen repeat', () => {
    const d = { ...defaultScheduleDraft(now), recurrence: RecurrenceKind.Monthly, dayOfMonth: '5' };
    const s = toScheduleInput(d).schedule!;
    expect(s.dayOfMonth).toBe(5);
    expect(s.daysOfWeek).toEqual([]);
  });
});
