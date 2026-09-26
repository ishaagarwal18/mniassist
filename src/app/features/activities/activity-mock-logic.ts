import { RecurrenceDto, RecurrenceFrequency, SlotDto } from '../../proxy/activities';

/**
 * The scheduling rules the server applies, restated for sample-data mode, where there is no server. Pure, so they are tested on
 * their own. They mirror the server's rules (overlap with a buffer, working-hours slots, repeats counted in local time); where the
 * two could ever differ, the server is right and this is only what the demo shows.
 */

const MINUTE = 60_000;
const DAY = 86_400_000;

export interface Span {
  startUtc: string;
  endUtc: string;
}

/** Two bookings clash when they overlap, or come closer than the buffer. Touching end-to-start is not a clash without a buffer. */
export function clashes(a: Span, b: Span, bufferMinutes = 0): boolean {
  const gap = bufferMinutes * MINUTE;
  return (
    Date.parse(a.startUtc) < Date.parse(b.endUtc) + gap &&
    Date.parse(b.startUtc) < Date.parse(a.endUtc) + gap
  );
}

export interface SlotQuery {
  fromUtc: string;
  toUtc: string;
  durationMinutes: number;
  workStartMinute: number;
  workEndMinute: number;
  utcOffsetMinutes: number;
  includeWeekends: boolean;
  bufferMinutes: number;
  max: number;
}

/** Half-hour-aligned openings inside working hours that nobody in `busy` is booked over. Earliest first. */
export function freeSlots(busy: readonly Span[], q: SlotQuery): SlotDto[] {
  const out: SlotDto[] = [];
  const from = Date.parse(q.fromUtc);
  const to = Date.parse(q.toUtc);
  const step = 30 * MINUTE;
  const length = q.durationMinutes * MINUTE;
  const offset = q.utcOffsetMinutes * MINUTE;
  // Walk local days: shift into local time, take midnight in UTC fields, shift back.
  const firstDay = Math.floor((from + offset) / DAY) * DAY - offset;

  for (let day = firstDay; day < to && out.length < q.max; day += DAY) {
    const weekday = new Date(day + offset).getUTCDay();
    if (!q.includeWeekends && (weekday === 0 || weekday === 6)) continue;
    const open = day + q.workStartMinute * MINUTE;
    const close = day + q.workEndMinute * MINUTE;
    for (let s = open; s + length <= close && out.length < q.max; s += step) {
      if (s < from || s + length > to) continue;
      const span = {
        startUtc: new Date(s).toISOString(),
        endUtc: new Date(s + length).toISOString(),
      };
      if (busy.some((b) => clashes(span, b, q.bufferMinutes))) continue;
      out.push({ startUtc: span.startUtc, endUtc: span.endUtc });
    }
  }
  return out;
}

/**
 * The dates a rule produces from a first one, in order, computed in local time so a 10:00 meeting stays at 10:00. Monthly repeats
 * count from the first date, so the 31st clamps to a short month and comes back afterwards. Ends at `untilUtc` or when the caller stops.
 */
export function* occurrencesOf(
  startUtc: string,
  rule: RecurrenceDto,
  utcOffsetMinutes: number,
): Generator<string> {
  const offset = utcOffsetMinutes * MINUTE;
  const first = Date.parse(startUtc) + offset; // "local" wall-clock, read through UTC fields
  const until = rule.untilUtc ? Date.parse(rule.untilUtc) : Infinity;
  const interval = Math.max(1, rule.interval ?? 1);
  const emit = (local: number): string | null => {
    const utc = local - offset;
    return utc > until ? null : new Date(utc).toISOString();
  };
  const startOfLocalDay = Math.floor(first / DAY) * DAY;
  const timeOfDay = first - startOfLocalDay;

  if (rule.frequency === RecurrenceFrequency.Daily) {
    for (let i = 0; i < 5000; i++) {
      const v = emit(first + i * interval * DAY);
      if (v === null) return;
      yield v;
    }
  } else if (rule.frequency === RecurrenceFrequency.Weekly) {
    const days = rule.weekdays?.length ? [...rule.weekdays] : [new Date(first).getUTCDay()];
    const mondayIndex = (d: number) => (d + 6) % 7;
    days.sort((a, b) => mondayIndex(a) - mondayIndex(b));
    const monday = startOfLocalDay - mondayIndex(new Date(first).getUTCDay()) * DAY;
    for (let w = 0; w < 5000; w++) {
      for (const d of days) {
        const local = monday + w * interval * 7 * DAY + mondayIndex(d) * DAY + timeOfDay;
        if (local < first) continue;
        const v = emit(local);
        if (v === null) return;
        yield v;
      }
    }
  } else if (rule.frequency === RecurrenceFrequency.Monthly) {
    const anchor = new Date(first);
    for (let m = 0; m < 1200; m++) {
      const months = anchor.getUTCMonth() + m * interval;
      const year = anchor.getUTCFullYear() + Math.floor(months / 12);
      const month = ((months % 12) + 12) % 12;
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const local = Date.UTC(year, month, Math.min(anchor.getUTCDate(), lastDay)) + timeOfDay;
      const v = emit(local);
      if (v === null) return;
      yield v;
    }
  }
}

/** A series' dates, at most `max` and at most the rule's own count. */
export function seriesStarts(
  startUtc: string,
  rule: RecurrenceDto,
  utcOffsetMinutes: number,
  max = 52,
): string[] {
  const limit = Math.min(max, rule.count ?? max);
  const out: string[] = [];
  for (const d of occurrencesOf(startUtc, rule, utcOffsetMinutes)) {
    out.push(d);
    if (out.length >= limit) break;
  }
  return out;
}

/** The next date of a repeating task: the first one after both the date it was due and now, so a late tick never brings back an overdue copy. */
export function nextDue(
  dueUtc: string,
  rule: RecurrenceDto,
  utcOffsetMinutes: number,
  nowUtc: Date,
): string | null {
  const floor = Math.max(Date.parse(dueUtc), nowUtc.getTime());
  for (const d of occurrencesOf(dueUtc, rule, utcOffsetMinutes)) {
    if (Date.parse(d) > floor) return d;
  }
  return null;
}

export interface IcsMeeting {
  id: string;
  title: string;
  description?: string | null;
  startUtc: string;
  endUtc: string;
  location?: string | null;
  meetingUrl?: string | null;
  organizerName?: string | null;
  attendees: { name: string; email?: string | null }[];
}

const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escapeText = (t: string) =>
  t
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/[,;]/g, (c) => `\\${c}`);

/** Long lines are folded at 75 characters with a leading space, as calendars expect. */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

/** An invitation any calendar app opens. */
export function buildIcs(m: IcsMeeting, now = new Date()): string {
  const where = [m.location, m.meetingUrl].filter(Boolean).join(' · ');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AutoReach//Meetings//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${m.id}@autoreach`,
    `DTSTAMP:${stamp(now.toISOString())}`,
    `DTSTART:${stamp(m.startUtc)}`,
    `DTEND:${stamp(m.endUtc)}`,
    `SUMMARY:${escapeText(m.title)}`,
    ...(m.description ? [`DESCRIPTION:${escapeText(m.description)}`] : []),
    ...(where ? [`LOCATION:${escapeText(where)}`] : []),
    ...m.attendees
      .filter((a) => a.email)
      .map((a) => `ATTENDEE;CN=${escapeText(a.name)}:mailto:${a.email}`),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
