import { describe, expect, it } from 'vitest';

import { TicketStatus } from '../../proxy/support/ticket-status.enum';
import {
  looksLikeCode,
  looksLikePhone,
  messageOf,
  problemOf,
  scanSessionKey,
  telLink,
  ticketStatusText,
  whatsAppLink,
} from './scan-logic';

const http = (status: number, code?: string, message?: string) => ({
  status,
  error: { error: { code, message } },
});

describe('machine scan page logic', () => {
  it('reads the page state from the status: unknown, replaced, busy, wrong code, captcha', () => {
    expect(problemOf(http(404))).toBe('unavailable');
    expect(problemOf(http(410))).toBe('revoked');
    expect(problemOf(http(429))).toBe('busy');
    expect(problemOf(http(401))).toBe('code');
    expect(problemOf(http(400, 'AutoReach:MachineQrCaptchaRequired'))).toBe('captcha');
    expect(problemOf(http(400, 'AutoReach:MachineQrReportInvalid'))).toBe('other');
    expect(problemOf(null)).toBe('other');
  });

  it("shows the server's words, or a fallback for long or missing ones", () => {
    expect(messageOf(http(400, 'x', 'Call the helpline.'), 'fallback')).toBe('Call the helpline.');
    expect(messageOf(http(500), 'fallback')).toBe('fallback');
    expect(messageOf(http(400, 'x', 'a'.repeat(500)), 'fallback')).toBe('fallback');
  });

  it('keeps the session under the token tail only', () => {
    const key = scanSessionKey('abcdefghijklmnopqrstuv');
    expect(key).toBe('machine-session:mnopqrstuv');
    expect(key).not.toContain('abcdef');
  });

  it('builds call and WhatsApp links, and none from too little', () => {
    expect(telLink('020 4000 1234')).toBe('tel:02040001234');
    expect(telLink('+91 98220 11000')).toBe('tel:+919822011000');
    expect(telLink('12')).toBeNull();
    expect(whatsAppLink('+91 98220 11000')).toBe('https://wa.me/919822011000');
    expect(whatsAppLink('919822011000', 'Machine VX 1')).toBe(
      'https://wa.me/919822011000?text=Machine%20VX%201',
    );
    expect(whatsAppLink(null)).toBeNull();
  });

  it('checks a number and a code loosely before sending', () => {
    expect(looksLikePhone('98220 11000')).toBe(true);
    expect(looksLikePhone('+91 98220 11000')).toBe(true);
    expect(looksLikePhone('12345')).toBe(false);
    expect(looksLikeCode('123 456')).toBe(true);
    expect(looksLikeCode('12345')).toBe(false);
  });

  it('names ticket states in the customer’s terms', () => {
    expect(ticketStatusText(TicketStatus.Open)).toBe('Logged');
    expect(ticketStatusText(TicketStatus.Pending)).toBe('Waiting for you');
    expect(ticketStatusText(TicketStatus.Resolved)).toBe('Resolved');
  });
});
