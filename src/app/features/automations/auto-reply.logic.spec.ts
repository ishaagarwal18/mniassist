import type { UpdateAutoReplySettingsInput } from '../../proxy/messaging/models';
import {
  EMPTY_FORM,
  formFrom,
  inputFrom,
  localDate,
  nowLine,
  zonedMidnightUtc,
} from './auto-reply.logic';

describe('auto-reply settings', () => {
  it('converts a closure in India time to UTC and back', () => {
    expect(zonedMidnightUtc('2026-11-07', 'Asia/Kolkata')).toBe('2026-11-06T18:30:00.000Z');
    expect(localDate('2026-11-06T18:30:00.000Z', 'Asia/Kolkata')).toBe('2026-11-07');

    const input = inputFrom({
      ...EMPTY_FORM,
      outOfOfficeEnabled: true,
      outOfOfficeText: 'Closed for Diwali',
      oooFrom: '2026-11-07',
      oooTo: '2026-11-11',
    });
    expect(input).toMatchObject({
      outOfOfficeFromUtc: '2026-11-06T18:30:00.000Z',
      // The end is the midnight after the last closed day.
      outOfOfficeToUtc: '2026-11-11T18:30:00.000Z',
    });

    const back = formFrom({
      ...(input as UpdateAutoReplySettingsInput),
      openNow: true,
      replyingNowWith: null,
    });
    expect(back.oooFrom).toBe('2026-11-07');
    expect(back.oooTo).toBe('2026-11-11');
  });

  it('refuses a reply switched on without its text, and duplicate holidays', () => {
    expect(inputFrom({ ...EMPTY_FORM, awayEnabled: true, awayText: ' ' })).toContain(
      'away message',
    );
    expect(
      inputFrom({
        ...EMPTY_FORM,
        holidays: [
          { date: '2026-10-20', name: 'Dussehra' },
          { date: '2026-10-20', name: 'Again' },
        ],
      }),
    ).toContain('once');
  });

  it('sends closed days without times', () => {
    const input = inputFrom(EMPTY_FORM);
    expect(typeof input).toBe('object');
    const sunday = (
      input as { days: { day: number; isOpen: boolean; opens?: string | null }[] }
    ).days.find((d) => d.day === 0);
    expect(sunday).toEqual({ day: 0, isOpen: false, opens: null, closes: null });
  });

  it('says what a customer writing now would get', () => {
    const base = { ...(inputFrom(EMPTY_FORM) as UpdateAutoReplySettingsInput), openNow: false };
    expect(nowLine({ ...base, replyingNowWith: 2 })).toContain('away reply');
    expect(nowLine({ ...base, openNow: true, replyingNowWith: null })).toContain('Open now');
  });
});
