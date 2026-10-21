import { ChangeDetectionStrategy, Component, booleanAttribute, inject, input } from '@angular/core';

import { APP_LANGUAGES, AppLanguage, LanguageService } from '../core/i18n/language.service';

/**
 * The language switch: English, हिन्दी, मराठी, ગુજરાતી. A segmented control like the theme switch, so the
 * current language is always visible and the others are one click away. Each option is written in
 * its own language, so someone who can't read the current one can still find theirs. `compact`
 * shows short names for the header.
 */
@Component({
  selector: 'ar-language-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.ls--compact]': 'compact()' },
  template: `
    <div class="ls" role="radiogroup" translate="no" [attr.aria-label]="i18n.t('Language')">
      @for (o of options; track o.code) {
        <button
          type="button"
          class="ls__opt"
          role="radio"
          [attr.lang]="o.code"
          [class.ls__opt--on]="i18n.lang() === o.code"
          [attr.aria-checked]="i18n.lang() === o.code"
          [attr.aria-label]="o.label"
          [attr.title]="o.label"
          (click)="pick(o.code, $event)"
        >
          {{ compact() ? o.short : o.label }}
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    .ls {
      display: inline-flex;
      gap: 2px;
      padding: 2px;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-100);
    }
    .ls__opt {
      height: 26px;
      padding: 0 10px;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: var(--ar-ink-500);
      font: 500 12px var(--ar-font-sans);
      cursor: pointer;
      white-space: nowrap;
      transition:
        background var(--ar-ease),
        color var(--ar-ease);
    }
    :host(.ls--compact) .ls__opt {
      min-width: 28px;
      padding: 0 6px;
    }
    .ls__opt:hover {
      color: var(--ar-ink-900);
    }
    .ls__opt--on {
      background: var(--ar-white);
      color: var(--ar-ink-900);
      box-shadow: var(--ar-shadow-card);
    }
    .ls__opt:focus-visible {
      outline: 2px solid var(--ar-blue-500);
      outline-offset: 1px;
    }
  `,
})
export class ArLanguageSwitch {
  protected readonly i18n = inject(LanguageService);
  readonly compact = input(false, { transform: booleanAttribute });
  protected readonly options = APP_LANGUAGES;

  protected pick(code: AppLanguage, event: Event): void {
    // Inside menus, a click here must not also close them.
    event.stopPropagation();
    this.i18n.set(code);
  }
}
