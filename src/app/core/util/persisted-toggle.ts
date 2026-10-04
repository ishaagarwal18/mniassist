import { WritableSignal, signal } from '@angular/core';

/**
 * An on/off choice remembered in this browser (a collapsed pane, say). Storage
 * can be blocked (private windows, strict settings); then the choice simply
 * lasts until the page is reloaded.
 */
export function persistedToggle(
  key: string,
  initial = false,
): WritableSignal<boolean> & { toggle(): void } {
  let start = initial;
  try {
    const v = localStorage.getItem(key);
    if (v !== null) start = v === '1';
  } catch {
    /* storage blocked */
  }
  const s = signal(start) as WritableSignal<boolean> & { toggle(): void };
  const set = s.set.bind(s);
  s.set = (value: boolean) => {
    set(value);
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch {
      /* storage blocked */
    }
  };
  s.update = (fn: (v: boolean) => boolean) => s.set(fn(s()));
  s.toggle = () => s.set(!s());
  return s;
}
