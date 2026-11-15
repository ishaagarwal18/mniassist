import { RecurrenceKind } from '../../proxy/campaigns/recurrence-kind.enum';
import type { ScheduleCampaignInput } from '../../proxy/campaigns/models';

/** The schedule dialog's values, as typed. Days are 0 (Sunday) to 6 (Saturday). */
export interface ScheduleDraft {
  /** yyyy-MM-dd, local. */
  date: string;
  /** HH:mm, local. */
  time: string;
  recurrence: RecurrenceKind;
  daysOfWeek: number[];
  dayOfMonth: string;
  /** yyyy-MM-dd, optional. */
  endsOn: string;
  quietHours: boolean;
  quietFrom: string;
  quietUntil: string;
  skipSundays: boolean;
}

export const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Tomorrow at 10:00, the usual first slot for a marketing send. */
export function defaultScheduleDraft(now = new Date()): ScheduleDraft {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: '10:00',
    recurrence: RecurrenceKind.Once,
    daysOfWeek: [d.getDay()],
    dayOfMonth: String(Math.min(d.getDate(), 28)),
    endsOn: '',
    quietHours: true,
    quietFrom: '21:00',
    quietUntil: '08:00',
    skipSundays: true,
  };
}

/** What is wrong with the schedule, or null when it can be saved. */
export function scheduleProblem(d: ScheduleDraft, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !/^\d{2}:\d{2}$/.test(d.time))
    return 'Pick the date and time of the first send.';
  const first = new Date(`${d.date}T${d.time}:00`);
  if (Number.isNaN(first.getTime())) return 'Pick the date and time of the first send.';
  if (first.getTime() <= now.getTime() + 60_000) return 'Pick a time in the future.';
  if (d.recurrence === RecurrenceKind.Weekly && d.daysOfWeek.length === 0)
    return 'Pick at least one day of the week.';
  if (d.recurrence === RecurrenceKind.Monthly) {
    const day = Number(d.dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 28)
      return 'Pick a day of the month from 1 to 28.';
  }
  if (d.endsOn && d.recurrence !== RecurrenceKind.Once && d.endsOn < d.date)
    return 'The end date is before the first send.';
  if (d.quietHours && (!/^\d{2}:\d{2}$/.test(d.quietFrom) || !/^\d{2}:\d{2}$/.test(d.quietUntil)))
    return 'Set when quiet hours start and end.';
  return null;
}

/** The input the API takes: the first send in UTC, and the repeat rule in India time. */
export function toScheduleInput(d: ScheduleDraft): ScheduleCampaignInput {
  const first = new Date(`${d.date}T${d.time}:00`);
  return {
    scheduledAtUtc: first.toISOString(),
    schedule: {
      timeZoneId: 'Asia/Kolkata',
      recurrence: d.recurrence,
      localSendTime: `${d.time}:00`,
      daysOfWeek: d.recurrence === RecurrenceKind.Weekly ? [...d.daysOfWeek].sort() : [],
      dayOfMonth: d.recurrence === RecurrenceKind.Monthly ? Number(d.dayOfMonth) : null,
      endsAtUtc:
        d.recurrence !== RecurrenceKind.Once && d.endsOn
          ? new Date(`${d.endsOn}T23:59:59`).toISOString()
          : null,
      quietHoursEnabled: d.quietHours,
      quietFrom: `${d.quietFrom}:00`,
      quietUntil: `${d.quietUntil}:00`,
      blackoutDays: d.skipSundays ? [0] : [],
    },
  };
}
