import { TicketStatus } from '../../proxy/support/ticket-status.enum';

/** What went wrong with a call from the scan page, read from the HTTP status and the error code. */
export type ScanProblem = 'unavailable' | 'revoked' | 'busy' | 'captcha' | 'code' | 'other';

export function problemOf(e: unknown): ScanProblem {
  const err = e as { status?: number; error?: { error?: { code?: string } } } | null;
  const code = err?.error?.error?.code ?? '';
  switch (err?.status) {
    case 404:
      return 'unavailable';
    case 410:
      return 'revoked';
    case 429:
      return 'busy';
    case 401:
      return 'code';
    case 400:
      return code.endsWith('MachineQrCaptchaRequired') ? 'captcha' : 'other';
    default:
      return 'other';
  }
}

/** The server's own words when it sent some, else the fallback. */
export function messageOf(e: unknown, fallback: string): string {
  const message = (e as { error?: { error?: { message?: string } } } | null)?.error?.error?.message;
  return message && message.length < 400 ? message : fallback;
}

/** Where this sticker's page session is kept for the tab: by the token's tail, never the whole token. */
export function scanSessionKey(token: string): string {
  return 'machine-session:' + token.slice(-10);
}

const STATUS_TEXT: Record<TicketStatus, string> = {
  [TicketStatus.Open]: 'Logged',
  [TicketStatus.Pending]: 'Waiting for you',
  [TicketStatus.Resolved]: 'Resolved',
  [TicketStatus.Closed]: 'Closed',
};

export function ticketStatusText(status: TicketStatus): string {
  return STATUS_TEXT[status] ?? 'Logged';
}

/** A wa.me link for the workspace's WhatsApp number, or null without one. */
export function whatsAppLink(digits: string | null | undefined, text?: string): string | null {
  const n = (digits ?? '').replace(/\D/g, '');
  if (n.length < 8) return null;
  return `https://wa.me/${n}` + (text ? `?text=${encodeURIComponent(text)}` : '');
}

/** A tel: link for the helpline as typed ("020 4000 1234" → tel:02040001234). */
export function telLink(phone: string | null | undefined): string | null {
  const t = (phone ?? '').replace(/[^\d+]/g, '');
  return t.length >= 6 ? `tel:${t}` : null;
}

/** A 10-digit Indian number, or one with a country code: enough to send to the server, which checks it properly. */
export function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function looksLikeCode(value: string): boolean {
  return value.replace(/\D/g, '').length === 6;
}
