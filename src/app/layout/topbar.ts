import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { ArIcon } from '../ui';
import { helpTopicFor } from '../core/help/help-topics';
import { grantedPolicy } from '../core/auth/permission';
import { InboxService } from '../core/services/inbox.service';
import { OpsService } from '../core/services/ops.service';
import { PlanService } from '../core/services/plan.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { canAccessNavItem } from '../core/auth/permission';
import { NAV, NavItem } from './nav.model';
import { ArAppearanceSettings } from './appearance-settings';
import { NavDrawer } from './nav-drawer';
import { LanguageService } from '../core/i18n/language.service';

/**
 * Every screen's header, and — since `help` is set on essentially every call
 * site — the one place a screen-level explanation lives. Keeping it here
 * rather than a `<ar-help>` scattered per-screen means every page gets the
 * same affordance in the same place, and a screen simply forgetting to pass
 * `help` is the only way one goes without it.
 * <p>
 * The popover's benefits and step-by-step sections come from `HELP_TOPICS`,
 * looked up by the route that rendered this screen — so no screen passes them
 * in. A route without a topic shows the one-line `help` alone, as before.
 * </p>
 */
@Component({
  selector: 'ar-topbar',
  imports: [ArIcon, ArAppearanceSettings, RouterLink, RouterLinkActive],
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
    <div class="tb__tools">
      @if (summary()) {
        <button
          type="button"
          class="tb__tool"
          [class.tb__tool--on]="open()"
          [attr.aria-expanded]="open()"
          [attr.aria-label]="'Help: about ' + title()"
          [title]="i18n.t('Help')"
          (click)="toggle($event)"
        >
          <ar-icon name="help" [size]="17" />
        </button>
      }
      @for (item of tools(); track item.route) {
        <a
          class="tb__tool"
          [routerLink]="item.route"
          routerLinkActive="tb__tool--on"
          [attr.aria-label]="
            i18n.t(item.label) + (badgeFor(item) ? ', ' + badgeFor(item) + ' new' : '')
          "
          [title]="i18n.t(item.label)"
        >
          <ar-icon [name]="item.icon" [size]="17" />
          @if (badgeFor(item); as n) {
            <span class="tb__badge">{{ n > 99 ? '99+' : n }}</span>
          }
        </a>
      }
      <ar-appearance-settings compact />
      <button class="tb__signout" type="button" (click)="signOut()">
        {{ i18n.t('Sign out') }}
      </button>
    </div>

    @if (open()) {
      @if (topic; as t) {
        <div
          class="tb__pop tb__pop--guide"
          role="dialog"
          [attr.aria-label]="'About ' + title()"
          (click)="$event.stopPropagation()"
        >
          <div class="tb__pop-head">
            <p class="tb__pop-title">{{ title() }}</p>
            <button
              type="button"
              class="tb__pop-close"
              aria-label="Close help"
              (click)="open.set(false)"
            >
              ×
            </button>
          </div>

          <p class="tb__pop-label">What it does</p>
          <p class="tb__pop-body">{{ summary() }}</p>

          <p class="tb__pop-label">Benefits</p>
          <ul class="tb__pop-list">
            @for (b of t.benefits; track $index) {
              <li>{{ b }}</li>
            }
          </ul>

          <p class="tb__pop-label">How to use it</p>
          <ol class="tb__pop-steps">
            @for (s of t.steps; track $index) {
              <li>{{ s }}</li>
            }
          </ol>

          @if (t.tips?.length) {
            <div class="tb__pop-tip">
              @for (tip of t.tips; track $index) {
                <p>{{ tip }}</p>
              }
            </div>
          }
        </div>
      } @else {
        <div class="tb__pop" role="tooltip" (click)="$event.stopPropagation()">
          <p class="tb__pop-title">{{ title() }}</p>
          <p class="tb__pop-body">{{ help() }}</p>
        </div>
      }
    }
  `,
  styles: `
    :host {
      position: relative;
      /* Its own layer above the page, so the help popover is never under a grid,
         calendar or chart; still below Syncfusion's popups and dialogs (1000+). */
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
    /* A phone: the sidebar is a drawer behind this button, and the header packs tighter. */
    @media (max-width: 720px) {
      /* Two rows: menu, title and tools on top; the page's own buttons below. */
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
      .tb__actions {
        order: 3;
        flex: 1 1 100%;
        flex-wrap: wrap;
        gap: 8px;
      }
      .tb__actions:empty {
        display: none;
      }
      :host .tb__tools {
        order: 2;
        flex: 1 1 100%;
        flex-wrap: wrap;
        justify-content: flex-end;
        padding-left: 0;
        border-left: 0;
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
      /* One line, cut short, when the header is tight: never a word per line. */
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tb__actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tb__signout {
      flex: none;
      min-height: 34px;
      padding: 6px 10px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      background: transparent;
      color: var(--ar-ink-700);
      font: 500 12px var(--ar-font-sans);
      white-space: nowrap;
      cursor: pointer;
    }
    .tb__signout:hover,
    .tb__signout:focus-visible {
      background: var(--ar-bg-100);
      color: var(--ar-ink-900);
    }
    .tb__tools {
      display: flex;
      align-items: center;
      gap: 4px;
      padding-left: 12px;
      border-left: 1px solid var(--ar-line-200);
    }
    /* Nothing to separate from on screens without header actions. */
    .tb__actions:empty + .tb__tools {
      padding-left: 0;
      border-left: 0;
    }
    .tb__tool {
      position: relative;
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid transparent;
      border-radius: var(--ar-radius-control);
      background: transparent;
      color: var(--ar-ink-500);
      cursor: pointer;
      text-decoration: none;
      transition:
        background-color var(--ar-ease),
        color var(--ar-ease);
    }
    .tb__tool:hover,
    .tb__tool:focus-visible {
      background: var(--ar-bg-100);
      color: var(--ar-ink-900);
      outline: none;
    }
    .tb__tool--on {
      background: var(--ar-blue-100);
      color: var(--ar-primary);
      border-color: color-mix(in srgb, var(--ar-primary) 25%, transparent);
    }
    .tb__badge {
      position: absolute;
      top: 2px;
      right: 1px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: var(--ar-red-500);
      color: #fff;
      font: 600 9.5px/16px var(--ar-font-sans);
      text-align: center;
      box-shadow: 0 0 0 2px var(--ar-header-bg, var(--ar-white));
    }

    .tb__pop {
      position: absolute;
      top: 50px;
      right: 22px;
      z-index: 1;
      width: min(340px, calc(100vw - 44px));
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-pop);
      padding: 12px 14px 13px;
    }
    .tb__pop-title {
      margin: 0 0 4px;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .tb__pop-body {
      margin: 0;
      font: 400 12.5px/1.55 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }

    .tb__pop--guide {
      width: min(400px, calc(100vw - 44px));
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      padding: 12px 16px 14px;
    }
    .tb__pop-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .tb__pop-head .tb__pop-title {
      margin: 0;
      font-size: 13.5px;
    }
    .tb__pop-close {
      flex: none;
      width: 24px;
      height: 24px;
      border: 0;
      border-radius: var(--ar-radius-control);
      background: transparent;
      color: var(--ar-ink-400);
      font: 400 18px/1 var(--ar-font-sans);
      cursor: pointer;
      padding: 0;
    }
    .tb__pop-close:hover {
      background: var(--ar-bg-100);
      color: var(--ar-ink-900);
    }
    .tb__pop-label {
      margin: 12px 0 4px;
      font: 600 10.5px var(--ar-font-sans);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ar-teal-600);
    }
    .tb__pop-list,
    .tb__pop-steps {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .tb__pop-steps li::marker {
      font-weight: 600;
      color: var(--ar-teal-600);
    }
    .tb__pop-tip {
      margin-top: 12px;
      padding: 8px 10px;
      border-radius: var(--ar-radius-inset);
      background: var(--ar-amber-100);
      font: 400 12px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .tb__pop-tip p {
      margin: 0;
    }
  `,
})
export class ArTopbar {
  protected readonly drawer = inject(NavDrawer);
  protected readonly i18n = inject(LanguageService);
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);

  /** A short, screen-specific explanation shown from the help popover. Omit
   *  only for a screen genuinely too simple to need one. */
  readonly help = input<string | null>(null);

  /** The routed screen this bar sits in; absent when rendered outside a route. */
  private readonly route = inject(ActivatedRoute, { optional: true });

  protected readonly topic = helpTopicFor(this.route?.snapshot.routeConfig?.path);

  /** The "What it does" line: a shared topic's own summary, else the screen's `help`. */
  protected readonly summary = computed(() => this.topic?.summary ?? this.help());

  protected readonly open = signal(false);

  private readonly inbox = inject(InboxService);
  private readonly ops = inject(OpsService);
  private readonly permissions = inject(PermissionService);
  private readonly plan = inject(PlanService);
  private readonly account = inject(CurrentUserService);

  /** Inbox and Notifications, as icons beside the theme switch, for those allowed to see them. */
  protected readonly tools = computed<readonly NavItem[]>(() => {
    this.account.permissionState();
    this.plan.plan();
    this.plan.features();
    this.account.isHost();

    return NAV.flatMap((g) => g.items).filter(
      (i) => i.top && canAccessNavItem(i, this.permissions, this.plan, this.account),
    );
  });

  protected badgeFor(item: NavItem): number | null {
    if (item.badge === 'inbox') return this.inbox.unassignedCount() || null;
    if (item.badge === 'alerts') return this.ops.unreadCount() || null;
    return null;
  }

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  protected signOut(): void {
    this.open.set(false);
    this.drawer.close();
    this.account.logout();
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    if (this.open()) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }
}
