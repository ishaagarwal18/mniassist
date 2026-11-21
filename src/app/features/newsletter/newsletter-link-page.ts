import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { ArBrand } from '../../layout/brand';
import { NewsletterPublicService } from '../../proxy/newsletter/newsletter.service';

type Mode = 'confirm' | 'unsubscribe';

/**
 * Where the newsletter's email links land: /newsletter/confirm?token=… and /newsletter/unsubscribe?token=….
 * The page posts the token itself; a plain GET never changes anything, because mail scanners open every link
 * in an email before the person does.
 */
@Component({
  selector: 'ar-newsletter-link-page',
  imports: [RouterLink, ArBrand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nlp">
      <header class="nlp__head">
        <ar-brand />
      </header>
      <main class="nlp__card" aria-live="polite">
        @switch (state()) {
          @case ('working') {
            <span class="nlp__icon nlp__icon--wait" aria-hidden="true"></span>
            <h1>{{ mode === 'confirm' ? 'Confirming your subscription…' : 'Unsubscribing…' }}</h1>
          }
          @case ('done') {
            <span class="nlp__icon nlp__icon--ok" aria-hidden="true">✓</span>
            @if (mode === 'confirm') {
              <h1>You're subscribed</h1>
              <p>
                <strong translate="no">{{ email() }}</strong> will receive the MNI Assist newsletter. Every
                issue has an unsubscribe link at the bottom.
              </p>
            } @else {
              <h1>You're unsubscribed</h1>
              <p>
                <strong translate="no">{{ email() }}</strong> won't receive the MNI Assist newsletter any more.
                Changed your mind? Sign up again at the bottom of our home page.
              </p>
            }
            <a class="nlp__btn" routerLink="/">Go to mniassist.com</a>
          }
          @case ('error') {
            <span class="nlp__icon nlp__icon--bad" aria-hidden="true">!</span>
            <h1>{{ mode === 'confirm' ? 'We couldn’t confirm that' : 'We couldn’t unsubscribe you' }}</h1>
            <p>{{ error() }}</p>
            <a class="nlp__btn" routerLink="/">Back to the home page</a>
          }
        }
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background:
        radial-gradient(ellipse 70% 50% at 50% 0%, rgba(235, 242, 255, 0.9), transparent 70%),
        #f8fafc;
      font-family: var(--ar-font-sans);
      color: #0b1220;
    }
    .nlp {
      max-width: 560px;
      margin: 0 auto;
      padding: 32px 20px 64px;
    }
    .nlp__head {
      display: flex;
      justify-content: center;
      margin-bottom: 40px;
    }
    .nlp__card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      padding: 40px 32px;
      border-radius: 24px;
      background: #fff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 30px 60px -36px rgba(15, 23, 42, 0.35);
      text-align: center;
    }
    h1 {
      margin: 0;
      font: 700 26px/1.2 var(--ar-font-sans);
      letter-spacing: -0.02em;
    }
    p {
      margin: 0;
      max-width: 42ch;
      font-size: 15px;
      line-height: 1.65;
      color: #475467;
    }
    .nlp__icon {
      width: 56px;
      height: 56px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      font: 700 24px var(--ar-font-sans);
      color: #fff;
    }
    .nlp__icon--ok {
      background: linear-gradient(135deg, #22c55e, #0ea5a4);
    }
    .nlp__icon--bad {
      background: #f04438;
    }
    .nlp__icon--wait {
      border: 4px solid #dbe6ff;
      border-top-color: #1769ff;
      animation: nlp-spin 0.9s linear infinite;
    }
    @keyframes nlp-spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .nlp__icon--wait {
        animation: none;
      }
    }
    .nlp__btn {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      height: 46px;
      padding: 0 22px;
      border-radius: 999px;
      background: #1769ff;
      color: #fff;
      font: 600 14.5px var(--ar-font-sans);
      text-decoration: none;
    }
    .nlp__btn:hover {
      background: #1258e0;
    }
  `,
})
export class ArNewsletterLinkPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(NewsletterPublicService);

  protected readonly mode: Mode = this.route.snapshot.data['mode'] === 'unsubscribe' ? 'unsubscribe' : 'confirm';
  protected readonly state = signal<'working' | 'done' | 'error'>('working');
  protected readonly email = signal('');
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    if (!token) {
      this.fail('This link is missing its code. Open it again from the email, or copy the whole link.');
      return;
    }

    try {
      const call = this.mode === 'confirm' ? this.api.confirm(token, { skipHandleError: true }) : this.api.unsubscribe(token, { skipHandleError: true });
      const result = await firstValueFrom(call);
      this.email.set(result.email);
      this.state.set('done');
    } catch (e: unknown) {
      this.fail(readApiError(e, 'Something went wrong. Try the link again in a moment.'));
    }
  }

  private fail(message: string): void {
    this.error.set(message);
    this.state.set('error');
  }
}
