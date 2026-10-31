import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  booleanAttribute,
  inject,
  input,
} from '@angular/core';
import { APP_LANGUAGES, LanguageService } from '../core/i18n/language.service';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'ar-appearance-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.preferences--compact]': 'compact()' },
  template: `
    <details>
      <summary>
        {{ i18n.t('Language') }} &amp;
        {{ i18n.t('Theme') }}
      </summary>
      <div class="preferences__panel" role="menu" [attr.aria-label]="i18n.t('Language')">
        <div class="preferences__group" role="group" [attr.aria-label]="i18n.t('Language')">
          <span class="preferences__heading">{{ i18n.t('Language') }}</span>
          @for (language of languages; track language.code) {
            <button
              type="button"
              role="menuitemradio"
              class="preferences__item"
              [attr.aria-checked]="i18n.lang() === language.code"
              [attr.lang]="language.code"
              translate="no"
              (click)="setLanguage(language.code)"
            >
              <span class="preferences__tick" aria-hidden="true">{{
                i18n.lang() === language.code ? '✓' : ''
              }}</span>
              {{ language.label }}
            </button>
          }
        </div>
        <div class="preferences__group" role="group" [attr.aria-label]="i18n.t('Theme')">
          <span class="preferences__heading">{{ i18n.t('Theme') }}</span>
          @for (option of themes; track option.value) {
            <button
              type="button"
              role="menuitemradio"
              class="preferences__item"
              [attr.aria-checked]="theme.theme() === option.value"
              (click)="setTheme(option.value)"
            >
              <span class="preferences__tick" aria-hidden="true">{{
                theme.theme() === option.value ? '✓' : ''
              }}</span>
              {{ i18n.t(option.label) }}
            </button>
          }
        </div>
      </div>
    </details>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      color: inherit;
    }
    summary {
      padding: 8px 10px;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      font: 500 12px var(--ar-font-sans);
      white-space: nowrap;
      cursor: pointer;
    }
    summary:focus-visible {
      outline: 2px solid var(--ar-primary);
      outline-offset: 2px;
    }
    .preferences__panel {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      z-index: 20;
      display: grid;
      gap: 12px;
      width: 190px;
      max-width: calc(100vw - 32px);
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      background: var(--ar-white);
      color: var(--ar-ink-900);
      box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
    }
    .preferences__group {
      display: grid;
      gap: 2px;
    }
    .preferences__heading {
      padding: 0 8px 4px;
      font: 600 11px var(--ar-font-sans);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ar-ink-400);
    }
    .preferences__item {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      min-height: 32px;
      padding: 6px 8px;
      border: 0;
      border-radius: var(--ar-radius-control);
      background: transparent;
      color: var(--ar-ink-900);
      font: 400 13px var(--ar-font-sans);
      text-align: left;
      cursor: pointer;
    }
    .preferences__item:hover {
      background: var(--ar-line-100, rgb(0 0 0 / 5%));
    }
    .preferences__item[aria-checked='true'] {
      font-weight: 600;
    }
    .preferences__item:focus-visible {
      outline: 2px solid var(--ar-primary);
      outline-offset: -2px;
    }
    .preferences__tick {
      width: 14px;
      color: var(--ar-primary);
    }
    :host(.preferences--compact) .preferences__panel {
      top: calc(100% + 8px);
      bottom: auto;
      right: 0;
      left: auto;
    }
  `,
})
export class ArAppearanceSettings {
  private readonly element = inject(ElementRef<HTMLElement>);
  readonly compact = input(false, { transform: booleanAttribute });
  protected readonly i18n = inject(LanguageService);
  protected readonly theme = inject(ThemeService);
  protected readonly languages = APP_LANGUAGES;
  protected readonly themes = [
    { value: 'light', label: 'Light theme' },
    { value: 'dark', label: 'Dark theme' },
  ] as const;

  @HostListener('document:click', ['$event'])
  protected closeOutside(event: MouseEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) {
      this.element.nativeElement.querySelector('details')?.removeAttribute('open');
    }
  }

  @HostListener('keydown.escape', ['$event'])
  protected closeOnEscape(event: Event): void {
    const details = this.element.nativeElement.querySelector('details');
    if (!details?.open) return;
    event.stopPropagation();
    details.open = false;
    details.querySelector('summary')?.focus();
  }

  protected setLanguage(value: string): void {
    const language = APP_LANGUAGES.find((language) => language.code === value);
    if (language) this.i18n.set(language.code);
    this.close();
  }

  protected setTheme(value: string): void {
    if (value === 'light' || value === 'dark') this.theme.set(value);
    this.close();
  }

  /** A choice closes the menu, as any menu does. */
  private close(): void {
    this.element.nativeElement.querySelector('details')?.removeAttribute('open');
  }
}
