import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Injector,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, of } from 'rxjs';
import { ArIcon } from '../ui/icon';
import { NavDrawer } from './nav-drawer';
import { LanguageService } from '../core/i18n/language.service';
import { PageContextService } from './page-context.service';
import { resolveNavTrail } from './nav-trail.logic';
import { NAV, visibleForSetup } from './nav.model';
import { OnboardingStore } from '../core/services/onboarding.store';
import { PermissionService } from '@abp/ng.core';
import { PlanService } from '../core/services/plan.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { canAccessNavItem } from '../core/auth/permission';
import { CockpitOriginService } from './cockpit-origin.service';
import { pathOf } from './cockpit-origin.logic';

/**
 * Every screen's header: displays responsive breadcrumbs (e.g. "Customers -> Contacts").
 * Shows basic, clean breadcrumbs when the sidebar is expanded;
 * transforms into an interactive dropdown switcher when the sidebar is collapsed.
 */
@Component({
  selector: 'ar-topbar',
  imports: [ArIcon, RouterLink],
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
        <nav class="tb__breadcrumb" aria-label="Breadcrumb">
          @if (cockpitCrumb(); as cc) {
            <!-- Opened from Customer 360 / Vendor 360 / a campaign: the way back to that customer, supplier or campaign -->
            <a
              class="tb__crumb-link"
              [routerLink]="cc.groupRoute"
              [title]="i18n.t('Go to {0}', i18n.t(cc.groupPage))"
            >
              {{ i18n.t(cc.group) }}
            </a>
            <span class="tb__crumb-sep" aria-hidden="true">
              <ar-icon name="chevron" [size]="12" />
            </span>
            <a
              class="tb__crumb-link tb__crumb-link--cockpit"
              [routerLink]="cc.link"
              [title]="i18n.t(cc.backTitle)"
            >
              {{ i18n.t(cc.cockpit) }}
              @if (cc.name) {
                <span class="tb__crumb-name" translate="no">· {{ cc.name }}</span>
              }
            </a>
            <span class="tb__crumb-sep" aria-hidden="true">
              <ar-icon name="chevron" [size]="12" />
            </span>
          } @else if (groupHeading(); as g) {
            @if (g.toLowerCase() !== title().toLowerCase()) {
              <div class="tb__crumb-group-wrap">
                @if (sidebarCollapsed()) {
                  <!-- COLLAPSED SIDEBAR: Interactive Dropdown Switcher -->
                  <button
                    type="button"
                    class="tb__crumb-dropdown-btn"
                    [class.tb__crumb-dropdown-btn--open]="groupMenuOpen()"
                    [attr.aria-expanded]="groupMenuOpen()"
                    [attr.aria-label]="i18n.t('Browse pages in {0}', i18n.t(g))"
                    [title]="i18n.t('Browse pages in {0}', i18n.t(g))"
                    (click)="toggleGroupMenu($event)"
                  >
                    <span class="tb__crumb-group-text">{{ i18n.t(g) }}</span>
                    <ar-icon class="tb__crumb-chev" name="chevdown" [size]="11" />
                  </button>

                  @if (groupMenuOpen()) {
                    <div class="tb__group-dropdown" role="menu" (click)="$event.stopPropagation()">
                      <div class="tb__group-dropdown-head">
                        <span class="tb__group-dropdown-title">{{ i18n.t(g) }}</span>
                        <span class="tb__group-dropdown-count"
                          >{{ siblingItems().length }} pages</span
                        >
                      </div>
                      <div class="tb__group-dropdown-list">
                        @for (item of siblingItems(); track item.route) {
                          <a
                            class="tb__group-dropdown-item"
                            [class.tb__group-dropdown-item--active]="
                              item.route === activeItemRoute()
                            "
                            [routerLink]="item.route"
                            role="menuitem"
                            (click)="closeGroupMenu()"
                          >
                            <ar-icon [name]="item.icon" [size]="15" />
                            <span class="tb__group-dropdown-label">{{ i18n.t(item.label) }}</span>
                            @if (item.route === activeItemRoute()) {
                              <span class="tb__group-dropdown-current" aria-label="Current page"
                                >Current</span
                              >
                            }
                          </a>
                        }
                      </div>
                    </div>
                  }
                } @else {
                  <!-- EXPANDED SIDEBAR: Clean, Basic Breadcrumb Link -->
                  <a
                    class="tb__crumb-link"
                    [routerLink]="groupPrimaryRoute()"
                    [title]="i18n.t('Go to {0}', i18n.t(g))"
                  >
                    {{ i18n.t(g) }}
                  </a>
                }
              </div>

              @if (parentItem(); as p) {
                <span class="tb__crumb-sep" aria-hidden="true">
                  <ar-icon name="chevron" [size]="12" />
                </span>
                <a
                  class="tb__crumb-link"
                  [routerLink]="p.route"
                  [title]="i18n.t('Go to {0}', i18n.t(p.label))"
                >
                  {{ i18n.t(p.label) }}
                </a>
              }

              <span class="tb__crumb-sep" aria-hidden="true">
                <ar-icon name="chevron" [size]="12" />
              </span>
            }
          }
          <h1 class="tb__title">{{ title() }}</h1>
        </nav>
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
      min-width: 0;
    }
    .tb__crumb-name {
      font-weight: 600;
      color: var(--ar-ink-800);
    }
    .tb__breadcrumb {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .tb__crumb-group-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    /* Basic breadcrumb text link (expanded sidebar) */
    .tb__crumb-link {
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-decoration: none;
      white-space: nowrap;
      transition: color var(--ar-ease);
    }
    .tb__crumb-link:hover,
    .tb__crumb-link:focus-visible {
      color: var(--ar-ink-900);
      text-decoration: underline;
      outline: none;
    }
    /* Separator chevron between breadcrumbs */
    .tb__crumb-sep {
      display: inline-flex;
      align-items: center;
      color: var(--ar-ink-400);
      flex-shrink: 0;
      user-select: none;
    }
    /* Interactive dropdown pill button (collapsed sidebar) */
    .tb__crumb-dropdown-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 28px;
      padding: 0 8px 0 10px;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
      background: var(--ar-bg-100, #f8fafc);
      border: 1px solid var(--ar-line-200, #e2e8f0);
      border-radius: var(--ar-radius-control, 6px);
      cursor: pointer;
      white-space: nowrap;
      transition:
        background var(--ar-ease),
        border-color var(--ar-ease),
        color var(--ar-ease),
        box-shadow var(--ar-ease);
    }
    .tb__crumb-dropdown-btn:hover,
    .tb__crumb-dropdown-btn:focus-visible {
      background: var(--ar-bg-200, #f1f5f9);
      border-color: var(--ar-line-300, #cbd5e1);
      color: var(--ar-ink-900);
      outline: none;
    }
    .tb__crumb-dropdown-btn--open {
      background: var(--ar-blue-50, #eff6ff);
      border-color: var(--ar-primary);
      color: var(--ar-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--ar-primary) 15%, transparent);
    }
    .tb__crumb-chev {
      color: var(--ar-ink-400);
      transition:
        transform var(--ar-ease),
        color var(--ar-ease);
    }
    .tb__crumb-dropdown-btn--open .tb__crumb-chev {
      transform: rotate(180deg);
      color: var(--ar-primary);
    }
    /* Floating popover dropdown menu */
    .tb__group-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      z-index: 1050;
      min-width: 210px;
      max-width: 300px;
      padding: 6px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control, 8px);
      box-shadow: var(--ar-shadow-pop, 0 10px 28px rgba(0, 0, 0, 0.14));
      display: flex;
      flex-direction: column;
      animation: tb-dropdown-in 0.15s ease-out;
    }
    @keyframes tb-dropdown-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .tb__group-dropdown-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 8px 6px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--ar-line-100, #f1f5f9);
    }
    .tb__group-dropdown-title {
      font: 600 11px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-400);
    }
    .tb__group-dropdown-count {
      font: 500 10.5px var(--ar-font-mono, monospace);
      color: var(--ar-ink-400);
      background: var(--ar-bg-100);
      padding: 1px 5px;
      border-radius: 4px;
    }
    .tb__group-dropdown-list {
      display: flex;
      flex-direction: column;
      gap: 1px;
      max-height: 280px;
      overflow-y: auto;
    }
    .tb__group-dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: var(--ar-radius-control, 6px);
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
      text-decoration: none;
      transition:
        background var(--ar-ease),
        color var(--ar-ease);
    }
    .tb__group-dropdown-item:hover,
    .tb__group-dropdown-item:focus-visible {
      background: var(--ar-bg-100);
      color: var(--ar-ink-900);
      outline: none;
    }
    .tb__group-dropdown-item--active {
      background: var(--ar-blue-100, #eff6ff);
      color: var(--ar-primary);
      font-weight: 600;
    }
    .tb__group-dropdown-current {
      margin-left: auto;
      font: 600 9.5px var(--ar-font-sans);
      color: var(--ar-primary);
      background: rgba(59, 130, 246, 0.1);
      padding: 1px 5px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .tb__title {
      margin: 0;
      font: 600 16px var(--ar-font-sans);
      letter-spacing: -0.015em;
      color: var(--ar-ink-900);
      white-space: nowrap;
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
      flex-shrink: 0;
    }
  `,
})
export class ArTopbar {
  protected readonly drawer = inject(NavDrawer);
  protected readonly pageContext = inject(PageContextService);
  protected readonly i18n = inject(LanguageService);
  private readonly router = inject(Router, { optional: true });
  private readonly permissions = inject(PermissionService, { optional: true });
  private readonly plan = inject(PlanService, { optional: true });
  private readonly account = inject(CurrentUserService, { optional: true });
  private readonly injector = inject(Injector);
  private readonly cockpitOrigin = inject(CockpitOriginService);

  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);

  /** An optional explicit group heading override if the screen belongs to a custom parent group. */
  readonly group = input<string | null>(null);

  /** A short, screen-specific explanation shown from the help popover in the right-hand sidebar. */
  readonly help = input<string | null>(null);

  protected readonly groupMenuOpen = signal(false);

  /** Left sidebar collapsed state from shared NavDrawer */
  protected readonly sidebarCollapsed = this.drawer.collapsed;

  private readonly currentUrl = toSignal(
    this.router
      ? this.router.events.pipe(
          filter((e): e is NavigationEnd => e instanceof NavigationEnd),
          map((e) => e.urlAfterRedirects),
        )
      : of(''),
    { initialValue: this.router?.url ?? '' },
  );

  protected readonly trail = computed(() =>
    resolveNavTrail(this.currentUrl() ?? '', this.title(), this.group(), NAV),
  );

  /** Set when this screen was opened from Customer 360, Vendor 360 or an open campaign: the crumbs that lead back to it. */
  protected readonly cockpitCrumb = computed(() => {
    const origin = this.cockpitOrigin.origin();
    if (!origin || !this.router || pathOf(this.currentUrl() ?? '') !== origin.targetPath)
      return null;
    const link = this.router.parseUrl(origin.cockpitUrl);
    if (origin.kind === 'campaign')
      return {
        link,
        name: origin.name,
        group: 'Marketing',
        groupRoute: '/campaigns',
        groupPage: 'Campaigns',
        cockpit: 'Campaign',
        backTitle: 'Back to the campaign',
      };
    return origin.kind === 'vendor'
      ? {
          link,
          name: origin.name,
          group: 'Purchasing & stock',
          groupRoute: '/purchasing',
          groupPage: 'Purchasing',
          cockpit: 'Supplier overview',
          backTitle: 'Back to Vendor 360',
        }
      : {
          link,
          name: origin.name,
          group: 'Customers',
          groupRoute: '/contacts',
          groupPage: 'Contacts',
          cockpit: 'Customer overview',
          backTitle: 'Back to Customer 360',
        };
  });

  protected readonly groupHeading = computed(() => this.trail().groupHeading);
  protected readonly groupPrimaryRoute = computed(() => this.trail().groupPrimaryRoute);
  protected readonly siblingItems = computed(() => {
    const setupComplete = this.setupComplete();
    const raw = this.trail().siblingItems.filter((item) => visibleForSetup(item, setupComplete));
    if (!this.permissions || !this.plan || !this.account) return raw;
    return raw.filter((item) =>
      canAccessNavItem(item, this.permissions!, this.plan!, this.account!),
    );
  });
  /** Hides Get started among the siblings once setup is done. Looked up lazily: off the signed-in shell there is no checklist. */
  private setupComplete(): boolean {
    try {
      return this.injector.get(OnboardingStore).isComplete();
    } catch {
      return false;
    }
  }

  protected readonly parentItem = computed(() => this.trail().parentItem);
  protected readonly activeItemRoute = computed(() => this.trail().activeItem?.route ?? null);

  constructor() {
    effect(() => {
      this.pageContext.setContext(this.title(), this.subtitle(), this.help());
    });
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    if (this.groupMenuOpen()) {
      this.groupMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.groupMenuOpen()) {
      this.groupMenuOpen.set(false);
    }
  }

  protected toggleGroupMenu(event: Event): void {
    event.stopPropagation();
    this.groupMenuOpen.update((v) => !v);
  }

  protected closeGroupMenu(): void {
    this.groupMenuOpen.set(false);
  }
}
