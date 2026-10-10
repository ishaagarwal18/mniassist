/** The longest delegation the server accepts. */
export const MAX_DELEGATION_DAYS = 90;

/**
 * Start and end of a delegation from two calendar dates in India: from the start of the
 * first day to the end of the last. Returns the reason when the dates do not work.
 */
export function delegationPeriod(
  start: string,
  end: string,
  now = new Date(),
): { startTime: string; endTime: string } | string {
  if (!start || !end) return 'Choose the first and the last day.';
  const from = new Date(`${start}T00:00:00+05:30`);
  const to = new Date(`${end}T23:59:59+05:30`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
    return 'Those dates are not valid.';
  if (to <= from) return 'The last day must be on or after the first.';
  if (to <= now) return 'The delegation would already be over.';
  // Starting "today" means from now, not from a midnight already passed.
  const startTime = from < now ? now : from;
  // The server measures the exact length, so this does too.
  if (to.getTime() - startTime.getTime() > MAX_DELEGATION_DAYS * 86_400_000) {
    return `A delegation can last at most ${MAX_DELEGATION_DAYS} days.`;
  }
  return { startTime: startTime.toISOString(), endTime: to.toISOString() };
}

/** Today's date in India, as the date input expects it. */
export function indianToday(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}
