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
      <div class="preferences__panel">
        <label>
          <span>{{ i18n.t('Language') }}</span>
          <select
            [attr.aria-label]="i18n.t('Language')"
            [value]="i18n.lang()"
            (change)="setLanguage($any($event.target).value)"
            translate="no"
          >
            @for (language of languages; track language.code) {
              <option
                [value]="language.code"
                [selected]="i18n.lang() === language.code"
                [attr.lang]="language.code"
              >
                {{ language.label }}
              </option>
            }
          </select>
        </label>
        <label>
          <span>{{ i18n.t('Theme') }}</span>
          <select
            [attr.aria-label]="i18n.t('Theme')"
            [value]="theme.theme()"
            (change)="setTheme($any($event.target).value)"
          >
            <option value="light">
              {{ i18n.t('Light theme') }}
            </option>
            <option value="dark">
              {{ i18n.t('Dark theme') }}
            </option>
          </select>
        </label>
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
    label {
      display: grid;
      gap: 5px;
      font: 500 12px var(--ar-font-sans);
    }
    select {
      width: 100%;
      min-width: 0;
      min-height: 34px;
      padding: 6px 8px;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      background: var(--ar-white);
      color: var(--ar-ink-900);
      font: 400 13px var(--ar-font-sans);
      cursor: pointer;
    }
    select:focus-visible {
      outline: 2px solid var(--ar-primary);
      outline-offset: 2px;
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
  }

  protected setTheme(value: string): void {
    if (value === 'light' || value === 'dark') this.theme.set(value);
  }
}
