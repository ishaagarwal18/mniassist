import { MyPictureStore } from '../core/services/my-picture.store';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { PermissionService } from '@abp/ng.core';
import { HUB_ROUTE, NAV, NavGroup, NavItem, visibleForSetup } from './nav.model';
import { OnboardingStore } from '../core/services/onboarding.store';
import { ArAvatar } from '../ui/avatar';
import { ArIcon, IconName } from '../ui/icon';
import { SubNavService } from './sub-nav.service';
import { ArBrand } from './brand';
import { NavDrawer } from './nav-drawer';
import { ArAppearanceSettings } from './appearance-settings';
import { LanguageService } from '../core/i18n/language.service';
import { OpsService } from '../core/services/ops.service';
import { InboxService } from '../core/services/inbox.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { BrandingStore } from '../core/services/branding.store';
import { PwaService } from '../core/services/pwa.service';
import { PlanService } from '../core/services/plan.service';
import { canAccessNavItem } from '../core/auth/permission';
import { OPTIONAL_AREAS, filterByWorkAreas, readWorkAreas, writeWorkAreas } from './work-areas';

const COLLAPSED_KEY = 'ar.sidebar.collapsed';
/** The group of starred pages; not in NAV. */
const FAVOURITES = 'Favourites';

/** Favourites are per person: two people sharing a browser keep their own. */
function favouritesKey(userId: string | null): string {
  return `ar.sidebar.favourites.${userId ?? 'me'}`;
}

function readFavourites(userId: string | null): readonly string[] {
  try {
    const raw = localStorage.getItem(favouritesKey(userId));
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((r): r is string => typeof r === 'string') : [];
  } catch {
    return [];
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

@Component({
  selector: 'ar-sidebar',
  imports: [RouterLink, ArIcon, ArAvatar, ArBrand, ArAppearanceSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.sb--collapsed]': 'collapsed()',
    '[class.sb--open]': 'drawer.open()',
  },
  template: `
    <div class="sb__top">
      <div class="sb__brand">
        <ar-brand
          class="sb__logo"
          onDark
          size="sm"
          destination="/home"
          [iconOnly]="collapsed()"
          [logoSrc]="branding.logoDataUrl()"
        />
        <button
          class="sb__collapse"
          type="button"
          [attr.aria-label]="i18n.t(collapsed() ? 'Expand navigation' : 'Collapse navigation')"
          [attr.aria-expanded]="!collapsed()"
          (click)="toggleCollapsed()"
        >
          <ar-icon name="chevron" [size]="14" />
        </button>
      </div>
      <!-- The workspace a tenant user works in. A host (platform) user is in no
           workspace, so there is nothing to name. -->
      @if (account.tenantName(); as name) {
        <div class="sb__tenant" [title]="name">
          <span class="sb__tenant-name">{{ name }}</span>
        </div>
      }
      <div class="sb__search" role="search">
        @if (collapsed()) {
          <button
            class="sb__search-btn"
            type="button"
            [attr.aria-label]="i18n.t('Search menu')"
            [title]="i18n.t('Search menu')"
            (click)="openSearch()"
          >
            <ar-icon name="search" [size]="15" />
          </button>
        } @else {
          <ar-icon class="sb__search-icon" name="search" [size]="14" />
          <input
            #menuSearch
            class="sb__search-input"
            type="search"
            [placeholder]="i18n.t('Search menu')"
            [attr.aria-label]="i18n.t('Search menu')"
            autocomplete="off"
            [value]="menuQuery()"
            (input)="menuQuery.set($any($event.target).value)"
            (keydown.enter)="openFirstMatch()"
            (keydown.escape)="clearSearch()"
          />
        }
      </div>
    </div>

    <nav class="sb__nav" aria-label="Main" (scroll)="hideMenuTooltip()">
      @for (group of shown(); track group.heading) {
        <div
          class="sb__group"
          [class.sb__group--active]="hasActiveItem(group)"
        >
          @if (group.heading && !searching()) {
            <!-- Only the group is listed here; its pages show as tabs above the screen (ar-sub-nav). -->
            <div class="sb__row">
              <button
                type="button"
                class="sb__item sb__item--group"
                [class.sb__item--on]="isCurrentGroup(group)"
                [attr.aria-current]="isCurrentGroup(group) ? 'true' : null"
                [attr.aria-label]="collapsed() ? i18n.t(group.heading) : null"
                (mouseenter)="showMenuTooltip($event, group.heading)"
                (mouseleave)="hideMenuTooltip()"
                (focus)="showMenuTooltip($event, group.heading)"
                (blur)="hideMenuTooltip()"
                (click)="selectGroup(group)"
              >
                <span class="sb__bar" aria-hidden="true"></span>
                <ar-icon [name]="groupIcon(group)" [size]="16" />
                <span class="sb__label">{{ i18n.t(group.heading) }}</span>
                @if (hasActiveItem(group) && !isCurrentGroup(group)) {
                  <span class="sb__heading-active-dot" aria-hidden="true"></span>
                }
              </button>
            </div>
          } @else {
            @if (group.heading) {
              <p class="sb__heading sb__heading--static">
                <span class="sb__heading-text">{{ i18n.t(group.heading) }}</span>
              </p>
            }
            <div class="sb__group-items">
              @for (item of group.items; track item.route) {
                <!-- One item is lit: the one whose route is the longest match for the page,
                     so /settings/support-access lights Support access, not Settings too,
                     and a sub-page (/enquiries/pipelines, /inbox?c=…) keeps its parent lit. -->
                <div class="sb__row">
                  <a
                    class="sb__item"
                    [class.sb__item--ai]="item.ai"
                    [class.sb__item--on]="item.route === active()"
                    [attr.aria-current]="item.route === active() ? 'page' : null"
                    [routerLink]="item.route"
                    [attr.aria-label]="collapsed() ? i18n.t(item.label) : null"
                    (mouseenter)="showMenuTooltip($event, item.label)"
                    (mouseleave)="hideMenuTooltip()"
                    (focus)="showMenuTooltip($event, item.label)"
                    (blur)="hideMenuTooltip()"
                    (keydown.escape)="hideMenuTooltip()"
                    (click)="hideMenuTooltip(); clearSearch(); drawer.close()"
                  >
                    <span class="sb__bar" aria-hidden="true"></span>
                    <ar-icon [name]="item.icon" [size]="16" />
                    <span class="sb__label">{{ i18n.t(item.label) }}</span>
                    @if (badgeFor(item.badge); as n) {
                      <span class="sb__badge">{{ n }}</span>
                    }
                  </a>
                  @if (!collapsed() && item.route !== '/getting-started') {
                    <button
                      type="button"
                      class="sb__star"
                      [class.sb__star--on]="isFavourite(item)"
                      [attr.aria-pressed]="isFavourite(item)"
                      [attr.aria-label]="
                        i18n.t(
                          isFavourite(item)
                            ? 'Remove {0} from favourites'
                            : 'Add {0} to favourites',
                          i18n.t(item.label)
                        )
                      "
                      [title]="
                        i18n.t(isFavourite(item) ? 'Remove from favourites' : 'Add to favourites')
                      "
                      (click)="toggleFavourite(item)"
                    >
                      <ar-icon name="star" [size]="13" />
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
      } @empty {
        <p class="sb__none">{{ i18n.t('No menu items match “{0}”.', menuQuery().trim()) }}</p>
      }
    </nav>

    <!-- Work areas: a person hides the departments they never use, so the menu shows their day. -->
    @if (!collapsed() && !searching() && areaChoices().length > 1) {
      <div class="sb__areas">
        @if (areasOpen()) {
          <fieldset class="sb__areas-panel">
            <legend class="sb__areas-title">{{ i18n.t('Show these areas in the menu') }}</legend>
            @for (area of areaChoices(); track area) {
              <label class="sb__areas-option">
                <input
                  type="checkbox"
                  [id]="'sb-area-' + $index"
                  [checked]="isAreaOn(area)"
                  (change)="toggleArea(area)"
                />
                {{ i18n.t(area) }}
              </label>
            }
            <div class="sb__areas-actions">
              <button type="button" class="sb__areas-link" (click)="showAllAreas()">
                {{ i18n.t('Show everything') }}
              </button>
              <button type="button" class="sb__areas-done" (click)="areasOpen.set(false)">
                {{ i18n.t('Done') }}
              </button>
            </div>
          </fieldset>
        } @else {
          <button type="button" class="sb__areas-open" (click)="areasOpen.set(true)">
            <ar-icon name="settings-menu" [size]="13" />
            @if (hiddenAreaCount() > 0) {
              {{ i18n.t('{0} areas hidden · Change', hiddenAreaCount()) }}
            } @else {
              {{ i18n.t('Too much here? Choose your work areas') }}
            }
          </button>
        }
      </div>
    }
    <div #menuTooltip class="sb__tooltip" popover="manual" aria-hidden="true"></div>

    <div class="sb__foot">
      @if (menuOpen()) {
        <div class="sb__menu" role="menu">
          <a class="sb__menu-item" routerLink="/settings/profile" role="menuitem" (click)="close()">
            <ar-icon name="user" [size]="15" /> {{ i18n.t('Your profile') }}
          </a>
          @if (pwa.canInstall()) {
            <button
              class="sb__menu-item"
              type="button"
              role="menuitem"
              (click)="installApp($event)"
            >
              <ar-icon name="download" [size]="15" /> {{ i18n.t('Install app') }}
            </button>
          }
          <button class="sb__menu-item" type="button" role="menuitem" (click)="signOut()">
            <ar-icon name="link" [size]="15" /> {{ i18n.t('Sign out') }}
          </button>
          <div class="sb__menu-lang" (click)="$event.stopPropagation()">
            <ar-appearance-settings />
          </div>
        </div>
      }
      <button
        class="sb__user"
        type="button"
        [class.sb__user--open]="menuOpen()"
        [attr.aria-expanded]="menuOpen()"
        (click)="toggleMenu($event)"
      >
        <ar-avatar [name]="account.fullName()" [src]="picture.dataUrl()" tone="teal" [size]="26" />
        <span class="sb__user-text">
          <span class="sb__user-name">{{ account.fullName() }}</span>
          <span class="sb__user-role">{{ account.primaryRole() }}</span>
        </span>
        <ar-icon class="sb__user-chev" name="chevdown" [size]="15" />
      </button>
    </div>
  `,
  styleUrl: './sidebar.scss',
})
export class ArSidebar {
  protected readonly drawer = inject(NavDrawer);
  protected readonly i18n = inject(LanguageService);
  private readonly inbox = inject(InboxService);
  private readonly ops = inject(OpsService);
  private readonly permissions = inject(PermissionService);
  protected readonly account = inject(CurrentUserService);
  protected readonly picture = inject(MyPictureStore);
  protected readonly branding = inject(BrandingStore);
  protected readonly pwa = inject(PwaService);
  protected readonly plan = inject(PlanService);
  private readonly onboarding = inject(OnboardingStore);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);

  /** Whether this group contains the currently active route item. */
  protected hasActiveItem(group: NavGroup): boolean {
    const current = this.active();
    return Boolean(current && group.items.some((i) => i.route === current));
  }

  constructor() {
    // The user id arrives after sign-in config loads; read that person's stars when it does.
    effect(() => {
      const id = this.account.id();
      untracked(() => {
        this.favouriteRoutes.set(readFavourites(id));
        this.workAreas.set(readWorkAreas(id));
      });
      // The picture is per person too: load it once someone is signed in.
      if (id) untracked(() => this.picture.ensureLoaded());
    });

    // A group picked by hand stays picked only while the page is one of its pages.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const picked = this.pickedHeading();
        if (!picked) return;
        const group = this.nav().find((g) => g.heading === picked);
        if (!group || !this.hasActiveItem(group)) this.pickedHeading.set(null);
      });

    // The horizontal menu above the screen shows the pages of the current group.
    this.subNav.toggleFavourite = (route) => {
      const item = this.allowed()
        .flatMap((g) => g.items)
        .find((i) => i.route === route);
      if (item) this.toggleFavourite(item);
    };
    effect(() => {
      const group = this.currentGroup();
      const active = this.active();
      const favourites = this.favouriteRoutes();
      untracked(() => {
        this.subNav.group.set(group);
        this.subNav.active.set(active);
        this.subNav.favourites.set(favourites);
      });
    });
  }

  private readonly subNav = inject(SubNavService);

  /** The group last clicked in the sidebar, while its page is open. */
  private readonly pickedHeading = signal<string | null>(null);

  /**
   * The group whose pages the horizontal menu shows: the one picked, else the department holding
   * this page (a starred page still shows its own department, not Favourites).
   */
  protected readonly currentGroup = computed<NavGroup | null>(() => {
    const groups = this.nav().filter((g) => g.heading);
    const picked = this.pickedHeading();
    if (picked) {
      const g = groups.find((x) => x.heading === picked);
      if (g) return g;
    }
    const holding = groups.filter((g) => this.hasActiveItem(g));
    return holding.find((g) => g.heading !== FAVOURITES) ?? holding[0] ?? null;
  });

  protected isCurrentGroup(group: NavGroup): boolean {
    return this.currentGroup()?.heading === group.heading;
  }

  protected groupIcon(group: NavGroup): IconName {
    return group.heading === FAVOURITES ? 'star' : (group.items[0]?.icon ?? 'chevron');
  }

  /** Shows the group's pages above the screen and opens its first page, unless already on one. */
  protected selectGroup(group: NavGroup): void {
    this.hideMenuTooltip();
    this.pickedHeading.set(group.heading);
    this.drawer.close();
    if (!this.hasActiveItem(group) && group.items[0]) {
      void this.router.navigateByUrl(group.items[0].route);
    }
  }

  /** Icons-only mode, remembered per browser and shared with topbar breadcrumbs. */
  protected readonly collapsed = this.drawer.collapsed;
  private readonly menuTooltip = viewChild<ElementRef<HTMLElement>>('menuTooltip');

  protected showMenuTooltip(event: Event, label: string): void {
    const tooltip = this.menuTooltip()?.nativeElement;
    const anchor = event.currentTarget;
    if (!this.collapsed() || !tooltip || !(anchor instanceof HTMLElement)) return;

    const bounds = anchor.getBoundingClientRect();
    tooltip.textContent = this.i18n.t(label);
    tooltip.style.left = `${bounds.right + 10}px`;
    tooltip.style.top = `${bounds.top + bounds.height / 2}px`;
    tooltip.showPopover();
  }

  protected hideMenuTooltip(): void {
    this.menuTooltip()?.nativeElement.hidePopover();
  }

  protected toggleCollapsed(): void {
    this.hideMenuTooltip();
    this.drawer.toggleCollapsed();
  }

  protected async installApp(event: Event): Promise<void> {
    event.stopPropagation();
    this.menuOpen.set(false);
    await this.pwa.promptInstall();
  }

  protected toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.update((v) => !v);
  }
  protected close(): void {
    this.menuOpen.set(false);
    this.drawer.close();
  }
  protected signOut(): void {
    this.menuOpen.set(false);
    this.account.logout();
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    if (this.menuOpen()) this.menuOpen.set(false);
  }

  /**
   * Every page this person may open, by group, filtered reactively by role permissions,
   * workspace plan and features. Includes the pages reached from hubs that can be starred.
   */
  private readonly allowed = computed<readonly NavGroup[]>(() => {
    this.account.permissionState();
    this.plan.plan();
    this.plan.features();
    this.account.isHost();

    const setupComplete = this.onboarding.hidden();

    return NAV.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.top &&
          visibleForSetup(item, setupComplete) &&
          canAccessNavItem(item, this.permissions, this.plan, this.account),
      ),
    })).filter((group) => group.items.length > 0);
  });

  /** Starred pages, in the order they were starred; per user and per browser. */
  private readonly favouriteRoutes = signal<readonly string[]>([]);

  /** The work areas this person chose to see; null until they choose (everything shows). */
  private readonly workAreas = signal<ReadonlySet<string> | null>(null);
  protected readonly areasOpen = signal(false);

  /** The optional areas this person may open at all, in menu order. */
  protected readonly areaChoices = computed(() =>
    this.allowed()
      .map((g) => g.heading)
      .filter((h): h is string => !!h && OPTIONAL_AREAS.includes(h)),
  );

  protected readonly hiddenAreaCount = computed(() => {
    const chosen = this.workAreas();
    return chosen === null ? 0 : this.areaChoices().filter((a) => !chosen.has(a)).length;
  });

  protected isAreaOn(area: string): boolean {
    const chosen = this.workAreas();
    return chosen === null || chosen.has(area);
  }

  protected toggleArea(area: string): void {
    const next = new Set(this.workAreas() ?? this.areaChoices());
    if (next.has(area)) next.delete(area);
    else next.add(area);
    this.saveAreas(next);
  }

  protected showAllAreas(): void {
    this.saveAreas(null);
    this.areasOpen.set(false);
  }

  private saveAreas(areas: ReadonlySet<string> | null): void {
    this.workAreas.set(areas);
    writeWorkAreas(this.account.id(), areas);
  }

  /** The sidebar: favourites first, then day-to-day work in the chosen areas. */
  protected readonly nav = computed(() => this.buildNav(true));

  /** Search looks through every area, including hidden ones, so nothing is lost by hiding it. */
  private readonly navForSearch = computed(() => this.buildNav(false));

  /** Set-up and report pages live on their hubs, not here. */
  private buildNav(byArea: boolean): readonly NavGroup[] {
    const allowed = this.allowed();
    const byRoute = new Map(allowed.flatMap((g) => g.items).map((i) => [i.route, i] as const));
    const favourites = this.favouriteRoutes()
      .map((r) => byRoute.get(r))
      .filter((i): i is NavItem => Boolean(i));
    const all = allowed
      .map((group) => ({ ...group, items: group.items.filter((i) => !this.offSidebar(i)) }))
      .filter((group) => group.items.length > 0);
    const daily = byArea ? filterByWorkAreas(all, this.workAreas()) : all;
    if (favourites.length === 0) return daily;
    const fav: NavGroup = { heading: FAVOURITES, items: favourites };
    // After the heading-less top (Home, Tasks…), before the departments.
    return daily[0] && !daily[0].heading ? [daily[0], fav, ...daily.slice(1)] : [fav, ...daily];
  }

  /** Kept on its hub page (Settings, All reports) rather than in the sidebar. */
  private offSidebar(item: NavItem): boolean {
    return !!item.menu && !(item.hostSidebar && this.account.isHost());
  }

  protected isFavourite(item: NavItem): boolean {
    return this.favouriteRoutes().includes(item.route);
  }

  protected toggleFavourite(item: NavItem): void {
    const now = this.favouriteRoutes();
    const next = now.includes(item.route)
      ? now.filter((r) => r !== item.route)
      : [...now, item.route];
    this.favouriteRoutes.set(next);
    try {
      localStorage.setItem(favouritesKey(this.account.id()), JSON.stringify(next));
    } catch {
      /* storage blocked: the star just won't be remembered */
    }
  }

  /** Filters the menu by item label, or by group heading to show a whole group. */
  protected readonly menuQuery = signal('');
  protected readonly searching = computed(() => this.menuQuery().trim().length > 0);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('menuSearch');

  protected readonly shown = computed<readonly NavGroup[]>(() => {
    const terms = this.menuQuery().trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return this.nav();
    const groups = this.navForSearch();
    const hits = (text: string) => terms.every((t) => text.includes(t));
    return groups
      .map((group) => {
        // The English and the shown language both match, so either can be typed.
        const heading = `${group.heading ?? ''} ${group.heading ? this.i18n.t(group.heading) : ''}`
          .trim()
          .toLowerCase();
        if (heading && hits(heading)) return group;
        return {
          ...group,
          items: group.items.filter((i) =>
            hits(`${i.label} ${this.i18n.t(i.label)} ${heading}`.toLowerCase()),
          ),
        };
      })
      .filter((group) => group.items.length > 0);
  });

  /** From icons-only mode: open the bar and put the cursor in the search. */
  protected openSearch(): void {
    if (this.collapsed()) this.toggleCollapsed();
    setTimeout(() => this.searchInput()?.nativeElement.focus());
  }

  protected openFirstMatch(): void {
    if (!this.searching()) return;
    const first = this.shown()[0]?.items[0];
    if (!first) return;
    this.clearSearch();
    void this.router.navigateByUrl(first.route);
  }

  protected clearSearch(): void {
    this.menuQuery.set('');
  }

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /**
   * The route of the item to light: the longest nav route the current path starts with. A page
   * kept off the sidebar lights its hub (Settings, All reports), unless it is starred.
   */
  protected readonly active = computed(() => {
    const path = (this.url() ?? '').split(/[?#;]/)[0];
    let best: NavItem | null = null;
    for (const group of this.allowed()) {
      for (const item of group.items) {
        const { route } = item;
        if (
          (path === route || path.startsWith(route + '/')) &&
          route.length > (best?.route.length ?? -1)
        ) {
          best = item;
        }
      }
    }
    if (!best) return '';
    if (best.menu && this.offSidebar(best) && !this.favouriteRoutes().includes(best.route)) {
      return HUB_ROUTE[best.menu];
    }
    return best.route;
  });

  protected badgeFor(kind: 'inbox' | 'enquiries' | 'alerts' | undefined): number | null {
    if (kind === 'inbox') return this.inbox.unassignedCount() ?? null;
    // No cheap open-enquiry count exists yet; a fixed number here was wrong for every workspace.
    if (kind === 'enquiries') return null;

    // Unread notifications, not unread criticals. A badge that only counts the worst
    // alerts teaches people that a badge of zero means nothing is waiting.
    if (kind === 'alerts') return this.ops.unreadCount() || null;

    return null;
  }
}
