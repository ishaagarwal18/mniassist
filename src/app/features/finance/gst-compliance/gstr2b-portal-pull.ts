import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  GstPortalSessionDto,
  Gstr2bStatementDto,
} from '../../../proxy/finance/gst-compliance.models';
import { Gstr2bService } from '../../../proxy/finance/gst-compliance.service';
import { ArButton } from '../../../ui/button';
import { readApiError } from '../../../core/util/api-error';

/** The GST portal user name: letters, digits, _ . - and @, as the portal allows. */
export function portalUsernameProblem(name: string): string | null {
  const v = name.trim();
  if (v.length < 2) return 'Enter your GST portal user name (not the GSTIN).';
  if (/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(v))
    return 'That is a GSTIN. Enter the user name you sign in to the GST portal with.';
  return /^[A-Za-z0-9_.@-]{2,60}$/.test(v)
    ? null
    : 'The user name has characters the portal does not use.';
}

export function otpProblem(otp: string): string | null {
  return /^\d{6}$/.test(otp.trim()) ? null : 'Enter the six-digit OTP from the SMS.';
}

/**
 * Pull GSTR-2B from the GST portal: sign in with an OTP sent to the registered mobile, then download the month. Shown only where a
 * GSP's returns API is set up; the file upload stays either way.
 */
@Component({
  selector: 'ar-gstr2b-portal-pull',
  imports: [ArButton, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (session(); as s) {
      @if (!s.isConfigured) {
        <p class="pp__muted">
          Pulling GSTR-2B straight from the GST portal isn't set up on this deployment yet.
        </p>
      } @else if (s.isSignedIn) {
        <div class="pp">
          <p class="pp__muted">
            Signed in to the GST portal as
            <strong translate="no">{{ s.portalUsername }}</strong> until
            {{ s.expiresAtUtc | date: 'shortTime' }}.
          </p>
          <div class="pp__row">
            <button ar-button variant="primary" type="button" [disabled]="busy()" (click)="pull()">
              {{ busy() ? 'Downloading…' : 'Pull GSTR-2B from the GST portal' }}
            </button>
            <button ar-button variant="ghost" type="button" [disabled]="busy()" (click)="signOut()">
              Sign out
            </button>
          </div>
        </div>
      } @else {
        <div class="pp">
          <p class="pp__muted">
            Or pull it from the GST portal ({{ s.providerName }}) for GSTIN
            <span translate="no">{{ s.gstin || '—' }}</span
            >. API access must be on for your portal user (GST portal → My profile → Manage API
            access).
          </p>
          <div class="pp__row">
            <label class="ar-field">
              <span class="ar-field__label">GST portal user name</span>
              <input
                class="ar-field__input"
                translate="no"
                autocomplete="username"
                [class.ar-invalid]="!!userError()"
                [attr.aria-invalid]="!!userError()"
                [value]="username()"
                [disabled]="busy()"
                (input)="username.set($any($event.target).value)"
              />
              @if (userError(); as e) {
                <small class="ar-field__error">{{ e }}</small>
              }
            </label>
            @if (otpSent()) {
              <label class="ar-field">
                <span class="ar-field__label">OTP</span>
                <input
                  class="ar-field__input"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="6"
                  [class.ar-invalid]="!!otpError()"
                  [attr.aria-invalid]="!!otpError()"
                  [value]="otp()"
                  [disabled]="busy()"
                  (input)="otp.set($any($event.target).value)"
                />
                @if (otpError(); as e) {
                  <small class="ar-field__error">{{ e }}</small>
                }
              </label>
            }
          </div>
          <div class="pp__row">
            @if (!otpSent()) {
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="busy()"
                (click)="sendOtp()"
              >
                Send OTP
              </button>
            } @else {
              <button
                ar-button
                variant="primary"
                type="button"
                [disabled]="busy()"
                (click)="verify()"
              >
                Sign in
              </button>
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="busy()"
                (click)="sendOtp()"
              >
                Send again
              </button>
            }
          </div>
        </div>
      }
    }
    @if (error(); as e) {
      <p class="ar-field__error" role="alert">{{ e }}</p>
    }
  `,
  styles: `
    .pp {
      display: grid;
      gap: 8px;
      margin-top: 12px;
      min-width: 0;
    }
    .pp__row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 12px;
      align-items: flex-end;
    }
    .pp__muted {
      margin: 0;
      color: var(--ar-ink-500);
      font-size: 12.5px;
    }
  `,
})
export class ArGstr2bPortalPull {
  private readonly api = inject(Gstr2bService);

  /** MMYYYY. */
  readonly period = input.required<string>();
  /** A month's GSTR-2B came in from the portal. */
  readonly pulled = output<Gstr2bStatementDto>();

  protected readonly session = signal<GstPortalSessionDto | null>(null);
  protected readonly username = signal('');
  protected readonly otp = signal('');
  protected readonly otpSent = signal(false);
  protected readonly userError = signal<string | null>(null);
  protected readonly otpError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.session.set(await firstValueFrom(this.api.getPortalSession({ skipHandleError: true })));
    } catch {
      this.session.set(null); // the upload still works; nothing to show here
    }
  }

  protected async sendOtp(): Promise<void> {
    const problem = portalUsernameProblem(this.username());
    this.userError.set(problem);
    if (problem) return;
    await this.run(async () => {
      await firstValueFrom(
        this.api.requestPortalOtp(this.username().trim(), { skipHandleError: true }),
      );
      this.otpSent.set(true);
      this.otp.set('');
    }, 'The OTP could not be requested.');
  }

  protected async verify(): Promise<void> {
    const problem = otpProblem(this.otp());
    this.otpError.set(problem);
    if (problem) return;
    await this.run(async () => {
      this.session.set(
        await firstValueFrom(
          this.api.verifyPortalOtp(this.username().trim(), this.otp().trim(), {
            skipHandleError: true,
          }),
        ),
      );
      this.otpSent.set(false);
    }, 'The GST portal did not accept the OTP.');
  }

  protected async pull(): Promise<void> {
    await this.run(async () => {
      this.pulled.emit(
        await firstValueFrom(this.api.pullFromPortal(this.period(), { skipHandleError: true })),
      );
    }, 'GSTR-2B could not be downloaded from the GST portal.');
    await this.load(); // the session may have ended
  }

  protected async signOut(): Promise<void> {
    await this.run(async () => {
      await firstValueFrom(this.api.signOutPortal({ skipHandleError: true }));
      await this.load();
    }, 'Could not sign out.');
  }

  private async run(work: () => Promise<void>, fallback: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await work();
    } catch (e) {
      this.error.set(readApiError(e, fallback));
    } finally {
      this.busy.set(false);
    }
  }
}
