import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AccountRecoveryService } from '../../proxy/identity/account-recovery.service';
import { ArButton } from '../../ui';

/**
 * Where the emailed link lands: <c>/reset-password?user=…&token=…[&tenant=…]</c>. Reading
 * the link is all it does — the token is validated by the server when the new password is
 * submitted, so an expired or already-used link shows up as a message here, with a way to
 * ask for a fresh one.
 */
@Component({
  selector: 'ar-reset-password',
  imports: [ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './recovery.scss',
  template: `
    <div class="rc">
      <form class="rc__card" (submit)="submit($event)">
        <h1 class="rc__title">Choose a new password</h1>

        @if (!linkComplete) {
          <p class="rc__error">
            This link is incomplete. Open the link from your email again, or request a new one.
          </p>
          <div class="rc__links"><a routerLink="/forgot-password">Request a new link</a></div>
        } @else if (done()) {
          <p class="rc__ok">
            Your password has been changed and every device was signed out. Sign in with the new
            one.
          </p>
          <a ar-button variant="primary" routerLink="/login">Go to sign in</a>
        } @else {
          <p class="rc__lead">Pick something you don't use anywhere else.</p>

          @if (error(); as e) {
            <p class="rc__error">{{ e }}</p>
          }
          @if (expired()) {
            <div class="rc__links"><a routerLink="/forgot-password">Request a new link</a></div>
          } @else {
            @for (m of messages(); track m) {
              <p class="rc__error">{{ m }}</p>
            }

            <label class="rc__field">
              <span>New password</span>
              <input
                class="ar-field__input"
                type="password"
                name="password"
                autocomplete="new-password"
                [value]="password()"
                (input)="password.set($any($event.target).value)"
              />
            </label>
            <label class="rc__field">
              <span>Confirm new password</span>
              <input
                class="ar-field__input"
                type="password"
                name="confirm"
                autocomplete="new-password"
                [value]="confirm()"
                (input)="confirm.set($any($event.target).value)"
              />
            </label>
            @if (confirm() && !matches()) {
              <p class="rc__error">The two passwords don't match.</p>
            }
            <button ar-button type="submit" variant="primary" [disabled]="busy() || !canSubmit()">
              {{ busy() ? 'Saving…' : 'Change password' }}
            </button>
          }
        }
      </form>
    </div>
  `,
})
export class ArResetPassword {
  private readonly recovery = inject(AccountRecoveryService);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  private readonly userId = this.params.get('user') ?? '';
  private readonly token = this.params.get('token') ?? '';
  private readonly tenantId = this.params.get('tenant');

  protected readonly linkComplete = !!this.userId && !!this.token;

  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly expired = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly messages = signal<string[]>([]);

  protected readonly matches = computed(() => this.password() === this.confirm());
  protected readonly canSubmit = computed(() => this.password().length > 0 && this.matches());

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.messages.set([]);
    try {
      const result = await firstValueFrom(
        this.recovery.resetPassword({
          tenantId: this.tenantId,
          userId: this.userId,
          token: this.token,
          newPassword: this.password(),
        }),
      );
      if (result.succeeded) {
        this.done.set(true);
      } else if (result.error === 'password_rejected') {
        this.messages.set(result.messages);
      } else {
        this.expired.set(true);
        this.error.set('This link has expired or was already used.');
      }
    } catch (e: unknown) {
      this.error.set(
        (e as { status?: number })?.status === 429
          ? 'Too many attempts from this network. Try again in an hour.'
          : "We couldn't change the password just now. Try again.",
      );
    } finally {
      this.busy.set(false);
    }
  }
}
