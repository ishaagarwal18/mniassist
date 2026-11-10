import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { readApiError } from '../../core/util/api-error';
import { settled } from '../../core/util/resource';
import { ToastService } from '../../core/ui/toast.service';
import { TwoFactorService } from '../../proxy/identity/two-factor.service';
import type { AuthenticatorSetupDto, TwoFactorStatusDto } from '../../proxy/identity/models';
import { ArBanner, ArButton, ArCard, ArChip, ArDialog } from '../../ui';
import { ArQrCode } from '../../ui/qr-code';

type Dialog = 'setup' | 'codes' | 'regenerate' | 'disable' | null;

const OFF: TwoFactorStatusDto = { isEnabled: false, recoveryCodesLeft: 0, hasPassword: true };

/** Few enough left that it is time to print a new sheet. */
const LOW_RECOVERY_CODES = 3;

/**
 * Two-step sign-in for the signed-in user's own account: set up an authenticator app,
 * keep the recovery codes, regenerate them, or turn it off. The sign-in screen does the
 * rest — once this is on, a correct password is followed by a code.
 */
@Component({
  selector: 'ar-two-factor-card',
  imports: [ArCard, ArButton, ArChip, ArBanner, ArDialog, ArQrCode],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-card heading="Two-step verification">
      <div class="tf">
        <div class="tf__state">
          @if (status().isEnabled) {
            <ar-chip tone="good" [dot]="true">On</ar-chip>
            <span class="tf__note" [class.tf__note--warn]="lowOnCodes()">
              {{ status().recoveryCodesLeft }} recovery code{{
                status().recoveryCodesLeft === 1 ? '' : 's'
              }}
              left
            </span>
          } @else {
            <ar-chip tone="amber">Off</ar-chip>
          }
        </div>
        <p class="tf__muted">
          @if (status().isEnabled) {
            Signing in asks for a code from your authenticator app after your password. If you lose
            your phone, a recovery code gets you in once.
          } @else {
            Add a second step to signing in: after your password, a 6-digit code from an
            authenticator app such as Google Authenticator, Microsoft Authenticator or Authy. A
            stolen password alone is then not enough.
          }
        </p>
        <div class="tf__actions">
          @if (status().isEnabled) {
            <button ar-button type="button" variant="ghost" (click)="open('regenerate')">
              New recovery codes
            </button>
            <button ar-button type="button" variant="danger" (click)="open('disable')">
              Turn off
            </button>
          } @else {
            <button
              ar-button
              type="button"
              variant="primary"
              icon="shield"
              [disabled]="busy()"
              (click)="startSetup()"
            >
              Set up authenticator app
            </button>
          }
        </div>
      </div>
    </ar-card>

    @if (dialog() === 'setup' && setup(); as s) {
      <ar-dialog
        title="Set up your authenticator app"
        width="min(520px, calc(100vw - 32px))"
        (dismiss)="close()"
      >
        @if (error(); as e) {
          <ar-banner tone="bad">{{ e }}</ar-banner>
        }
        <ol class="tf__steps">
          <li>
            <p>Scan this with your authenticator app.</p>
            <div class="tf__qr">
              <ar-qr-code [value]="s.authenticatorUri" label="Authenticator setup QR code" />
            </div>
            <p class="tf__muted">
              Can't scan it? Add an account by hand with this key:
              <code class="tf__key">{{ s.sharedKey }}</code>
              <button type="button" class="link" (click)="copyKey(s.sharedKey)">Copy</button>
            </p>
          </li>
          <li>
            <label class="fld">
              <span class="fld__k">Enter the 6-digit code it shows</span>
              <input
                required
                class="ar-field__input tf__code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="7"
                data-autofocus
                [value]="code()"
                (input)="code.set($any($event.target).value)"
              />
            </label>
          </li>
        </ol>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="close()">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !codeLooksRight()"
            (click)="enable()"
          >
            {{ busy() ? 'Checking…' : 'Turn on' }}
          </button>
        </div>
      </ar-dialog>
    }

    @if (dialog() === 'codes') {
      <ar-dialog title="Save your recovery codes" (dismiss)="close()">
        <ar-banner tone="warn">
          These are shown once. Each one signs you in once if you lose your phone. Keep them
          somewhere safe — a password manager, or printed and filed.
        </ar-banner>
        <ul class="tf__codes ar-mono">
          @for (c of recoveryCodes(); track c) {
            <li>{{ c }}</li>
          }
        </ul>
        <div class="tf__code-tools">
          <button ar-button type="button" variant="ghost" icon="copy" (click)="copyCodes()">
            Copy
          </button>
          <button ar-button type="button" variant="ghost" icon="download" (click)="download()">
            Download
          </button>
        </div>
        <div dialogActions>
          <button ar-button type="button" variant="primary" (click)="close()">
            I've saved them
          </button>
        </div>
      </ar-dialog>
    }

    @if (dialog() === 'regenerate') {
      <ar-dialog title="New recovery codes" (dismiss)="close()">
        @if (error(); as e) {
          <ar-banner tone="bad">{{ e }}</ar-banner>
        }
        <p class="tf__muted">
          Your current recovery codes stop working. Enter a code from your authenticator app to
          confirm.
        </p>
        <label class="fld">
          <span class="fld__k">Authentication code</span>
          <input
            required
            class="ar-field__input tf__code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="7"
            data-autofocus
            [value]="code()"
            (input)="code.set($any($event.target).value)"
          />
        </label>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="close()">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !codeLooksRight()"
            (click)="regenerate()"
          >
            {{ busy() ? 'Checking…' : 'Make new codes' }}
          </button>
        </div>
      </ar-dialog>
    }

    @if (dialog() === 'disable') {
      <ar-dialog title="Turn off two-step verification?" (dismiss)="close()">
        @if (error(); as e) {
          <ar-banner tone="bad">{{ e }}</ar-banner>
        }
        <p class="tf__muted">
          Signing in will need only your password again. Your authenticator entry and recovery codes
          stop working.
        </p>
        @if (status().hasPassword) {
          <label class="fld">
            <span class="fld__k">Your password</span>
            <input
              required
              class="ar-field__input"
              type="password"
              autocomplete="current-password"
              data-autofocus
              [value]="password()"
              (input)="password.set($any($event.target).value)"
            />
          </label>
        } @else {
          <label class="fld">
            <span class="fld__k">Authentication code</span>
            <input
              required
              class="ar-field__input tf__code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="7"
              data-autofocus
              [value]="code()"
              (input)="code.set($any($event.target).value)"
            />
          </label>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="close()">Cancel</button>
          <button
            ar-button
            type="button"
            variant="danger"
            [disabled]="busy() || (status().hasPassword ? !password() : !codeLooksRight())"
            (click)="disable()"
          >
            {{ busy() ? 'Turning off…' : 'Turn off' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    .tf__state {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tf__note {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .tf__note--warn {
      color: var(--ar-amber-600);
      font-weight: 500;
    }
    .tf__muted {
      margin: 8px 0 12px;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .tf__actions {
      display: flex;
      gap: 8px;
    }
    .tf__steps {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      font: 400 13px var(--ar-font-sans);
    }
    .tf__steps p {
      margin: 0 0 8px;
    }
    .tf__qr {
      display: flex;
      justify-content: center;
      margin: 6px 0;
    }
    .tf__key {
      font: 500 12.5px var(--ar-font-mono);
      letter-spacing: 0.05em;
      user-select: all;
    }
    .tf__code {
      font: 600 18px var(--ar-font-mono);
      letter-spacing: 0.3em;
      max-width: 180px;
    }
    .tf__codes {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 24px;
      margin: 14px 0;
      padding: 12px 16px;
      list-style: none;
      border-radius: 6px;
      background: var(--ar-ink-50);
      font-size: 13px;
    }
    .tf__code-tools {
      display: flex;
      gap: 8px;
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
    .link {
      border: 0;
      background: none;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
      margin-left: 6px;
    }
  `,
})
export class ArTwoFactorCard {
  private readonly api = inject(TwoFactorService);
  private readonly toast = inject(ToastService);

  private readonly tick = signal(0);
  private readonly resource = rxResource({
    params: () => ({ t: this.tick() }),
    stream: () => this.api.getStatus(),
    defaultValue: OFF,
  });

  protected readonly status = computed(() => settled(this.resource, OFF));
  protected readonly lowOnCodes = computed(
    () => this.status().isEnabled && this.status().recoveryCodesLeft <= LOW_RECOVERY_CODES,
  );

  protected readonly dialog = signal<Dialog>(null);
  protected readonly setup = signal<AuthenticatorSetupDto | null>(null);
  protected readonly recoveryCodes = signal<string[]>([]);
  protected readonly code = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly codeLooksRight = computed(() => this.code().replace(/\D/g, '').length === 6);

  protected open(d: Exclude<Dialog, null>): void {
    this.code.set('');
    this.password.set('');
    this.error.set(null);
    this.dialog.set(d);
  }

  protected close(): void {
    this.dialog.set(null);
    this.setup.set(null);
    this.recoveryCodes.set([]);
    this.code.set('');
    this.password.set('');
  }

  protected async startSetup(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const s = await firstValueFrom(this.api.startAuthenticatorSetup());
      this.setup.set(s);
      this.open('setup');
    } catch (e) {
      this.toast.error(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async enable(): Promise<void> {
    await this.run(async () => {
      const r = await firstValueFrom(this.api.enableAuthenticator({ code: this.code() }));
      this.showCodes(r.codes);
      this.toast.success('Two-step verification is on.');
    });
  }

  protected async regenerate(): Promise<void> {
    await this.run(async () => {
      const r = await firstValueFrom(this.api.regenerateRecoveryCodes({ code: this.code() }));
      this.showCodes(r.codes);
      this.toast.success('New recovery codes made. The old ones no longer work.');
    });
  }

  protected async disable(): Promise<void> {
    await this.run(async () => {
      await firstValueFrom(
        this.api.disable(
          this.status().hasPassword ? { password: this.password() } : { code: this.code() },
        ),
      );
      this.close();
      this.toast.success('Two-step verification is off.');
    });
  }

  protected copyKey(key: string): Promise<void> {
    return this.copy(key.replace(/\s+/g, '').toUpperCase(), 'Key');
  }

  protected copyCodes(): Promise<void> {
    return this.copy(this.recoveryCodes().join('\n'), 'Recovery codes');
  }

  private async copy(text: string, what: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success(`${what} copied.`);
    } catch {
      this.toast.warning(
        'Copying is blocked in this browser. Select the text and copy it instead.',
      );
    }
  }

  protected download(): void {
    const body = [
      'MNI Assist — two-step verification recovery codes',
      `Made ${new Date().toLocaleString('en-IN')}. Each code works once.`,
      '',
      ...this.recoveryCodes(),
      '',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mni-assist-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  private showCodes(codes: string[]): void {
    this.recoveryCodes.set(codes);
    this.code.set('');
    this.password.set('');
    this.setup.set(null);
    this.dialog.set('codes');
    this.reload();
  }

  /** Runs a dialog's action: errors stay in the dialog, and the status reloads after. */
  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
      this.reload();
    } catch (e) {
      this.error.set(readApiError(e));
      this.code.set('');
    } finally {
      this.busy.set(false);
    }
  }

  private reload(): void {
    this.tick.update((n) => n + 1);
  }
}
