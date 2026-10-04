import { Injectable, computed, signal } from '@angular/core';

/** The quick choices; `custom` uses the from/to dates as given. */
export type PeriodPreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | '90d'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'custom';

export const PERIOD_PRESETS: readonly { value: PeriodPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'thisQuarter', label: 'This quarter' },
  { value: 'custom', label: 'Custom dates' },
];

/** A reporting window in UTC instants, ready for the API. `to` is exclusive. */
export interface UtcRange {
  readonly fromUtc: string;
  readonly toUtc: string;
}

interface Saved {
  preset: PeriodPreset;
  from: string;
  to: string;
  compare: boolean;
}

/** India Standard Time, UTC+05:30 all year: the day a report counts in (as the API's ReportingCalendar). */
const IST_MINUTES = 330;
const DAY_MS = 86_400_000;
const STORAGE_KEY = 'ar.report-period';

/** Today's date in India as "yyyy-mm-dd", whatever the browser's own zone. */
export function istToday(now = Date.now()): string {
  return new Date(now + IST_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** Local midnight (IST) of a "yyyy-mm-dd" date, as a UTC instant. */
export function istMidnightUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) - IST_MINUTES * 60_000;
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The inclusive first and last local dates a preset covers, as of today. */
export function presetDates(
  preset: PeriodPreset,
  today = istToday(),
): { from: string; to: string } {
  const [y, m] = today.split('-').map(Number);
  const iso = (yy: number, mm: number, dd: number) =>
    new Date(Date.UTC(yy, mm - 1, dd)).toISOString().slice(0, 10);
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday':
      return { from: addDays(today, -1), to: addDays(today, -1) };
    case '7d':
      return { from: addDays(today, -6), to: today };
    case '90d':
      return { from: addDays(today, -89), to: today };
    case 'thisMonth':
      return { from: iso(y, m, 1), to: today };
    case 'lastMonth':
      return { from: iso(y, m - 1, 1), to: iso(y, m, 0) };
    case 'thisQuarter':
      return { from: iso(y, Math.floor((m - 1) / 3) * 3 + 1, 1), to: today };
    default:
      return { from: addDays(today, -29), to: today };
  }
}

function formatDate(date: string, withYear: boolean): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

function rangeLabel(from: string, to: string): string {
  if (from === to) return formatDate(from, true);
  return `${formatDate(from, from.slice(0, 4) !== to.slice(0, 4))} – ${formatDate(to, true)}`;
}

/**
 * The reporting period every report screen shares — Analytics, Campaign results, Ad
 * attribution and Business reports — so a period picked on one is the period on the
 * next. Days are India Standard Time days, as the API counts them. The choice and the
 * compare switch are remembered on this device.
 */
@Injectable({ providedIn: 'root' })
export class ReportPeriodStore {
  readonly preset = signal<PeriodPreset>('30d');
  /** Inclusive local dates, used when the preset is `custom`. */
  readonly customFrom = signal(presetDates('30d').from);
  readonly customTo = signal(istToday());
  /** Show each figure against the period just before. */
  readonly compare = signal(true);

  /** The inclusive local dates in force. */
  readonly dates = computed(() =>
    this.preset() === 'custom'
      ? this.ordered(this.customFrom(), this.customTo())
      : presetDates(this.preset()),
  );

  /** For the API: local midnight of the first day to local midnight after the last (or now, when the last day is today). */
  readonly range = computed<UtcRange>(() => {
    const { from, to } = this.dates();
    const end = Math.min(istMidnightUtc(addDays(to, 1)), Date.now());
    return {
      fromUtc: new Date(istMidnightUtc(from)).toISOString(),
      toUtc: new Date(end).toISOString(),
    };
  });

  /** The same length of time immediately before. */
  readonly previousRange = computed<UtcRange>(() => {
    const from = Date.parse(this.range().fromUtc);
    const length = Date.parse(this.range().toUtc) - from;
    return { fromUtc: new Date(from - length).toISOString(), toUtc: new Date(from).toISOString() };
  });

  /** "1 Sep – 30 Sep 2026". */
  readonly label = computed(() => rangeLabel(this.dates().from, this.dates().to));

  /** "vs 2 Aug – 31 Aug 2026". */
  readonly previousLabel = computed(() => {
    const { from, to } = this.dates();
    const days = Math.round((istMidnightUtc(to) - istMidnightUtc(from)) / DAY_MS) + 1;
    return `vs ${rangeLabel(addDays(from, -days), addDays(from, -1))}`;
  });

  /** Number of whole days covered, for "per day" figures. */
  readonly days = computed(
    () =>
      Math.round((istMidnightUtc(this.dates().to) - istMidnightUtc(this.dates().from)) / DAY_MS) +
      1,
  );

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Saved | null;
      if (saved && PERIOD_PRESETS.some((p) => p.value === saved.preset)) {
        this.preset.set(saved.preset);
        if (/^\d{4}-\d{2}-\d{2}$/.test(saved.from)) this.customFrom.set(saved.from);
        if (/^\d{4}-\d{2}-\d{2}$/.test(saved.to)) this.customTo.set(saved.to);
        this.compare.set(saved.compare !== false);
      }
    } catch {
      // No storage (private window, blocked site data): the defaults stand.
    }
  }

  setPreset(preset: PeriodPreset): void {
    if (preset === 'custom') {
      // Start the custom range from whatever was showing, so it is an edit, not a reset.
      const { from, to } = this.dates();
      this.customFrom.set(from);
      this.customTo.set(to);
    }
    this.preset.set(preset);
    this.save();
  }

  setCustom(from: string, to: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return;
    const today = istToday();
    this.customFrom.set(from > today ? today : from);
    this.customTo.set(to > today ? today : to);
    this.preset.set('custom');
    this.save();
  }

  setCompare(on: boolean): void {
    this.compare.set(on);
    this.save();
  }

  private ordered(a: string, b: string): { from: string; to: string } {
    return a <= b ? { from: a, to: b } : { from: b, to: a };
  }

  private save(): void {
    try {
      const saved: Saved = {
        preset: this.preset(),
        from: this.customFrom(),
        to: this.customTo(),
        compare: this.compare(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Remembering the choice is a convenience; without storage it simply resets.
    }
  }
}

/** "+12%", "−3 pts" or null, and whether the move is good news. Shared by every report's tiles. */
export function changeOf(
  current: number | null | undefined,
  previous: number | null | undefined,
  options: { rate?: boolean; higherIsBetter?: boolean | null } = {},
): { text: string; good: boolean | null } | null {
  if (current == null || previous == null) return null;
  const higher = options.higherIsBetter;
  const direction = (up: boolean) => (higher == null ? null : up === higher);
  if (options.rate) {
    const points = (current - previous) * 100;
    if (Math.abs(points) < 0.5) return { text: 'no change', good: null };
    return {
      text: `${points > 0 ? '+' : '−'}${Math.abs(points).toFixed(0)} pts`,
      good: direction(points > 0),
    };
  }
  if (previous === 0) return current === 0 ? null : { text: 'new', good: direction(true) };
  const change = (current - previous) / Math.abs(previous);
  if (Math.abs(change) < 0.005) return { text: 'no change', good: null };
  return {
    text: `${change > 0 ? '+' : '−'}${Math.abs(change * 100).toFixed(0)}%`,
    good: direction(change > 0),
  };
}
