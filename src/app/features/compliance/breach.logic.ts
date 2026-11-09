import type { Breach } from '../../core/services/compliance.service';
import type { ChipTone } from '../../ui/chip';

/** A short status with the tone of its chip. */
export interface BreachStatus {
  readonly label: string;
  readonly tone: ChipTone;
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function hours(h: number): string {
  const n = Math.abs(Math.round(h));
  return n >= 48 ? `${Math.round(n / 24)}d` : `${n}h`;
}

/**
 * Telling the Data Protection Board. The platform holds itself to 72 hours from detection (DPDP says "without
 * delay"), so an untold incident shows the time left, then how far past it is.
 */
export function boardStatus(b: Breach): BreachStatus {
  if (b.boardNotifiedAt) return { label: `Told ${day(b.boardNotifiedAt)}`, tone: 'good' };
  if (b.state === 'closed') return { label: 'Not told', tone: 'neutral' };
  if (b.hoursToBoardDeadline < 0)
    return { label: `${hours(b.hoursToBoardDeadline)} overdue`, tone: 'bad' };
  return {
    label: `${hours(b.hoursToBoardDeadline)} left`,
    tone: b.hoursToBoardDeadline <= 24 ? 'amber' : 'neutral',
  };
}

/** Telling the people whose data was affected. Nobody to tell when no one was affected. */
export function peopleStatus(b: Breach): BreachStatus {
  if (b.principalsNotifiedAt) return { label: `Told ${day(b.principalsNotifiedAt)}`, tone: 'good' };
  if (b.affected <= 0) return { label: 'No one affected', tone: 'neutral' };
  if (b.state === 'closed') return { label: 'Not told', tone: 'neutral' };
  return { label: 'To tell', tone: 'amber' };
}

/** `<input type="datetime-local">`'s format for a moment, in the browser's time zone. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * What is wrong with an incident about to be logged, or null. The time it was found must be a real moment no later
 * than now: the Board's clock runs from it.
 */
export function breachProblem(
  title: string,
  detectedLocal: string,
  affected: number,
  now = new Date(),
): string | null {
  if (!title.trim()) return 'Give the incident a short title.';
  const at = new Date(detectedLocal);
  if (!detectedLocal || Number.isNaN(at.getTime())) return 'Enter when the incident was found.';
  if (at.getTime() > now.getTime() + 60_000) return 'When it was found cannot be in the future.';
  if (!Number.isFinite(affected) || affected < 0)
    return 'People affected must be 0 or more (0 if no one’s data was exposed).';
  return null;
}
