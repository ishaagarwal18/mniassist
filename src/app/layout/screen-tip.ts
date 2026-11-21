import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CurrentUserService } from '../core/services/current-user.service';
import { ArIcon } from '../ui/icon';
import { PageContextService } from './page-context.service';
import { TipState, readTips, tipFor, writeTips } from './screen-tip.logic';

/**
 * "New to this screen?" — shown once per screen, floating in the corner: what the screen is for,
 * the first three steps, and a way into the full help. Built from the help topics the help
 * panel already shows, so there is one source of help text.
 */
@Component({
  selector: 'ar-screen-tip',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tip(); as t) {
      <aside class="st" role="complementary" aria-label="Tip for this screen">
        <div class="st__head">
          <ar-icon name="help" [size]="16" />
          <strong class="st__title">New to this screen?</strong>
          <button type="button" class="st__close" aria-label="Close tip" (click)="dismiss(t.id)">
            <ar-icon name="close" [size]="14" />
          </button>
        </div>
        @if (t.summary) {
          <p class="st__summary">{{ t.summary }}</p>
        }
        @if (t.steps.length) {
          <p class="st__label">How to start</p>
          <ol class="st__steps">
            @for (s of t.steps; track $index) {
              <li>{{ s }}</li>
            }
          </ol>
        }
        <div class="st__actions">
          <button type="button" class="st__link" (click)="turnOff()">Don't show tips</button>
          <span class="st__gap"></span>
          <button type="button" class="st__more" (click)="openHelp($event, t.id)">Full help</button>
          <button type="button" class="st__ok" (click)="dismiss(t.id)">Got it</button>
        </div>
      </aside>
    }
  `,
  styleUrl: './screen-tip.scss',
})
export class ArScreenTip {
  private readonly page = inject(PageContextService);
  private readonly account = inject(CurrentUserService);
  private readonly state = signal<TipState>({ off: false, seen: [] });

  constructor() {
    // Each person keeps their own seen list; it loads once the user id is known.
    effect(() => {
      const id = this.account.id();
      untracked(() => this.state.set(readTips(id)));
    });
  }

  /** Hidden while the help panel is open: the full help is already on screen. */
  protected readonly tip = computed(() =>
    this.page.helpOpen() || !this.account.id()
      ? null
      : tipFor(this.page.activeRoutePath(), this.page.topic(), this.page.summary(), this.state()),
  );

  protected dismiss(id: string): void {
    const s = this.state();
    this.save({ ...s, seen: [...s.seen, id] });
  }

  protected turnOff(): void {
    this.save({ ...this.state(), off: true });
  }

  protected openHelp(event: Event, id: string): void {
    // The right sidebar closes its help panel on any document click; keep this one from reaching it.
    event.stopPropagation();
    this.dismiss(id);
    if (!this.page.helpOpen()) this.page.toggleHelp();
  }

  private save(next: TipState): void {
    this.state.set(next);
    writeTips(this.account.id(), next);
  }
}
