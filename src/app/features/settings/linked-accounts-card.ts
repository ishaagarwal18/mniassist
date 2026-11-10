import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AccountSwitcher } from '../../core/auth/account-switch';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { workspaceSlug } from '../../core/util/workspace-slug';
import { settled } from '../../core/util/resource';
import { LinkedAccountService } from '../../proxy/identity/linked-account.service';
import type { LinkedAccountDto } from '../../proxy/identity/models';
import { ArBanner, ArButton, ArCard } from '../../ui';

/**
 * Other accounts the same person owns — in another workspace, or on the platform — linked
 * once with that account's password, then one click to move between them. A linked
 * account is the person's own, so a switch is not "acting as" anyone.
 */
@Component({
  selector: 'ar-linked-accounts-card',
  imports: [ArCard, ArButton, ArBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-card heading="Linked accounts">
      <p class="la__muted">
        Your other AutoReach accounts, for example in a client's workspace. Link one with its
        password once, then switch between them without signing out.
      </p>
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (switcher.actingAs()) {
        <p class="la__muted">Return to your own account to link or switch accounts.</p>
      }
      <ul class="la">
        @for (a of accounts(); track a.userId + (a.tenantId ?? '')) {
          <li class="la__row">
            <span class="la__who">
              <strong>{{ a.userName }}</strong>
              <span class="la__muted">
                {{ a.tenantName || 'Platform (host)' }}{{ a.email ? ' · ' + a.email : '' }}
              </span>
            </span>
            <span class="la__act">
              <button
                type="button"
                class="link"
                [disabled]="busy() || !!switcher.actingAs()"
                (click)="switchTo(a)"
              >
                Switch to it
              </button>
              <button
                type="button"
                class="link link--danger"
                [disabled]="busy()"
                (click)="unlink(a)"
              >
                Unlink
              </button>
            </span>
          </li>
        } @empty {
          <li class="la__muted">No linked accounts.</li>
        }
      </ul>

      @if (linking()) {
        <form class="la__form" (submit)="$event.preventDefault(); link()">
          <label class="fld">
            <span class="fld__k">Workspace</span>
            <input
              class="ar-field__input"
              autocapitalize="none"
              maxlength="64"
              placeholder="e.g. Sun Energy Automation — blank for the platform"
              [value]="workspace()"
              (input)="workspace.set($any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Username, email or phone number</span>
            <input
              required
              class="ar-field__input"
              autocomplete="off"
              maxlength="256"
              [value]="userName()"
              (input)="userName.set($any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Its password</span>
            <input
              required
              type="password"
              class="ar-field__input"
              autocomplete="off"
              maxlength="128"
              [value]="password()"
              (input)="password.set($any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Authentication code (if it uses two-step verification)</span>
            <input
              class="ar-field__input"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="16"
              [value]="code()"
              (input)="code.set($any($event.target).value)"
            />
          </label>
          <div class="la__btns">
            <button
              ar-button
              type="submit"
              variant="primary"
              [disabled]="busy() || !userName().trim() || !password()"
            >
              {{ busy() ? 'Linking…' : 'Link account' }}
            </button>
            <button ar-button type="button" variant="ghost" (click)="cancel()">Cancel</button>
          </div>
        </form>
      } @else {
        <button
          ar-button
          type="button"
          variant="ghost"
          icon="link"
          [disabled]="!!switcher.actingAs()"
          (click)="linking.set(true)"
        >
          Link another account
        </button>
      }
    </ar-card>
  `,
  styles: `
    .la {
      margin: 0 0 10px;
      padding: 0;
      list-style: none;
    }
    .la__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 0;
      border-top: 1px solid var(--ar-ink-100);
    }
    .la__row:first-child {
      border-top: 0;
    }
    .la__who {
      display: flex;
      flex-direction: column;
      min-width: 0;
      font: 400 13px var(--ar-font-sans);
    }
    .la__muted {
      margin: 0 0 10px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .la__who .la__muted {
      margin: 0;
    }
    .la__act {
      display: flex;
      gap: 12px;
    }
    .la__form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
    }
    .la__btns {
      grid-column: 1 / -1;
      display: flex;
      gap: 10px;
    }
    .fld__k {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .link {
      border: 0;
      background: none;
      cursor: pointer;
      padding: 0;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
    .link:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .link--danger {
      color: var(--ar-red-600);
    }
  `,
})
export class ArLinkedAccountsCard {
  private readonly api = inject(LinkedAccountService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  protected readonly switcher = inject(AccountSwitcher);

  private readonly tick = signal(0);
  private readonly resource = rxResource({
    params: () => ({ t: this.tick() }),
    stream: () => this.api.getList(),
    defaultValue: { items: [] as LinkedAccountDto[] },
  });
  protected readonly accounts = computed(() => settled(this.resource, { items: [] }).items ?? []);

  protected readonly linking = signal(false);
  protected readonly workspace = signal('');
  protected readonly userName = signal('');
  protected readonly password = signal('');
  protected readonly code = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected cancel(): void {
    this.linking.set(false);
    this.password.set('');
    this.code.set('');
    this.error.set(null);
  }

  protected async link(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const a = await firstValueFrom(
        this.api.link({
          workspace: workspaceSlug(this.workspace()) || null,
          userNameOrEmail: this.userName().trim(),
          password: this.password(),
          twoFactorCode: this.code().trim() || null,
        }),
      );
      this.toasts.success(`${a.userName} is linked.`);
      this.workspace.set('');
      this.userName.set('');
      this.cancel();
      this.tick.update((n) => n + 1);
    } catch (e) {
      this.password.set('');
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async unlink(a: LinkedAccountDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Unlink ${a.userName}?`,
        message: 'Both accounts stay as they are; you just cannot switch between them any more.',
        confirmText: 'Unlink',
        tone: 'danger',
      }))
    )
      return;
    try {
      await firstValueFrom(this.api.unlink(a.userId, a.tenantId));
      this.tick.update((n) => n + 1);
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  protected async switchTo(a: LinkedAccountDto): Promise<void> {
    this.busy.set(true);
    try {
      await this.switcher.switchTo({
        kind: 'LinkedAccount',
        userId: a.userId,
        tenant: a.tenantId ? { id: a.tenantId, name: a.tenantName ?? '' } : null,
      });
    } catch (e) {
      this.busy.set(false);
      this.error.set(readApiError(e));
    }
  }
}
