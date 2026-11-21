import { checkOnLeave } from './form-validation';

function field(html: string): HTMLInputElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.querySelector('input')!;
}

const message = (el: HTMLElement) =>
  el.closest('label')?.querySelector('.ar-field__error')?.textContent ?? null;

describe('check a field on leaving it', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('flags a mistyped email at once', () => {
    const el = field(
      '<label><span class="ar-field__label">Email</span><input type="email" /></label>',
    );
    el.value = 'ravi@';
    checkOnLeave(el);
    expect(message(el)).toContain('valid email');
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });

  it('flags a phone number with too few digits', () => {
    const el = field(
      '<label><span class="ar-field__label">Mobile</span><input type="tel" /></label>',
    );
    el.value = '98765';
    checkOnLeave(el);
    expect(message(el)).toContain('8 to 15 digits');
  });

  it('does not nag about an empty required field the person only tabbed past', () => {
    const el = field('<label><span class="ar-field__label">Name</span><input required /></label>');
    checkOnLeave(el);
    expect(message(el)).toBeNull();
  });

  it('clears the message once the value is fixed', () => {
    const el = field(
      '<label><span class="ar-field__label">Email</span><input type="email" /></label>',
    );
    el.value = 'ravi@';
    checkOnLeave(el);
    el.value = 'ravi@plant.in';
    checkOnLeave(el);
    expect(message(el)).toBeNull();
    expect(el.hasAttribute('aria-invalid')).toBe(false);
  });

  it('skips read-only fields and opted-out sections', () => {
    const ro = field('<label><input type="email" readonly /></label>');
    ro.value = 'x';
    checkOnLeave(ro);
    expect(message(ro)).toBeNull();
    const off = field('<div data-novalidate><label><input type="email" /></label></div>');
    off.value = 'x';
    checkOnLeave(off);
    expect(message(off)).toBeNull();
  });
});
