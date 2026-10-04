import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';

/**
 * A Syncfusion card (`e-card` with header and content parts). Three of
 * Syncfusion's card defaults are undone because cards here hold whole forms and
 * tables: `overflow: hidden` would clip menus and pop-ups, a 36px line height
 * would loosen every line of text inside, and vertical centring would float
 * short content.
 */
@Component({
  selector: 'ar-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'e-card ar-card' },
  template: `
    @if (heading()) {
      <header class="e-card-header ar-card__head">
        <div class="e-card-header-caption">
          <h2 class="e-card-header-title ar-card__title">{{ heading() }}</h2>
        </div>
        <ng-content select="[card-actions]" />
      </header>
    }
    <div class="e-card-content ar-card__body"><ng-content /></div>
  `,
  styles: `
    :host {
      display: block;
      overflow: visible;
      line-height: normal;
      font-size: inherit;
      justify-content: flex-start;
      background: var(--ar-white);
      background-image: var(--ar-card-sheen);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      color: var(--ar-ink-900);
    }
    .ar-card__head {
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: var(--ar-pad-card) var(--ar-pad-card) 0;
      border-bottom: 0;
      min-height: 0;
    }
    .e-card-header-caption {
      flex: 1;
      min-width: 0;
    }
    .ar-card__title {
      margin: 0;
      font: 600 15px var(--ar-font-sans);
      letter-spacing: -0.01em;
      color: var(--ar-ink-900);
    }
    .ar-card__body {
      padding: 14px var(--ar-pad-card) var(--ar-pad-card);
      font: inherit;
      line-height: normal;
    }
    :host:not(:has(.ar-card__head)) .ar-card__body {
      padding-top: var(--ar-pad-card);
    }
  `,
})
export class ArCard {
  readonly heading = input<string | null>(null);

  constructor() {
    ensureSyncfusionTheme();
  }
}
