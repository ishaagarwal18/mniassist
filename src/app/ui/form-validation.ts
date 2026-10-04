import {
  Directive,
  ElementRef,
  OnDestroy,
  afterEveryRender,
  afterNextRender,
  inject,
} from '@angular/core';

/**
 * Form checks for every dialog (ArDialog runs them) and any page that opts in
 * with `arForm`. They use the rules already written on the fields — `required`,
 * `type="email"`, `type="url"`, `min`/`max`, `minlength`/`maxlength`, `pattern` —
 * plus a phone-number check for `type="tel"`. When the main button is pressed
 * and something is wrong, the click is stopped before the screen's own handler
 * runs, each problem is written under its field, and the first one gets focus.
 * Editing a field clears its message.
 *
 * A button counts as "main" when it is the dialog's primary (or danger) button,
 * or carries `arSubmit`. `data-novalidate` on a button lets it through
 * (a "Save draft", say); on a container, it skips the fields inside.
 */

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const FIELD_SELECTOR = 'input, select, textarea';
const ERROR_CLASS = 'ar-field__error';

/** Digits, spaces, dashes, dots, brackets and a leading +; 8 to 15 digits. */
function phoneProblem(value: string): string | null {
  if (!value.trim()) return null;
  if (!/^\+?[\d\s\-().]+$/.test(value))
    return 'Use digits only, with an optional + and country code.';
  const digits = value.replace(/\D/g, '').length;
  return digits < 8 || digits > 15
    ? 'Enter a full phone number, 8 to 15 digits with country code.'
    : null;
}

function labelOf(el: Field): string {
  const label = el.labels?.[0] ?? el.closest('label');
  const text =
    label?.querySelector('.ar-field__label, .fld__k, span')?.textContent ??
    label?.textContent ??
    '';
  return text.replace(/\boptional\b.*$/i, '').trim();
}

/** What is wrong with a field, in words, or null. */
export function problemWith(el: Field): string | null {
  if (el.disabled || el.closest('[data-novalidate]')) return null;
  if (
    el instanceof HTMLInputElement &&
    ['hidden', 'button', 'submit', 'reset', 'file'].includes(el.type)
  ) {
    return el.type === 'file' && el.required && !el.files?.length ? 'Choose a file.' : null;
  }
  const v = el.validity;
  const name = labelOf(el);
  if (v.valueMissing) {
    if (el instanceof HTMLSelectElement)
      return name ? `Choose ${name.toLowerCase()}.` : 'Choose an option.';
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      return 'Tick this to continue.';
    }
    return name ? `${name} is required.` : 'This is required.';
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const value = el.value;
    if (!value.trim() && el.required) return name ? `${name} is required.` : 'This is required.';
    if (v.typeMismatch) {
      if (el.type === 'email') return 'Enter a valid email address, like name@company.com.';
      if (el.type === 'url') return 'Enter a full web address, starting with https://.';
      return 'This does not look right.';
    }
    if (v.tooShort) return `Use at least ${el.minLength} characters.`;
    if (v.tooLong) return `Use at most ${el.maxLength} characters.`;
    if (v.rangeUnderflow) return `Must be ${(el as HTMLInputElement).min} or more.`;
    if (v.rangeOverflow) return `Must be ${(el as HTMLInputElement).max} or less.`;
    if (v.stepMismatch) return 'Enter a whole number.';
    if (v.badInput) return 'Enter a number.';
    if (v.patternMismatch) return el.title || 'This does not look right.';
    if (el instanceof HTMLInputElement && el.type === 'tel') return phoneProblem(value);
    if (el.required && el.minLength < 0 && value.trim().length === 0) return 'This is required.';
  }
  return v.valid ? null : el.validationMessage || 'This does not look right.';
}

/** Where the message goes: under the field's row. */
function holderOf(el: Field): HTMLElement {
  return (el.closest('.ar-field, label, .fld, .field') as HTMLElement | null) ?? el.parentElement!;
}

/** The thing the user sees: a Syncfusion picker sits right after the hidden native control. */
function visibleOf(el: Field): HTMLElement {
  const next = el.nextElementSibling as HTMLElement | null;
  return el.style.display === 'none' && next?.classList.contains('e-input-group') ? next : el;
}

export function clearProblem(el: Field): void {
  el.removeAttribute('aria-invalid');
  visibleOf(el).classList.remove('e-error', 'ar-invalid');
  holderOf(el).querySelector(`:scope > .${ERROR_CLASS}`)?.remove();
}

function showProblem(el: Field, message: string): void {
  el.setAttribute('aria-invalid', 'true');
  const shown = visibleOf(el);
  shown.classList.add('ar-invalid');
  if (shown !== el) shown.classList.add('e-error');
  const holder = holderOf(el);
  let note = holder.querySelector<HTMLElement>(`:scope > .${ERROR_CLASS}`);
  if (!note) {
    note = document.createElement('span');
    note.className = ERROR_CLASS;
    note.setAttribute('role', 'alert');
    holder.appendChild(note);
  }
  note.textContent = message;
  const clear = () => clearProblem(el);
  el.addEventListener('input', clear, { once: true });
  el.addEventListener('change', clear, { once: true });
}

/**
 * Clears messages on fields that are now fine. Run after each render, so a value
 * set by code (a form filled from a vCard, say) drops its stale message too.
 */
export function recheckMarked(root: ParentNode): void {
  for (const el of Array.from(root.querySelectorAll<Field>('[aria-invalid="true"]'))) {
    if (el.matches(FIELD_SELECTOR) && !problemWith(el)) clearProblem(el);
  }
}

/** Checks every field under root; marks the problems and focuses the first. True when all is well. */
export function validateWithin(root: ParentNode): boolean {
  let first: HTMLElement | null = null;
  for (const el of Array.from(root.querySelectorAll<Field>(FIELD_SELECTOR))) {
    const problem = problemWith(el);
    if (problem) {
      showProblem(el, problem);
      first ??= visibleOf(el);
    } else if (el.getAttribute('aria-invalid') === 'true') {
      clearProblem(el);
    }
  }
  if (first) {
    const target = first.matches(FIELD_SELECTOR)
      ? first
      : first.querySelector<HTMLElement>('input');
    target?.focus();
    first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return false;
  }
  return true;
}

/** Whether a click on this element should run the checks first. */
export function isSubmitClick(
  target: EventTarget | null,
  primaryCounts: boolean,
): HTMLButtonElement | null {
  const button = (target as HTMLElement | null)?.closest?.('button') as HTMLButtonElement | null;
  if (!button || button.disabled || button.hasAttribute('data-novalidate')) return null;
  if (button.hasAttribute('arsubmit') || button.type === 'submit') return button;
  if (
    primaryCounts &&
    (button.classList.contains('e-primary') || button.classList.contains('e-danger'))
  ) {
    return button;
  }
  return null;
}

/**
 * Opt a page section in: `<section arForm> … <button arSubmit>Save</button></section>`.
 * The same checks as a dialog run when the arSubmit (or type=submit) button is pressed.
 */
@Directive({ selector: '[arForm]' })
export class ArForm implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly onClick = (e: Event) => {
    if (isSubmitClick(e.target, false) && !validateWithin(this.host)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };

  constructor() {
    afterNextRender(() => this.host.addEventListener('click', this.onClick, true));
    afterEveryRender(() => recheckMarked(this.host));
  }

  ngOnDestroy(): void {
    this.host.removeEventListener('click', this.onClick, true);
  }
}
