import { EMPTY_FORM, inputFrom, is24x7, week24x7 } from './auto-reply.logic';

describe('24x7 auto-replies', () => {
  it('reads a week open all day as 24x7, and normal hours as not', () => {
    expect(is24x7(week24x7())).toBe(true);
    expect(is24x7(EMPTY_FORM.days)).toBe(false);
  });

  it('sends the 24x7 schedule as all-day hours the API understands', () => {
    const input = inputFrom({ ...EMPTY_FORM, days: week24x7() });
    expect(typeof input).not.toBe('string');
    if (typeof input === 'string') return;
    expect(input.days.every((d) => d.isOpen && d.opens === '00:00' && d.closes === '00:00')).toBe(
      true,
    );
  });

  it('needs the acknowledgement text when it is switched on', () => {
    expect(
      inputFrom({ ...EMPTY_FORM, acknowledgementEnabled: true, acknowledgementText: ' ' }),
    ).toBe('Write the 24x7 acknowledgement, or switch it off.');
    const ok = inputFrom({
      ...EMPTY_FORM,
      acknowledgementEnabled: true,
      acknowledgementText: '  Got it, thanks!  ',
    });
    expect(typeof ok === 'string' ? ok : ok.acknowledgementText).toBe('Got it, thanks!');
  });
});
