import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  SSO_PROVIDER,
  readCallback,
  takeStart,
  type ExternalLoginState,
} from '../../core/auth/external-login';
import { TwoFactorRequiredError } from '../../core/auth/two-factor';
import { CurrentUserService } from '../../core/services/current-user.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ExternalLoginService } from '../../proxy/identity/external-login.service';
import { ArBrand } from '../../layout/brand';
import { ArButton } from '../../ui';

/** The auth server's refusal text, or the generic one. */
function grantError(e: unknown): string {
  const d = (e as { error?: { error_description?: string } } | null)?.error?.error_description;
  return d || readApiError(e, 'The sign-in could not be completed. Try again.');
}

/**
 * Where Google or Microsoft send the browser back (M01-7). Finishes a sign-in — asking for
 * the authenticator code when the account uses two-step verification — or links the
 * provider to the account already signed in, then moves on. The ID token is cleared from
 * the address bar before anything else.
 */
@Component({
  selector: 'ar-external-login-callback',
  imports: [ArBrand, ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="xl">
      <form class="xl__card" (submit)="$event.preventDefault(); verify()">
        <ar-brand />
        @if (failure(); as f) {
          <h1 class="xl__title">That did not work</h1>
          <p class="xl__error">{{ f }}</p>
          <a class="xl__link" [routerLink]="backTo()">Back</a>
        } @else if (needsCode()) {
          <h1 class="xl__title">Two-step verification</h1>
          <p class="xl__sub">Enter the 6-digit code from your authenticator app.</p>
          <input
            class="ar-field__input xl__code"
            name="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="7"
            [value]="code()"
            (input)="code.set($any($event.target).value)"
          />
          <button ar-button type="submit" variant="primary" [disabled]="busy() || !canVerify()">
            {{ busy() ? 'Checking…' : 'Verify' }}
          </button>
        } @else {
          <h1 class="xl__title">Signing you in…</h1>
        }
      </form>
    </div>
  `,
  styles: `
    .xl {
      display: grid;
      place-items: center;
      min-height: 100vh;
      padding: 24px 16px;
      background: var(--ar-bg-100);
    }
    .xl__card {
      display: grid;
      gap: 14px;
      width: 380px;
      max-width: 100%;
      padding: 30px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-modal);
      box-shadow: var(--ar-shadow-pop);
    }
    .xl__title {
      margin: 0;
      font: 700 20px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .xl__sub {
      margin: 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .xl__error {
      margin: 0;
      padding: 9px 11px;
      border: 1px solid var(--ar-red-200);
      border-radius: var(--ar-radius-inset);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 400 13px var(--ar-font-sans);
    }
    .xl__code {
      font: 600 20px var(--ar-font-mono);
      letter-spacing: 0.3em;
      text-align: center;
    }
    .xl__link {
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
  `,
})
export class ArExternalLoginCallback {
  private readonly account = inject(CurrentUserService);
  private readonly api = inject(ExternalLoginService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly failure = signal<string | null>(null);
  protected readonly needsCode = signal(false);
  protected readonly code = signal('');
  protected readonly busy = signal(false);
  protected readonly canVerify = computed(() => this.code().replace(/\D/g, '').length === 6);

  private start: ExternalLoginState | null = null;
  private idToken = '';

  protected readonly backTo = computed(() =>
    this.start?.mode === 'link' ? '/settings' : '/login',
  );

  constructor() {
    const result = readCallback(window.location.hash, takeStart());
    history.replaceState(null, '', window.location.pathname);
    if (!result.ok) {
      this.failure.set(result.reason);
      return;
    }
    this.start = result.start;
    this.idToken = result.idToken;
    void (this.start.mode === 'link'
      ? this.link()
      : this.start.provider === SSO_PROVIDER
        ? this.signInSso()
        : this.signIn());
  }

  /** "Sign in with SSO": the workspace's own IdP vouched for the person. */
  private async signInSso(): Promise<void> {
    const s = this.start!;
    if (!s.ssoEmail) {
      this.failure.set('This sign-in was not started here. Start again.');
      return;
    }
    this.busy.set(true);
    try {
      await this.account.signInSso(s.ssoEmail, this.idToken, s.nonce, s.rememberMe, s.workspace);
    } catch (e) {
      this.failure.set(grantError(e));
    } finally {
      this.busy.set(false);
    }
  }

  private async link(): Promise<void> {
    const s = this.start!;
    try {
      const linked = await firstValueFrom(
        this.api.link({ provider: s.provider, idToken: this.idToken, nonce: s.nonce }),
      );
      this.toasts.success(
        `${linked.provider}${linked.displayName ? ` (${linked.displayName})` : ''} is linked. You can sign in with it now.`,
      );
      await this.router.navigateByUrl('/settings');
    } catch (e) {
      this.failure.set(readApiError(e, 'Could not link that account.'));
    }
  }

  private async signIn(code?: string): Promise<void> {
    const s = this.start!;
    this.busy.set(true);
    try {
      await this.account.signInExternal(
        s.provider,
        this.idToken,
        s.nonce,
        s.rememberMe,
        s.workspace,
        code ? { code } : undefined,
      );
    } catch (e) {
      if (e instanceof TwoFactorRequiredError) {
        this.needsCode.set(true);
      } else {
        this.code.set('');
        if (this.needsCode()) this.toasts.error(grantError(e));
        else this.failure.set(grantError(e));
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected async verify(): Promise<void> {
    if (!this.canVerify() || this.busy()) return;
    await this.signIn(this.code());
  }
}
