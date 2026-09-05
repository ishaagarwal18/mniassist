/** Indian digit grouping — 8,40,000 not 840,000. */
export function inr(paise: number, opts: { paise?: boolean } = {}): string {
  const rupees = opts.paise === false ? paise : paise / 100;
  const whole = Math.abs(rupees) >= 100 || Number.isInteger(rupees);
  return '₹' + rupees.toLocaleString('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

/** ₹42.6L / ₹1.42 Cr — how Indian B2B actually writes deal values. */
export function inrCompact(rupees: number): string {
  if (rupees >= 1e7) return `₹${(rupees / 1e7).toFixed(2)} Cr`;
  if (rupees >= 1e5) return `₹${(rupees / 1e5).toFixed(1)}L`;
  return inr(rupees, { paise: false });
}

export function count(n: number): string {
  return n.toLocaleString('en-IN');
}

export function pct(part: number, whole: number, dp = 1): string {
  if (!whole) return '0%';
  return `${((part / whole) * 100).toFixed(dp)}%`;
}

/** "3h 48m" — the service-window countdown. */
export function untilLabel(expiresAt: Date | null, now = new Date()): string | null {
  if (!expiresAt) return null;
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60_000);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

export function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}
