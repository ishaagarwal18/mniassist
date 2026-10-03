import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  PublicSignedInDto,
  ReorderPublicService,
} from '../../proxy/reorder/reorder-public.service';
import { apiMessage } from '../signing/signing-logic';
import { sessionKeyFor, writeSession } from './reorder-logic';

type Step = 'loading' | 'unavailable' | 'sign-in' | 'code';

/**
 * A workspace's password sign-in page for the spares re-order portal (/reorder/{code}). A customer the distributor knows signs in with
 * their WhatsApp number and password, or gets a code on WhatsApp to set one, and lands on the same page their personal link opens.
 */
@Component({
  selector: 'ar-reorder-sign-in',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="si">
      @switch (step()) {
        @case ('loading') {
          <p class="si__soft">Loading…</p>
        }
        @case ('unavailable') {
          <section class="si__card">
            <h1 class="si__title">This page isn't available</h1>
            <p class="si__soft">
              Ask your supplier on WhatsApp for your re-order link, or for the right sign-in
              address.
            </p>
          </section>
        }
        @case ('sign-in') {
          <section class="si__card">
            @if (heading()) {
              <p class="si__eyebrow">{{ heading() }}</p>
            }
            <h1 class="si__title">Sign in to re-order spares</h1>
            @if (intro()) {
              <p class="si__soft">{{ intro() }}</p>
            }
            <form class="si__form" (submit)="$event.preventDefault(); signIn()">
              <label for="si-phone">WhatsApp number</label>
              <input
                id="si-phone"
                inputmode="tel"
                autocomplete="tel"
                placeholder="98220 11000"
                [value]="phone()"
                (input)="phone.set($any($event.target).value)"
              />
              <label for="si-password">Password</label>
              <input
                id="si-password"
                type="password"
                autocomplete="current-password"
                [value]="password()"
                (input)="password.set($any($event.target).value)"
              />
              @if (problem(); as p) {
                <p class="si__bad" role="alert">{{ p }}</p>
              }
              <button
                type="submit"
                class="si__btn"
                [disabled]="busy() || !phone().trim() || !password()"
              >
                {{ busy() ? 'Signing in…' : 'Sign in' }}
              </button>
            </form>
            <button type="button" class="si__link" [disabled]="busy()" (click)="toCode()">
              First time, or forgot your password? Get a code on WhatsApp
            </button>
          </section>
        }
        @case ('code') {
          <section class="si__card">
            <h1 class="si__title">Set your password</h1>
            @if (!codeSent()) {
              <p class="si__soft">
                We'll send a code to your WhatsApp. Use the number your supplier knows you by.
              </p>
              <form class="si__form" (submit)="$event.preventDefault(); sendCode()">
                <label for="si-phone2">WhatsApp number</label>
                <input
                  id="si-phone2"
                  inputmode="tel"
                  autocomplete="tel"
                  [value]="phone()"
                  (input)="phone.set($any($event.target).value)"
                />
                @if (problem(); as p) {
                  <p class="si__bad" role="alert">{{ p }}</p>
                }
                <button type="submit" class="si__btn" [disabled]="busy() || !phone().trim()">
                  {{ busy() ? 'Sending…' : 'Send code' }}
                </button>
              </form>
            } @else {
              <p class="si__soft">{{ codeNote() }}</p>
              <form class="si__form" (submit)="$event.preventDefault(); setPassword()">
                <label for="si-code">Code from WhatsApp</label>
                <input
                  id="si-code"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="6"
                  [value]="code()"
                  (input)="code.set($any($event.target).value)"
                />
                <label for="si-new"
                  >New password
                  <span class="si__soft">(8 or more characters, a letter and a number)</span></label
                >
                <input
                  id="si-new"
                  type="password"
                  autocomplete="new-password"
                  [value]="password()"
                  (input)="password.set($any($event.target).value)"
                />
                @if (problem(); as p) {
                  <p class="si__bad" role="alert">{{ p }}</p>
                }
                <button
                  type="submit"
                  class="si__btn"
                  [disabled]="busy() || code().trim().length < 6 || password().length < 8"
                >
                  {{ busy() ? 'Saving…' : 'Set password and continue' }}
                </button>
              </form>
            }
            <button type="button" class="si__link" [disabled]="busy()" (click)="toSignIn()">
              Back to sign in
            </button>
          </section>
        }
      }
    </main>
  `,
  styles: `
    :host {
      --si-ink: var(--ar-ink-900);
      --si-soft: var(--ar-ink-500);
      --si-line: var(--ar-line-300);
      --si-card: var(--ar-white);
      --si-bg: var(--ar-bg-100);
      --si-accent: var(--ar-blue-600);
      --si-on-accent: #ffffff;
      --si-bad: var(--ar-red-600);
      display: block;
      min-height: 100%;
      background: var(--si-bg);
      color: var(--si-ink);
      font:
        400 15px/1.5 'IBM Plex Sans',
        system-ui,
        sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --si-ink: #e6edf5;
        --si-soft: #a6b4c5;
        --si-line: #1d3654;
        --si-card: #10263d;
        --si-bg: var(--ar-navy);
        --si-accent: #6ea2ff;
        --si-on-accent: var(--ar-navy);
        --si-bad: #ff8b7e;
      }
    }
    .si {
      max-width: 440px;
      margin: 0 auto;
      padding: 40px 16px;
    }
    .si__card {
      background: var(--si-card);
      border: 1px solid var(--si-line);
      border-radius: 12px;
      padding: 22px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .si__eyebrow {
      margin: 0;
      font:
        600 12px/1 'IBM Plex Mono',
        monospace;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--si-accent);
    }
    .si__title {
      margin: 0;
      font:
        700 24px/1.2 'IBM Plex Sans Condensed',
        'IBM Plex Sans',
        sans-serif;
    }
    .si__soft {
      margin: 0;
      color: var(--si-soft);
      font-size: 14px;
    }
    .si__form {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .si__form label {
      font-weight: 600;
      font-size: 13.5px;
      margin-top: 6px;
    }
    .si__form input {
      font: inherit;
      padding: 10px 12px;
      border: 1px solid var(--si-line);
      border-radius: 8px;
      background: var(--si-bg);
      color: var(--si-ink);
    }
    .si__btn {
      margin-top: 10px;
      font:
        600 15px 'IBM Plex Sans',
        sans-serif;
      padding: 12px;
      border: 0;
      border-radius: 8px;
      background: var(--si-accent);
      color: var(--si-on-accent);
      cursor: pointer;
    }
    .si__btn:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .si__link {
      border: 0;
      background: none;
      color: var(--si-accent);
      font:
        500 14px 'IBM Plex Sans',
        sans-serif;
      cursor: pointer;
      padding: 4px 0;
      text-align: left;
    }
    .si__bad {
      margin: 4px 0 0;
      color: var(--si-bad);
      font-weight: 500;
    }
    :focus-visible {
      outline: 2px solid var(--si-accent);
      outline-offset: 2px;
    }
  `,
})
export class ArReorderSignIn {
  private readonly api = inject(ReorderPublicService);
  private readonly router = inject(Router);
  private readonly code_ = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';

  protected readonly step = signal<Step>('loading');
  protected readonly heading = signal<string | null>(null);
  protected readonly intro = signal<string | null>(null);
  protected readonly phone = signal('');
  protected readonly password = signal('');
  protected readonly code = signal('');
  protected readonly codeSent = signal(false);
  protected readonly codeNote = signal('');
  protected readonly busy = signal(false);
  protected readonly problem = signal<string | null>(null);

  constructor() {
    void this.start();
  }

  private async start(): Promise<void> {
    try {
      const page = await firstValueFrom(this.api.openSignIn(this.code_));
      this.heading.set(page.heading ?? null);
      this.intro.set(page.intro ?? null);
      this.step.set('sign-in');
    } catch {
      this.step.set('unavailable');
    }
  }

  protected toCode(): void {
    this.problem.set(null);
    this.password.set('');
    this.codeSent.set(false);
    this.step.set('code');
  }

  protected toSignIn(): void {
    this.problem.set(null);
    this.password.set('');
    this.step.set('sign-in');
  }

  protected async signIn(): Promise<void> {
    await this.run(
      () => this.api.signIn(this.code_, this.phone().trim(), this.password()),
      "That number and password don't match. Try again, or get a code to set a new password.",
    );
  }

  protected async sendCode(): Promise<void> {
    this.busy.set(true);
    this.problem.set(null);
    try {
      const sent = await firstValueFrom(this.api.sendSignInCode(this.code_, this.phone().trim()));
      this.codeNote.set(`${sent.message} It works for ${sent.validForMinutes} minutes.`);
      this.codeSent.set(true);
    } catch (e: unknown) {
      this.problem.set(apiMessage(e, "The code couldn't be sent. Try again in a minute."));
    } finally {
      this.busy.set(false);
    }
  }

  protected async setPassword(): Promise<void> {
    await this.run(
      () =>
        this.api.setPasswordWithCode(
          this.code_,
          this.phone().trim(),
          this.code().replace(/\D/g, ''),
          this.password(),
        ),
      "That code isn't right or has expired. Get a new one.",
    );
  }

  /** Signs in (or sets a password) and opens the customer's page with the session already started. */
  private async run(
    call: () => ReturnType<ReorderPublicService['signIn']>,
    fallback: string,
  ): Promise<void> {
    this.busy.set(true);
    this.problem.set(null);
    try {
      const signedIn: PublicSignedInDto = await firstValueFrom(call());
      writeSession(sessionKeyFor(signedIn.token), signedIn.session);
      await this.router.navigate(['/r', signedIn.token]);
    } catch (e: unknown) {
      this.problem.set(apiMessage(e, fallback));
    } finally {
      this.busy.set(false);
    }
  }
}
