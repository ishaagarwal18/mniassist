import { AttendeeResponse, CrmTaskStatus, MeetingConflictDto } from '../../proxy/activities';
import {
  addDays,
  conflictLine,
  dayKey,
  defaultMeetingStart,
  dueBucket,
  dueLabel,
  durationLabel,
  errorMessage,
  fromLocalInput,
  groupByDay,
  groupTasks,
  isConflictError,
  minutesBetween,
  sameDay,
  startOfWeek,
  toLocalInput,
  uniqueConflicts,
  weekOf,
  pastTimeProblem,
} from './activity-logic';

// Built from local parts, so the tests mean the same thing in any time zone.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const iso = (d: Date) => d.toISOString();

describe('the week', () => {
  it('starts on Monday whatever day it is asked from, at local midnight', () => {
    const monday = at(2026, 9, 21);
    for (let i = 0; i < 7; i++) {
      const s = startOfWeek(addDays(monday, i));
      expect(dayKey(s)).toBe('2026-09-21');
      expect(s.getHours()).toBe(0);
    }
    expect(dayKey(startOfWeek(at(2026, 9, 27, 23, 59)))).toBe('2026-09-21'); // Sunday belongs to the week before it
    expect(dayKey(startOfWeek(at(2026, 9, 28)))).toBe('2026-09-28');
  });

  it('is seven days, Monday first, over a half-open range', () => {
    const w = weekOf(at(2026, 9, 24, 15, 0));
    expect(w.days.map(dayKey)).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
    expect(dayKey(w.to)).toBe('2026-09-28');
  });

  it('adds days across a month end', () => {
    expect(dayKey(addDays(at(2026, 9, 30), 2))).toBe('2026-10-02');
    expect(sameDay(at(2026, 9, 21, 1), at(2026, 9, 21, 23))).toBe(true);
    expect(sameDay(at(2026, 9, 21, 23, 59), at(2026, 9, 22, 0, 1))).toBe(false);
  });

  it('groups meetings under the day they start, keeps empty days, and orders each day by time', () => {
    const days = weekOf(at(2026, 9, 21)).days;
    const items = [
      { id: 'late', start: iso(at(2026, 9, 22, 16)) },
      { id: 'early', start: iso(at(2026, 9, 22, 9)) },
      { id: 'thu', start: iso(at(2026, 9, 24, 11)) },
      { id: 'next-week', start: iso(at(2026, 9, 29, 11)) },
    ];

    const grouped = groupByDay(items, (i) => i.start, days);

    expect(grouped).toHaveLength(7);
    expect(grouped[1].items.map((i) => i.id)).toEqual(['early', 'late']);
    expect(grouped[3].items.map((i) => i.id)).toEqual(['thu']);
    expect(grouped[0].items).toEqual([]);
    expect(grouped.flatMap((g) => g.items.map((i) => i.id))).not.toContain('next-week');
  });
});

describe('date inputs', () => {
  it('round-trips a local date and time through the UTC instant', () => {
    const local = '2026-09-21T10:30';
    const instant = fromLocalInput(local)!;
    expect(new Date(instant).getHours()).toBe(10);
    expect(toLocalInput(instant)).toBe(local);
  });

  it('reads nothing and rubbish as empty', () => {
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('not a date')).toBeNull();
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput('nonsense')).toBe('');
  });

  it('starts a new meeting on the next half hour, at least a quarter of an hour away', () => {
    expect(toLocalInput(iso(defaultMeetingStart(at(2026, 9, 21, 10, 0))))).toBe('2026-09-21T10:30');
    expect(toLocalInput(iso(defaultMeetingStart(at(2026, 9, 21, 10, 14))))).toBe(
      '2026-09-21T10:30',
    );
    expect(toLocalInput(iso(defaultMeetingStart(at(2026, 9, 21, 10, 16))))).toBe(
      '2026-09-21T11:00',
    );
    expect(toLocalInput(iso(defaultMeetingStart(at(2026, 9, 21, 23, 50))))).toBe(
      '2026-09-22T00:30',
    );
  });
});

describe('tasks by when they are due', () => {
  const now = at(2026, 9, 21, 10, 30);
  const open = (d: Date | null) => ({ status: CrmTaskStatus.Open, dueAtUtc: d ? iso(d) : null });

  it('puts an open task in the bucket the server would count it in', () => {
    expect(dueBucket(open(null), now)).toBe('nodate');
    expect(dueBucket(open(at(2026, 9, 21, 10, 29)), now)).toBe('overdue');
    expect(dueBucket(open(at(2026, 9, 21, 17, 0)), now)).toBe('today');
    expect(dueBucket(open(at(2026, 9, 22, 0, 30)), now)).toBe('week');
    expect(dueBucket(open(at(2026, 9, 28, 9, 0)), now)).toBe('week');
    expect(dueBucket(open(at(2026, 9, 30, 9, 0)), now)).toBe('later');
  });

  it('files a finished or cancelled task under done, whatever its date', () => {
    expect(dueBucket({ status: CrmTaskStatus.Done, dueAtUtc: iso(at(2026, 1, 1)) }, now)).toBe(
      'done',
    );
    expect(dueBucket({ status: CrmTaskStatus.Cancelled, dueAtUtc: null }, now)).toBe('done');
  });

  it('groups in order and leaves out the buckets with nothing in them', () => {
    const tasks = [
      { id: 'later', ...open(at(2026, 10, 30)) },
      { id: 'late', ...open(at(2026, 9, 1)) },
      { id: 'none', ...open(null) },
      { id: 'done', status: CrmTaskStatus.Done, dueAtUtc: null },
    ];

    const groups = groupTasks(tasks, now);

    expect(groups.map((g) => g.bucket)).toEqual(['overdue', 'later', 'nodate', 'done']);
    expect(groups[0].label).toBe('Overdue');
    expect(groups[0].tasks.map((t) => t.id)).toEqual(['late']);
  });

  it('describes a due time the way a person would say it', () => {
    expect(dueLabel(null, now)).toBe('No due date');
    expect(dueLabel(iso(at(2026, 9, 21, 17, 0)), now)).toBe('Today 5:00 pm');
    expect(dueLabel(iso(at(2026, 9, 22, 9, 0)), now)).toBe('Tomorrow 9:00 am');
    expect(dueLabel(iso(at(2026, 9, 18, 9, 0)), now)).toBe('3 days overdue');
    expect(dueLabel(iso(at(2026, 9, 20, 9, 0)), now)).toBe('1 day overdue');
    expect(dueLabel(iso(at(2026, 9, 21, 8, 0)), now)).toContain('Overdue since');
    expect(dueLabel(iso(at(2026, 9, 25, 9, 0)), now)).toMatch(/Fri/);
  });
});

describe('meeting wording', () => {
  it('says how long', () => {
    expect(durationLabel(30)).toBe('30 min');
    expect(durationLabel(60)).toBe('1 h');
    expect(durationLabel(90)).toBe('1 h 30 min');
    expect(minutesBetween(iso(at(2026, 9, 21, 10)), iso(at(2026, 9, 21, 11, 15)))).toBe(75);
  });

  const conflict = (over: Partial<MeetingConflictDto> = {}): MeetingConflictDto => ({
    userId: 'u1',
    userName: 'Ravi K',
    meetingId: 'm1',
    title: 'Plant review',
    startUtc: iso(at(2026, 9, 21, 10)),
    endUtc: iso(at(2026, 9, 21, 11)),
    ...over,
  });

  it('describes who is booked, with what, when', () => {
    expect(conflictLine(conflict())).toBe('Ravi K is booked 10:00 am – 11:00 am (Plant review)');
    expect(conflictLine(conflict({ title: '' }))).toBe('Ravi K is booked 10:00 am – 11:00 am');
  });

  it('lists a booking once', () => {
    const list = uniqueConflicts([
      conflict(),
      conflict(),
      conflict({ userId: 'u2', userName: 'Meera' }),
    ]);
    expect(list.map((c) => c.userName)).toEqual(['Ravi K', 'Meera']);
  });
});

describe('errors from the server', () => {
  it('recognises a clash, which can be overridden, from its code', () => {
    expect(isConflictError({ error: { error: { code: 'AutoReach:MeetingConflict' } } })).toBe(true);
    expect(isConflictError({ error: { error: { code: 'AutoReach:MeetingTooLong' } } })).toBe(false);
    expect(isConflictError(new Error('x'))).toBe(false);
  });

  it('shows the servers sentence when there is one', () => {
    expect(
      errorMessage(
        { error: { error: { message: 'Ravi already has "Plant review" at that time.' } } },
        'x',
      ),
    ).toBe('Ravi already has "Plant review" at that time.');
    expect(errorMessage({}, 'Something went wrong.')).toBe('Something went wrong.');
  });

  it('has a word for each answer', async () => {
    const { RESPONSE_LABEL } = await import('./activity-logic');
    expect(RESPONSE_LABEL[AttendeeResponse.Accepted]).toBe('Accepted');
  });
});

describe('pastTimeProblem', () => {
  const now = new Date('2026-10-18T10:00:00');
  const local = (d: Date) => toLocalInput(d.toISOString());

  it('refuses a new time in the past', () => {
    expect(pastTimeProblem(local(new Date('2026-10-17T09:00:00')), null, 'The due date', now)).toBe(
      "The due date can't be in the past.",
    );
  });

  it('allows now, the future and an empty value', () => {
    expect(pastTimeProblem(local(now), null, 'The due date', now)).toBeNull();
    expect(pastTimeProblem(local(new Date('2026-10-19T09:00:00')), null, 'x', now)).toBeNull();
    expect(pastTimeProblem('', null, 'x', now)).toBeNull();
  });

  it('leaves an already-saved past time alone, so an overdue task can still be edited', () => {
    const saved = new Date('2026-10-01T09:00:00').toISOString();
    expect(pastTimeProblem(toLocalInput(saved), saved, 'The due date', now)).toBeNull();
    expect(
      pastTimeProblem(local(new Date('2026-10-02T09:00:00')), saved, 'The due date', now),
    ).toContain('past');
  });
});
