import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AbpTenantService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CurrentUserService } from '../../core/services/current-user.service';
import { BrandingService } from '../../proxy/branding';
import { ArButton, ArIcon } from '../../ui';
import { ArThemeToggle } from '../../layout/theme-toggle';
import { ArAuthShowcase } from './auth-showcase';
import { ArBrand } from '../../layout/brand';

/**
 * The sign-in screen. Username + password (ABP's password grant in real mode; any
 * non-empty credentials in the demo build). Rendered outside the app shell, so a
 * signed-out visitor never sees the navigation.
 */
@Component({
  selector: 'ar-login',
  imports: [ArButton, ArIcon, RouterLink, ArThemeToggle, ArAuthShowcase, ArBrand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-auth-showcase class="lg__show" />
    <div class="lg">
      <div class="lg__top"><ar-theme-toggle /></div>
      <form class="lg__card" (submit)="submit($event)">
        <div class="lg__brand">
          <ar-brand [logoSrc]="workspaceLogo()" />
        </div>
        <h1 class="lg__title">Welcome back</h1>
        <p class="lg__sub">Sign in to your workspace to pick up where your team left off.</p>

        @if (error(); as e) {
          <p class="lg__error">{{ e }}</p>
        }

        @if (!mock) {
          <label class="lg__field">
            <span>Workspace <em class="lg__opt">— leave blank for the host</em></span>
            <input
              class="ar-field__input"
              name="tenant"
              autocapitalize="none"
              autocomplete="organization"
              placeholder="e.g. vertex-automation"
              [value]="tenant()"
              (input)="tenant.set($any($event.target).value)"
              (blur)="previewWorkspaceBranding()"
            />
          </label>
        }

        <label class="lg__field">
          <span>Username or email</span>
          <input
            class="ar-field__input"
            name="username"
            autocomplete="username"
            autocapitalize="none"
            [value]="username()"
            (input)="username.set($any($event.target).value)"
          />
        </label>
        <label class="lg__field">
          <span>Password</span>
          <input
            class="ar-field__input"
            type="password"
            name="password"
            autocomplete="current-password"
            [value]="password()"
            (input)="password.set($any($event.target).value)"
          />
        </label>
        <label class="lg__remember">
          <input
            type="checkbox"
            [checked]="rememberMe()"
            (change)="rememberMe.set($any($event.target).checked)"
          />
          Keep me signed in
        </label>

        <button ar-button type="submit" variant="primary" [disabled]="busy() || !canSubmit()">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>

        @if (mock) {
          <p class="lg__hint">Demo build — any username and password will sign you in.</p>
        } @else {
          <a class="lg__link lg__link--forgot" routerLink="/forgot-password">Forgot password?</a>
          <p class="lg__new">
            New to MNI Assist? <a class="lg__link" routerLink="/signup">Create a workspace</a>
          </p>
        }
      </form>
      <ul class="lg__trust" aria-label="Security">
        <li><ar-icon name="shield" [size]="14" /> Encrypted sign-in</li>
        <li><ar-icon name="check" [size]="14" /> DPDP-ready consent records</li>
        <li><ar-icon name="user" [size]="14" /> Role-based access</li>
      </ul>
      <p class="lg__foot">
        MNI Assist — AI Business Engagement Platform for Industrial Companies ·
        <a routerLink="/privacy" class="lg__foot-link">Privacy policy</a>
      </p>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      min-height: 100vh;
      background: var(--ar-bg-100);
    }
    .lg {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
      padding: 72px 24px 32px;
    }
    .lg__top {
      position: absolute;
      top: 20px;
      right: 24px;
    }
    .lg__card {
      width: 380px;
      max-width: 100%;
      padding: 32px 30px 26px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-modal);
      box-shadow: var(--ar-shadow-pop);
    }
    .lg__brand {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 22px;
    }
    .lg__title {
      margin: 0;
      font: 700 24px var(--ar-font-sans);
      letter-spacing: -0.02em;
      color: var(--ar-ink-900);
    }
    .lg__sub {
      margin: 6px 0 22px;
      font: 400 13.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .lg__error {
      margin: 0 0 14px;
      padding: 9px 11px;
      border: 1px solid var(--ar-red-200);
      border-radius: var(--ar-radius-inset);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 400 12.5px var(--ar-font-sans);
    }
    .lg__field {
      display: block;
      margin-bottom: 14px;
    }
    .lg__field > span {
      display: block;
      margin-bottom: 5px;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .lg__opt {
      font-style: normal;
      font-weight: 400;
      color: var(--ar-ink-400);
    }
    .lg__remember {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 18px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .lg__card button[ar-button] {
      width: 100%;
      height: 40px;
      justify-content: center;
      font-size: 14px;
    }
    .lg__hint {
      margin: 14px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
      text-align: center;
    }
    .lg__link {
      color: var(--ar-blue-600);
      font: 500 12.5px var(--ar-font-sans);
    }
    .lg__link--forgot {
      display: block;
      margin-top: 14px;
      text-align: center;
    }
    .lg__new {
      margin: 18px 0 0;
      padding-top: 16px;
      border-top: 1px solid var(--ar-line-200);
      text-align: center;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .lg__trust {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px 18px;
      margin: 0;
      padding: 0;
      list-style: none;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .lg__trust li {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .lg__trust ar-icon {
      color: var(--ar-green-600);
    }
    .lg__foot {
      margin: 0;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
      text-align: center;
    }
    .lg__foot-link {
      color: inherit;
      text-decoration: underline;
    }
    @media (max-width: 960px) {
      :host {
        grid-template-columns: minmax(0, 1fr);
      }
      .lg__show {
        display: none;
      }
    }
  `,
})
export class ArLogin {
  private readonly account = inject(CurrentUserService);
  private readonly router = inject(Router);
  private readonly tenants = inject(AbpTenantService);
  private readonly branding = inject(BrandingService);

  protected readonly mock = environment.useMockData;
  protected readonly tenant = signal('');
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly rememberMe = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  // Pre-auth branding preview — a signed-out visitor typing their workspace name
  // sees that workspace's own logo/colour appear, the same identity BrandingStore
  // applies once they're actually signed in. Best-effort only: a lookup failure
  // (unknown workspace, network hiccup) just leaves AutoReach's own defaults in
  // place rather than surfacing an error on a field that isn't required yet.
  protected readonly workspaceLogo = signal<string | null>(null);
  protected readonly workspacePrimaryColor = signal<string | null>(null);
  private lastPreviewedWorkspace = '';

  protected readonly canSubmit = computed(
    () => this.username().trim().length > 0 && this.password().length > 0,
  );

  constructor() {
    if (this.account.isAuthenticated()) {
      void this.router.navigateByUrl('/home');
    }
  }

  protected async previewWorkspaceBranding(): Promise<void> {
    if (this.mock) return;
    const name = this.tenant().trim();
    if (!name || name === this.lastPreviewedWorkspace) return;
    this.lastPreviewedWorkspace = name;

    if (!name) {
      this.workspaceLogo.set(null);
      this.workspacePrimaryColor.set(null);
      return;
    }

    try {
      const found = await firstValueFrom(this.tenants.findTenantByName(name));
      if (!found?.success || !found.tenantId || name !== this.tenant().trim()) return;

      const branding = await firstValueFrom(this.branding.publicByTenantId(found.tenantId));
      if (name !== this.tenant().trim()) return; // stale by the time this resolved
      this.workspaceLogo.set(branding.logoDataUrl ?? null);
      this.workspacePrimaryColor.set(branding.primaryColor ?? null);
    } catch {
      // Unknown workspace or a network hiccup — leave AutoReach's own identity
      // showing. The real validation (does this workspace exist) happens at
      // actual sign-in, not here.
      this.workspaceLogo.set(null);
      this.workspacePrimaryColor.set(null);
    }
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.account.signIn(
        this.username().trim(),
        this.password(),
        this.rememberMe(),
        this.tenant().trim(),
      );
    } catch (e: unknown) {
      this.error.set(this.readError(e));
      this.busy.set(false);
    }
  }

  private readError(e: unknown): string {
    const err = e as { error?: { error_description?: string; error?: string }; message?: string };
    return (
      err?.error?.error_description ||
      err?.error?.error ||
      err?.message ||
      'Wrong username or password.'
    );
  }
}
