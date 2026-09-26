import { describe, expect, it } from 'vitest';

import { checkTicketAnswers } from './ticket-portal-logic';

const good = { name: 'Asha Rao', phone: '9812345678', subject: 'Motor overheating', consent: true };

describe('checkTicketAnswers', () => {
  it('finds nothing wrong with a complete answer', () => {
    expect(checkTicketAnswers(good)).toEqual({});
  });

  it('names each blank required field', () => {
    const errors = checkTicketAnswers({ name: '', phone: '  ', subject: '', consent: true });
    expect(Object.keys(errors)).toEqual(['name', 'phone', 'subject']);
  });

  it('requires the consent tick separately from the text fields', () => {
    const errors = checkTicketAnswers({ ...good, consent: false });
    expect(Object.keys(errors)).toEqual(['consent']);
  });
});
