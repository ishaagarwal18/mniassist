import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { UserSecurityAdminService } from '../../proxy/identity/user-security-admin.service';
import type { UserSecurityStatusDto } from '../../proxy/identity/models';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';

/** Fifty years ahead reads as "until someone unlocks it". */
const FOREVER_MS = 50 * 365 * 24 * 3_600_000;

/**
 * An administrator's security view of one person: are they locked out, how many wrong
 * passwords, is their email confirmed, do they use two-step — and the actions: lock (which
 * signs them out everywhere), unlock, and set a password for them.
 */
@Component({
  selector: 'ar-user-security-dialog',
  imports: [ArDialog, ArButton, ArChip, ArBanner, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      [title]="'Security · ' + userName()"
      width="min(520px, calc(100vw - 32px))"
      (dismiss)="closed.emit()"
    >
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (status(); as s) {
        <div class="us__chips">
          @if (s.isLockedOut) {
            <ar-chip tone="bad">
              Locked
              {{
                isForever(s.lockedOutUntil)
                  ? 'until unlocked'
                  : 'until ' + (s.lockedOutUntil | date: 'dd MMM, HH:mm')
              }}
            </ar-chip>
          } @else {
            <ar-chip tone="good">Can sign in</ar-chip>
          }
          <ar-chip [tone]="s.emailConfirmed ? 'good' : 'amber'">
            Email {{ s.emailConfirmed ? 'confirmed' : 'not confirmed' }}
          </ar-chip>
          <ar-chip [tone]="s.twoFactorEnabled ? 'good' : 'neutral'">
            2-step {{ s.twoFactorEnabled ? 'on' : 'off' }}
          </ar-chip>
          @if (s.mustChangePasswordOnNextSignIn) {
            <ar-chip tone="teal">Must change password</ar-chip>
          }
        </div>
        <p class="us__muted">
          {{ s.failedSignInAttempts }} wrong password{{ s.failedSignInAttempts === 1 ? '' : 's' }}
          since the last good sign-in.
          @if (s.lastPasswordChangeTime) {
            Password last changed {{ s.lastPasswordChangeTime | date: 'dd MMM yyyy' }}.
          }
        </p>

        <h4 class="us__h">Lock</h4>
        @if (s.isLockedOut) {
          <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="unlock()">
            Unlock
          </button>
        } @else {
          <div class="us__row">
            <label class="fld">
              <span class="fld__k"
                >Until
                <span class="ar-field__opt">optional — blank means until unlocked</span></span
              >
              <input
                class="ar-field__input"
                type="datetime-local"
                [value]="lockUntil()"
                (input)="lockUntil.set($any($event.target).value)"
              />
            </label>
            <button ar-button type="button" variant="danger" [disabled]="busy()" (click)="lock()">
              Lock and sign out
            </button>
          </div>
        }

        <h4 class="us__h">Set a password</h4>
        <div class="us__row">
          <label class="fld">
            <span class="fld__k">New password</span>
            <input
              class="ar-field__input"
              type="password"
              autocomplete="new-password"
              [value]="newPassword()"
              (input)="newPassword.set($any($event.target).value)"
            />
          </label>
          <button
            ar-button
            type="button"
            variant="ghost"
            [disabled]="busy() || newPassword().length < 6"
            (click)="setPassword()"
          >
            Set password
          </button>
        </div>
        <label class="chk">
          <input
            type="checkbox"
            [checked]="mustChange()"
            (change)="mustChange.set($any($event.target).checked)"
          />
          They must choose their own at the next sign-in
        </label>
        <p class="us__muted">Setting a password signs them out of every device.</p>
      } @else if (!error()) {
        <p class="us__muted">Loading…</p>
      }
      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">Close</button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .us__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .us__muted {
      margin: 10px 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .us__h {
      margin: 16px 0 8px;
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .us__row {
      display: flex;
      align-items: flex-end;
      gap: 10px;
    }
    .us__row .fld {
      flex: 1;
    }
    .fld {
      display: block;
    }
    .fld__k {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .chk {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-top: 8px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
  `,
})
export class ArUserSecurityDialog implements OnInit {
  readonly userId = input.required<string>();
  readonly userName = input.required<string>();
  readonly closed = output<void>();

  private readonly api = inject(UserSecurityAdminService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly status = signal<UserSecurityStatusDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly lockUntil = signal('');
  protected readonly newPassword = signal('');
  protected readonly mustChange = signal(true);

  ngOnInit(): void {
    void this.run(() => firstValueFrom(this.api.get(this.userId())));
  }

  protected isForever(iso: string | null | undefined): boolean {
    return !!iso && new Date(iso).getTime() - Date.now() > FOREVER_MS;
  }

  protected async lock(): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Lock ${this.userName()}?`,
        message: 'They are signed out of every device and cannot sign in until the lock ends.',
        confirmText: 'Lock',
      }))
    ) {
      return;
    }
    const until = this.lockUntil() ? new Date(this.lockUntil()).toISOString() : null;
    if (await this.run(() => firstValueFrom(this.api.lock(this.userId(), { until })))) {
      this.toast.success(`${this.userName()} is locked out and signed out everywhere.`);
    }
  }

  protected async unlock(): Promise<void> {
    if (await this.run(() => firstValueFrom(this.api.unlock(this.userId())))) {
      this.toast.success(`${this.userName()} can sign in again.`);
    }
  }

  protected async setPassword(): Promise<void> {
    const ok = await this.run(() =>
      firstValueFrom(
        this.api.setPassword(this.userId(), {
          newPassword: this.newPassword(),
          mustChangeOnNextSignIn: this.mustChange(),
        }),
      ),
    );
    if (ok) {
      this.newPassword.set('');
      this.toast.success(
        this.mustChange()
          ? 'Password set. They will choose their own at the next sign-in.'
          : 'Password set.',
      );
    }
  }

  private async run(action: () => Promise<UserSecurityStatusDto>): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.status.set(await action());
      return true;
    } catch (e) {
      this.error.set(readApiError(e));
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
