import { textToEmailHtml } from './email-contact-dialog';
import { dateOnly } from '../project-billing/guarantees-panel';

describe('email a contact', () => {
  it('turns typed paragraphs into HTML and escapes markup', () => {
    expect(textToEmailHtml('Hello Asha,\n\nThe <quote> is ready.\nThanks')).toBe(
      '<p>Hello Asha,</p>\n<p>The &lt;quote&gt; is ready.<br>Thanks</p>',
    );
  });

  it('trims the edges', () => {
    expect(textToEmailHtml('  \n Hi \n\n')).toBe('<p>Hi</p>');
  });
});

describe('bank guarantee edit', () => {
  it('reads the date part of an ISO date-time', () => {
    expect(dateOnly('2027-03-31T00:00:00')).toBe('2027-03-31');
    expect(dateOnly('2027-03-31')).toBe('2027-03-31');
  });
});
