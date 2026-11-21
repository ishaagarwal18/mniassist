import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { NewsletterPublicService } from '../../proxy/newsletter/newsletter.service';
import { ArCaptcha } from '../../ui/captcha';

/** Loose shape check before the API's own; the API decides. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The footer's newsletter box. Double opt-in: a successful submit only means "check your inbox", and the answer is
 * the same whether or not the address was already on the list. The consent line's wording is versioned on the API
 * (NewsletterSignupService.ConsentNoticeVersion): change both together.
 */
@Component({
  selector: 'ar-newsletter-signup',
  imports: [RouterLink, ArCaptcha],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nl">
      <div class="nl__copy">
        <h2 class="nl__title">Get the newsletter</h2>
        <p class="nl__sub">Product updates and ideas for selling on WhatsApp. Unsubscribe any time.</p>
      </div>

      @if (state() === 'done') {
        <p class="nl__done" role="status">
          <span class="nl__done-icon" aria-hidden="true">✓</span>
          <span><strong>Check your inbox.</strong> We've sent a link to confirm your subscription.</span>
        </p>
      } @else {
        <form class="nl__form" novalidate (submit)="$event.preventDefault(); submit()">
          <div class="nl__row">
            <label class="nl__sr" for="nl-email">Email address</label>
            <input
              id="nl-email"
              class="nl__input"
              type="email"
              autocomplete="email"
              inputmode="email"
              placeholder="you@company.com"
              maxlength="256"
              [value]="email()"
              [attr.aria-invalid]="!!error()"
              aria-describedby="nl-error"
              (input)="email.set($any($event.target).value); error.set(null)"
            />
            <button class="nl__btn" type="submit" [disabled]="state() === 'sending'">
              {{ state() === 'sending' ? 'Subscribing…' : 'Subscribe' }}
            </button>
          </div>
          <label class="nl__consent">
            <input type="checkbox" [checked]="consent()" (change)="consent.set($any($event.target).checked); error.set(null)" />
            <span>
              I agree to receive the MNI Assist newsletter by email. See our
              <a routerLink="/privacy">Privacy policy</a>.
            </span>
          </label>
          <ar-captcha #captcha (required)="captchaRequired.set($event)" (token)="captchaToken.set($event)" />
          <p class="nl__error" id="nl-error" role="alert">{{ error() }}</p>
        </form>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .nl {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
      gap: 24px 48px;
      align-items: center;
      padding: 28px 32px;
      border-radius: 24px;
      background: linear-gradient(135deg, rgba(23, 105, 255, 0.14), rgba(14, 165, 164, 0.1));
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .nl__title {
      margin: 0;
      font: 700 22px/1.2 var(--ar-font-sans);
      letter-spacing: -0.02em;
      color: #fff;
    }
    .nl__sub {
      margin: 6px 0 0;
      font-size: 14px;
      line-height: 1.6;
      color: #b4c0d6;
    }
    .nl__form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .nl__row {
      display: flex;
      gap: 8px;
      padding: 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.16);
      transition: border-color 200ms ease, box-shadow 200ms ease;
    }
    .nl__row:focus-within {
      border-color: #7fb0ff;
      box-shadow: 0 0 0 4px rgba(127, 176, 255, 0.18);
    }
    .nl__input {
      flex: 1;
      min-width: 0;
      padding: 0 14px;
      border: 0;
      outline: none;
      background: none;
      font: 400 15px var(--ar-font-sans);
      color: #fff;
    }
    .nl__input::placeholder {
      color: #7d8aa3;
    }
    .nl__btn {
      flex: none;
      height: 44px;
      padding: 0 22px;
      border: 0;
      border-radius: 999px;
      background: #fff;
      color: #070d1c;
      font: 600 14.5px var(--ar-font-sans);
      cursor: pointer;
      transition: transform 200ms ease, box-shadow 200ms ease;
    }
    .nl__btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px -10px rgba(127, 176, 255, 0.8);
    }
    .nl__btn:disabled {
      opacity: 0.7;
      cursor: progress;
    }
    .nl__btn:focus-visible {
      outline: 2px solid #7fb0ff;
      outline-offset: 3px;
    }
    .nl__consent {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 0 6px;
      font-size: 13px;
      line-height: 1.5;
      color: #98a6bf;
      cursor: pointer;
    }
    .nl__consent input {
      flex: none;
      margin-top: 2px;
      width: 16px;
      height: 16px;
      accent-color: #1769ff;
    }
    .nl__consent a {
      color: #cfe0ff;
    }
    .nl__error {
      margin: 0;
      min-height: 0;
      padding: 0 6px;
      font: 500 13px var(--ar-font-sans);
      color: #fda29b;
    }
    .nl__error:empty {
      display: none;
    }
    .nl__done {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      padding: 16px 18px;
      border-radius: 16px;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.3);
      font-size: 14.5px;
      line-height: 1.5;
      color: #d1fadf;
    }
    .nl__done strong {
      color: #fff;
    }
    .nl__done-icon {
      flex: none;
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #22c55e;
      color: #04210f;
      font-weight: 700;
    }
    .nl__sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    @media (max-width: 860px) {
      .nl {
        grid-template-columns: 1fr;
        padding: 24px 20px;
      }
    }
    @media (max-width: 420px) {
      .nl__row {
        flex-direction: column;
        border-radius: 18px;
      }
      .nl__input {
        height: 44px;
      }
    }
  `,
})
export class ArNewsletterSignup {
  private readonly api = inject(NewsletterPublicService);
  private readonly captcha = viewChild<ArCaptcha>('captcha');

  protected readonly email = signal('');
  protected readonly consent = signal(false);
  protected readonly captchaRequired = signal(false);
  protected readonly captchaToken = signal<string | null>(null);
  protected readonly state = signal<'idle' | 'sending' | 'done'>('idle');
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    const email = this.email().trim();
    if (!EMAIL.test(email)) {
      this.error.set('Enter a valid email address, like name@company.com.');
      return;
    }
    if (!this.consent()) {
      this.error.set('Tick the box to agree to receive the newsletter.');
      return;
    }
    if (this.captchaRequired() && !this.captchaToken()) {
      this.error.set('Complete the check above.');
      return;
    }

    this.state.set('sending');
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.subscribe(
          { email, consent: true, captchaToken: this.captchaToken() },
          { skipHandleError: true },
        ),
      );
      this.state.set('done');
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'That did not work. Try again in a moment.'));
      this.state.set('idle');
      this.captcha()?.reset();
      this.captchaToken.set(null);
    }
  }
}
