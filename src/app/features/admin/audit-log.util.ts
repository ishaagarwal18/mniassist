import type { ChipTone } from '../../ui';
import { EntityChangeType } from '../../proxy/auditing/entity-change-type.enum';

/** How far back the audit screen looks. A log is read by "what happened lately", not by month. */
export type AuditWindow = '24h' | '7d' | '30d' | '90d';

export const AUDIT_WINDOWS: readonly { value: AuditWindow; label: string; hours: number }[] = [
  { value: '24h', label: 'Last 24 hours', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { value: '30d', label: 'Last 30 days', hours: 24 * 30 },
  { value: '90d', label: 'Last 90 days', hours: 24 * 90 },
];

export function windowRange(
  window: AuditWindow,
  now = Date.now(),
): { startTime: string; endTime: string } {
  const hours = AUDIT_WINDOWS.find((w) => w.value === window)?.hours ?? 24 * 7;
  return {
    startTime: new Date(now - hours * 3_600_000).toISOString(),
    endTime: new Date(now).toISOString(),
  };
}

/** A failed call is red whatever its status; otherwise the status class decides. */
export function statusTone(status: number | null | undefined, hasException: boolean): ChipTone {
  if (hasException || (status ?? 0) >= 500) return 'bad';
  if ((status ?? 0) >= 400) return 'amber';
  if (!status) return 'neutral';
  return 'good';
}

export function durationLabel(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

/** `Volo.Abp.Identity.IdentityUser` → `IdentityUser`. */
export function shortTypeName(fullName: string | null | undefined): string {
  if (!fullName) return '—';
  const generic = fullName.indexOf('`');
  const plain = generic >= 0 ? fullName.slice(0, generic) : fullName;
  return plain.slice(plain.lastIndexOf('.') + 1);
}

export function changeTypeLabel(type: EntityChangeType): string {
  switch (type) {
    case EntityChangeType.Created:
      return 'Created';
    case EntityChangeType.Updated:
      return 'Updated';
    case EntityChangeType.Deleted:
      return 'Deleted';
    default:
      return 'Changed';
  }
}

export function changeTypeTone(type: EntityChangeType): ChipTone {
  switch (type) {
    case EntityChangeType.Created:
      return 'good';
    case EntityChangeType.Deleted:
      return 'bad';
    default:
      return 'teal';
  }
}

/** Indented JSON when the text is JSON, the text as it came otherwise. */
export function prettyJson(text: string | null | undefined): string {
  if (!text) return '';
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** Entity property values are stored JSON-encoded: `"Rahul"` reads better as Rahul. */
export function propertyValue(value: string | null | undefined): string {
  if (value == null) return '—';
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value;
    }
  }
  return value;
}

/** "21–40 of 1,234" */
export function pageLabel(skip: number, shown: number, total: number): string {
  if (total === 0) return 'No records';
  const fmt = new Intl.NumberFormat('en-IN');
  return `${fmt.format(skip + 1)}–${fmt.format(skip + shown)} of ${fmt.format(total)}`;
}
