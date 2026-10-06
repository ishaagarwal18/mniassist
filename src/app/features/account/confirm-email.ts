import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AccountRecoveryService } from '../../proxy/identity/account-recovery.service';
import { ArButton } from '../../ui';

/**
 * Where the confirmation email's link lands: <c>/confirm-email?user=…&token=…[&tenant=…]</c>.
 * It confirms on arrival — there is nothing to fill in — and says how it went.
 */
@Component({
  selector: 'ar-confirm-email',
  imports: [ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './recovery.scss',
  template: `
    <div class="rc">
      <div class="rc__card">
        <h1 class="rc__title">Confirm your email address</h1>

        @switch (state()) {
          @case ('working') {
            <p class="rc__lead">Confirming…</p>
          }
          @case ('done') {
            <p class="rc__ok">Your email address is confirmed. You can sign in.</p>
            <a ar-button variant="primary" routerLink="/login">Go to sign in</a>
          }
          @case ('incomplete') {
            <p class="rc__error">
              This link is incomplete. Open the link from your email again, or ask for a new one
              from the sign-in screen.
            </p>
            <div class="rc__links"><a routerLink="/login">Go to sign in</a></div>
          }
          @default {
            <p class="rc__error">{{ message() }}</p>
            <div class="rc__links"><a routerLink="/login">Go to sign in</a></div>
          }
        }
      </div>
    </div>
  `,
})
export class ArConfirmEmail {
  private readonly api = inject(AccountRecoveryService);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<'working' | 'done' | 'incomplete' | 'failed'>('working');
  protected readonly message = signal('');

  constructor() {
    const q = this.route.snapshot.queryParamMap;
    const userId = q.get('user');
    const token = q.get('token');
    if (!userId || !token) {
      this.state.set('incomplete');
      return;
    }
    void this.confirm(userId, token, q.get('tenant'));
  }

  private async confirm(userId: string, token: string, tenantId: string | null): Promise<void> {
    try {
      const r = await firstValueFrom(this.api.confirmEmail({ userId, token, tenantId }));
      if (r.succeeded) {
        this.state.set('done');
      } else {
        this.message.set(
          'This link has expired or was already used. Ask for a new one from the sign-in screen.',
        );
        this.state.set('failed');
      }
    } catch (e) {
      const status = (e as { status?: number })?.status;
      this.message.set(
        status === 429
          ? 'Too many attempts from here. Wait a while and open the link again.'
          : 'Something went wrong. Open the link again in a moment.',
      );
      this.state.set('failed');
    }
  }
}
