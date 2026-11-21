/** Display helpers for the inbox thread and list: day headings, delivery ticks and channel badges. */

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * The heading shown above a message when it starts a new day: "Today", "Yesterday", or a date
 * such as "Mon, 16 Nov" (with the year when it isn't this year). Null when it is the same day as the
 * message before it, or its time is unknown.
 */
export function dayHeading(
  sentAtUtc: string | undefined,
  previousSentAtUtc: string | undefined,
  now: Date = new Date(),
): string | null {
  if (!sentAtUtc) return null;
  const d = new Date(sentAtUtc);
  if (Number.isNaN(d.getTime())) return null;
  if (previousSentAtUtc) {
    const p = new Date(previousSentAtUtc);
    if (!Number.isNaN(p.getTime()) && dayKey(p) === dayKey(d)) return null;
  }
  if (dayKey(d) === dayKey(now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** The clock time of a message, e.g. "14:05"; falls back to the label the list already has. */
export function clockTime(sentAtUtc: string | undefined, fallback: string): string {
  if (!sentAtUtc) return fallback;
  const d = new Date(sentAtUtc);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** WhatsApp-style ticks for an outgoing message's delivery status. */
export function statusTicks(
  status: 'sent' | 'delivered' | 'read' | undefined,
): { ticks: string; label: string; read: boolean } | null {
  switch (status) {
    case 'sent':
      return { ticks: '✓', label: 'Sent', read: false };
    case 'delivered':
      return { ticks: '✓✓', label: 'Delivered', read: false };
    case 'read':
      return { ticks: '✓✓', label: 'Read', read: true };
    default:
      return null;
  }
}

/** A short badge for the conversation's channel, shown on the avatar in the list. */
export function channelBadge(
  channel: string | undefined,
  sms: boolean | undefined,
): { text: string; kind: 'wa' | 'ig' | 'fb' | 'email' | 'sms' | 'other' } {
  if (sms) return { text: 'SMS', kind: 'sms' };
  const c = (channel ?? '').toLowerCase();
  if (!c) return { text: 'WA', kind: 'wa' };
  if (c.includes('insta')) return { text: 'IG', kind: 'ig' };
  if (c.includes('messenger') || c.includes('facebook')) return { text: 'FB', kind: 'fb' };
  if (c.includes('mail')) return { text: '@', kind: 'email' };
  if (c.includes('sms')) return { text: 'SMS', kind: 'sms' };
  return { text: channel!.slice(0, 2).toUpperCase(), kind: 'other' };
}
