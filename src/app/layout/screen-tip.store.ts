import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { CurrentUserService } from '../core/services/current-user.service';
import { TipState, readTips, writeTips } from './screen-tip.logic';

/**
 * The "New to this screen?" tip state for the signed-in person: shared by the tip card (which
 * hides tips) and the help panel (which turns them back on).
 */
@Injectable({ providedIn: 'root' })
export class ScreenTipStore {
  private readonly account = inject(CurrentUserService);
  readonly state = signal<TipState>({ off: false, seen: [] });

  constructor() {
    // Each person keeps their own seen list; it loads once the user id is known.
    effect(() => {
      const id = this.account.id();
      untracked(() => this.state.set(readTips(id)));
    });
  }

  dismiss(id: string): void {
    const s = this.state();
    if (!s.seen.includes(id)) this.save({ ...s, seen: [...s.seen, id] });
  }

  turnOff(): void {
    this.save({ ...this.state(), off: true });
  }

  /** Tips on again, and every screen's tip shows once more. */
  turnOn(): void {
    this.save({ off: false, seen: [] });
  }

  private save(next: TipState): void {
    this.state.set(next);
    writeTips(this.account.id(), next);
  }
}
