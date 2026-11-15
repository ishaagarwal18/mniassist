import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { readApiError } from '../../core/util/api-error';
import { WorkspaceMemberService } from '../../proxy/identity/workspace-member.service';
import { ArButton } from '../../ui';

type State = 'ready' | 'invalid' | 'done';

/**
 * Where an invitation email lands: <c>/accept-invitation?token=…</c>. The invited person picks a user name and
 * password here; WorkspaceMemberAppService.AcceptInvitationAsync creates the account in the inviting workspace with
 * the invited role and confirms the email (the link proves they own it). The token is taken out of the address bar.
 */
@Component({
  selector: 'ar-accept-invitation',
  imports: [ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './recovery.scss',
  template: `
    <div class="rc">
      <form class="rc__card" (submit)="submit($event)">
        <h1 class="rc__title">Join your team</h1>

        @switch (state()) {
          @case ('invalid') {
            <p class="rc__error">{{ error() }}</p>
            <div class="rc__links"><a routerLink="/login">Go to sign in</a></div>
          }
          @case ('done') {
            <p class="rc__ok">
              Your account is ready. Sign in with the user name and password you just chose.
            </p>
            <a ar-button variant="primary" routerLink="/login">Go to sign in</a>
          }
          @default {
            <p class="rc__lead">You've been invited to a workspace. Set up your account to join.</p>

            @if (error(); as e) {
              <p class="rc__error">{{ e }}</p>
            }

            <label class="rc__field">
              <span>First name</span>
              <input
                class="ar-field__input"
                name="name"
                autocomplete="given-name"
                maxlength="128"
                [value]="name()"
                (input)="name.set($any($event.target).value)"
              />
            </label>
            <label class="rc__field">
              <span>Last name</span>
              <input
                class="ar-field__input"
                name="surname"
                autocomplete="family-name"
                maxlength="128"
                [value]="surname()"
                (input)="surname.set($any($event.target).value)"
              />
            </label>
            <label class="rc__field">
              <span>User name</span>
              <input
                class="ar-field__input"
                name="username"
                autocomplete="username"
                maxlength="64"
                required
                [value]="userName()"
                (input)="userName.set($any($event.target).value)"
              />
            </label>
            <label class="rc__field">
              <span>Password</span>
              <input
                class="ar-field__input"
                type="password"
                name="password"
                autocomplete="new-password"
                maxlength="128"
                required
                [value]="password()"
                (input)="password.set($any($event.target).value)"
              />
            </label>
            <label class="rc__field">
              <span>Confirm password</span>
              <input
                class="ar-field__input"
                type="password"
                name="confirm"
                autocomplete="new-password"
                maxlength="128"
                [value]="confirm()"
                (input)="confirm.set($any($event.target).value)"
              />
            </label>
            @if (confirm() && !matches()) {
              <p class="rc__error">The two passwords don't match.</p>
            }
            <button ar-button type="submit" variant="primary" [disabled]="busy() || !canSubmit()">
              {{ busy() ? 'Creating your account…' : 'Join workspace' }}
            </button>
          }
        }
      </form>
    </div>
  `,
})
export class ArAcceptInvitation {
  private readonly members = inject(WorkspaceMemberService);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  protected readonly state = signal<State>(this.token ? 'ready' : 'invalid');
  protected readonly name = signal('');
  protected readonly surname = signal('');
  protected readonly userName = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(
    this.token ? null : 'This invitation link is incomplete. Open the link from your email again.',
  );

  protected readonly matches = computed(() => this.password() === this.confirm());
  protected readonly canSubmit = computed(
    () => this.userName().trim().length > 0 && this.password().length > 0 && this.matches(),
  );

  constructor() {
    // Keep the token out of history and out of anything that reads the address bar later.
    inject(Location).replaceState('/accept-invitation');
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.state() !== 'ready' || !this.canSubmit() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.members.acceptInvitation(
          {
            token: this.token,
            userName: this.userName().trim(),
            password: this.password(),
            name: this.name().trim() || undefined,
            surname: this.surname().trim() || undefined,
          },
          { skipHandleError: true },
        ),
      );
      this.state.set('done');
    } catch (e: unknown) {
      const message = readApiError(e, "We couldn't create your account just now. Try again.");
      // An unusable token (used, expired, unknown) can't be fixed on this page.
      const code = (e as { error?: { error?: { code?: string } } })?.error?.error?.code;
      if (code === 'AutoReach:InvitationNotUsable') {
        this.error.set(message);
        this.state.set('invalid');
      } else {
        this.error.set(message);
      }
    } finally {
      this.busy.set(false);
    }
  }
}
