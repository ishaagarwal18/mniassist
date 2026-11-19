import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { ArIcon } from '../ui/icon';
import { APP_LANGUAGES, AppLanguage, LanguageService } from '../core/i18n/language.service';
import { ThemeService } from '../core/services/theme.service';
import { Theme } from '../core/services/theme-logic';
import { InboxService } from '../core/services/inbox.service';
import { OpsService } from '../core/services/ops.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { PlanService } from '../core/services/plan.service';
import { canAccessNavItem } from '../core/auth/permission';
import { NAV, NavItem } from './nav.model';
import { PageContextService } from './page-context.service';

@Component({
  selector: 'ar-right-sidebar',
  imports: [RouterLink, RouterLinkActive, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.rsb--open]': 'pageContext.drawerOpen()',
  },
  template: `
    <!-- Top Section: Communications & Help -->
    <div class="rsb__section">
      <!-- Inbox -->
      @if (showInbox()) {
        <a
          class="rsb__item"
          routerLink="/inbox"
          routerLinkActive="rsb__item--active"
          [attr.aria-label]="i18n.t('Inbox') + (inboxBadge() ? ', ' + inboxBadge() + ' new' : '')"
          [title]="i18n.t('Inbox')"
          (click)="closeAll(); pageContext.closeDrawer()"
        >
          <ar-icon name="inbox" [size]="18" />
          @if (inboxBadge(); as count) {
            <span class="rsb__badge">{{ count > 99 ? '99+' : count }}</span>
          }
        </a>
      }

      <!-- Notifications -->
      @if (showNotifications()) {
        <a
          class="rsb__item"
          routerLink="/notifications"
          routerLinkActive="rsb__item--active"
          [attr.aria-label]="
            i18n.t('Notifications') +
            (notificationsBadge() ? ', ' + notificationsBadge() + ' new' : '')
          "
          [title]="i18n.t('Notifications')"
          (click)="closeAll(); pageContext.closeDrawer()"
        >
          <ar-icon name="bell" [size]="18" />
          @if (notificationsBadge(); as count) {
            <span class="rsb__badge">{{ count > 99 ? '99+' : count }}</span>
          }
        </a>
      }

      <!-- What's new -->
      <a
        class="rsb__item"
        routerLink="/whats-new"
        routerLinkActive="rsb__item--active"
        [attr.aria-label]="i18n.t('What’s new')"
        [title]="i18n.t('What’s new')"
        (click)="closeAll(); pageContext.closeDrawer()"
      >
        <ar-icon name="sparkle" [size]="18" />
      </a>

      <!-- Help -->
      <button
        type="button"
        class="rsb__item"
        [class.rsb__item--active]="pageContext.helpOpen()"
        [attr.aria-expanded]="pageContext.helpOpen()"
        [attr.aria-label]="i18n.t('Help') + (pageTitle() ? ': about ' + pageTitle() : '')"
        [title]="i18n.t('Help')"
        (click)="toggleHelp($event)"
      >
        <ar-icon name="help" [size]="18" />
      </button>
    </div>

    <!-- Help Flyout Guide Panel -->
    @if (pageContext.helpOpen()) {
      <div
        class="rsb__pop rsb__pop--help"
        role="dialog"
        [attr.aria-label]="i18n.t('Help: ') + (pageTitle() || 'MNI Assist')"
        (click)="$event.stopPropagation()"
      >
        <div class="rsb__help-head">
          <p class="rsb__help-head-title">{{ pageTitle() || i18n.t('Help & Guide') }}</p>
          <button
            type="button"
            class="rsb__help-close"
            [attr.aria-label]="i18n.t('Close help')"
            (click)="pageContext.closeHelp()"
          >
            ×
          </button>
        </div>

        @if (topic(); as t) {
          <p class="rsb__help-label">{{ i18n.t('What it does') }}</p>
          <p class="rsb__help-body">{{ summary() }}</p>

          @if (t.benefits.length) {
            <p class="rsb__help-label">{{ i18n.t('Benefits') }}</p>
            <ul class="rsb__help-list">
              @for (b of t.benefits; track $index) {
                <li>{{ b }}</li>
              }
            </ul>
          }

          @if (t.steps.length) {
            <p class="rsb__help-label">{{ i18n.t('How to use it') }}</p>
            <ol class="rsb__help-steps">
              @for (s of t.steps; track $index) {
                <li>{{ s }}</li>
              }
            </ol>
          }

          @if (t.fields?.length) {
            <p class="rsb__help-label">{{ i18n.t('On this screen') }}</p>
            <dl class="rsb__help-fields">
              @for (f of t.fields; track $index) {
                <div>
                  <dt>{{ f.name }}</dt>
                  <dd>{{ f.text }}</dd>
                </div>
              }
            </dl>
          }

          @if (t.tips?.length) {
            <div class="rsb__help-tip">
              @for (tip of t.tips; track $index) {
                <p>{{ tip }}</p>
              }
            </div>
          }
        } @else if (summary()) {
          <p class="rsb__help-label">{{ i18n.t('What it does') }}</p>
          <p class="rsb__help-body">{{ summary() }}</p>
        } @else {
          <p class="rsb__help-body">
            {{
              i18n.t(
                'MNI Assist helps you manage customer outreach, automation, and conversations seamlessly.'
              )
            }}
          </p>
        }
      </div>
    }

    <!-- Bottom Section: Theme, Language, Sign Out -->
    <div class="rsb__section">
      <div class="rsb__divider" aria-hidden="true"></div>

      <!-- Theme Popover Toggle -->
      <button
        type="button"
        class="rsb__item"
        [class.rsb__item--active]="themeOpen()"
        [attr.aria-expanded]="themeOpen()"
        [attr.aria-label]="i18n.t('Theme')"
        [title]="i18n.t('Theme: ' + themeService.theme())"
        (click)="toggleTheme($event)"
      >
        <ar-icon [name]="themeService.theme() === 'dark' ? 'moon' : 'sun'" [size]="18" />
      </button>

      @if (themeOpen()) {
        <div
          class="rsb__pop rsb__pop--menu"
          style="bottom: 110px;"
          role="menu"
          [attr.aria-label]="i18n.t('Theme')"
          (click)="$event.stopPropagation()"
        >
          <span class="rsb__pop-title">{{ i18n.t('Theme') }}</span>
          @for (option of themes; track option.value) {
            <button
              type="button"
              role="menuitemradio"
              class="rsb__pop-item"
              [class.rsb__pop-item--on]="themeService.theme() === option.value"
              [attr.aria-checked]="themeService.theme() === option.value"
              (click)="setTheme(option.value)"
            >
              <span class="rsb__tick" aria-hidden="true">{{
                themeService.theme() === option.value ? '✓' : ''
              }}</span>
              <ar-icon [name]="option.icon" [size]="15" />
              <span>{{ i18n.t(option.label) }}</span>
            </button>
          }
        </div>
      }

      <!-- Language Popover Toggle -->
      <button
        type="button"
        class="rsb__item"
        [class.rsb__item--active]="langOpen()"
        [attr.aria-expanded]="langOpen()"
        [attr.aria-label]="i18n.t('Language: ') + currentLangLabel()"
        [title]="i18n.t('Language: ') + currentLangLabel()"
        (click)="toggleLang($event)"
      >
        <ar-icon name="globe" [size]="18" />
        <span class="rsb__lang-pill">{{ currentLangShort() }}</span>
      </button>

      @if (langOpen()) {
        <div
          class="rsb__pop rsb__pop--menu"
          style="bottom: 60px;"
          role="menu"
          [attr.aria-label]="i18n.t('Language')"
          (click)="$event.stopPropagation()"
        >
          <span class="rsb__pop-title">{{ i18n.t('Language') }}</span>
          @for (language of languages; track language.code) {
            <button
              type="button"
              role="menuitemradio"
              class="rsb__pop-item"
              [class.rsb__pop-item--on]="i18n.lang() === language.code"
              [attr.aria-checked]="i18n.lang() === language.code"
              [attr.lang]="language.code"
              translate="no"
              (click)="setLanguage(language.code)"
            >
              <span class="rsb__tick" aria-hidden="true">{{
                i18n.lang() === language.code ? '✓' : ''
              }}</span>
              <span>{{ language.label }}</span>
            </button>
          }
        </div>
      }

      <!-- Sign Out -->
      <button
        type="button"
        class="rsb__item rsb__item--danger"
        [attr.aria-label]="i18n.t('Sign out')"
        [title]="i18n.t('Sign out')"
        (click)="signOut()"
      >
        <ar-icon name="logout" [size]="18" />
      </button>
    </div>
  `,
  styleUrl: './right-sidebar.scss',
})
export class ArRightSidebar {
  protected readonly pageContext = inject(PageContextService);
  protected readonly i18n = inject(LanguageService);
  protected readonly themeService = inject(ThemeService);
  private readonly inbox = inject(InboxService);
  private readonly ops = inject(OpsService);
  private readonly permissions = inject(PermissionService);
  private readonly plan = inject(PlanService);
  private readonly account = inject(CurrentUserService);

  protected readonly langOpen = signal(false);
  protected readonly themeOpen = signal(false);

  protected readonly languages = APP_LANGUAGES;
  protected readonly themes: readonly { value: Theme; label: string; icon: 'sun' | 'moon' }[] = [
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
  ];

  protected readonly currentLangLabel = computed(() => {
    const code = this.i18n.lang();
    return this.languages.find((l) => l.code === code)?.label ?? code;
  });

  protected readonly currentLangShort = computed(() => {
    const code = this.i18n.lang();
    return this.languages.find((l) => l.code === code)?.short ?? code;
  });

  protected readonly pageTitle = computed(() => this.pageContext.title());
  protected readonly topic = computed(() => this.pageContext.topic());
  protected readonly summary = computed(() => this.pageContext.summary());

  protected readonly inboxItem = computed(() =>
    NAV.flatMap((g) => g.items).find((i) => i.route === '/inbox'),
  );
  protected readonly notificationsItem = computed(() =>
    NAV.flatMap((g) => g.items).find((i) => i.route === '/notifications'),
  );

  protected readonly showInbox = computed(() => {
    this.account.permissionState();
    this.plan.plan();
    this.plan.features();
    this.account.isHost();
    const item = this.inboxItem();
    return item ? canAccessNavItem(item, this.permissions, this.plan, this.account) : true;
  });

  protected readonly showNotifications = computed(() => {
    this.account.permissionState();
    this.plan.plan();
    this.plan.features();
    this.account.isHost();
    const item = this.notificationsItem();
    return item ? canAccessNavItem(item, this.permissions, this.plan, this.account) : true;
  });

  protected readonly inboxBadge = computed(() => this.inbox.unassignedCount() || null);
  protected readonly notificationsBadge = computed(() => this.ops.unreadCount() || null);

  protected toggleLang(event: Event): void {
    event.stopPropagation();
    this.themeOpen.set(false);
    this.pageContext.closeHelp();
    this.langOpen.update((v) => !v);
  }

  protected toggleTheme(event: Event): void {
    event.stopPropagation();
    this.langOpen.set(false);
    this.pageContext.closeHelp();
    this.themeOpen.update((v) => !v);
  }

  protected toggleHelp(event: Event): void {
    event.stopPropagation();
    this.langOpen.set(false);
    this.themeOpen.set(false);
    this.pageContext.toggleHelp();
  }

  protected setLanguage(code: AppLanguage): void {
    this.i18n.set(code);
    this.langOpen.set(false);
  }

  protected setTheme(theme: Theme): void {
    this.themeService.set(theme);
    this.themeOpen.set(false);
  }

  protected signOut(): void {
    this.closeAll();
    this.pageContext.closeDrawer();
    this.account.logout();
  }

  protected closeAll(): void {
    this.langOpen.set(false);
    this.themeOpen.set(false);
    this.pageContext.closeHelp();
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.closeAll();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeAll();
    this.pageContext.closeDrawer();
  }
}
