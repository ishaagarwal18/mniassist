import {
  googleCalendarUrl,
  mailtoUrl,
  meetingText,
  outlookCalendarUrl,
  teamsMeetingUrl,
  whatsappUrl,
} from './meeting-share';

const m = {
  title: 'Site visit: Line 3',
  description: 'Bring the VFD manual',
  startUtc: '2026-10-05T04:30:00.000Z',
  endUtc: '2026-10-05T05:30:00.000Z',
  location: null,
  meetingUrl: 'https://meet.example/abc',
  organizerName: 'Ravi K',
};

describe('meeting share links', () => {
  it('builds a Google Calendar template with UTC dates and the join link', () => {
    const u = new URL(googleCalendarUrl(m));
    expect(u.searchParams.get('dates')).toBe('20261005T043000Z/20261005T053000Z');
    expect(u.searchParams.get('text')).toBe('Site visit: Line 3');
    expect(u.searchParams.get('location')).toBe('https://meet.example/abc');
    expect(u.searchParams.get('details')).toContain('Join: https://meet.example/abc');
  });

  it('builds Outlook and Teams links with ISO times', () => {
    const o = new URL(outlookCalendarUrl(m));
    expect(o.host).toBe('outlook.office.com');
    expect(o.searchParams.get('startdt')).toBe('2026-10-05T04:30:00Z');
    expect(new URL(outlookCalendarUrl(m, false)).host).toBe('outlook.live.com');
    const t = new URL(teamsMeetingUrl(m, ['a@x.com', 'b@y.com']));
    expect(t.searchParams.get('attendees')).toBe('a@x.com,b@y.com');
    expect(t.searchParams.get('endTime')).toBe('2026-10-05T05:30:00Z');
  });

  it('shares the same text by email and WhatsApp', () => {
    const text = meetingText(m);
    expect(text).toContain('Join: https://meet.example/abc');
    expect(text).toContain('Organiser: Ravi K');
    expect(mailtoUrl(m, ['a@x.com'])).toMatch(
      /^mailto:a%40x\.com\?subject=Meeting%3A%20Site%20visit/,
    );
    expect(whatsappUrl(m, '+91 98200 11234')).toMatch(/^https:\/\/wa\.me\/919820011234\?text=/);
    expect(whatsappUrl(m)).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});
