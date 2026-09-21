import { RecurrenceFrequency } from '../../proxy/activities';
import { NO_REPEAT, RecurrenceDraft, recurrenceLabel, recurrenceProblem, toDraft, toRecurrence } from './recurrence';

const draft = (over: Partial<RecurrenceDraft>): RecurrenceDraft => ({ ...NO_REPEAT, frequency: RecurrenceFrequency.Weekly, ...over });

describe('the rule sent to the server', () => {
  it('is nothing when it does not repeat', () => {
    expect(toRecurrence(NO_REPEAT)).toBeNull();
  });

  it('carries the interval, the weekdays for a weekly repeat and a count', () => {
    expect(toRecurrence(draft({ interval: 2, weekdays: [1, 4], ends: 'count', count: 6 }))).toEqual({
      frequency: RecurrenceFrequency.Weekly,
      interval: 2,
      weekdays: [1, 4],
      untilUtc: null,
      count: 6,
    });
  });

  it('drops weekdays that only mean something for a weekly repeat', () => {
    expect(toRecurrence(draft({ frequency: RecurrenceFrequency.Monthly, weekdays: [1] }))!.weekdays).toEqual([]);
  });

  it('keeps the numbers inside what the server accepts', () => {
    const r = toRecurrence(draft({ interval: 0, count: 9999 }))!;
    expect(r.interval).toBe(1);
    expect(r.count).toBe(260);
  });

  it('ends on a date at the close of that local day, so an evening meeting on the last day is in', () => {
    const r = toRecurrence(draft({ ends: 'until', until: '2026-12-31' }))!;
    const end = new Date(r.untilUtc!);
    expect([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours()]).toEqual([2026, 11, 31, 23]);
    expect(r.count).toBeNull();
  });

  it('may go on for ever when it says never', () => {
    const r = toRecurrence(draft({ ends: 'never' }))!;
    expect(r.count).toBeNull();
    expect(r.untilUtc).toBeNull();
  });
});

describe('showing a saved rule again', () => {
  it('round-trips a count and a date', () => {
    const counted = toDraft(toRecurrence(draft({ interval: 3, ends: 'count', count: 8, weekdays: [2] })));
    expect(counted).toMatchObject({ interval: 3, ends: 'count', count: 8, weekdays: [2] });

    const dated = toDraft(toRecurrence(draft({ ends: 'until', until: '2027-01-15' })));
    expect(dated).toMatchObject({ ends: 'until', until: '2027-01-15' });
  });

  it('reads no rule as does not repeat, and a rule with no end as never', () => {
    expect(toDraft(null).frequency).toBe(RecurrenceFrequency.None);
    expect(toDraft({ frequency: RecurrenceFrequency.Daily }).ends).toBe('never');
  });
});

describe('describing a rule', () => {
  it('says it in words', () => {
    expect(recurrenceLabel(null)).toBe('Does not repeat');
    expect(recurrenceLabel({ frequency: RecurrenceFrequency.Daily })).toBe('Every day');
    expect(recurrenceLabel({ frequency: RecurrenceFrequency.Monthly, interval: 2 })).toBe('Every 2 months');
    expect(recurrenceLabel({ frequency: RecurrenceFrequency.Weekly, weekdays: [4, 1], count: 6 })).toBe('Every week on Mon, Thu, 6 times');
    expect(recurrenceLabel({ frequency: RecurrenceFrequency.Weekly, count: 1 })).toBe('Every week, 1 time');
  });

  it('gives the last date when there is one', () => {
    expect(recurrenceLabel({ frequency: RecurrenceFrequency.Daily, untilUtc: new Date(2026, 11, 31, 12).toISOString() })).toContain('until 31 Dec 2026');
  });
});

describe('what is wrong with the choices', () => {
  it('needs an end for a meeting series but not for a task', () => {
    const forever = draft({ ends: 'never' });
    expect(recurrenceProblem(forever, true)).toMatch(/when the series ends/);
    expect(recurrenceProblem(forever, false)).toBeNull();
  });

  it('needs a date when ending on one, and says nothing about a task that does not repeat', () => {
    expect(recurrenceProblem(draft({ ends: 'until', until: '' }), false)).toMatch(/last date/);
    expect(recurrenceProblem(NO_REPEAT, true)).toBeNull();
  });
});
