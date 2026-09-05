import { DestroyRef, inject, signal, Signal } from '@angular/core';

/** A signal that re-emits on an interval, so time-derived values (service
 *  window countdowns, SLA timers) recompute without manual change detection.
 *  Cleans itself up with the injection context's DestroyRef. */
export function tickingNow(everyMs = 30_000): Signal<Date> {
  const now = signal(new Date());
  const id = setInterval(() => now.set(new Date()), everyMs);
  inject(DestroyRef).onDestroy(() => clearInterval(id));
  return now.asReadonly();
}
