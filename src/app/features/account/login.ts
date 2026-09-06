import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { CurrentUserService } from '../../core/services/current-user.service';
import { ArButton, ArIcon } from '../../ui';

/**
 * The signed-out landing. In mock mode "Sign in" flips the local session flag and
 * drops you into the app; with a real API it hands off to the OAuth provider's
 * login. Rendered outside the app shell, so a signed-out visitor never sees the
 * navigation.
 */
@Component({
  selector: 'ar-login',
  imports: [ArButton, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lg">
      <div class="lg__card">
        <div class="lg__brand">
          <span class="lg__mark"><ar-icon name="bolt" [size]="16" [strokeWidth]="0" /></span>
          <span class="lg__name">AutoReach</span>
        </div>
        <h1 class="lg__title">Sign in to your workspace</h1>
        <p class="lg__sub">
          {{
            mock
              ? 'Demo build — no password needed.'
              : 'You will be taken to your organisation’s sign-in page.'
          }}
        </p>
        <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="signIn()">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>
      </div>
      <p class="lg__foot">AutoReach — WhatsApp marketing for industrial automation</p>
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
      width: 340px;
      max-width: 100%;
      padding: 28px 26px 26px;
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
      margin-bottom: 18px;
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
      margin: 0 0 6px;
      font: 600 16px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .lg__sub {
      margin: 0 0 20px;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .lg__card button {
      width: 100%;
    }
    .lg__foot {
      margin: 0;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
  `,
})
export class ArLogin {
  private readonly account = inject(CurrentUserService);
  private readonly router = inject(Router);

  protected readonly mock = environment.useMockData;
  protected readonly busy = signal(false);

  constructor() {
    // Already signed in (e.g. hit /login directly) — go home.
    if (this.account.isAuthenticated()) {
      void this.router.navigateByUrl('/home');
    }
  }

  protected signIn(): void {
    this.busy.set(true);
    this.account.login();
  }
}
