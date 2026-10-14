import { describe, expect, it } from 'vitest';

import { parseEmbeddedSignupMessage } from './facebook-sdk';

const msg = (origin: string, data: unknown) => new MessageEvent('message', { origin, data });

describe('parseEmbeddedSignupMessage', () => {
  it('reads the WABA, number and business from a FINISH message', () => {
    const r = parseEmbeddedSignupMessage(
      msg(
        'https://www.facebook.com',
        JSON.stringify({
          type: 'WA_EMBEDDED_SIGNUP',
          event: 'FINISH',
          data: { phone_number_id: '111', waba_id: '222', business_id: '333' },
        }),
      ),
    );
    expect(r).toEqual({
      kind: 'finish',
      data: { phoneNumberId: '111', wabaId: '222', businessId: '333' },
    });
  });

  it('reports a cancel with the step it stopped at', () => {
    const r = parseEmbeddedSignupMessage(
      msg('https://web.facebook.com', {
        type: 'WA_EMBEDDED_SIGNUP',
        event: 'CANCEL',
        data: { current_step: 'PHONE_NUMBER_SETUP' },
      }),
    );
    expect(r).toEqual({ kind: 'cancel', step: 'PHONE_NUMBER_SETUP' });
  });

  it('treats a FINISH without a number as an error', () => {
    const r = parseEmbeddedSignupMessage(
      msg('https://www.facebook.com', { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: {} }),
    );
    expect(r?.kind).toBe('error');
  });

  it('ignores messages from other origins and other message types', () => {
    const body = JSON.stringify({
      type: 'WA_EMBEDDED_SIGNUP',
      event: 'FINISH',
      data: { phone_number_id: '1', waba_id: '2' },
    });
    expect(parseEmbeddedSignupMessage(msg('https://evil-facebook.com', body))).toBeNull();
    expect(parseEmbeddedSignupMessage(msg('https://facebook.com.evil.io', body))).toBeNull();
    expect(parseEmbeddedSignupMessage(msg('https://www.facebook.com', 'not json'))).toBeNull();
    expect(
      parseEmbeddedSignupMessage(msg('https://www.facebook.com', { type: 'OTHER' })),
    ).toBeNull();
  });
});
