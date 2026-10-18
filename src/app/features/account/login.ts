import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AbpTenantService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CurrentUserService } from '../../core/services/current-user.service';
import { TwoFactorRequiredError } from '../../core/auth/two-factor';
import {
  EmailConfirmationRequiredError,
  PasswordChangeRequiredError,
} from '../../core/auth/sign-in-challenge';
import { AccountRecoveryService } from '../../proxy/identity/account-recovery.service';
import { BrandingService } from '../../proxy/branding';
import {
  ExternalLoginService,
  type ExternalLoginProviderDto,
} from '../../proxy/identity/external-login.service';
import { beginExternalLogin } from '../../core/auth/external-login';
import { ArButton, ArIcon } from '../../ui';
import { ArThemeToggle } from '../../layout/theme-toggle';
import { ArAuthShowcase } from './auth-showcase';
import { ArBrand } from '../../layout/brand';
import { workspaceSlug } from '../../core/util/workspace-slug';

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
        @if (step() === 'code') {
          <h1 class="lg__title">Two-step verification</h1>
          <p class="lg__sub">
            @if (useRecovery()) {
              Enter one of the recovery codes you saved when you set up two-step verification. Each
              code works once.
            } @else {
              Enter the 6-digit code from your authenticator app.
            }
          </p>

          @if (error(); as e) {
            <p class="lg__error">{{ e }}</p>
          }

          @if (useRecovery()) {
            <label class="lg__field">
              <span>Recovery code</span>
              <input
                class="ar-field__input ar-mono"
                name="recoveryCode"
                autocomplete="off"
                autocapitalize="none"
                spellcheck="false"
                data-autofocus
                [value]="secondFactor()"
                (input)="secondFactor.set($any($event.target).value)"
              />
            </label>
          } @else {
            <label class="lg__field">
              <span>Authentication code</span>
              <input
                class="ar-field__input lg__code"
                name="code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="7"
                data-autofocus
                [value]="secondFactor()"
                (input)="secondFactor.set($any($event.target).value)"
              />
            </label>
          }

          <button ar-button type="submit" variant="primary" [disabled]="busy() || !canVerify()">
            {{ busy() ? 'Verifying…' : 'Verify' }}
          </button>

          <button type="button" class="lg__link lg__link--btn" (click)="toggleRecovery()">
            {{
              useRecovery() ? 'Use your authenticator app' : 'Lost your phone? Use a recovery code'
            }}
          </button>
          <button type="button" class="lg__link lg__link--btn" (click)="backToPassword()">
            Back to sign in
          </button>
        } @else if (step() === 'new-password') {
          <h1 class="lg__title">Choose a new password</h1>
          <p class="lg__sub">
            @if (passwordChangeReason() === 'PeriodicallyChangePassword') {
              Your password is older than your workspace allows. Choose a new one to continue.
            } @else {
              Your administrator set a temporary password. Choose your own to continue.
            }
          </p>

          @if (error(); as e) {
            <p class="lg__error">{{ e }}</p>
          }

          <label class="lg__field">
            <span>New password</span>
            <input
              class="ar-field__input"
              type="password"
              name="newPassword"
              autocomplete="new-password"
              data-autofocus
              [value]="newPassword()"
              (input)="newPassword.set($any($event.target).value)"
            />
          </label>
          <label class="lg__field">
            <span>Type it again</span>
            <input
              class="ar-field__input"
              type="password"
              name="confirmNewPassword"
              autocomplete="new-password"
              [value]="confirmNewPassword()"
              (input)="confirmNewPassword.set($any($event.target).value)"
            />
          </label>

          <button
            ar-button
            type="submit"
            variant="primary"
            [disabled]="busy() || !canSetNewPassword()"
          >
            {{ busy() ? 'Saving…' : 'Save and sign in' }}
          </button>
          <button type="button" class="lg__link lg__link--btn" (click)="backToPassword()">
            Back to sign in
          </button>
        } @else if (step() === 'confirm-email') {
          <h1 class="lg__title">Confirm your email first</h1>
          <p class="lg__sub">
            Your workspace only lets people sign in once their email address is confirmed.
            @if (unconfirmedEmail(); as m) {
              We can send a confirmation link to <strong>{{ m }}</strong
              >.
            }
          </p>

          @if (error(); as e) {
            <p class="lg__error">{{ e }}</p>
          }
          @if (confirmationSent()) {
            <p class="lg__note">
              If that address has an account, a confirmation link is on its way. Open it, then sign
              in again.
            </p>
          } @else {
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy()"
              (click)="sendConfirmation()"
            >
              {{ busy() ? 'Sending…' : 'Send me a confirmation link' }}
            </button>
          }
          <button type="button" class="lg__link lg__link--btn" (click)="backToPassword()">
            Back to sign in
          </button>
        } @else {
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
                placeholder="e.g. Sun Energy Automation"
                [value]="tenant()"
                (input)="tenant.set($any($event.target).value)"
                (blur)="previewWorkspaceBranding()"
              />
            </label>
          }

          <label class="lg__field">
            <span>Username, email or phone number</span>
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

          @if (externalProviders().length) {
            <div class="lg__or"><span>or</span></div>
            <div class="lg__external">
              @for (p of externalProviders(); track p.name) {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy()"
                  (click)="continueWith(p)"
                >
                  Sign in with {{ p.name }}
                </button>
              }
            </div>
          }

          @if (mock) {
            <p class="lg__hint">Demo build — any username and password will sign you in.</p>
          } @else {
            <a class="lg__link lg__link--forgot" routerLink="/forgot-password">Forgot password?</a>
            <p class="lg__new">
              New to MNI Assist? <a class="lg__link" routerLink="/signup">Create a workspace</a>
            </p>
          }
        }
      </form>
      <ul class="lg__trust" aria-label="Security">
        <li><ar-icon name="shield" [size]="14" /> Encrypted sign-in</li>
        <li><ar-icon name="check" [size]="14" /> DPDP-ready consent records</li>
        <li><ar-icon name="user" [size]="14" /> Role-based access</li>
      </ul>
      <p class="lg__foot">
        MNI Assist — AI Business Engagement Platform for Industrial Companies ·
        <a routerLink="/privacy" class="lg__foot-link">Privacy policy</a> ·
        <a routerLink="/status" class="lg__foot-link">System status</a>
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
    .lg__code {
      font: 600 20px var(--ar-font-mono);
      letter-spacing: 0.3em;
      text-align: center;
    }
    .lg__link--btn {
      display: block;
      margin: 10px auto 0;
      border: 0;
      background: none;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
    }
    .lg__note {
      margin: 0 0 12px;
      padding: 10px 12px;
      border-radius: 6px;
      background: var(--ar-bg-100);
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
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
    .lg__or {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 16px 0 12px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .lg__or::before,
    .lg__or::after {
      content: '';
      flex: 1;
      border-top: 1px solid var(--ar-line-200);
    }
    .lg__external {
      display: grid;
      gap: 8px;
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

  /**
   * Password first. The other steps only after the server asks: a second factor, a new
   * password (set by an admin, or past its age), or a confirmed email address.
   */
  protected readonly step = signal<'password' | 'code' | 'new-password' | 'confirm-email'>(
    'password',
  );

  private readonly recovery = inject(AccountRecoveryService);
  protected readonly passwordChangeReason = signal<string>('ShouldChangePasswordOnNextLogin');
  private changePasswordToken = '';
  protected readonly newPassword = signal('');
  protected readonly confirmNewPassword = signal('');
  protected readonly canSetNewPassword = computed(
    () =>
      this.newPassword().length >= 6 &&
      this.newPassword() === this.confirmNewPassword() &&
      this.newPassword() !== this.password(),
  );
  protected readonly unconfirmedEmail = signal<string | null>(null);
  protected readonly confirmationSent = signal(false);
  protected readonly useRecovery = signal(false);
  protected readonly secondFactor = signal('');
  protected readonly canVerify = computed(() => {
    const v = this.secondFactor().trim();
    return this.useRecovery() ? v.length >= 6 : v.replace(/\D/g, '').length === 6;
  });

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

  /** Google / Microsoft, when this deployment has client ids for them (M01-7). */
  protected readonly externalProviders = signal<ExternalLoginProviderDto[]>([]);
  private readonly externalLogin = inject(ExternalLoginService);

  constructor() {
    if (this.account.isAuthenticated()) {
      void this.router.navigateByUrl('/home');
    }
    if (!this.mock) {
      this.externalLogin.getProviders({ skipHandleError: true }).subscribe({
        next: (r) => this.externalProviders.set(r.items ?? []),
        error: () => this.externalProviders.set([]),
      });
    }
  }

  protected continueWith(p: ExternalLoginProviderDto): void {
    beginExternalLogin(p, {
      mode: 'signin',
      rememberMe: this.rememberMe(),
      workspace: workspaceSlug(this.tenant()),
    });
  }

  protected async previewWorkspaceBranding(): Promise<void> {
    if (this.mock) return;
    const name = workspaceSlug(this.tenant());
    if (!name || name === this.lastPreviewedWorkspace) return;
    this.lastPreviewedWorkspace = name;

    if (!name) {
      this.workspaceLogo.set(null);
      this.workspacePrimaryColor.set(null);
      return;
    }

    try {
      const found = await firstValueFrom(this.tenants.findTenantByName(name));
      if (!found?.success || !found.tenantId || name !== workspaceSlug(this.tenant())) return;

      const branding = await firstValueFrom(this.branding.publicByTenantId(found.tenantId));
      if (name !== workspaceSlug(this.tenant())) return; // stale by the time this resolved
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
    if (this.step() === 'code') {
      await this.verify();
      return;
    }
    if (this.step() === 'new-password') {
      await this.saveNewPassword();
      return;
    }
    if (this.step() !== 'password') return;
    if (!this.canSubmit() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.account.signIn(
        this.username().trim(),
        this.password(),
        this.rememberMe(),
        workspaceSlug(this.tenant()),
      );
    } catch (e: unknown) {
      if (e instanceof TwoFactorRequiredError) {
        this.secondFactor.set('');
        this.useRecovery.set(false);
        this.step.set('code');
      } else if (e instanceof PasswordChangeRequiredError) {
        this.passwordChangeReason.set(e.reason);
        this.changePasswordToken = e.changePasswordToken;
        this.newPassword.set('');
        this.confirmNewPassword.set('');
        this.step.set('new-password');
      } else if (e instanceof EmailConfirmationRequiredError) {
        this.unconfirmedEmail.set(e.email);
        this.confirmationSent.set(false);
        this.step.set('confirm-email');
      } else {
        this.error.set(this.readError(e));
      }
      this.busy.set(false);
    }
  }

  private async verify(): Promise<void> {
    if (!this.canVerify() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const value = this.secondFactor().trim();
    try {
      await this.account.completeTwoFactorSignIn(
        this.username().trim(),
        this.password(),
        this.rememberMe(),
        this.useRecovery() ? { recoveryCode: value } : { code: value },
      );
    } catch (e: unknown) {
      this.error.set(this.readSecondFactorError(e));
      this.secondFactor.set('');
      this.busy.set(false);
    }
  }

  private async saveNewPassword(): Promise<void> {
    if (!this.canSetNewPassword() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.account.completeSignInWithNewPassword(
        this.username().trim(),
        this.password(),
        this.rememberMe(),
        this.changePasswordToken,
        this.newPassword(),
      );
    } catch (e: unknown) {
      // The password rules' own reasons ("Passwords must have at least one digit") — safe to show.
      this.error.set(this.readError(e));
      this.busy.set(false);
    }
  }

  protected async sendConfirmation(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.recovery.sendEmailConfirmation({
          workspace: workspaceSlug(this.tenant()) || null,
          email: this.unconfirmedEmail() ?? this.username().trim(),
        }),
      );
      this.confirmationSent.set(true);
    } catch {
      this.error.set('Too many requests from here. Wait a while and try again.');
    } finally {
      this.busy.set(false);
    }
  }

  protected toggleRecovery(): void {
    this.useRecovery.update((v) => !v);
    this.secondFactor.set('');
    this.error.set(null);
  }

  protected backToPassword(): void {
    this.step.set('password');
    this.password.set('');
    this.secondFactor.set('');
    this.error.set(null);
  }

  /** ABP's English messages for these are terse; the lockout one is already plain. */
  private readSecondFactorError(e: unknown): string {
    const message = this.readError(e);
    if (/invalid authenticator code/i.test(message)) {
      return 'That code is not right. Check that the time on your phone is correct and try the current code.';
    }
    if (/invalid recovery code/i.test(message)) {
      return 'That recovery code is not right, or it has already been used.';
    }
    return message;
  }

  private readError(e: unknown): string {
    const err = e as { error?: { error_description?: string; error?: string }; message?: string };
    return (
      err?.error?.error_description ||
      err?.error?.error ||
      err?.message ||
      'Wrong sign-in details or password.'
    );
  }
}
