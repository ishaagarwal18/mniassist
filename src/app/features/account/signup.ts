import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { readApiError } from '../../core/util/api-error';
import { CurrentUserService } from '../../core/services/current-user.service';
import { TenantSignupService } from '../../proxy/registration';
import { ArButton } from '../../ui';
import { ArBrand } from '../../layout/brand';
import { planByKey, planKey, priceLabel } from '../landing/landing-plans';
import { ArCaptcha } from '../../ui/captcha';

/**
 * Anonymous "create your workspace" screen. Creates the tenant + its admin, then
 * signs in as that admin. Rendered outside the app shell, like /login.
 * Arriving from a plan on the landing page (`?plan=growth`), it shows that plan
 * and, once the workspace exists, opens Billing to activate it.
 */
@Component({
  selector: 'ar-signup',
  imports: [ArButton, RouterLink, ArBrand, ArCaptcha],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lg">
      <form class="lg__card" (submit)="submit($event)">
        <div class="lg__brand">
          <ar-brand />
        </div>

        @if (done()) {
          <h1 class="lg__title">Workspace created</h1>
          <p class="lg__hint">Signing you in to {{ workspace() }}…</p>
        } @else {
          <h1 class="lg__title">Create your workspace</h1>

          @if (plan(); as p) {
            <div class="lg__plan">
              <span>
                You're getting the <strong>{{ p.name }}</strong> plan · {{ price(p) }}/month + GST
              </span>
              <a routerLink="/" fragment="plans" class="lg__plan-change">Change</a>
            </div>
          }

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
              placeholder="e.g. Sun Energy-automation"
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
            <span>Mobile number{{ mobileRequired() ? '' : ' (optional)' }}</span>
            <span class="lg__row">
              <input
                class="ar-field__input"
                type="tel"
                name="mobile"
                autocomplete="tel"
                placeholder="+91 98200 11234"
                [disabled]="mobileVerified()"
                [value]="mobile()"
                (input)="mobileChanged($any($event.target).value)"
              />
              @if (mobileRequired() && !mobileVerified()) {
                <button
                  type="button"
                  class="lg__inline"
                  [disabled]="sending() || !mobile().trim()"
                  (click)="sendCode()"
                >
                  {{ sending() ? 'Sending…' : verificationId() ? 'Resend' : 'Send code' }}
                </button>
              }
            </span>
            @if (mobileVerified()) {
              <em class="lg__note lg__ok">Verified.</em>
            } @else if (sentTo(); as to) {
              <em class="lg__note">We sent a 6-digit code to {{ to }}.</em>
            }
          </label>
          @if (mobileRequired() && verificationId() && !mobileVerified()) {
            <label class="lg__field">
              <span>Code from the SMS</span>
              <span class="lg__row">
                <input
                  class="ar-field__input"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="8"
                  [value]="code()"
                  (input)="code.set($any($event.target).value)"
                />
                <button
                  type="button"
                  class="lg__inline"
                  [disabled]="sending() || code().trim().length < 6"
                  (click)="verifyCode()"
                >
                  Verify
                </button>
              </span>
            </label>
          }
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

          <ar-captcha
            #captcha
            (required)="captchaRequired.set($event)"
            (token)="captchaToken.set($event)"
          />

          <button ar-button type="submit" variant="primary" [disabled]="busy() || !canSubmit()">
            {{ busy() ? 'Creating…' : 'Create workspace' }}
          </button>

          <a class="lg__link" routerLink="/login">I already have a workspace</a>
        }
      </form>
      <p class="lg__foot">
        MNI Assist — AI Business Engagement Platform for Industrial Companies ·
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
    .lg__plan {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 0 0 16px;
      padding: 10px 12px;
      border: 1px solid var(--ar-blue-200);
      border-radius: var(--ar-radius-inset);
      background: var(--ar-blue-100);
      font: 400 12.5px/1.45 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .lg__plan strong {
      color: var(--ar-ink-900);
    }
    .lg__plan-change {
      flex: none;
      font-weight: 600;
      color: var(--ar-blue-600);
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
    .lg__row {
      display: flex;
      gap: 6px;
    }
    .lg__inline {
      flex: none;
      padding: 0 10px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-inset);
      background: var(--ar-white);
      color: var(--ar-teal-600);
      font: 600 12px var(--ar-font-sans);
      cursor: pointer;
    }
    .lg__inline:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .lg__ok {
      color: var(--ar-green-600);
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

  /** The plan chosen on the landing page, if the link carried one. */
  protected readonly plan = signal(
    planByKey(inject(ActivatedRoute).snapshot.queryParamMap.get('plan')),
  );
  protected readonly price = (p: NonNullable<ReturnType<typeof planByKey>>) =>
    priceLabel(p, 'monthly');

  protected readonly workspace = signal('');
  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);

  /** M01-1: the owner's mobile, verified by an SMS code when the platform requires it. */
  protected readonly mobile = signal('');
  protected readonly mobileRequired = signal(false);
  protected readonly verificationId = signal<string | null>(null);
  protected readonly sentTo = signal<string | null>(null);
  protected readonly code = signal('');
  protected readonly mobileVerified = signal(false);
  protected readonly sending = signal(false);

  protected mobileChanged(value: string): void {
    this.mobile.set(value);
    this.verificationId.set(null);
    this.sentTo.set(null);
    this.mobileVerified.set(false);
  }

  protected async sendCode(): Promise<void> {
    this.sending.set(true);
    this.error.set(null);
    try {
      const sent = await firstValueFrom(this.api.sendMobileCode(this.mobile().trim()));
      this.verificationId.set(sent.verificationId);
      this.sentTo.set(sent.sentTo);
      this.code.set('');
    } catch (e) {
      this.error.set(readApiError(e, 'Could not send the code.'));
    } finally {
      this.sending.set(false);
    }
  }

  protected async verifyCode(): Promise<void> {
    const id = this.verificationId();
    if (!id) return;
    this.sending.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.verifyMobileCode(id, this.code().trim()));
      this.mobileVerified.set(true);
    } catch (e) {
      this.error.set(readApiError(e, 'That code is not right.'));
    } finally {
      this.sending.set(false);
    }
  }

  /** Until the API says otherwise, assume a check is needed: a fast click must not skip it. */
  protected readonly captchaRequired = signal(true);
  protected readonly captchaToken = signal<string | null>(null);
  private readonly captcha = viewChild<ArCaptcha>('captcha');

  protected readonly canSubmit = computed(
    () =>
      /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(this.workspace().trim().toLowerCase()) &&
      this.email().trim().length > 0 &&
      this.password().length >= 6 &&
      (!this.mobileRequired() || this.mobileVerified()) &&
      (!this.captchaRequired() || !!this.captchaToken()),
  );

  constructor() {
    if (this.account.isAuthenticated()) {
      void this.router.navigateByUrl('/home');
    }
    if (!environment.useMockData) {
      firstValueFrom(this.api.getMobileVerification())
        .then((r) => this.mobileRequired.set(r.required))
        .catch(() => undefined);
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
          captchaToken: this.captchaToken(),
          mobileNumber: this.mobile().trim() || null,
          mobileVerificationId: this.mobileVerified() ? this.verificationId() : null,
        }),
      );
      this.done.set(true);
      // ABP seeds the first user as "admin"; sign in scoped to the new workspace.
      await this.account.signIn('admin', this.password(), true, name);
      // Straight to Billing to activate the plan they picked, if they picked one.
      const chosen = this.plan();
      if (chosen) {
        await this.router.navigate(['/billing'], { queryParams: { plan: planKey(chosen) } });
      }
    } catch (e) {
      this.error.set(readApiError(e, 'Could not create the workspace.'));
      // A token is single-use; the next attempt needs a new one.
      this.captcha()?.reset();
      this.done.set(false);
      this.busy.set(false);
    }
  }
}
