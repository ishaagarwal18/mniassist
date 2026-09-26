import { describe, expect, it } from 'vitest';

import { RecurrenceFrequency } from '../../proxy/activities';
import {
  buildIcs,
  clashes,
  freeSlots,
  nextDue,
  occurrencesOf,
  seriesStarts,
} from './activity-mock-logic';

const IST = 330;
// Monday 1 March 2027, 10:00 in India = 04:30 UTC.
const MON_10 = '2027-03-01T04:30:00.000Z';
const span = (start: string, mins: number) => ({
  startUtc: start,
  endUtc: new Date(Date.parse(start) + mins * 60000).toISOString(),
});

describe('clashes', () => {
  it('overlap clashes, touching does not, a buffer makes touching clash', () => {
    const a = span(MON_10, 60);
    expect(clashes(a, span('2027-03-01T05:00:00.000Z', 60))).toBe(true);
    expect(clashes(a, span('2027-03-01T05:30:00.000Z', 60))).toBe(false);
    expect(clashes(a, span('2027-03-01T05:30:00.000Z', 60), 15)).toBe(true);
  });
});

describe('freeSlots', () => {
  const q = {
    fromUtc: '2027-03-01T00:00:00.000Z',
    toUtc: '2027-03-02T00:00:00.000Z',
    durationMinutes: 60,
    workStartMinute: 9 * 60,
    workEndMinute: 18 * 60,
    utcOffsetMinutes: IST,
    includeWeekends: false,
    bufferMinutes: 0,
    max: 100,
  };

  it('offers half-hour starts inside working hours only', () => {
    const slots = freeSlots([], q);
    expect(slots[0].startUtc).toBe('2027-03-01T03:30:00.000Z'); // 09:00 IST
    expect(slots.at(-1)!.endUtc).toBe('2027-03-01T12:30:00.000Z'); // 18:00 IST
    expect(slots).toHaveLength(17);
  });

  it('skips a booked hour', () => {
    const slots = freeSlots([span(MON_10, 60)], q).map((s) => s.startUtc);
    expect(slots).not.toContain(MON_10);
    expect(slots).not.toContain('2027-03-01T04:00:00.000Z');
    expect(slots).toContain('2027-03-01T05:30:00.000Z');
  });

  it('leaves out weekends unless asked, and stops at max', () => {
    const weekend = {
      ...q,
      fromUtc: '2027-03-06T00:00:00.000Z',
      toUtc: '2027-03-07T18:00:00.000Z',
    };
    expect(freeSlots([], weekend)).toHaveLength(0);
    expect(freeSlots([], { ...weekend, includeWeekends: true, max: 3 })).toHaveLength(3);
  });
});

describe('occurrencesOf', () => {
  it('daily keeps the local time', () => {
    const list = seriesStarts(MON_10, { frequency: RecurrenceFrequency.Daily, count: 3 }, IST);
    expect(list).toEqual([MON_10, '2027-03-02T04:30:00.000Z', '2027-03-03T04:30:00.000Z']);
  });

  it('weekly on chosen days goes in week order and starts no earlier than the first date', () => {
    const list = seriesStarts(
      MON_10,
      { frequency: RecurrenceFrequency.Weekly, weekdays: [4, 1], count: 4 },
      IST,
    );
    expect(
      list.map((d) => new Date(Date.parse(d) + IST * 60000).toISOString().slice(0, 10)),
    ).toEqual(['2027-03-01', '2027-03-04', '2027-03-08', '2027-03-11']);
  });

  it('every two weeks skips a week', () => {
    const list = seriesStarts(
      MON_10,
      { frequency: RecurrenceFrequency.Weekly, interval: 2, count: 2 },
      IST,
    );
    expect(list[1]).toBe('2027-03-15T04:30:00.000Z');
  });

  it('monthly on the 31st clamps to a short month and comes back', () => {
    const jan31 = '2027-01-31T04:30:00.000Z';
    const list = seriesStarts(jan31, { frequency: RecurrenceFrequency.Monthly, count: 3 }, IST).map(
      (d) => d.slice(0, 10),
    );
    expect(list).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
  });

  it('stops at the until date and at the cap', () => {
    const until = seriesStarts(
      MON_10,
      { frequency: RecurrenceFrequency.Daily, untilUtc: '2027-03-03T23:59:00.000Z' },
      IST,
    );
    expect(until).toHaveLength(3);
    expect(
      seriesStarts(MON_10, { frequency: RecurrenceFrequency.Daily, count: 200 }, IST, 52),
    ).toHaveLength(52);
    expect([...occurrencesOf(MON_10, { frequency: RecurrenceFrequency.None }, IST)]).toEqual([]);
  });
});

describe('nextDue', () => {
  it('is a week on for a weekly task ticked on time', () => {
    expect(
      nextDue(
        MON_10,
        { frequency: RecurrenceFrequency.Weekly },
        IST,
        new Date('2027-03-01T03:00:00Z'),
      ),
    ).toBe('2027-03-08T04:30:00.000Z');
  });

  it('skips ahead of now when ticked late', () => {
    const next = nextDue(
      MON_10,
      { frequency: RecurrenceFrequency.Daily },
      IST,
      new Date('2027-03-10T12:00:00Z'),
    )!;
    expect(next).toBe('2027-03-11T04:30:00.000Z');
  });

  it('is null once the rule has ended', () => {
    expect(
      nextDue(
        MON_10,
        { frequency: RecurrenceFrequency.Daily, untilUtc: MON_10 },
        IST,
        new Date('2027-03-01T00:00:00Z'),
      ),
    ).toBeNull();
  });
});

describe('buildIcs', () => {
  const m = {
    id: 'abc',
    title: 'Site visit, phase 2',
    startUtc: MON_10,
    endUtc: '2027-03-01T05:30:00.000Z',
    location: 'Plot 4',
    attendees: [{ name: 'Asha', email: 'asha@x.in' }, { name: 'No mail' }],
  };

  it('writes a valid single event with escaped text and only attendees who have email', () => {
    const ics = buildIcs(m, new Date('2027-01-01T00:00:00Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20270301T043000Z');
    expect(ics).toContain('SUMMARY:Site visit\\, phase 2');
    expect(ics).toContain('ATTENDEE;CN=Asha:mailto:asha@x.in');
    expect(ics).not.toContain('No mail');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('folds long lines at 75 characters', () => {
    const ics = buildIcs({ ...m, title: 'x'.repeat(200) });
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75);
  });
});
