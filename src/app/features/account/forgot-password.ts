import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccountRecoveryService } from '../../proxy/identity/account-recovery.service';
import { ArButton } from '../../ui';

type Mode = 'password' | 'workspace';

/**
 * Account recovery for a signed-out visitor: emails a password-reset link, or — because
 * sign-in needs the workspace name and forgetting it locks someone out just as surely —
 * emails the workspace names an address belongs to.
 *
 * The success message is the same whether or not the address has an account. That is the
 * point: this screen must not become a way to find out who uses AutoReach.
 */
@Component({
  selector: 'ar-forgot-password',
  imports: [ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './recovery.scss',
  template: `
    <div class="rc">
      <form class="rc__card" (submit)="submit($event)">
        <h1 class="rc__title">
          {{ mode() === 'password' ? 'Reset your password' : 'Find your workspace' }}
        </h1>
        <p class="rc__lead">
          @if (mode() === 'password') {
            Enter the email address on your account and we'll send you a link to choose a new
            password.
          } @else {
            Enter the email address on your account and we'll email you the workspace name to sign
            in with.
          }
        </p>

        @if (error(); as e) {
          <p class="rc__error">{{ e }}</p>
        }

        @if (sent()) {
          <p class="rc__ok">
            If there is an account for <strong>{{ email() }}</strong
            >, an email is on its way. It can take a minute — check your spam folder too.
          </p>
        } @else {
          @if (mode() === 'password' && !mock) {
            <label class="rc__field">
              <span>Workspace <em class="rc__opt">— leave blank for the host</em></span>
              <input
                class="ar-field__input"
                name="tenant"
                autocapitalize="none"
                placeholder="e.g. Sun Energy-automation"
                [value]="workspace()"
                (input)="workspace.set($any($event.target).value)"
              />
            </label>
          }
          <label class="rc__field">
            <span>Email</span>
            <input
              class="ar-field__input"
              type="email"
              name="email"
              autocomplete="email"
              autocapitalize="none"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
            />
          </label>
          <button ar-button type="submit" variant="primary" [disabled]="busy() || !canSubmit()">
            {{
              busy()
                ? 'Sending…'
                : mode() === 'password'
                  ? 'Send reset link'
                  : 'Email me my workspace'
            }}
          </button>
        }

        <div class="rc__links">
          <a routerLink="/login">Back to sign in</a>
          @if (!mock) {
            <button type="button" class="rc__linkbtn" (click)="switchMode()">
              {{ mode() === 'password' ? 'Forgot your workspace?' : 'Reset a password instead' }}
            </button>
          }
        </div>
      </form>
    </div>
  `,
})
export class ArForgotPassword {
  private readonly recovery = inject(AccountRecoveryService);

  protected readonly mock = environment.useMockData;
  protected readonly mode = signal<Mode>('password');
  protected readonly workspace = signal('');
  protected readonly email = signal('');
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly canSubmit = computed(() => /^\S+@\S+\.\S+$/.test(this.email().trim()));

  protected switchMode(): void {
    this.mode.update((m) => (m === 'password' ? 'workspace' : 'password'));
    this.sent.set(false);
    this.error.set(null);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (!this.mock) {
        const email = this.email().trim();
        await firstValueFrom(
          this.mode() === 'password'
            ? this.recovery.forgotPassword({ workspace: this.workspace().trim() || null, email })
            : this.recovery.forgotWorkspace({ email }),
        );
      }
      this.sent.set(true);
    } catch (e: unknown) {
      this.error.set(
        (e as { status?: number })?.status === 429
          ? 'Too many requests from this network. Try again in an hour.'
          : "We couldn't send that just now. Check your connection and try again.",
      );
    } finally {
      this.busy.set(false);
    }
  }
}
