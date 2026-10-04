/**
 * Sharing a meeting and putting it into other calendars, with links each
 * provider documents for "open a prefilled event" — no account connection or
 * API keys needed. The person's own Google, Microsoft or Zoom sign-in in the
 * browser does the rest.
 */

export interface ShareableMeeting {
  title: string;
  description?: string | null;
  startUtc: string;
  endUtc: string;
  location?: string | null;
  meetingUrl?: string | null;
  organizerName?: string | null;
}

/** 20261004T093000Z, the compact UTC form calendar links use. */
const compactUtc = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** 2026-10-04T09:30:00Z, the ISO form Outlook and Teams links use. */
const isoUtc = (iso: string) => new Date(iso).toISOString().replace(/\.\d{3}/, '');

const where = (m: ShareableMeeting) => m.meetingUrl || m.location || '';

/** The meeting in a few lines of plain text, for email, WhatsApp and the clipboard. */
export function meetingText(m: ShareableMeeting, locale = 'en-IN'): string {
  const start = new Date(m.startUtc);
  const end = new Date(m.endUtc);
  const day = start.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = (d: Date) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const lines = [`*${m.title}*`, `${day}, ${time(start)} – ${time(end)}`];
  if (m.meetingUrl) lines.push(`Join: ${m.meetingUrl}`);
  if (m.location) lines.push(`Where: ${m.location}`);
  if (m.organizerName) lines.push(`Organiser: ${m.organizerName}`);
  if (m.description) lines.push('', m.description);
  return lines.join('\n');
}

const details = (m: ShareableMeeting) =>
  [m.description, m.meetingUrl ? `Join: ${m.meetingUrl}` : ''].filter(Boolean).join('\n\n');

export function googleCalendarUrl(m: ShareableMeeting): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: m.title,
    dates: `${compactUtc(m.startUtc)}/${compactUtc(m.endUtc)}`,
    details: details(m),
    location: where(m),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** Outlook on the web; `work` opens a Microsoft 365 work/school calendar, otherwise outlook.com. */
export function outlookCalendarUrl(m: ShareableMeeting, work = true): string {
  const q = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: m.title,
    startdt: isoUtc(m.startUtc),
    enddt: isoUtc(m.endUtc),
    body: details(m),
    location: where(m),
  });
  return `https://outlook.${work ? 'office' : 'live'}.com/calendar/0/deeplink/compose?${q}`;
}

/** Opens Teams' new-meeting form, filled in; saving it there creates the Teams link. */
export function teamsMeetingUrl(
  m: ShareableMeeting,
  attendeeEmails: readonly string[] = [],
): string {
  const q = new URLSearchParams({
    subject: m.title,
    startTime: isoUtc(m.startUtc),
    endTime: isoUtc(m.endUtc),
    content: m.description ?? '',
  });
  if (attendeeEmails.length) q.set('attendees', attendeeEmails.join(','));
  return `https://teams.microsoft.com/l/meeting/new?${q}`;
}

/** Zoom has no prefill link: this opens its scheduler, signed in as the person. */
export const ZOOM_SCHEDULE_URL = 'https://zoom.us/meeting/schedule';

/** Starts a Google Meet room straight away; its link can be pasted into the meeting. */
export const GOOGLE_MEET_NEW_URL = 'https://meet.google.com/new';

export function mailtoUrl(m: ShareableMeeting, to: readonly string[] = []): string {
  const q = new URLSearchParams({
    subject: `Meeting: ${m.title}`,
    body: meetingText(m).replace(/\*/g, ''),
  });
  // mailto wants %20 for spaces, not +.
  return `mailto:${to.map(encodeURIComponent).join(',')}?${q.toString().replace(/\+/g, '%20')}`;
}

/** WhatsApp's share link; with a number it opens that chat, otherwise the contact picker. */
export function whatsappUrl(m: ShareableMeeting, phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(meetingText(m))}`;
}
