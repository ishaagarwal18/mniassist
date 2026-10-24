import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { PermissionService } from '@abp/ng.core';
import { NAV, NavGroup } from './nav.model';
import { ArAvatar, ArIcon } from '../ui';
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

const COLLAPSED_KEY = 'ar.sidebar.collapsed';
const FOLDED_KEY = 'ar.sidebar.foldedGroups';

function readFolded(): ReadonlySet<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FOLDED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
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

    <nav class="sb__nav" aria-label="Main">
      @for (group of shown(); track group.heading) {
        @if (group.heading) {
          <!-- A heading folds its group away; the group holding this page stays open. -->
          <button
            type="button"
            class="sb__heading"
            [class.sb__heading--folded]="isFolded(group)"
            [attr.aria-expanded]="!isFolded(group)"
            [attr.title]="i18n.t(isFolded(group) ? 'Show {0}' : 'Hide {0}', i18n.t(group.heading))"
            (click)="toggleGroup(group)"
          >
            <span>{{ i18n.t(group.heading) }}</span>
            <ar-icon class="sb__heading-chev" name="chevdown" [size]="12" />
          </button>
        }
        @for (item of isFolded(group) ? [] : group.items; track item.route) {
          <!-- One item is lit: the one whose route is the longest match for the page,
               so /settings/support-access lights Support access, not Settings too,
               and a sub-page (/enquiries/pipelines, /inbox?c=…) keeps its parent lit. -->
          <a
            class="sb__item"
            [class.sb__item--ai]="item.ai"
            [class.sb__item--on]="item.route === active()"
            [attr.aria-current]="item.route === active() ? 'page' : null"
            [routerLink]="item.route"
            [attr.title]="collapsed() ? i18n.t(item.label) : null"
            (click)="clearSearch(); drawer.close()"
          >
            <span class="sb__bar" aria-hidden="true"></span>
            <ar-icon [name]="item.icon" [size]="16" />
            <span class="sb__label">{{ i18n.t(item.label) }}</span>
            @if (badgeFor(item.badge); as n) {
              <span class="sb__badge">{{ n }}</span>
            }
          </a>
        }
      } @empty {
        <p class="sb__none">{{ i18n.t('No menu items match “{0}”.', menuQuery().trim()) }}</p>
      }
    </nav>

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
        <ar-avatar [name]="account.fullName()" tone="teal" [size]="26" />
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
  protected readonly branding = inject(BrandingStore);
  protected readonly pwa = inject(PwaService);
  protected readonly plan = inject(PlanService);

  protected readonly menuOpen = signal(false);

  /** Menu groups folded away by their heading, remembered per browser. */
  private readonly folded = signal<ReadonlySet<string>>(readFolded());

  /** Folded, unless it holds the page on screen (or the bar shows icons only, or a search is on). */
  protected isFolded(group: NavGroup): boolean {
    if (!group.heading || this.collapsed() || this.searching()) return false;
    if (!this.folded().has(group.heading)) return false;
    return !group.items.some((i) => i.route === this.active());
  }

  protected toggleGroup(group: NavGroup): void {
    const name = group.heading;
    if (!name) return;
    const next = new Set(this.folded());
    if (this.isFolded(group)) next.delete(name);
    else next.add(name);
    this.folded.set(next);
    try {
      localStorage.setItem(FOLDED_KEY, JSON.stringify([...next]));
    } catch {
      /* storage blocked: the choice just won't persist */
    }
  }

  /** Icons-only mode, remembered per browser. */
  protected readonly collapsed = signal(readCollapsed());

  protected toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
    try {
      localStorage.setItem(COLLAPSED_KEY, this.collapsed() ? '1' : '0');
    } catch {
      /* storage blocked: the choice just won't persist */
    }
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

  /** NAV with items filtered reactively by role permissions, workspace plan, and features. */
  protected readonly nav = computed<readonly NavGroup[]>(() => {
    this.account.permissionState();
    this.plan.plan();
    this.plan.features();
    this.account.isHost();

    return NAV.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.top && canAccessNavItem(item, this.permissions, this.plan, this.account),
      ),
    })).filter((group) => group.items.length > 0);
  });

  /** Filters the menu by item label, or by group heading to show a whole group. */
  protected readonly menuQuery = signal('');
  protected readonly searching = computed(() => this.menuQuery().trim().length > 0);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('menuSearch');

  protected readonly shown = computed<readonly NavGroup[]>(() => {
    const terms = this.menuQuery().trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return this.nav();
    const hits = (text: string) => terms.every((t) => text.includes(t));
    return this.nav()
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

  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** The route of the item to light: the longest nav route the current path starts with. */
  protected readonly active = computed(() => {
    const path = (this.url() ?? '').split(/[?#;]/)[0];
    let best = '';
    for (const group of this.nav()) {
      for (const { route } of group.items) {
        if ((path === route || path.startsWith(route + '/')) && route.length > best.length) {
          best = route;
        }
      }
    }
    return best;
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
