import {
  AttendeeResponse,
  CrmTaskStatus,
  MeetingConflictDto,
  MeetingKind,
  MeetingStatus,
  TaskPriority,
} from '../../proxy/activities';

// ---- the calendar ------------------------------------------------------------------
// Everything here works in the browser's local time: that is the day a person means by "today" and "Friday".

/** Local time minus UTC, in minutes (330 in India). What the server needs to work out a person's day. */
export function utcOffsetMinutes(at: Date = new Date()): number {
  return -at.getTimezoneOffset();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

/** The Monday on or before the date, at local midnight. */
export function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  return addDays(day, -((day.getDay() + 6) % 7));
}

/** The seven local days of the week containing the date, Monday first, and the half-open range they cover. */
export function weekOf(anchor: Date): { from: Date; to: Date; days: Date[] } {
  const from = startOfWeek(anchor);
  return {
    from,
    to: addDays(from, 7),
    days: Array.from({ length: 7 }, (_, i) => addDays(from, i)),
  };
}

export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "2026-09-21" in local time, to group by. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Every day given, with what starts on it, earliest first. Days with nothing are kept: an empty day is information too. */
export function groupByDay<T>(
  items: readonly T[],
  startIso: (item: T) => string | undefined,
  days: readonly Date[],
): { day: Date; items: T[] }[] {
  return days.map((day) => ({
    day,
    items: items
      .filter((i) => {
        const s = startIso(i);
        return !!s && dayKey(new Date(s)) === dayKey(day);
      })
      .sort((a, b) => new Date(startIso(a)!).getTime() - new Date(startIso(b)!).getTime()),
  }));
}

// ---- date inputs --------------------------------------------------------------------

/** What a datetime-local input wants: "2026-09-21T10:30" in local time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** The UTC instant a datetime-local value means, or null when it is empty or not a date. */
export function fromLocalInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** The next half hour, at least a quarter of an hour away: where a new meeting starts unless told otherwise. */
export function defaultMeetingStart(now: Date): Date {
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes() + 15,
  );
  const rem = d.getMinutes() % 30;
  return rem === 0 && d.getSeconds() === 0
    ? d
    : new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        d.getMinutes() + (30 - rem),
      );
}

// ---- tasks ----------------------------------------------------------------------------

export type DueBucket = 'overdue' | 'today' | 'week' | 'later' | 'nodate' | 'done';

export const BUCKET_ORDER: readonly DueBucket[] = [
  'overdue',
  'today',
  'week',
  'later',
  'nodate',
  'done',
];

export const BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'This week',
  later: 'Later',
  nodate: 'No date',
  done: 'Done',
};

/** Where an open task stands against today, the same way the server counts it. */
export function dueBucket(
  task: { status?: CrmTaskStatus; dueAtUtc?: string | null },
  now: Date,
): DueBucket {
  if (task.status !== undefined && task.status !== CrmTaskStatus.Open) return 'done';
  if (!task.dueAtUtc) return 'nodate';
  const due = new Date(task.dueAtUtc);
  if (due.getTime() < now.getTime()) return 'overdue';
  const today = startOfDay(now);
  const dueDay = startOfDay(due);
  if (sameDay(dueDay, today)) return 'today';
  return dueDay.getTime() <= addDays(today, 7).getTime() ? 'week' : 'later';
}

export function groupTasks<T extends { status?: CrmTaskStatus; dueAtUtc?: string | null }>(
  tasks: readonly T[],
  now: Date,
): { bucket: DueBucket; label: string; tasks: T[] }[] {
  return BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: BUCKET_LABEL[bucket],
    tasks: tasks.filter((t) => dueBucket(t, now) === bucket),
  })).filter((g) => g.tasks.length > 0);
}

const timeOf = (d: Date): string =>
  d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

/** "Today 4:30 pm", "Tomorrow 9:00 am", "Fri 25 Sep", "2 days overdue". */
export function dueLabel(
  iso: string | null | undefined,
  now: Date,
  status?: CrmTaskStatus,
): string {
  if (!iso) return 'No due date';
  const due = new Date(iso);
  const bucket = dueBucket({ status: status ?? CrmTaskStatus.Open, dueAtUtc: iso }, now);

  if (bucket === 'overdue') {
    const days = Math.floor((startOfDay(now).getTime() - startOfDay(due).getTime()) / 86_400_000);
    return days <= 0
      ? `Overdue since ${timeOf(due)}`
      : `${days} day${days === 1 ? '' : 's'} overdue`;
  }
  if (bucket === 'today') return `Today ${timeOf(due)}`;
  if (sameDay(startOfDay(due), addDays(startOfDay(now), 1))) return `Tomorrow ${timeOf(due)}`;
  return due.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  [TaskPriority.Low]: 'Low',
  [TaskPriority.Normal]: 'Normal',
  [TaskPriority.High]: 'High',
};

// ---- meetings --------------------------------------------------------------------------

export const KIND_LABEL: Record<MeetingKind, string> = {
  [MeetingKind.InPerson]: 'In person',
  [MeetingKind.Call]: 'Call',
  [MeetingKind.Video]: 'Video',
  [MeetingKind.SiteVisit]: 'Site visit',
};

export const STATUS_LABEL: Record<MeetingStatus, string> = {
  [MeetingStatus.Scheduled]: 'Scheduled',
  [MeetingStatus.Completed]: 'Done',
  [MeetingStatus.Cancelled]: 'Cancelled',
  [MeetingStatus.NoShow]: 'No-show',
};

export const RESPONSE_LABEL: Record<AttendeeResponse, string> = {
  [AttendeeResponse.Pending]: 'Not answered',
  [AttendeeResponse.Accepted]: 'Accepted',
  [AttendeeResponse.Declined]: 'Declined',
};

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** "10:00 am – 11:00 am". */
export function timeRange(startIso: string, endIso: string): string {
  return `${timeOf(new Date(startIso))} – ${timeOf(new Date(endIso))}`;
}

/** "Mon 22 Sep, 10:00 am – 11:00 am": a suggested time as a button label. */
export function slotLabel(startIso: string, endIso: string): string {
  const day = new Date(startIso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${day}, ${timeRange(startIso, endIso)}`;
}

/** One line for each person who is booked: "Ravi K is booked 10:00 am – 11:00 am (Plant review)". */
export function conflictLine(c: MeetingConflictDto): string {
  const what = c.title ? ` (${c.title})` : '';
  return `${c.userName ?? 'Someone'} is booked ${timeRange(c.startUtc!, c.endUtc!)}${what}`;
}

/** Two people, or the same person twice, never appear as two lines: the same booking once. */
export function uniqueConflicts(conflicts: readonly MeetingConflictDto[]): MeetingConflictDto[] {
  const seen = new Set<string>();
  return conflicts.filter((c) => {
    const key = `${c.userId}|${c.meetingId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** True when the server refused because someone is already booked, which the person can override. */
export function isConflictError(e: unknown): boolean {
  return (
    (e as { error?: { error?: { code?: string } } })?.error?.error?.code ===
    'AutoReach:MeetingConflict'
  );
}

/** The words the server put on an error, or the fallback. */
export function errorMessage(e: unknown, fallback: string): string {
  const message = (e as { error?: { error?: { message?: string } } })?.error?.error?.message;
  return message && message.length < 400 ? message : fallback;
}

/** Hands a text file to the browser to save. */
export function downloadTextFile(
  fileName: string,
  content: string,
  mime = 'text/calendar;charset=utf-8',
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
