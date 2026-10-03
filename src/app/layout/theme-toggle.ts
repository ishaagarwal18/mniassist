import { ChangeDetectionStrategy, Component, booleanAttribute, inject, input } from '@angular/core';

import { ThemeService } from '../core/services/theme.service';
import { Theme } from '../core/services/theme-logic';
import { ArIcon } from '../ui';

/**
 * The light/dark switch. A two-option segmented control rather than a single
 * toggle button, so the current choice is always visible and both options are
 * one click away. `compact` drops the labels for tight spots like the top bar.
 */
@Component({
  selector: 'ar-theme-toggle',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.tt--compact]': 'compact()' },
  template: `
    <div class="tt" role="radiogroup" aria-label="Theme">
      @for (o of options; track o.value) {
        <button
          type="button"
          class="tt__opt"
          role="radio"
          [class.tt__opt--on]="theme.theme() === o.value"
          [attr.aria-checked]="theme.theme() === o.value"
          [attr.aria-label]="o.label + ' theme'"
          [attr.title]="compact() ? o.label + ' theme' : null"
          (click)="pick(o.value, $event)"
        >
          <ar-icon [name]="o.icon" [size]="14" />
          @if (!compact()) {
            <span>{{ o.label }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    .tt {
      display: inline-flex;
      gap: 2px;
      padding: 2px;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-100);
    }
    .tt__opt {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 26px;
      padding: 0 10px;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: var(--ar-ink-500);
      font: 500 12px var(--ar-font-sans);
      cursor: pointer;
      transition:
        background var(--ar-ease),
        color var(--ar-ease);
    }
    :host(.tt--compact) .tt__opt {
      width: 28px;
      padding: 0;
      justify-content: center;
    }
    .tt__opt:hover {
      color: var(--ar-ink-900);
    }
    .tt__opt--on {
      background: var(--ar-white);
      color: var(--ar-ink-900);
      box-shadow: var(--ar-shadow-card);
    }
    .tt__opt:focus-visible {
      outline: 2px solid var(--ar-blue-500);
      outline-offset: 1px;
    }
  `,
})
export class ArThemeToggle {
  protected readonly theme = inject(ThemeService);
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly options: readonly { value: Theme; label: string; icon: 'sun' | 'moon' }[] = [
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
  ];

  protected pick(value: Theme, event: Event): void {
    // Inside menus and popovers, a click here must not also close them.
    event.stopPropagation();
    this.theme.set(value);
  }
}
