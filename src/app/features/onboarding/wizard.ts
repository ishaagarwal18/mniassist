import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ChecklistItem, OnboardingStore } from '../../core/services/onboarding.store';
import { OnboardingChecklistStep } from '../../proxy/identity/onboarding-checklist-step.enum';
import { ArTopbar } from '../../layout/topbar';
import { ArButton } from '../../ui/button';
import { ArChip } from '../../ui/chip';
import { ArMeter } from '../../ui/meter';
import { ToastService } from '../../core/ui/toast.service';
import { AccountRecoveryService } from '../../proxy/identity/account-recovery.service';
import { errorMessage } from '../activities/activity-logic';
import { ArOnboardingStepPanel, opensInline } from './step-panel';
import { ArOnboardingConsentRules } from './consent-rules';
import { ArOnboardingAddFunds } from './add-funds';
import { ArOnboardingInviteTeam } from './invite-team';

/**
 * Get started (M07-1). The nine things a new tenant does before the product is
 * useful, as a step-by-step wizard: a rail across the top shows every step and
 * the progress, and one step is shown at a time with Back / Next, opening on the
 * next one to do.
 *
 * It is a checklist, not a gate: someone who connected a number during signup sees
 * that step already done rather than being marched through embedded signup again,
 * and any step can be skipped or picked from the rail. Email and mobile
 * verification, and accepting the consent rules (consent-rules.ts), are handled on
 * the card itself; every other step opens on this page,
 * under its card (step-panel.ts), so the person never leaves Get started. The
 * business profile comes first (see ORDER in onboarding.store.ts).
 */
@Component({
  selector: 'ar-onboarding-wizard',
  imports: [
    RouterLink,
    ArTopbar,
    ArButton,
    ArChip,
    ArMeter,
    ArOnboardingStepPanel,
    ArOnboardingConsentRules,
    ArOnboardingAddFunds,
    ArOnboardingInviteTeam,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Get started"
      [subtitle]="checklist().completedCount + ' of ' + checklist().totalCount + ' done'"
      help="A running checklist, not a gate — steps you've already finished show as done automatically. It leaves the menu by itself once every step is done."
    />

    <div class="ob ar-scroll" [class.ob--wide]="openStepId() !== null">
      <!-- The rail: every step at a glance; click one to go to it. -->
      <nav class="rail" aria-label="Setup steps">
        <ol class="rail__list">
          @for (step of checklist().items; track step.step; let i = $index) {
            <li
              class="rail__step"
              [class.rail__step--done]="step.done"
              [class.rail__step--on]="i === current() && !summary()"
            >
              <button
                type="button"
                class="rail__btn"
                [attr.aria-current]="i === current() && !summary() ? 'step' : null"
                [attr.aria-label]="
                  'Step ' + (i + 1) + ': ' + step.label + (step.done ? ', done' : '')
                "
                (click)="show(i)"
              >
                <span class="rail__dot" aria-hidden="true">{{ step.done ? '✓' : i + 1 }}</span>
                <span class="rail__label">{{ step.label }}</span>
              </button>
            </li>
          }
        </ol>
        <div class="prog">
          <ar-meter [value]="progress()" tone="teal" label="Setup progress" />
          <span class="prog__n ar-mono"
            >{{ checklist().completedCount }}/{{ checklist().totalCount }} · {{ progress() }}%</span
          >
        </div>
      </nav>

      @if (store.loading()) {
        <p role="status">Loading your setup checklist…</p>
      } @else if (summary()) {
        <section class="done">
          <h2 class="done__t">You’re set up.</h2>
          <p class="done__p">Every step is complete. Pick any step above to look at it again.</p>
        </section>
      } @else if (item(); as step) {
        <section class="card" [class.card--done]="step.done" aria-live="polite">
          <p class="card__k">Step {{ current() + 1 }} of {{ checklist().totalCount }}</p>
          <div class="card__head">
            <h2 class="card__t">{{ step.label }}</h2>
            @if (step.done) {
              <ar-chip tone="good">Done</ar-chip>
            } @else if (isNext(step)) {
              <ar-chip tone="amber">Do this next</ar-chip>
            }
          </div>
          <p class="card__d">{{ step.description }}</p>

          @if (!step.done) {
            @if (isEmailStep(step)) {
              @if (emailSentTo(); as to) {
                <p class="card__d">
                  A confirmation link is on its way to <strong>{{ to }}</strong
                  >. Open it, then come back and press “I’ve opened the link”.
                </p>
              }
              <div class="row">
                <button
                  ar-button
                  type="button"
                  [variant]="emailSentTo() ? 'ghost' : 'primary'"
                  [disabled]="busy()"
                  (click)="sendEmailLink()"
                >
                  {{ emailSentTo() ? 'Send it again' : 'Send confirmation link' }}
                </button>
                <button
                  ar-button
                  type="button"
                  [variant]="emailSentTo() ? 'primary' : 'ghost'"
                  icon="check"
                  [disabled]="busy()"
                  (click)="recheckEmail()"
                >
                  I’ve opened the link
                </button>
              </div>
            }
            @if (isMobileStep(step)) {
              @if (otpSent()) {
                <p class="card__d">
                  A 6-digit verification code was sent to <strong>{{ mobile() }}</strong
                  >. Enter the code below.
                </p>
                <div class="row">
                  <input
                    class="ar-field__input otp ar-mono"
                    inputmode="numeric"
                    maxlength="6"
                    placeholder="6-digit code"
                    aria-label="6-digit verification code"
                    [value]="otpCode()"
                    (input)="otpCode.set($any($event.target).value)"
                    (keydown.enter)="confirmOtp()"
                  />
                  <button
                    ar-button
                    type="button"
                    variant="primary"
                    [disabled]="busy() || !otpCode().trim()"
                    (click)="confirmOtp()"
                  >
                    Confirm
                  </button>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy() || resendCountdown() > 0"
                    (click)="resendOtp()"
                  >
                    {{
                      resendCountdown() > 0
                        ? 'Resend code (' + resendCountdown() + 's)'
                        : 'Resend code'
                    }}
                  </button>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy()"
                    (click)="changeMobile()"
                  >
                    Change number
                  </button>
                </div>
              } @else {
                <div class="row">
                  <input
                    class="ar-field__input otp"
                    type="tel"
                    placeholder="+91 …"
                    aria-label="Mobile number"
                    [value]="mobile()"
                    (input)="mobile.set($any($event.target).value)"
                    (keydown.enter)="sendOtp()"
                  />
                  <button
                    ar-button
                    type="button"
                    variant="primary"
                    [disabled]="busy()"
                    (click)="sendOtp()"
                  >
                    Send code
                  </button>
                </div>
              }
            }
            <div class="row">
              @if (inline(step)) {
                @if (isOpen(step)) {
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy()"
                    (click)="closeStep(step)"
                  >
                    Close
                  </button>
                } @else {
                  <button
                    ar-button
                    type="button"
                    variant="primary"
                    icon="link"
                    [disabled]="busy()"
                    (click)="openStep(step)"
                  >
                    Go and do it
                  </button>
                }
              } @else if (
                step.route && !isVerifyStep(step) && !isFundStep(step) && !isTeamStep(step)
              ) {
                <a ar-button variant="primary" icon="link" [routerLink]="step.route"
                  >Go and do it</a
                >
              }
              @if (!isVerifyStep(step)) {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  icon="check"
                  [disabled]="busy()"
                  (click)="markDone(step)"
                >
                  I’ve done this
                </button>
              }
            </div>
          }

          @if (isConsentStep(step)) {
            <ar-onboarding-consent-rules
              [acceptance]="checklist().consentRules"
              (accepted)="advance()"
            />
          }

          @if (isFundStep(step)) {
            <ar-onboarding-add-funds (funded)="onFunded(step)" />
          }

          @if (isTeamStep(step)) {
            <ar-onboarding-invite-team (invited)="onInvited()" />
          }

          @if (isOpen(step)) {
            <ar-onboarding-step-panel [step]="step.step" (closed)="closeStep(step)" />
          }

          <footer class="card__foot">
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="current() === 0"
              (click)="go(-1)"
            >
              ← Back
            </button>
            <span class="dots" aria-hidden="true">
              @for (x of checklist().items; track x.step; let i = $index) {
                <span
                  class="dot"
                  [class.dot--on]="i === current()"
                  [class.dot--done]="x.done"
                ></span>
              }
            </span>
            @if (current() < checklist().totalCount - 1) {
              <button ar-button type="button" variant="ghost" (click)="go(1)">
                {{ step.done ? 'Next' : 'Skip for now' }} →
              </button>
            } @else if (checklist().isComplete) {
              <button ar-button type="button" variant="ghost" (click)="summary.set(true)">
                Finish
              </button>
            } @else {
              <button ar-button type="button" variant="ghost" (click)="advance()">
                Back to what's left →
              </button>
            }
          </footer>
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .ob {
      flex: 1;
      min-height: 0;
      padding: 20px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-width: 920px;
    }
    /* A step's screen is open under its card: give it the room it has on its own page. */
    .ob--wide {
      max-width: 1240px;
    }

    /* The rail */
    .rail {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 16px 14px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .rail__list {
      display: flex;
      margin: 0;
      padding: 2px 0 4px;
      list-style: none;
      overflow-x: auto;
    }
    .rail__step {
      position: relative;
      flex: 1 0 84px;
      display: flex;
      justify-content: center;
    }
    /* The line on to the next step. */
    .rail__step:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 15px;
      left: calc(50% + 19px);
      right: calc(-50% + 19px);
      height: 2px;
      border-radius: 1px;
      background: var(--ar-line-200);
    }
    .rail__step--done:not(:last-child)::after {
      background: var(--ar-green-500);
    }
    .rail__btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      max-width: 96px;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      text-align: center;
    }
    .rail__dot {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      border: 2px solid var(--ar-line-300);
      background: var(--ar-white);
      color: var(--ar-ink-500);
      font: 600 12px var(--ar-font-sans);
      transition:
        transform var(--ar-ease),
        box-shadow var(--ar-ease);
    }
    .rail__label {
      font: 500 11px/1.3 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .rail__step--done .rail__dot {
      border-color: var(--ar-green-500);
      background: var(--ar-green-500);
      color: #fff;
    }
    .rail__step--on .rail__dot {
      border-color: var(--ar-primary);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--ar-primary) 18%, transparent);
      transform: scale(1.08);
    }
    .rail__step--on:not(.rail__step--done) .rail__dot {
      background: var(--ar-primary);
      color: #fff;
    }
    .rail__step--on .rail__label {
      color: var(--ar-ink-900);
      font-weight: 600;
    }
    .rail__btn:focus-visible .rail__dot {
      box-shadow: var(--ar-focus-ring);
    }
    .prog {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .prog ar-meter {
      flex: 1;
    }
    .prog__n {
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }

    /* The step on show */
    .card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 22px 24px 16px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-top: 3px solid var(--ar-primary);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      animation: card-in 0.2s ease-out;
    }
    .card--done {
      border-top-color: var(--ar-green-500);
    }
    @keyframes card-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
    .card__k {
      margin: 0;
      font: 600 10.5px var(--ar-font-sans);
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--ar-ink-400);
    }
    .card__head {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .card__t {
      margin: 0;
      font: 600 18px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .card__d {
      margin: 0;
      max-width: 640px;
      font: 400 13.5px/1.6 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .otp {
      width: 180px;
    }
    .card__foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 10px;
      padding-top: 12px;
      border-top: 1px solid var(--ar-line-200);
    }
    .dots {
      display: flex;
      gap: 5px;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--ar-line-300);
      transition: width var(--ar-ease);
    }
    .dot--done {
      background: var(--ar-green-500);
    }
    .dot--on {
      width: 18px;
      border-radius: 4px;
      background: var(--ar-primary);
    }

    .done {
      background: var(--ar-teal-100);
      border-radius: var(--ar-radius-card);
      padding: 22px 24px;
    }
    .done__t {
      margin: 0;
      font: 600 16px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .done__p {
      margin: 6px 0 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
  `,
})
export class ArOnboardingWizard {
  private readonly toasts = inject(ToastService);
  private readonly account = inject(AccountRecoveryService);
  protected readonly store = inject(OnboardingStore);
  private readonly destroyRef = inject(DestroyRef);

  /** The address the confirmation link went to, once sent. */
  protected readonly emailSentTo = signal<string | null>(null);

  protected readonly checklist = this.store.checklist;
  protected readonly progress = this.store.progress;

  protected readonly mobile = signal('');
  protected readonly otpSent = signal(false);
  protected readonly otpCode = signal('');
  protected readonly busy = signal(false);
  protected readonly resendCountdown = signal(0);
  private resendTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly nextStep = computed(() => this.checklist().nextStep);

  /** The step on show: the next one to do on arrival, then wherever the person goes. */
  protected readonly current = signal(0);
  protected readonly item = computed(() => this.checklist().items[this.current()] ?? null);
  /** The "You're set up" summary, shown once everything is done until a step is picked. */
  protected readonly summary = signal(false);
  private placed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.resendTimer) {
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
    });

    // Open on the first step not yet done, once the checklist has loaded.
    effect(() => {
      const items = this.checklist().items;
      if (this.placed || items.length === 0) return;
      this.placed = true;
      const next = items.findIndex((i) => !i.done);
      untracked(() => {
        this.current.set(next < 0 ? 0 : next);
        this.summary.set(next < 0);
      });
    });
  }

  /** The step whose screen is open under its card, if any. */
  protected readonly openStepId = signal<OnboardingChecklistStep | null>(null);

  protected inline(item: ChecklistItem): boolean {
    return opensInline(item.step);
  }

  protected isOpen(item: ChecklistItem): boolean {
    return this.openStepId() === item.step;
  }

  protected openStep(item: ChecklistItem): void {
    this.openStepId.set(item.step);
  }

  /**
   * The step's screen closed: read the checklist again, since saving the profile, connecting a number and the rest
   * tick their step on the server, and move on when this one is now done.
   */
  protected async closeStep(item: ChecklistItem): Promise<void> {
    if (this.openStepId() !== item.step) return;
    this.openStepId.set(null);
    try {
      await this.store.reread();
    } catch {
      return; // The card still offers "I've done this".
    }
    const now = this.checklist().items.find((i) => i.step === item.step);
    if (now?.done && this.item()?.step === item.step) this.advance();
  }

  protected isNext(item: ChecklistItem): boolean {
    return !item.done && item.step === this.nextStep();
  }

  protected isEmailStep(item: ChecklistItem): boolean {
    return item.step === OnboardingChecklistStep.VerifyEmail;
  }

  /**
   * Steps proven by a flow on the card (email link, mobile code, accepting the consent rules), never ticked by hand
   * and with no other screen to go to.
   */
  protected isVerifyStep(item: ChecklistItem): boolean {
    return this.isEmailStep(item) || this.isMobileStep(item) || this.isConsentStep(item);
  }

  /**
   * "Add funds": the balance and a top-up on the card itself. A top-up ticks the step on the server; "I've done
   * this" stays for a wallet funded before that, or by the platform team.
   */
  protected isFundStep(item: ChecklistItem): boolean {
    return item.step === OnboardingChecklistStep.FundWallet;
  }

  /** The wallet was credited from the card: pick up the step the server ticked, and move on. */
  protected async onFunded(item: ChecklistItem): Promise<void> {
    try {
      await this.store.reread();
    } catch {
      return;
    }
    const now = this.checklist().items.find((i) => i.step === item.step);
    if (now?.done && this.item()?.step === item.step) this.advance();
  }

  /**
   * "Invite your team": who is in, an invite form and the invitations waiting, on the card itself. The first
   * invitation ticks the step on the server; "I've done this" stays for a team invited before that.
   */
  protected isTeamStep(item: ChecklistItem): boolean {
    return item.step === OnboardingChecklistStep.InviteTeam;
  }

  /**
   * An invitation went out: pick up the step the server ticked. No moving on — someone inviting their team usually
   * sends several, and this is the last step anyway.
   */
  protected async onInvited(): Promise<void> {
    try {
      await this.store.reread();
    } catch {
      // The card still offers "I've done this".
    }
  }

  /** "Review the consent rules": the rules and a named acceptance, on the card itself. */
  protected isConsentStep(item: ChecklistItem): boolean {
    return item.step === OnboardingChecklistStep.ReviewConsentPolicy;
  }

  protected async sendEmailLink(): Promise<void> {
    this.busy.set(true);
    try {
      const status = await firstValueFrom(this.account.getMyEmailStatus());
      if (status.emailConfirmed) {
        // Already confirmed (e.g. in another tab): the checklist just hasn't caught up.
        await this.recheckEmail();
        return;
      }
      if (!status.email) {
        this.toasts.warning(
          'Your account has no email address. Add one on your profile first.',
          'Verification',
        );
        return;
      }
      await firstValueFrom(this.account.sendMyEmailConfirmation());
      this.emailSentTo.set(status.email);
    } catch (e: unknown) {
      const throttled = (e as { status?: number })?.status === 429;
      this.toasts.error(
        throttled
          ? 'A link was sent a moment ago. Wait a few minutes before asking for another.'
          : errorMessage(e, 'The confirmation link could not be sent.'),
        'Verification',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async recheckEmail(): Promise<void> {
    this.busy.set(true);
    try {
      await this.store.refresh();
      const email = this.checklist().items.find(
        (i) => i.step === OnboardingChecklistStep.VerifyEmail,
      );
      if (email?.done) {
        this.emailSentTo.set(null);
        this.toasts.success('Your email address is confirmed.', 'Verification');
        this.advance();
      } else {
        this.toasts.info(
          'Not confirmed yet. Open the link in the email, then try again.',
          'Verification',
        );
      }
    } catch (e: unknown) {
      this.toasts.error(errorMessage(e, 'The checklist could not be refreshed.'), 'Verification');
    } finally {
      this.busy.set(false);
    }
  }

  protected isMobileStep(item: ChecklistItem): boolean {
    return item.step === OnboardingChecklistStep.VerifyMobile;
  }

  protected show(index: number): void {
    // Leaving a step with its screen open folds it away (and picks up anything it saved).
    const open = this.checklist().items.find((i) => i.step === this.openStepId());
    if (open && this.checklist().items[index]?.step !== open.step) void this.closeStep(open);
    this.summary.set(false);
    this.current.set(index);
  }

  protected go(step: -1 | 1): void {
    const last = this.checklist().items.length - 1;
    this.show(Math.min(last, Math.max(0, this.current() + step)));
  }

  /** Marks the step done and moves on to the next one still to do. */
  protected async markDone(item: ChecklistItem): Promise<void> {
    this.busy.set(true);
    try {
      await this.store.markStep(item.step);
      this.advance();
    } catch (e: unknown) {
      this.toasts.error(errorMessage(e, 'That step could not be marked done.'));
    } finally {
      this.busy.set(false);
    }
  }

  /** The next step still to do after this one (or before it), or the summary when none is left. */
  protected advance(): void {
    const items = this.checklist().items;
    const from = this.current();
    const ahead = items.findIndex((i, idx) => idx > from && !i.done);
    const anywhere = items.findIndex((i) => !i.done);
    if (ahead >= 0) this.show(ahead);
    else if (anywhere >= 0) this.show(anywhere);
    else this.summary.set(true);
  }

  protected async sendOtp(isResend = false): Promise<void> {
    if (!this.mobile().trim()) {
      this.toasts.warning('Enter your mobile number with country code.', 'Verification');
      return;
    }
    this.busy.set(true);
    try {
      await this.store.startMobileVerification(this.mobile());
      this.otpSent.set(true);
      this.startResendTimer(30);
      if (isResend) {
        this.toasts.success('Verification code resent.', 'Verification');
      } else {
        this.toasts.info('Verification code sent to ' + this.mobile().trim() + '.', 'Verification');
      }
    } catch (e: unknown) {
      this.toasts.error(errorMessage(e, 'Could not send verification code.'), 'Verification');
    } finally {
      this.busy.set(false);
    }
  }

  protected async resendOtp(): Promise<void> {
    if (this.resendCountdown() > 0 || this.busy()) return;
    await this.sendOtp(true);
  }

  protected changeMobile(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
    this.resendCountdown.set(0);
    this.otpSent.set(false);
    this.otpCode.set('');
  }

  private startResendTimer(seconds = 30): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
    this.resendCountdown.set(seconds);
    this.resendTimer = setInterval(() => {
      const next = this.resendCountdown() - 1;
      if (next <= 0) {
        this.resendCountdown.set(0);
        if (this.resendTimer) {
          clearInterval(this.resendTimer);
          this.resendTimer = null;
        }
      } else {
        this.resendCountdown.set(next);
      }
    }, 1000);
  }

  protected async confirmOtp(): Promise<void> {
    if (!/^\d{4,6}$/.test(this.otpCode().trim())) {
      this.toasts.warning('Enter the code from WhatsApp.', 'Verification');
      return;
    }
    this.busy.set(true);
    try {
      await this.store.confirmMobile(this.otpCode());
      if (this.resendTimer) {
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
      this.resendCountdown.set(0);
      this.otpSent.set(false);
      this.otpCode.set('');
      this.toasts.success('Mobile number verified successfully.', 'Verification');
      this.advance();
    } catch {
      this.toasts.warning(
        'That code did not match. Request a new one and try again.',
        'Verification',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
