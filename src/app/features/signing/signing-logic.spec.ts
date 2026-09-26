import { SignatureRequestStatus } from '../../proxy/pipeline';
import {
  SIGNATURE_STATUS_LABEL,
  apiMessage,
  mailtoShareLink,
  padPoint,
  safeColor,
  shareText,
  signingUrl,
  whatsappShareLink,
} from './signing-logic';

describe('signature pad points', () => {
  const rect = { left: 100, top: 50, width: 300, height: 100 };

  it('maps the pointer onto the canvas however the canvas is scaled', () => {
    expect(padPoint(250, 100, rect, 600, 200)).toEqual({ x: 300, y: 100 });
    expect(padPoint(100, 50, rect, 600, 200)).toEqual({ x: 0, y: 0 });
  });

  it('keeps a stroke that leaves the pad on its edge', () => {
    expect(padPoint(9999, -50, rect, 600, 200)).toEqual({ x: 600, y: 0 });
  });

  it('survives a pad with no size yet', () => {
    expect(() =>
      padPoint(10, 10, { left: 0, top: 0, width: 0, height: 0 }, 600, 200),
    ).not.toThrow();
  });
});

describe('branding colours', () => {
  it('accepts a plain hex colour and refuses anything that could carry style', () => {
    expect(safeColor('#1a2B3c', '#000000')).toBe('#1a2B3c');
    expect(safeColor('red', '#000000')).toBe('#000000');
    expect(safeColor('#123; background:url(x)', '#000000')).toBe('#000000');
    expect(safeColor(null, '#111111')).toBe('#111111');
  });
});

describe('sharing the link', () => {
  const url = signingUrl('https://app.example.com/', '/sign/host.abc');

  it('builds the full address without doubling the slash', () => {
    expect(url).toBe('https://app.example.com/sign/host.abc');
  });

  it('words the message with the reference and who it is from', () => {
    expect(shareText('QTN-1', 'Asha', url, 'Sun Energy')).toContain(
      'quotation QTN-1 from Sun Energy',
    );
    expect(shareText('QTN-1', 'Asha', url)).not.toContain(' from ');
  });

  it('makes a WhatsApp link from the digits of a phone number, or none', () => {
    const text = shareText('QTN-1', 'Asha', url);
    expect(whatsappShareLink('+91 98000-00000', text)).toMatch(
      /^https:\/\/wa\.me\/919800000000\?text=/,
    );
    expect(whatsappShareLink('12345', text)).toBeNull();
    expect(whatsappShareLink(null, text)).toBeNull();
  });

  it('makes a mail link only for something that looks like an address', () => {
    expect(mailtoShareLink('asha@example.com', 'Sign', 'hi')).toMatch(
      /^mailto:asha@example.com\?subject=Sign&body=hi$/,
    );
    expect(mailtoShareLink('nope', 'Sign', 'hi')).toBeNull();
  });
});

describe('status wording and errors', () => {
  it('has words for every status', () => {
    expect(Object.keys(SIGNATURE_STATUS_LABEL)).toHaveLength(5);
    expect(SIGNATURE_STATUS_LABEL[SignatureRequestStatus.Voided]).toBe('Withdrawn');
  });

  it('shows the servers message, or the fallback when there is none', () => {
    expect(apiMessage({ error: { error: { message: 'This link has expired.' } } }, 'x')).toBe(
      'This link has expired.',
    );
    expect(apiMessage({}, 'Something went wrong.')).toBe('Something went wrong.');
    expect(apiMessage({ error: { error: { message: 'y'.repeat(500) } } }, 'short')).toBe('short');
  });
});
