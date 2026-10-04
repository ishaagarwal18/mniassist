/**
 * Shared plumbing for the directives that put a Syncfusion control in place of
 * a native form control (select.ts, date-input.ts).
 *
 * The native control stays in the DOM, hidden, and remains the source of truth:
 * templates keep binding `[value]`, `[selected]`, `(change)` and ngModel to it
 * exactly as before. The Syncfusion control mirrors it after each render, and
 * when the user picks something it writes the native value back and fires the
 * native `input` and `change` events, so every existing handler runs unchanged.
 */

/** Copies what the screen's own styles and assistive technology rely on. */
export function adoptNativeLook(
  native: HTMLElement,
  wrapper: HTMLElement,
  input: HTMLElement,
): void {
  for (const cls of Array.from(native.classList)) wrapper.classList.add(cls);
  // Component styles are scoped by the _ngcontent-* attribute; without it the
  // screen's layout rules (width, flex, margins) would not reach the wrapper.
  for (const attr of Array.from(native.attributes)) {
    if (attr.name.startsWith('_ngcontent-')) wrapper.setAttribute(attr.name, '');
  }
  const label =
    native.getAttribute('aria-label') ||
    Array.from((native as HTMLInputElement).labels ?? [])
      .map((l) => l.textContent?.trim())
      .filter(Boolean)
      .join(' ');
  if (label) input.setAttribute('aria-label', label);
  const title = native.getAttribute('title');
  if (title) wrapper.title = title;
}

/**
 * The width the Syncfusion wrapper should take: the native control's own width,
 * or 100% when it filled its container (or isn't laid out yet). A content-sized
 * control gets a little more room, as Syncfusion's icons are wider than the
 * native arrow and would otherwise cut the text short.
 */
const ICON_ROOM = 16;

export function nativeWidth(native: HTMLElement): string {
  const width = native.getBoundingClientRect().width;
  const parent = native.parentElement;
  if (!width || !parent) return '100%';
  const style = getComputedStyle(parent);
  const inner =
    parent.clientWidth -
    parseFloat(style.paddingLeft || '0') -
    parseFloat(style.paddingRight || '0');
  return Math.abs(inner - width) < 2 ? '100%' : `${Math.ceil(width) + ICON_ROOM}px`;
}

/** Hide the native control from sight, focus and assistive technology. */
export function hideNative(native: HTMLElement): void {
  native.style.display = 'none';
  native.setAttribute('aria-hidden', 'true');
  native.tabIndex = -1;
}

/** Write a value to the native control and let its listeners know. */
export function commitNative(native: HTMLInputElement | HTMLSelectElement, value: string): void {
  native.value = value;
  native.dispatchEvent(new Event('input', { bubbles: true }));
  native.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Keeps the wrapper right after the native control. Angular moves the native
 * node when an @for reorders rows, and knows nothing of the wrapper.
 */
export function keepBeside(native: HTMLElement, wrapper: HTMLElement): void {
  if (native.nextElementSibling !== wrapper && native.parentNode) {
    native.after(wrapper);
  }
}
