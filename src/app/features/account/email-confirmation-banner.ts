import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { settled } from '../../core/util/resource';
import { AccountRecoveryService } from '../../proxy/identity/account-recovery.service';
import { ArBanner, ArButton } from '../../ui';

/**
 * Shown on the profile while the signed-in user's email address is unconfirmed, with a
 * button that emails them the confirmation link. Hidden once confirmed.
 */
@Component({
  selector: 'ar-email-confirmation-banner',
  imports: [ArBanner, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (unconfirmed(); as email) {
      <ar-banner tone="warn">
        <span>
          {{ email }} is not confirmed yet.
          @if (sent()) {
            A confirmation link is on its way — open it to finish.
          } @else if (failed()) {
            That did not go through. Wait a while and try again.
          }
        </span>
        @if (!sent()) {
          <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="send()">
            {{ busy() ? 'Sending…' : 'Send confirmation link' }}
          </button>
        }
      </ar-banner>
    }
  `,
})
export class ArEmailConfirmationBanner {
  private readonly api = inject(AccountRecoveryService);
  private readonly mock = environment.useMockData;

  private readonly status = rxResource({
    params: () => (this.mock ? undefined : {}),
    stream: () => this.api.getMyEmailStatus(),
    defaultValue: { emailConfirmed: true },
  });

  protected readonly unconfirmed = computed(() => {
    const s = settled(this.status, { emailConfirmed: true });
    return !s.emailConfirmed && s.email ? s.email : null;
  });

  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly failed = signal(false);

  protected async send(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    try {
      await firstValueFrom(this.api.sendMyEmailConfirmation());
      this.sent.set(true);
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
