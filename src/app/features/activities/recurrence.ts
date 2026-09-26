import { RecurrenceDto, RecurrenceFrequency, Weekday } from '../../proxy/activities';

/** What the picker holds: the person's choices, as typed, before they become a rule. */
export interface RecurrenceDraft {
  frequency: RecurrenceFrequency;
  interval: number;
  /** For a weekly repeat. Empty means the weekday of the first one. */
  weekdays: Weekday[];
  /** How it ends. */
  ends: 'never' | 'count' | 'until';
  count: number;
  /** Local date, "2026-12-31", for ends = until. */
  until: string;
}

export const NO_REPEAT: RecurrenceDraft = {
  frequency: RecurrenceFrequency.None,
  interval: 1,
  weekdays: [],
  ends: 'count',
  count: 10,
  until: '',
};

export const DAY_NAMES: readonly string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Monday first, the way the week is laid out. */
export const WEEK_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/**
 * The rule the server takes, from what was chosen. The last day is the end of that local day, so "until 31 Dec" includes a meeting on the
 * evening of the 31st. Returns null when it does not repeat.
 */
export function toRecurrence(d: RecurrenceDraft): RecurrenceDto | null {
  if (d.frequency === RecurrenceFrequency.None) return null;

  const rule: RecurrenceDto = {
    frequency: d.frequency,
    interval: Math.max(1, Math.min(52, Math.round(d.interval) || 1)),
    weekdays: d.frequency === RecurrenceFrequency.Weekly ? [...d.weekdays] : [],
    untilUtc: null,
    count: null,
  };

  if (d.ends === 'count') {
    rule.count = Math.max(1, Math.min(260, Math.round(d.count) || 1));
  } else if (d.ends === 'until' && d.until) {
    const [y, m, day] = d.until.split('-').map(Number);
    const endOfDay = new Date(y, m - 1, day, 23, 59, 59);
    rule.untilUtc = Number.isNaN(endOfDay.getTime()) ? null : endOfDay.toISOString();
  }
  return rule;
}

/** The draft for a rule that was saved, to show it again. */
export function toDraft(rule: RecurrenceDto | null | undefined): RecurrenceDraft {
  if (!rule || rule.frequency === RecurrenceFrequency.None) return { ...NO_REPEAT };
  const p = (n: number) => String(n).padStart(2, '0');
  const until = rule.untilUtc ? new Date(rule.untilUtc) : null;
  return {
    frequency: rule.frequency,
    interval: rule.interval ?? 1,
    weekdays: [...(rule.weekdays ?? [])],
    ends: rule.count ? 'count' : until ? 'until' : 'never',
    count: rule.count ?? NO_REPEAT.count,
    until: until ? `${until.getFullYear()}-${p(until.getMonth() + 1)}-${p(until.getDate())}` : '',
  };
}

/** "Every week on Mon, Thu", "Every 2 months", "Every day, 10 times". */
export function recurrenceLabel(rule: RecurrenceDto | null | undefined): string {
  if (!rule || rule.frequency === RecurrenceFrequency.None) return 'Does not repeat';
  const n = rule.interval ?? 1;
  const unit = {
    [RecurrenceFrequency.Daily]: 'day',
    [RecurrenceFrequency.Weekly]: 'week',
    [RecurrenceFrequency.Monthly]: 'month',
  }[rule.frequency];
  let text = n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
  if (rule.frequency === RecurrenceFrequency.Weekly && rule.weekdays?.length) {
    text += ` on ${WEEK_ORDER.filter((d) => rule.weekdays!.includes(d))
      .map((d) => DAY_NAMES[d])
      .join(', ')}`;
  }
  if (rule.count) text += `, ${rule.count} time${rule.count === 1 ? '' : 's'}`;
  else if (rule.untilUtc)
    text += `, until ${new Date(rule.untilUtc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return text;
}

/** What is wrong with the choices, or null: a meeting series must say when it ends, a weekly one on which days is optional. */
export function recurrenceProblem(d: RecurrenceDraft, needsEnd: boolean): string | null {
  if (d.frequency === RecurrenceFrequency.None) return null;
  if (needsEnd && d.ends === 'never')
    return 'Say when the series ends: after a number of times, or on a date.';
  if (d.ends === 'until' && !d.until) return 'Pick the last date.';
  if (d.ends === 'count' && !(d.count >= 1)) return 'A series has at least one meeting.';
  return null;
}
