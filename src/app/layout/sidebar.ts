import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { NAV, NavGroup } from './nav.model';
import { ArAvatar, ArIcon } from '../ui';
import { OpsService } from '../core/services/ops.service';
import { InboxService } from '../core/services/inbox.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { grantedPolicy } from '../core/auth/permission';

@Component({
  selector: 'ar-sidebar',
  imports: [RouterLink, RouterLinkActive, ArIcon, ArAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sb__top">
      <div class="sb__brand">
        <span class="sb__mark" aria-hidden="true"
          ><ar-icon name="bolt" [size]="13" [strokeWidth]="0"
        /></span>
        <span class="sb__name">AutoReach</span>
      </div>
      <button class="sb__tenant" type="button">
        <span class="sb__tenant-name">Vertex Automation</span>
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
            [routerLink]="item.route"
            routerLinkActive="sb__item--on"
            [routerLinkActiveOptions]="{ exact: true }"
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
        <ar-icon name="chevdown" [size]="15" />
      </button>
    </div>
  `,
  styles: `
    :host {
      width: 216px;
      flex: none;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--ar-nav);
      color: var(--ar-nav-text);
    }
    .sb__top {
      padding: 16px 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sb__brand {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .sb__mark {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      flex: none;
      background: var(--ar-amber-500);
      color: var(--ar-nav);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sb__name {
      font: 600 15px var(--ar-font-sans);
      color: #fff;
      letter-spacing: -0.015em;
    }
    .sb__tenant {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      height: 34px;
      padding: 0 10px;
      cursor: pointer;
      background: var(--ar-nav-hi);
      border: 1px solid #303945;
      border-radius: var(--ar-radius-control);
      color: var(--ar-nav-dim);
    }
    .sb__tenant-name {
      font: 500 12px var(--ar-font-sans);
      color: #dde3ea;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sb__nav {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 4px 10px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sb__heading {
      padding: 14px 8px 6px;
      font: 600 9.5px var(--ar-font-sans);
      letter-spacing: 0.11em;
      text-transform: uppercase;
      color: var(--ar-nav-dim);
    }
    .sb__item {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 33px;
      padding: 0 8px;
      border-radius: var(--ar-radius-control);
      color: var(--ar-nav-text);
      text-decoration: none;
    }
    .sb__item:hover {
      background: #20262e;
      color: #dde3ea;
    }
    .sb__bar {
      width: 3px;
      height: 16px;
      border-radius: 2px;
      margin-left: -4px;
      flex: none;
      background: transparent;
    }
    .sb__label {
      flex: 1;
      font: 400 13px var(--ar-font-sans);
    }
    .sb__item--on {
      background: var(--ar-nav-hi);
      color: #fff;
    }
    .sb__item--on .sb__bar {
      background: var(--ar-amber-500);
    }
    .sb__item--on .sb__label {
      font-weight: 500;
    }
    .sb__item--on ar-icon {
      color: var(--ar-amber-500);
    }
    .sb__item ar-icon {
      color: var(--ar-nav-dim);
    }
    .sb__badge {
      min-width: 19px;
      height: 17px;
      padding: 0 5px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #303945;
      color: #c4ccd6;
      font: 600 10.5px var(--ar-font-sans);
    }
    .sb__item--on .sb__badge {
      background: var(--ar-amber-500);
      /* var(--ar-nav) on amber-500 was 4.46:1 — just under WCAG AA's 4.5:1.
         ar-ink-900 (darker) clears it at 4.86:1. amber-500 itself is left
         untouched — it doubles as --ar-chart-marketing, validated separately. */
      color: var(--ar-ink-900);
    }

    .sb__foot {
      position: relative;
      border-top: 1px solid var(--ar-nav-line);
    }
    .sb__user {
      width: 100%;
      padding: 12px 14px 14px;
      display: flex;
      align-items: center;
      gap: 9px;
      color: var(--ar-nav-dim);
      background: transparent;
      border: 0;
      cursor: pointer;
      text-align: left;
    }
    .sb__user:hover,
    .sb__user--open {
      background: #20262e;
    }
    .sb__user-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .sb__user-name {
      font: 500 12px var(--ar-font-sans);
      color: #dde3ea;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sb__user-role {
      font: 400 10.5px var(--ar-font-sans);
      color: var(--ar-nav-dim);
    }
    .sb__user ar-icon {
      color: var(--ar-nav-dim);
    }

    .sb__menu {
      position: absolute;
      left: 10px;
      right: 10px;
      bottom: calc(100% - 4px);
      background: var(--ar-nav-hi);
      border: 1px solid #303945;
      border-radius: var(--ar-radius-control);
      padding: 4px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      z-index: 10;
    }
    .sb__menu-item {
      display: flex;
      align-items: center;
      gap: 9px;
      width: 100%;
      padding: 8px 9px;
      border: 0;
      border-radius: var(--ar-radius-control);
      background: transparent;
      color: var(--ar-nav-text);
      cursor: pointer;
      text-decoration: none;
      font: 400 12.5px var(--ar-font-sans);
    }
    .sb__menu-item:hover {
      background: #20262e;
      color: #dde3ea;
    }
    .sb__menu-item ar-icon {
      color: var(--ar-nav-dim);
    }
  `,
})
export class ArSidebar {
  private readonly inbox = inject(InboxService);
  private readonly ops = inject(OpsService);
  private readonly permissions = inject(PermissionService);
  protected readonly account = inject(CurrentUserService);

  protected readonly menuOpen = signal(false);

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
