import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ChecklistItem, OnboardingStore } from '../../core/services/onboarding.store';
import { OnboardingChecklistStep } from '../../proxy/identity/onboarding-checklist-step.enum';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArMeter } from '../../ui';

/**
 * Get started (M07-1). The nine things a new tenant does before the product is
 * useful, in the order they usually make sense, with the next one called out.
 *
 * It is a checklist, not a gate: someone who connected a number during signup sees
 * that step already done rather than being marched through embedded signup again.
 * Mobile verification is the one step handled inline — the OTP round-trip is short
 * enough that bouncing to another screen for it would be the slower path.
 */
@Component({
  selector: 'ar-onboarding-wizard',
  imports: [RouterLink, ArTopbar, ArButton, ArChip, ArMeter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Get started"
      [subtitle]="checklist().completedCount + ' of ' + checklist().totalCount + ' done'"
      help="A running checklist, not a gate — steps you've already finished show as done automatically. Dismissing it just hides the checklist; nothing here is lost."
    >
      @if (!checklist().isComplete) {
        <button ar-button type="button" variant="ghost" (click)="store.dismiss()">Dismiss</button>
      }
    </ar-topbar>

    <div class="ob ar-scroll">
      @if (checklist().isComplete) {
        <section class="done">
          <h2 class="done__t">You’re set up.</h2>
          <p class="done__p">
            Every step is complete. This page stays here if you want to revisit anything.
          </p>
        </section>
      } @else {
        <div class="prog">
          <ar-meter [value]="progress()" tone="teal" label="Onboarding checklist progress" />
          <span class="prog__n ar-mono">{{ progress() }}%</span>
        </div>
      }

      <ol class="steps">
        @for (item of checklist().items; track item.step; let i = $index) {
          <li class="step" [class.step--done]="item.done" [class.step--next]="isNext(item)">
            <span class="step__mark" aria-hidden="true">
              {{ item.done ? '✓' : i + 1 }}
            </span>
            <div class="step__body">
              <div class="step__headrow">
                <h3 class="step__t">{{ item.label }}</h3>
                @if (isNext(item)) {
                  <ar-chip tone="amber">Next</ar-chip>
                }
                @if (item.done) {
                  <ar-chip tone="neutral">Done</ar-chip>
                }
              </div>
              <p class="step__d">{{ item.description }}</p>

              @if (!item.done) {
                @if (isMobileStep(item)) {
                  <div class="otp">
                    @if (otpSent()) {
                      <input
                        class="otp__in ar-mono"
                        inputmode="numeric"
                        maxlength="6"
                        placeholder="6-digit code"
                        aria-label="6-digit verification code"
                        [value]="otpCode()"
                        (input)="otpCode.set($any($event.target).value)"
                      />
                      <button
                        ar-button
                        type="button"
                        variant="primary"
                        [disabled]="busy()"
                        (click)="confirmOtp()"
                      >
                        Confirm
                      </button>
                    } @else {
                      <input
                        class="otp__in"
                        type="tel"
                        placeholder="+91 …"
                        aria-label="Mobile number"
                        [value]="mobile()"
                        (input)="mobile.set($any($event.target).value)"
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
                    }
                  </div>
                } @else if (item.route) {
                  <a class="step__open" [routerLink]="item.route">Open →</a>
                }
                <button ar-button type="button" variant="ghost" (click)="store.markStep(item.step)">
                  Mark done
                </button>
              }
            </div>
          </li>
        }
      </ol>
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
      max-width: 780px;
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

    .steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .step {
      display: flex;
      gap: 14px;
      padding: 16px 18px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .step--next {
      border-color: var(--ar-blue-500);
      box-shadow: 0 0 0 1px var(--ar-blue-500) inset;
    }
    /* No opacity dimming here: composited over --ar-ink-500's already-modest
       5.84:1 headroom, 0.7 opacity dropped .step__d's text to ~3.0:1 — below
       WCAG AA. The teal-tinted mark and the "Done" chip already signal
       completion; opacity added no information, only a contrast failure. */
    .step__mark {
      width: 26px;
      height: 26px;
      flex: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ar-line-200);
      color: var(--ar-ink-500);
      font: 600 12px var(--ar-font-sans);
    }
    .step--done .step__mark {
      background: var(--ar-teal-100);
      color: var(--ar-teal-600);
    }
    .step--next .step__mark {
      background: var(--ar-primary);
      color: #fff;
    }
    .step__body {
      flex: 1;
    }
    .step__headrow {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .step__t {
      margin: 0;
      font: 600 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .step__d {
      margin: 4px 0 0;
      font: 400 12.5px/1.55 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }

    .otp,
    .step__open,
    .step__body > button {
      margin-top: 10px;
    }
    .step__open {
      display: inline-block;
      margin-right: 12px;
      text-decoration: none;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-blue-600);
    }
    .step__open:hover {
      text-decoration: underline;
    }
    .otp {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .otp__in {
      height: 34px;
      padding: 0 10px;
      font: 400 13px var(--ar-font-sans);
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      width: 160px;
    }
  `,
})
export class ArOnboardingWizard {
  protected readonly store = inject(OnboardingStore);

  protected readonly checklist = this.store.checklist;
  protected readonly progress = this.store.progress;

  protected readonly mobile = signal('');
  protected readonly otpSent = signal(false);
  protected readonly otpCode = signal('');
  protected readonly busy = signal(false);

  protected readonly nextStep = computed(() => this.checklist().nextStep);

  protected isNext(item: ChecklistItem): boolean {
    return !item.done && item.step === this.nextStep();
  }

  protected isMobileStep(item: ChecklistItem): boolean {
    return item.step === OnboardingChecklistStep.VerifyMobile;
  }

  protected async sendOtp(): Promise<void> {
    if (!this.mobile().trim()) return;
    this.busy.set(true);
    try {
      await this.store.startMobileVerification(this.mobile());
      this.otpSent.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  protected async confirmOtp(): Promise<void> {
    if (!/^\d{4,6}$/.test(this.otpCode().trim())) {
      window.alert('Enter the code from the SMS.');
      return;
    }
    this.busy.set(true);
    try {
      await this.store.confirmMobile(this.otpCode());
      this.otpSent.set(false);
      this.otpCode.set('');
    } catch {
      window.alert('That code did not match. Request a new one and try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
