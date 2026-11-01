import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import { ArIcon } from '../ui/icon';
import { NavDrawer } from './nav-drawer';
import { LanguageService } from '../core/i18n/language.service';
import { PageContextService } from './page-context.service';

/**
 * Every screen's header: displays page title, subtitle, and screen actions.
 * Help, utilities, theme, language, and sign-out are managed in the right-hand sidebar.
 */
@Component({
  selector: 'ar-topbar',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="tb__menu"
      [attr.aria-label]="i18n.t('Open the menu')"
      [attr.aria-expanded]="drawer.open()"
      (click)="drawer.toggle()"
    >
      <ar-icon name="menu" [size]="18" />
    </button>
    <div class="tb__titles">
      <div class="tb__title-row">
        <h1 class="tb__title">{{ title() }}</h1>
      </div>
      @if (subtitle()) {
        <p class="tb__sub">{{ subtitle() }}</p>
      }
    </div>
    <div class="tb__actions"><ng-content /></div>
    <button
      type="button"
      class="tb__util-btn"
      [attr.aria-label]="i18n.t('Open utilities menu')"
      [attr.aria-expanded]="pageContext.drawerOpen()"
      (click)="pageContext.toggleDrawer()"
    >
      <ar-icon name="dots" [size]="18" />
    </button>
  `,
  styles: `
    :host {
      position: relative;
      z-index: 900;
      height: 56px;
      flex: none;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 0 22px;
      background: var(--ar-header-bg);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--ar-line-200);
    }
    .tb__titles {
      flex: 1;
      min-width: 0;
    }
    .tb__menu {
      display: none;
      flex: none;
      width: 34px;
      height: 34px;
      place-items: center;
      padding: 0;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-white);
      color: var(--ar-ink-700);
      cursor: pointer;
    }
    .tb__util-btn {
      display: none;
      flex: none;
      width: 34px;
      height: 34px;
      place-items: center;
      padding: 0;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-white);
      color: var(--ar-ink-700);
      cursor: pointer;
    }
    .tb__menu:hover,
    .tb__menu:focus-visible,
    .tb__util-btn:hover,
    .tb__util-btn:focus-visible {
      background: var(--ar-bg-100);
      color: var(--ar-ink-900);
    }
    /* A phone: the sidebar is a drawer behind this button, and the header packs tighter. */
    @media (max-width: 720px) {
      :host {
        height: auto;
        min-height: 56px;
        flex-wrap: wrap;
        gap: 8px 10px;
        padding: 10px 12px;
      }
      .tb__menu {
        display: grid;
      }
      .tb__util-btn {
        display: grid;
        order: 2;
      }
      .tb__actions {
        order: 3;
        flex: 1 1 100%;
        flex-wrap: wrap;
        gap: 8px;
      }
      .tb__actions:empty {
        display: none;
      }
    }
    .tb__title-row {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .tb__title {
      margin: 0;
      font: 600 15.5px var(--ar-font-sans);
      letter-spacing: -0.015em;
      color: var(--ar-ink-900);
    }
    .tb__sub {
      margin: 1px 0 0;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tb__actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  `,
})
export class ArTopbar {
  protected readonly drawer = inject(NavDrawer);
  protected readonly pageContext = inject(PageContextService);
  protected readonly i18n = inject(LanguageService);

  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);

  /** A short, screen-specific explanation shown from the help popover in the right-hand sidebar. */
  readonly help = input<string | null>(null);

  constructor() {
    effect(() => {
      this.pageContext.setContext(this.title(), this.subtitle(), this.help());
    });
  }
}
