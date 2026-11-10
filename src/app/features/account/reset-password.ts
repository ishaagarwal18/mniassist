import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountRecoveryService } from '../../proxy/identity/account-recovery.service';
import { ArButton } from '../../ui';

type State = 'opening' | 'invalid' | 'ready' | 'done';

/**
 * Where the emailed link lands: <c>/reset-password?link=…</c>. A link works once, within an hour
 * of being sent: arriving here opens it on the server, which uses it up and hands back a
 * 15-minute session for setting the password. The session lives in this page only, and the link
 * is taken out of the address bar, so reloading, the back button or a second tab finds it used.
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

        @switch (state()) {
          @case ('opening') {
            <p class="rc__lead">Checking your link…</p>
          }
          @case ('invalid') {
            <p class="rc__error">{{ error() }}</p>
            <div class="rc__links"><a routerLink="/forgot-password">Request a new link</a></div>
          }
          @case ('done') {
            <p class="rc__ok">
              Your password has been changed and every device was signed out. Sign in with the new
              one.
            </p>
            <a ar-button variant="primary" routerLink="/login">Go to sign in</a>
          }
          @default {
            <p class="rc__lead">
              @if (userName(); as u) {
                For <strong>{{ u }}</strong
                >.
              }
              Pick something you don't use anywhere else.
            </p>
            <p class="rc__hint">
              This link has now been used. Set the password on this page within
              {{ minutes() }} minutes; if you close or reload it, request a new link.
            </p>

            @if (error(); as e) {
              <p class="rc__error">{{ e }}</p>
            }
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
  private readonly location = inject(Location);
  private readonly link = inject(ActivatedRoute).snapshot.queryParamMap.get('link') ?? '';

  private session = '';
  protected readonly state = signal<State>('opening');
  protected readonly userName = signal<string | null>(null);
  protected readonly minutes = signal(15);

  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly messages = signal<string[]>([]);

  protected readonly matches = computed(() => this.password() === this.confirm());
  protected readonly canSubmit = computed(() => this.password().length > 0 && this.matches());

  constructor() {
    void this.open();
  }

  private async open(): Promise<void> {
    // The link is spent the moment it is opened; keep it out of history so Back can't resend it.
    this.location.replaceState('/reset-password');

    if (!this.link) {
      this.invalid(
        'This link is incomplete. Open the link from your email again, or request a new one.',
      );
      return;
    }

    try {
      const opened = await firstValueFrom(this.recovery.openResetLink({ link: this.link }));
      if (!opened.succeeded || !opened.session) {
        this.invalid(
          'This link has expired or has already been opened. Each link works once, within an hour of being sent.',
        );
        return;
      }
      this.session = opened.session;
      this.userName.set(opened.userName ?? null);
      this.minutes.set(opened.sessionMinutes || 15);
      this.state.set('ready');
    } catch (e: unknown) {
      this.invalid(
        (e as { status?: number })?.status === 429
          ? 'Too many attempts from this network. Try again in an hour.'
          : "We couldn't check the link just now. Request a new one and try again.",
      );
    }
  }

  private invalid(message: string): void {
    this.error.set(message);
    this.state.set('invalid');
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.state() !== 'ready' || !this.canSubmit() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.messages.set([]);
    try {
      const result = await firstValueFrom(
        this.recovery.resetPassword({ session: this.session, newPassword: this.password() }),
      );
      if (result.succeeded) {
        this.session = '';
        this.state.set('done');
      } else if (result.error === 'password_rejected') {
        this.messages.set(result.messages);
      } else {
        this.invalid(
          'This page has expired. Request a new link and set the password within the time shown.',
        );
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
