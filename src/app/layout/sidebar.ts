import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { PermissionService } from '@abp/ng.core';
import { NAV, NavGroup } from './nav.model';
import { ArAvatar, ArIcon } from '../ui';
import { ArBrand } from './brand';
import { OpsService } from '../core/services/ops.service';
import { InboxService } from '../core/services/inbox.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { BrandingStore } from '../core/services/branding.store';
import { ThemeService } from '../core/services/theme.service';
import { PwaService } from '../core/services/pwa.service';
import { grantedPolicy } from '../core/auth/permission';

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
  imports: [RouterLink, ArIcon, ArAvatar, ArBrand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.sb--collapsed]': 'collapsed()' },
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
          [attr.aria-label]="collapsed() ? 'Expand navigation' : 'Collapse navigation'"
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
    </div>

    <nav class="sb__nav" aria-label="Main">
      @for (group of nav; track group.heading) {
        @if (group.heading) {
          <!-- A heading folds its group away; the group holding this page stays open. -->
          <button
            type="button"
            class="sb__heading"
            [class.sb__heading--folded]="isFolded(group)"
            [attr.aria-expanded]="!isFolded(group)"
            [attr.title]="isFolded(group) ? 'Show ' + group.heading : 'Hide ' + group.heading"
            (click)="toggleGroup(group)"
          >
            <span>{{ group.heading }}</span>
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
            [attr.title]="collapsed() ? item.label : null"
          >
            <span class="sb__bar" aria-hidden="true"></span>
            <ar-icon [name]="item.icon" [size]="16" />
            <span class="sb__label">{{ item.label }}</span>
            @if (badgeFor(item.badge); as n) {
              <span class="sb__badge">{{ n }}</span>
            }
          </a>
        }
      }
    </nav>

    <div class="sb__foot">
      @if (menuOpen()) {
        <div class="sb__menu" role="menu">
          <a class="sb__menu-item" routerLink="/settings/profile" role="menuitem" (click)="close()">
            <ar-icon name="user" [size]="15" /> Your profile
          </a>
          <button
            class="sb__menu-item"
            type="button"
            role="menuitemcheckbox"
            [attr.aria-checked]="theme.theme() === 'dark'"
            (click)="toggleTheme($event)"
          >
            <ar-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="15" />
            {{ theme.theme() === 'dark' ? 'Light theme' : 'Dark theme' }}
          </button>
          @if (pwa.canInstall()) {
            <button class="sb__menu-item" type="button" role="menuitem" (click)="installApp($event)">
              <ar-icon name="download" [size]="15" /> Install app
            </button>
          }
          <button class="sb__menu-item" type="button" role="menuitem" (click)="signOut()">
            <ar-icon name="link" [size]="15" /> Sign out
          </button>
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
  private readonly inbox = inject(InboxService);
  private readonly ops = inject(OpsService);
  private readonly permissions = inject(PermissionService);
  protected readonly account = inject(CurrentUserService);
  protected readonly branding = inject(BrandingStore);
  protected readonly theme = inject(ThemeService);
  protected readonly pwa = inject(PwaService);

  protected readonly menuOpen = signal(false);

  /** Menu groups folded away by their heading, remembered per browser. */
  private readonly folded = signal<ReadonlySet<string>>(readFolded());

  /** Folded, unless it holds the page on screen (or the bar shows icons only). */
  protected isFolded(group: NavGroup): boolean {
    if (!group.heading || this.collapsed() || !this.folded().has(group.heading)) return false;
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

  /** Keeps the menu open, so the switch can be flipped back and forth to compare. */
  protected toggleTheme(event: Event): void {
    event.stopPropagation();
    this.theme.toggle();
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
  }
  protected signOut(): void {
    this.menuOpen.set(false);
    this.account.logout();
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    if (this.menuOpen()) this.menuOpen.set(false);
  }

  /** NAV with items the current user cannot see, and the header's items, filtered out. */
  protected readonly nav: readonly NavGroup[] = NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.top && grantedPolicy(item.permission, this.permissions),
    ),
  })).filter((group) => group.items.length > 0);

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
    for (const group of this.nav) {
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
