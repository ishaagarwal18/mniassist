import { ChangeDetectionStrategy, Component, HostListener, input, signal } from '@angular/core';
import { ArIcon } from '../ui';

/**
 * Every screen's header, and — since `help` is set on essentially every call
 * site — the one place a screen-level explanation lives. Keeping it here
 * rather than a `<ar-help>` scattered per-screen means every page gets the
 * same affordance in the same place, and a screen simply forgetting to pass
 * `help` is the only way one goes without it.
 */
@Component({
  selector: 'ar-topbar',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tb__titles">
      <div class="tb__title-row">
        <h1 class="tb__title">{{ title() }}</h1>
        @if (help()) {
          <button
            type="button"
            class="tb__help"
            [class.tb__help--on]="open()"
            [attr.aria-expanded]="open()"
            [attr.aria-label]="'About ' + title()"
            (click)="toggle($event)"
          >
            <ar-icon name="help" [size]="14" />
          </button>
        }
      </div>
      @if (subtitle()) { <p class="tb__sub">{{ subtitle() }}</p> }
    </div>
    <div class="tb__actions"><ng-content /></div>

    @if (open()) {
      <div class="tb__pop" role="tooltip" (click)="$event.stopPropagation()">
        <p class="tb__pop-title">{{ title() }}</p>
        <p class="tb__pop-body">{{ help() }}</p>
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      height: 56px; flex: none; display: flex; align-items: center; gap: 16px;
      padding: 0 22px; background: var(--ar-white);
      border-bottom: 1px solid var(--ar-line-200);
    }
    .tb__titles { flex: 1; min-width: 0; }
    .tb__title-row { display: flex; align-items: center; gap: 7px; }
    .tb__title { margin: 0; font: 600 15.5px var(--ar-font-sans); letter-spacing: -.015em; color: var(--ar-ink-900); }
    .tb__sub { margin: 1px 0 0; font: 400 11.5px var(--ar-font-sans); color: var(--ar-ink-400); }
    .tb__actions { display: flex; align-items: center; gap: 10px; }

    .tb__help {
      flex: none; width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--ar-line-300); background: var(--ar-bg-50);
      color: var(--ar-ink-400); cursor: pointer; padding: 0;
    }
    .tb__help:hover, .tb__help--on {
      color: var(--ar-teal-600); border-color: var(--ar-teal-600); background: var(--ar-teal-100);
    }

    .tb__pop {
      position: absolute; top: 46px; left: 22px; z-index: 30;
      width: min(340px, calc(100vw - 44px));
      background: var(--ar-white); border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card); box-shadow: var(--ar-shadow-pop);
      padding: 12px 14px 13px;
    }
    .tb__pop-title { margin: 0 0 4px; font: 600 12.5px var(--ar-font-sans); color: var(--ar-ink-900); }
    .tb__pop-body { margin: 0; font: 400 12.5px/1.55 var(--ar-font-sans); color: var(--ar-ink-500); }
  `,
})
export class ArTopbar {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);

  /** A short, screen-specific explanation shown from the help popover. Omit
   *  only for a screen genuinely too simple to need one. */
  readonly help = input<string | null>(null);

  protected readonly open = signal(false);

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    if (this.open()) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }
}
