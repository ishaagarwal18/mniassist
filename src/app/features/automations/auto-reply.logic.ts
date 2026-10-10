import type {
  AutoReplySettingsDto,
  BusinessDayDto,
  HolidayDto,
  UpdateAutoReplySettingsInput,
} from '../../proxy/messaging/models';

/** Monday first, as Indian businesses write their week; values are .NET's DayOfWeek. */
export const WEEK: readonly { day: number; label: string }[] = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 0, label: 'Sunday' },
];

export const TIME_ZONES: readonly { id: string; label: string }[] = [
  { id: 'Asia/Kolkata', label: 'India (IST, UTC+05:30)' },
  { id: 'Asia/Dubai', label: 'UAE (UTC+04:00)' },
  { id: 'Asia/Singapore', label: 'Singapore (UTC+08:00)' },
  { id: 'Europe/London', label: 'United Kingdom' },
  { id: 'Europe/Berlin', label: 'Central Europe' },
  { id: 'America/New_York', label: 'US Eastern' },
  { id: 'UTC', label: 'UTC' },
];

/** The editable form: the API input, with the closure as local calendar dates. */
export interface AutoReplyForm extends Omit<
  UpdateAutoReplySettingsInput,
  'outOfOfficeFromUtc' | 'outOfOfficeToUtc'
> {
  /** First closed day, "yyyy-MM-dd" in the workspace's zone. */
  oooFrom: string;
  /** Last closed day, inclusive. */
  oooTo: string;
}

export const EMPTY_FORM: AutoReplyForm = {
  welcomeEnabled: false,
  welcomeText: '',
  awayEnabled: false,
  awayText: '',
  awayCooldownHours: 12,
  outOfOfficeEnabled: false,
  outOfOfficeText: '',
  oooFrom: '',
  oooTo: '',
  timeZoneId: 'Asia/Kolkata',
  days: WEEK.map((w) => ({ day: w.day, isOpen: w.day !== 0, opens: '09:30', closes: '18:30' })),
  holidays: [],
};

export function formFrom(dto: AutoReplySettingsDto): AutoReplyForm {
  const byDay = new Map(dto.days.map((d) => [d.day, d]));
  return {
    welcomeEnabled: dto.welcomeEnabled,
    welcomeText: dto.welcomeText ?? '',
    awayEnabled: dto.awayEnabled,
    awayText: dto.awayText ?? '',
    awayCooldownHours: dto.awayCooldownHours,
    outOfOfficeEnabled: dto.outOfOfficeEnabled,
    outOfOfficeText: dto.outOfOfficeText ?? '',
    oooFrom: dto.outOfOfficeFromUtc ? localDate(dto.outOfOfficeFromUtc, dto.timeZoneId) : '',
    // The stored end is the midnight after the last closed day.
    oooTo: dto.outOfOfficeToUtc
      ? localDate(new Date(Date.parse(dto.outOfOfficeToUtc) - 1).toISOString(), dto.timeZoneId)
      : '',
    timeZoneId: dto.timeZoneId,
    days: WEEK.map((w) => {
      const d = byDay.get(w.day);
      return d?.isOpen
        ? { day: w.day, isOpen: true, opens: d.opens ?? '09:30', closes: d.closes ?? '18:30' }
        : { day: w.day, isOpen: false, opens: '09:30', closes: '18:30' };
    }),
    holidays: [...dto.holidays].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** The API input, or the first thing that needs fixing. */
export function inputFrom(f: AutoReplyForm): UpdateAutoReplySettingsInput | string {
  if (f.welcomeEnabled && !f.welcomeText?.trim())
    return 'Write the welcome message, or switch it off.';
  if (f.awayEnabled && !f.awayText?.trim()) return 'Write the away message, or switch it off.';
  if (!(f.awayCooldownHours >= 1 && f.awayCooldownHours <= 168)) {
    return 'Wait between away replies must be from 1 to 168 hours.';
  }
  if (f.outOfOfficeEnabled) {
    if (!f.outOfOfficeText?.trim()) return 'Write the out-of-office message, or switch it off.';
    if (!f.oooFrom || !f.oooTo) return 'Choose the first and the last day of the closure.';
    if (f.oooTo < f.oooFrom) return 'The last day of the closure must be on or after the first.';
  }
  const dates = f.holidays.map((h) => h.date);
  if (dates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) return 'Give every holiday a date.';
  if (new Set(dates).size !== dates.length) return 'Each holiday date can be listed once.';

  return {
    welcomeEnabled: f.welcomeEnabled,
    welcomeText: f.welcomeText?.trim() || null,
    awayEnabled: f.awayEnabled,
    awayText: f.awayText?.trim() || null,
    awayCooldownHours: Math.round(f.awayCooldownHours),
    outOfOfficeEnabled: f.outOfOfficeEnabled,
    outOfOfficeText: f.outOfOfficeText?.trim() || null,
    outOfOfficeFromUtc: f.oooFrom ? zonedMidnightUtc(f.oooFrom, f.timeZoneId) : null,
    outOfOfficeToUtc: f.oooTo ? zonedMidnightUtc(nextDay(f.oooTo), f.timeZoneId) : null,
    timeZoneId: f.timeZoneId,
    days: f.days.map((d): BusinessDayDto =>
      d.isOpen ? { ...d } : { day: d.day, isOpen: false, opens: null, closes: null },
    ),
    holidays: f.holidays.map((h): HolidayDto => ({ date: h.date, name: h.name.trim() })),
  };
}

/** Midnight at the start of a calendar date in a time zone, as a UTC ISO string. */
export function zonedMidnightUtc(date: string, timeZone: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  // Two passes settle the offset even across a daylight-saving change.
  let utc = guess - offsetMs(guess, timeZone);
  utc = guess - offsetMs(utc, timeZone);
  return new Date(utc).toISOString();
}

/** The calendar date of a moment in a time zone, "yyyy-MM-dd". */
export function localDate(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function offsetMs(utc: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utc));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return asUtc - Math.floor(utc / 1000) * 1000;
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** One line for the head of the page: what a customer writing now would get. */
export function nowLine(dto: AutoReplySettingsDto | null): string {
  if (!dto) return '';
  if (dto.replyingNowWith === 3)
    return 'Closed now for the out-of-office period: a message now gets that reply.';
  if (dto.replyingNowWith === 2)
    return 'Outside business hours now: a message now gets the away reply.';
  return dto.openNow
    ? 'Open now: no away reply is sent.'
    : 'Closed now, but the away reply is off.';
}
