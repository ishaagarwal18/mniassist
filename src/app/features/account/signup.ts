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
import { readApiError } from '../../core/util/api-error';
import { workspaceNameProblem, workspaceSlug } from '../../core/util/workspace-slug';
import { CurrentUserService } from '../../core/services/current-user.service';
import { TenantSignupService } from '../../proxy/registration';
import { SubscriptionPlan } from '../../proxy/billing/subscription-plan.enum';
import { ArButton } from '../../ui';
import { ArBrand } from '../../layout/brand';
import { ArLanguageSwitch } from '../../layout/language-switch';
import { LanguageService } from '../../core/i18n/language.service';
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
  imports: [ArButton, RouterLink, ArBrand, ArCaptcha, ArLanguageSwitch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lg">
      <div class="lg__top"><ar-language-switch /></div>
      <form class="lg__card" (submit)="submit($event)">
        <div class="lg__brand">
          <ar-brand />
        </div>

        @if (done()) {
          <h1 class="lg__title">{{ i18n.t('Workspace created') }}</h1>
          <p class="lg__hint">{{ i18n.t('Signing you in to {0}…', workspace()) }}</p>
        } @else {
          <h1 class="lg__title">{{ i18n.t('Create your workspace') }}</h1>

          @if (plan(); as p) {
            <div class="lg__plan">
              <span>
                You're getting the <strong>{{ p.name }}</strong> plan · {{ price(p) }}/month + GST
              </span>
              <a routerLink="/" fragment="plans" class="lg__plan-change">{{ i18n.t('Change') }}</a>
            </div>
          }

          @if (error(); as e) {
            <p class="lg__error" role="alert">{{ e }}</p>
          }

          <label class="lg__field">
            <span>{{ i18n.t('Workspace name') }}</span>
            <input
              class="ar-field__input"
              name="workspace"
              autocomplete="organization"
              placeholder="e.g. Sun Energy Automation"
              maxlength="64"
              [class.lg__input--bad]="show('workspace') && !!workspaceError()"
              [attr.aria-invalid]="show('workspace') && !!workspaceError()"
              [value]="workspace()"
              (input)="workspace.set($any($event.target).value)"
              (blur)="touch('workspace')"
            />
            @if (show('workspace') && workspaceError(); as e) {
              <em class="lg__note lg__bad">{{ e }}</em>
            } @else if (slug()) {
              <em class="lg__note"
                >You'll sign in with the workspace <strong class="lg__slug">{{ slug() }}</strong
                >.</em
              >
            } @else {
              <em class="lg__note">{{ i18n.t('Your company's name. Spaces are fine.') }}</em>
            }
          </label>
          <label class="lg__field">
            <span
              >{{ i18n.t('Your name') }}
              <span class="lg__opt">{{ i18n.t('(optional)') }}</span></span
            >
            <input
              class="ar-field__input"
              name="name"
              autocomplete="name"
              maxlength="128"
              [value]="fullName()"
              (input)="fullName.set($any($event.target).value)"
            />
          </label>
          <label class="lg__field">
            <span>{{ i18n.t('Email') }}</span>
            <input
              class="ar-field__input"
              type="email"
              name="email"
              autocomplete="email"
              maxlength="256"
              [class.lg__input--bad]="show('email') && !!emailError()"
              [attr.aria-invalid]="show('email') && !!emailError()"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
              (blur)="touch('email')"
            />
            @if (show('email') && emailError(); as e) {
              <em class="lg__note lg__bad">{{ e }}</em>
            }
          </label>
          <label class="lg__field">
            <span
              >{{ i18n.t('Mobile number')
              }}{{ mobileRequired() ? '' : ' ' + i18n.t('(optional)') }}</span
            >
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
                  {{ i18n.t(sending() ? 'Sending…' : verificationId() ? 'Resend' : 'Send code') }}
                </button>
              }
            </span>
            @if (mobileVerified()) {
              <em class="lg__note lg__ok">{{ i18n.t('Verified.') }}</em>
            } @else if (sentTo(); as to) {
              <em class="lg__note">{{ i18n.t('We sent a 6-digit code to {0}.', to) }}</em>
            } @else if (submitted() && mobileError(); as e) {
              <em class="lg__note lg__bad">{{ e }}</em>
            }
          </label>
          @if (mobileRequired() && verificationId() && !mobileVerified()) {
            <label class="lg__field">
              <span>{{ i18n.t('Code from the SMS') }}</span>
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
                  {{ i18n.t('Verify') }}
                </button>
              </span>
            </label>
          }
          <label class="lg__field">
            <span>{{ i18n.t('Password') }}</span>
            <input
              class="ar-field__input"
              type="password"
              name="password"
              autocomplete="new-password"
              maxlength="128"
              [class.lg__input--bad]="show('password') && !!passwordError()"
              [attr.aria-invalid]="show('password') && !!passwordError()"
              [value]="password()"
              (input)="password.set($any($event.target).value)"
              (blur)="touch('password')"
            />
            @if (show('password') && passwordError(); as e) {
              <em class="lg__note lg__bad">{{ e }}</em>
            } @else {
              <!-- The workspace's password rules; the server has the last word. -->
              <span class="lg__rules">
                @for (r of passwordRules(); track r.label) {
                  <em class="lg__note" [class.lg__ok]="r.met"
                    >{{ r.met ? '✓' : '·' }} {{ r.label }}</em
                  >
                }
              </span>
            }
          </label>

          <ar-captcha
            #captcha
            (required)="captchaRequired.set($event)"
            (token)="captchaToken.set($event)"
          />
          @if (submitted() && captchaError(); as e) {
            <em class="lg__note lg__bad">{{ e }}</em>
          }

          <button ar-button type="submit" variant="primary" [disabled]="busy()">
            {{ i18n.t(busy() ? 'Creating…' : 'Create workspace') }}
          </button>

          <a class="lg__link" routerLink="/login">{{ i18n.t('I already have a workspace') }}</a>
        }
      </form>
      <p class="lg__foot">
        MNI Assist — AI Business Engagement Platform for Industrial Companies ·
        <a routerLink="/privacy" class="lg__foot-link">{{ i18n.t('Privacy policy') }}</a>
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
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
      padding: 24px;
    }
    .lg__top {
      position: absolute;
      top: 20px;
      right: 24px;
    }
    @media (max-width: 640px) {
      .lg__top {
        position: static;
        align-self: flex-end;
      }
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
    .lg__note.lg__bad,
    .lg__bad {
      color: var(--ar-red-600, #b91c1c);
    }
    .lg__input--bad {
      border-color: var(--ar-red-500, #ef4444) !important;
    }
    .lg__slug {
      font-family: var(--ar-font-mono);
      font-style: normal;
      white-space: nowrap;
    }
    .lg__opt {
      font-weight: 400;
      color: var(--ar-ink-500);
    }
    .lg__rules {
      display: flex;
      flex-wrap: wrap;
      gap: 2px 12px;
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
  protected readonly i18n = inject(LanguageService);
  private readonly api = inject(TenantSignupService);
  private readonly account = inject(CurrentUserService);
  private readonly router = inject(Router);

  /** The plan chosen on the landing page, if the link carried one. */
  protected readonly plan = signal(
    planByKey(inject(ActivatedRoute).snapshot.queryParamMap.get('plan')),
  );
  protected readonly price = (p: NonNullable<ReturnType<typeof planByKey>>) =>
    priceLabel(p, 'monthly');

  /** The chosen plan as the API's enum (Starter, Growth, Pro, Enterprise), or null for the default (Starter). */
  private chosenPlan(): SubscriptionPlan | null {
    const name = this.plan()?.name;
    return name ? (SubscriptionPlan[name as keyof typeof SubscriptionPlan] ?? null) : null;
  }

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

  // ---- Validation: shown per field once it has been left, and for every field on submit ----
  /** The sign-in name the typed workspace name becomes ("Sun Energy" → "sun-energy"). */
  protected readonly slug = computed(() => workspaceSlug(this.workspace()));
  protected readonly submitted = signal(false);
  private readonly touched = signal<ReadonlySet<string>>(new Set());

  protected touch(field: string): void {
    this.touched.update((s) => new Set([...s, field]));
  }
  protected show(field: string): boolean {
    return this.submitted() || this.touched().has(field);
  }

  protected readonly workspaceError = computed(() => workspaceNameProblem(this.workspace()));
  protected readonly emailError = computed(() => {
    const email = this.email().trim();
    if (!email) return 'Enter your email address.';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? null
      : 'Enter a valid email address, like name@company.com.';
  });
  /** ABP's default rules for a new workspace's first password. */
  protected readonly passwordRules = computed(() => {
    const p = this.password();
    return [
      { label: '6+ characters', met: p.length >= 6 },
      { label: 'an uppercase letter', met: /[A-Z]/.test(p) },
      { label: 'a lowercase letter', met: /[a-z]/.test(p) },
      { label: 'a digit', met: /\d/.test(p) },
      { label: 'a symbol', met: /[^A-Za-z0-9]/.test(p) },
    ];
  });
  protected readonly passwordError = computed(() => {
    const p = this.password();
    if (!p) return 'Choose a password.';
    const missing = this.passwordRules().filter((r) => !r.met);
    return missing.length ? `The password needs ${missing.map((r) => r.label).join(', ')}.` : null;
  });
  protected readonly mobileError = computed(() =>
    this.mobileRequired() && !this.mobileVerified()
      ? this.mobile().trim()
        ? 'Send the code and enter it to verify your mobile number.'
        : 'Enter your mobile number and verify it with the code we send.'
      : null,
  );
  protected readonly captchaError = computed(() =>
    this.captchaRequired() && !this.captchaToken() ? 'Complete the check above.' : null,
  );

  protected readonly canSubmit = computed(
    () =>
      !this.workspaceError() &&
      !this.emailError() &&
      !this.passwordError() &&
      !this.mobileError() &&
      !this.captchaError(),
  );

  constructor() {
    if (this.account.isAuthenticated()) {
      void this.router.navigateByUrl('/home');
    }

    firstValueFrom(this.api.getMobileVerification())
      .then((r) => this.mobileRequired.set(r.required))
      .catch(() => undefined);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    this.submitted.set(true);
    if (!this.canSubmit()) {
      this.error.set('Please fix the highlighted fields.');
      // Put the cursor in the first field that needs attention.
      // After the page re-renders with the errors marked.
      setTimeout(() =>
        (document.querySelector('.lg [aria-invalid="true"]') as HTMLElement | null)?.focus(),
      );
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const name = this.slug();
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
          // The trial starts on the plan picked on the landing page: its modules, roles and menus only.
          plan: this.chosenPlan(),
        }),
      );
      this.done.set(true);
      // ABP seeds the first user as "admin"; sign in scoped to the new workspace, and start
      // on Get started — a new workspace's dashboard has nothing on it yet.
      await this.account.signIn('admin', this.password(), true, name, '/getting-started');
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
