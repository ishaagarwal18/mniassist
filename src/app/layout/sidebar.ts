import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { NAV, NavGroup } from './nav.model';
import { ArAvatar, ArIcon } from '../ui';
import { ArBrand } from './brand';
import { OpsService } from '../core/services/ops.service';
import { InboxService } from '../core/services/inbox.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { BrandingStore } from '../core/services/branding.store';
import { ThemeService } from '../core/services/theme.service';
import { grantedPolicy } from '../core/auth/permission';

const COLLAPSED_KEY = 'ar.sidebar.collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

@Component({
  selector: 'ar-sidebar',
  imports: [RouterLink, RouterLinkActive, ArIcon, ArAvatar, ArBrand],
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
      <button class="sb__tenant" type="button">
        <span class="sb__tenant-name">{{ account.currentTenantName() || 'MNI Assist' }}</span>
        <ar-icon name="chevdown" [size]="14" />
      </button>
    </div>

    <nav class="sb__nav" aria-label="Main">
      @for (group of nav; track group.heading) {
        @if (group.heading) {
          <div class="sb__heading">{{ group.heading }}</div>
        }
        @for (item of group.items; track item.route) {
          <!-- Exact matching, because /settings/support-access is a prefix match for
               /settings and prefix matching lights up two items at once. -->
          <a
            class="sb__item"
            [class.sb__item--ai]="item.ai"
            [routerLink]="item.route"
            routerLinkActive="sb__item--on"
            [routerLinkActiveOptions]="{ exact: true }"
            [attr.title]="collapsed() ? item.label : null"
            #rla="routerLinkActive"
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

  protected readonly menuOpen = signal(false);

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

  /** NAV with items the current user cannot see filtered out (all visible on seed data). */
  protected readonly nav: readonly NavGroup[] = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => grantedPolicy(item.permission, this.permissions)),
  })).filter((group) => group.items.length > 0);

  protected badgeFor(kind: 'inbox' | 'enquiries' | 'alerts' | undefined): number | null {
    if (kind === 'inbox') return this.inbox.unassignedCount() ?? null;
    if (kind === 'enquiries') return 4;

    // Unread notifications, not unread criticals. A badge that only counts the worst
    // alerts teaches people that a badge of zero means nothing is waiting.
    if (kind === 'alerts') return this.ops.unreadCount() || null;

    return null;
  }
}
