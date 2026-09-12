import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { CurrentUserService } from '../../core/services/current-user.service';
import { TenantSignupService } from '../../proxy/registration';
import { ArButton, ArIcon } from '../../ui';

/**
 * Anonymous "create your workspace" screen. Creates the tenant + its admin, then
 * signs in as that admin. Rendered outside the app shell, like /login.
 */
@Component({
  selector: 'ar-signup',
  imports: [ArButton, ArIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lg">
      <form class="lg__card" (submit)="submit($event)">
        <div class="lg__brand">
          <span class="lg__mark"><ar-icon name="bolt" [size]="16" [strokeWidth]="0" /></span>
          <span class="lg__name">AutoReach</span>
        </div>

        @if (done()) {
          <h1 class="lg__title">Workspace created</h1>
          <p class="lg__hint">Signing you in to {{ workspace() }}…</p>
        } @else {
          <h1 class="lg__title">Create your workspace</h1>

          @if (error(); as e) {
            <p class="lg__error">{{ e }}</p>
          }

          <label class="lg__field">
            <span>Workspace name</span>
            <input
              class="ar-field__input"
              name="workspace"
              autocapitalize="none"
              autocomplete="organization"
              placeholder="e.g. vertex-automation"
              [value]="workspace()"
              (input)="workspace.set($any($event.target).value)"
            />
            <em class="lg__note">Lowercase letters, digits and hyphens.</em>
          </label>
          <label class="lg__field">
            <span>Your name</span>
            <input
              class="ar-field__input"
              name="name"
              autocomplete="name"
              [value]="fullName()"
              (input)="fullName.set($any($event.target).value)"
            />
          </label>
          <label class="lg__field">
            <span>Email</span>
            <input
              class="ar-field__input"
              type="email"
              name="email"
              autocomplete="email"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
            />
          </label>
          <label class="lg__field">
            <span>Password</span>
            <input
              class="ar-field__input"
              type="password"
              name="password"
              autocomplete="new-password"
              [value]="password()"
              (input)="password.set($any($event.target).value)"
            />
          </label>

          <button ar-button type="submit" variant="primary" [disabled]="busy() || !canSubmit()">
            {{ busy() ? 'Creating…' : 'Create workspace' }}
          </button>

          <a class="lg__link" routerLink="/login">I already have a workspace</a>
        }
      </form>
      <p class="lg__foot">
        AutoReach — WhatsApp marketing for industrial automation ·
        <a routerLink="/privacy" class="lg__foot-link">Privacy policy</a>
      </p>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      min-height: 100vh;
      background: var(--ar-bg-100);
    }
    .lg {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
      padding: 24px;
    }
    .lg__card {
      width: 360px;
      max-width: 100%;
      padding: 28px 26px 24px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: 0 10px 40px rgba(15, 23, 32, 0.08);
      text-align: center;
    }
    .lg__brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      margin-bottom: 16px;
    }
    .lg__mark {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: var(--ar-amber-500);
      color: var(--ar-ink-900);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lg__name {
      font: 600 17px var(--ar-font-sans);
      color: var(--ar-ink-900);
      letter-spacing: -0.015em;
    }
    .lg__title {
      margin: 0 0 16px;
      font: 600 16px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .lg__error {
      margin: 0 0 12px;
      padding: 8px 10px;
      border-radius: var(--ar-radius-inset);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 400 12px var(--ar-font-sans);
    }
    .lg__field {
      display: block;
      text-align: left;
      margin-bottom: 12px;
    }
    .lg__field > span {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .lg__note {
      display: block;
      margin-top: 3px;
      font: 400 11px var(--ar-font-sans);
      font-style: normal;
      color: var(--ar-ink-400);
    }
    .lg__card button[ar-button] {
      width: 100%;
      margin-top: 4px;
    }
    .lg__hint {
      margin: 14px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .lg__link {
      display: inline-block;
      margin-top: 12px;
      color: var(--ar-teal-600);
      font: 500 12px var(--ar-font-sans);
      text-decoration: none;
    }
    .lg__foot {
      margin: 0;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .lg__foot-link {
      color: inherit;
      text-decoration: underline;
    }
  `,
})
export class ArSignup {
  private readonly api = inject(TenantSignupService);
  private readonly account = inject(CurrentUserService);
  private readonly router = inject(Router);

  protected readonly workspace = signal('');
  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly canSubmit = computed(
    () =>
      /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(this.workspace().trim().toLowerCase()) &&
      this.email().trim().length > 0 &&
      this.password().length >= 6,
  );

  constructor() {
    if (this.account.isAuthenticated()) {
      void this.router.navigateByUrl('/home');
    }
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const name = this.workspace().trim().toLowerCase();
    try {
      await firstValueFrom(
        this.api.register({
          workspaceName: name,
          adminEmailAddress: this.email().trim(),
          adminPassword: this.password(),
          adminDisplayName: this.fullName().trim() || undefined,
        }),
      );
      this.done.set(true);
      // ABP seeds the first user as "admin"; sign in scoped to the new workspace.
      await this.account.signIn('admin', this.password(), true, name);
    } catch (e) {
      this.error.set(readApiError(e, 'Could not create the workspace.'));
      this.done.set(false);
      this.busy.set(false);
    }
  }
}
