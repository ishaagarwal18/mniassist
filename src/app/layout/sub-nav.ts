import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArIcon } from '../ui/icon';
import { LanguageService } from '../core/i18n/language.service';
import { SubNavService } from './sub-nav.service';

/** The pages of the sidebar group in use, as tabs above the screen's top bar. */
@Component({
  selector: 'ar-sub-nav',
  imports: [RouterLink, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sub.group(); as group) {
      @if (group.items.length > 0) {
        <nav class="sn" [attr.aria-label]="i18n.t(group.heading ?? 'Menu')">
          @for (item of group.items; track item.route) {
            <a
              class="sn__item"
              [class.sn__item--on]="item.route === sub.active()"
              [class.sn__item--ai]="item.ai"
              [attr.aria-current]="item.route === sub.active() ? 'page' : null"
              [routerLink]="item.route"
            >
              <ar-icon [name]="item.icon" [size]="15" />
              <span>{{ i18n.t(item.label) }}</span>
              @if (item.route !== '/getting-started') {
                <button
                  type="button"
                  class="sn__star"
                  [class.sn__star--on]="isFavourite(item.route)"
                  [attr.aria-pressed]="isFavourite(item.route)"
                  [attr.aria-label]="
                    i18n.t(
                      isFavourite(item.route) ? 'Remove {0} from favourites' : 'Add {0} to favourites',
                      i18n.t(item.label)
                    )
                  "
                  [title]="
                    i18n.t(isFavourite(item.route) ? 'Remove from favourites' : 'Add to favourites')
                  "
                  (click)="star($event, item.route)"
                >
                  <ar-icon name="star" [size]="13" />
                </button>
              }
            </a>
          }
        </nav>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      flex: none;
    }
    .sn {
      display: flex;
      gap: 2px;
      overflow-x: auto;
      scrollbar-width: thin;
      padding: 0 8px;
      background: var(--ar-surface-dark, #0f1b2d);
      border-bottom: 1px solid var(--ar-line-300);
    }
    .sn__item {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      min-width: 120px;
      color: rgba(255, 255, 255, 0.78);
      font: 500 13px var(--ar-font-sans);
      text-decoration: none;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
    }
    .sn__item:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.06);
    }
    .sn__item:focus-visible {
      outline: 2px solid var(--ar-cobalt-400, #5b8cff);
      outline-offset: -2px;
    }
    .sn__item--on {
      color: #fff;
      font-weight: 600;
      background: rgba(76, 126, 255, 0.22);
      border-bottom-color: var(--ar-cobalt-500, #3b6cff);
    }
    .sn__star {
      display: inline-flex;
      margin-left: auto;
      padding: 2px;
      border: 0;
      background: transparent;
      color: rgba(255, 255, 255, 0.35);
      cursor: pointer;
      opacity: 0;
    }
    .sn__item:hover .sn__star,
    .sn__star:focus-visible,
    .sn__star--on {
      opacity: 1;
    }
    .sn__star--on {
      color: #f5b301;
    }
    .sn__item--ai.sn__item--on {
      border-bottom-color: var(--ar-ai-fill, #14b8a6);
    }
  `,
})
export class ArSubNav {
  protected readonly sub = inject(SubNavService);
  protected readonly i18n = inject(LanguageService);

  protected isFavourite(route: string): boolean {
    return this.sub.favourites().includes(route);
  }

  protected star(event: Event, route: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.sub.toggleFavourite(route);
  }
}
