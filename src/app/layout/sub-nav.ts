import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArIcon } from '../ui/icon';
import { LanguageService } from '../core/i18n/language.service';
import { SubNavService } from './sub-nav.service';
import { NavDrawer } from './nav-drawer';
import { PageContextService } from './page-context.service';

/** The pages of the sidebar group in use, as tabs above the screen's top bar. */
@Component({
  selector: 'ar-sub-nav',
  imports: [RouterLink, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeIfOutside($event)',
    '(document:keydown.escape)': 'open.set(false)',
    '[class.sn-host--inline]': 'inline()',
    '[class.sn-host--deferred]': '!inline() && sub.inlineHosts() > 0',
  },
  template: `
    @if (sub.group(); as group) {
      @if (group.items.length > 0) {
        <nav
          class="sn"
          [class.sn--open]="open()"
          [class.sn--compact]="compact()"
          [attr.aria-label]="i18n.t(group.heading ?? 'Menu')"
        >
          <!-- On a phone the screen's menu and ⋯ buttons sit up here, above the tabs (the top bar hides its own). -->
          <button
            type="button"
            class="sn__phone"
            [attr.aria-label]="i18n.t('Open the menu')"
            [attr.aria-expanded]="drawer.open()"
            (click)="drawer.toggle()"
          >
            <ar-icon name="menu" [size]="18" />
          </button>
          <!-- On a phone the tabs fold into this one picker showing the current page. -->
          <button
            type="button"
            class="sn__pick"
            aria-haspopup="true"
            [attr.aria-expanded]="open()"
            (click)="open.set(!open())"
          >
            @if (current(); as c) {
              <span class="sn__icon sn__icon--on" [class.sn__icon--ai]="c.ai"
                ><ar-icon [name]="c.icon" [size]="14"
              /></span>
              <span class="sn__pick-text">
                <span class="sn__pick-group">{{ i18n.t(group.heading ?? 'Menu') }}</span>
                <span class="sn__pick-label">{{ i18n.t(c.label) }}</span>
              </span>
            } @else {
              <span class="sn__pick-text">
                <span class="sn__pick-label">{{ i18n.t(group.heading ?? 'Menu') }}</span>
              </span>
            }
            <span class="sn__pick-count">{{ group.items.length }}</span>
            <ar-icon class="sn__pick-chev" name="chevdown" [size]="14" />
          </button>
          <div class="sn__track">
            @for (item of group.items; track item.route) {
              <a
                class="sn__item"
                [class.sn__item--on]="item.route === sub.active()"
                [class.sn__item--ai]="item.ai"
                [attr.aria-current]="item.route === sub.active() ? 'page' : null"
                [routerLink]="item.route"
                (click)="open.set(false)"
                [attr.title]="i18n.t(item.label)"
              >
                <span class="sn__icon"><ar-icon [name]="item.icon" [size]="14" /></span>
                <span class="sn__label">{{ i18n.t(item.label) }}</span>
                @if (item.route !== '/getting-started') {
                  <button
                    type="button"
                    class="sn__star"
                    [class.sn__star--on]="isFavourite(item.route)"
                    [attr.aria-pressed]="isFavourite(item.route)"
                    [attr.aria-label]="
                      i18n.t(
                        isFavourite(item.route)
                          ? 'Remove {0} from favourites'
                          : 'Add {0} to favourites',
                        i18n.t(item.label)
                      )
                    "
                    [title]="
                      i18n.t(
                        isFavourite(item.route) ? 'Remove from favourites' : 'Add to favourites'
                      )
                    "
                    (click)="star($event, item.route)"
                  >
                    <ar-icon name="star" [size]="13" />
                  </button>
                }
              </a>
            }
          </div>
          <button
            type="button"
            class="sn__phone"
            [attr.aria-label]="i18n.t('Open utilities menu')"
            [attr.aria-expanded]="pageContext.drawerOpen()"
            (click)="pageContext.toggleDrawer()"
          >
            <ar-icon name="dots" [size]="18" />
          </button>
        </nav>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      flex: none;
    }
    /* On wide screens a screen's top bar carries the tabs in its own row, so the strip above hides. */
    :host(.sn-host--inline) {
      display: none;
      flex: 1 1 0;
      min-width: 0;
    }
    @media (min-width: 1281px) {
      :host(.sn-host--inline) {
        display: block;
      }
      :host(.sn-host--deferred) {
        display: none;
      }
      :host(.sn-host--inline) .sn {
        padding: 0;
        background: none;
        border: 0;
      }

    }
    /*
     * A segmented control on the page surface: the section's pages sit in one soft track and the
     * current page lifts out of it as a white pill. The strip stays one row and never scrolls.
     */
    .sn {
      display: flex;
      padding: 5px 16px;
      background: linear-gradient(180deg, var(--ar-white), var(--ar-bg-50, var(--ar-white)));
      border-bottom: 1px solid var(--ar-line-200);
      overflow: hidden;
    }
    .sn__track {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
      padding: 3px;
      max-width: 100%;
      border-radius: 10px;
      background: var(--ar-bg-100);
      box-shadow: inset 0 0 0 1px var(--ar-line-200);
    }
    .sn__item {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px 3px 4px;
      border-radius: 8px;
      color: var(--ar-ink-500);
      font: 500 13px var(--ar-font-sans);
      text-decoration: none;
      white-space: nowrap;
      transition:
        color 0.15s,
        background 0.15s,
        box-shadow 0.15s;
    }
    .sn__icon {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 6px;
      color: var(--ar-ink-400);
      transition:
        background 0.15s,
        color 0.15s;
    }
    .sn__item:hover {
      color: var(--ar-ink-900);
      background: color-mix(in srgb, var(--ar-white) 60%, transparent);
    }
    .sn__item:hover .sn__icon {
      color: var(--ar-ink-700);
    }
    .sn__item:focus-visible {
      outline: 2px solid var(--ar-blue-500);
      outline-offset: 1px;
    }
    .sn__item--on,
    .sn__item--on:hover {
      color: var(--ar-ink-900);
      font-weight: 600;
      background: var(--ar-white);
      box-shadow:
        0 1px 2px rgb(15 23 42 / 0.08),
        0 2px 8px rgb(15 23 42 / 0.06);
    }
    .sn__item--on .sn__icon {
      background: var(--ar-blue-600);
      color: var(--ar-white);
    }
    .sn__item--ai.sn__item--on .sn__icon {
      background: var(--ar-ai-500);
    }
    .sn__star {
      display: inline-flex;
      margin-left: 2px;
      padding: 2px;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: var(--ar-ink-400);
      cursor: pointer;
      opacity: 0;
    }
    .sn__star:hover {
      color: #c98d00;
    }
    .sn__item:hover .sn__star,
    .sn__star:focus-visible,
    .sn__star--on {
      opacity: 1;
    }
    .sn__star--on {
      color: #e0a100;
    }
    .sn__phone {
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
    .sn__phone:hover,
    .sn__phone:focus-visible {
      background: var(--ar-bg-100);
      color: var(--ar-ink-900);
    }
    .sn__pick {
      display: none;
    }
    /* Names show while they all fit; when they don't, the other pages fold to icons (name on hover). */
    .sn__track {
      flex-wrap: nowrap;
    }
    /* Not on a phone: there the pages are a full list under the picker, always with names. */
    @media (min-width: 721px) {
      .sn--compact .sn__item:not(.sn__item--on) {
        padding: 3px 4px;
      }
      .sn--compact .sn__item:not(.sn__item--on) .sn__label,
      .sn--compact .sn__item:not(.sn__item--on) .sn__star {
        display: none;
      }
    }
    @media (max-width: 720px) {
      .sn {
        position: relative;
        align-items: center;
        gap: 8px;
        padding: 5px 12px;
        overflow: visible;
      }
      .sn__phone {
        display: grid;
      }
      .sn__pick {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        height: 36px;
        padding: 0 10px 0 6px;
        border: 1px solid var(--ar-line-200);
        border-radius: 12px;
        background: var(--ar-white);
        box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
        color: var(--ar-ink-900);
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .sn__pick:focus-visible {
        outline: 2px solid var(--ar-blue-500);
        outline-offset: 1px;
      }
      .sn__pick-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      }
      .sn__pick-group {
        display: none;
        font: 500 10.5px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-400);
      }
      .sn__pick-label {
        font: 600 14px var(--ar-font-sans);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sn__pick-count {
        flex: none;
        min-width: 20px;
        padding: 1px 6px;
        border-radius: 99px;
        background: var(--ar-bg-100);
        font: 600 11px var(--ar-font-sans);
        color: var(--ar-ink-500);
        text-align: center;
      }
      .sn__pick-chev {
        flex: none;
        color: var(--ar-ink-500);
        transition: transform 0.15s;
      }
      .sn--open .sn__pick-chev {
        transform: rotate(180deg);
      }
      /* The page list drops down under the picker. */
      .sn__track {
        display: none;
      }
      .sn--open .sn__track {
        position: absolute;
        z-index: 950;
        top: calc(100% - 4px);
        left: 12px;
        right: 12px;
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: 2px;
        padding: 6px;
        max-height: min(70vh, 480px);
        overflow-y: auto;
        border-radius: 14px;
        background: var(--ar-white);
        box-shadow:
          0 0 0 1px var(--ar-line-200),
          0 12px 32px rgb(15 23 42 / 0.16);
      }
      .sn--open .sn__item {
        padding: 10px 10px 10px 8px;
        font-size: 14px;
      }
      .sn--open .sn__label {
        flex: 1;
      }
      .sn--open .sn__star {
        opacity: 1;
      }
      .sn__icon--on {
        background: var(--ar-blue-600);
        color: var(--ar-white);
        width: 26px;
        height: 26px;
        border-radius: 7px;
      }
      .sn__icon--ai {
        background: var(--ar-ai-500);
      }
    }
    @media (max-width: 640px) {
      .sn {
        padding: 8px 12px;
      }
      .sn__item {
        padding: 5px 10px 5px 6px;
        font-size: 12.5px;
      }
    }
  `,
})
export class ArSubNav {
  protected readonly sub = inject(SubNavService);
  protected readonly i18n = inject(LanguageService);
  protected readonly drawer = inject(NavDrawer);
  protected readonly pageContext = inject(PageContextService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  /** Drawn inside a top bar's row rather than as the strip above the screen. */
  readonly inline = input(false);

  /** The phone picker's page list. */
  protected readonly open = signal(false);
  /** True when the page names don't all fit, so the other pages show as icons. */
  protected readonly compact = signal(false);
  /** Width of the track with every name showing, measured while not compact. */
  private fullWidth = 0;

  constructor() {
    // Re-measure with names showing whenever the pages, the lit page or the language change.
    effect(() => {
      this.sub.group();
      this.sub.active();
      this.i18n.lang();
      this.compact.set(false);
      requestAnimationFrame(() => this.measure());
    });
    afterNextRender(() => {
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private measure(): void {
    const el = this.host.nativeElement as HTMLElement;
    const nav = el.querySelector('.sn') as HTMLElement | null;
    const track = el.querySelector('.sn__track') as HTMLElement | null;
    if (!nav || !track || !track.offsetParent) return;
    if (!this.compact()) this.fullWidth = track.scrollWidth;
    const cs = getComputedStyle(nav);
    const room = nav.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    this.compact.set(this.fullWidth > room + 1);
  }

  protected readonly current = computed(
    () => this.sub.group()?.items.find((i) => i.route === this.sub.active()) ?? null,
  );

  protected closeIfOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node))
      this.open.set(false);
  }

  protected isFavourite(route: string): boolean {
    return this.sub.favourites().includes(route);
  }

  protected star(event: Event, route: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.sub.toggleFavourite(route);
  }
}
