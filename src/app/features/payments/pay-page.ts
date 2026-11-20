import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  PaymentPublicService,
  PaymentRequestStatus,
  PublicPaymentDto,
} from '../../proxy/payments/payment.service';
import { loadRazorpay } from '../../core/services/platform-checkout';
import { apiMessage } from '../signing/signing-logic';
import { PAYMENT_STATUS_LABEL, payRequestOptions, rupees } from './payment-logic';

/**
 * The page a customer opens from the link sent in their conversation: who is asking, what for, how much — and a button that
 * opens Razorpay's payment window over the page, paying into the seller's own Razorpay account. No login and no app shell; the
 * link is all they hold. What the window hands back is checked by the server with Razorpay before the page says paid.
 */
@Component({
  selector: 'ar-pay-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="pay">
      @if (loading()) {
        <p class="pay__note">Loading…</p>
      } @else if (unavailable(); as why) {
        <p class="pay__note" role="alert">{{ why }}</p>
      } @else if (payment(); as p) {
        <section class="pay__card" [class.pay__card--paid]="p.status === Status.Paid">
          <p class="pay__payee">Payment to {{ p.payeeName }}</p>
          @if (p.testMode) {
            <p class="pay__test" role="note">
              Test mode: no real money moves. Pay with one of Razorpay's test cards or test UPI ids.
            </p>
          }
          <h1 class="pay__amount">{{ amount(p.amountInPaise) }}</h1>
          <p class="pay__desc">{{ p.description }}</p>
          <p class="pay__ref">
            Reference <span class="pay__mono">{{ p.reference }}</span>
          </p>

          @if (p.status === Status.Paid) {
            <p class="pay__done" role="status">Paid — thank you. You can close this page.</p>
          } @else if (checking()) {
            <p class="pay__note" role="status">Confirming your payment with the bank…</p>
          } @else if (p.canPay) {
            @if (p.status === Status.Failed) {
              <p class="pay__fail" role="alert">
                {{ p.failureReason || 'The last attempt did not go through.' }} You can try again.
              </p>
            }
            @if (error(); as e) {
              <p class="pay__fail" role="alert">{{ e }}</p>
            }
            <button type="button" class="pay__btn" [disabled]="busy()" (click)="pay()">
              {{ busy() ? 'Opening Razorpay…' : 'Pay ' + amount(p.amountInPaise) }}
            </button>
            <p class="pay__small">
              Pay securely through Razorpay by UPI, card, net banking or wallet.
            </p>
          } @else {
            <p class="pay__note" role="status">
              {{ label(p.status) }}. Please contact {{ p.payeeName }} if you still need to pay.
            </p>
          }
        </section>
      }
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: var(--ar-bg-100);
    }
    .pay {
      padding: 32px 16px 48px;
      font:
        400 15px/1.5 system-ui,
        -apple-system,
        'Segoe UI',
        Roboto,
        sans-serif;
      color: var(--ar-ink-900);
    }
    .pay__card {
      max-width: 440px;
      margin: 0 auto;
      padding: 28px 24px;
      background: #fff;
      border: 1px solid var(--ar-line-300);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      text-align: center;
    }
    .pay__card--paid {
      border-color: var(--ar-green-200);
      background: var(--ar-green-100);
    }
    .pay__payee {
      margin: 0;
      color: var(--ar-ink-500);
      font-size: 14px;
    }
    .pay__test {
      margin: 0;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--ar-amber-100);
      color: var(--ar-amber-700);
      font-size: 13px;
      font-weight: 500;
    }
    .pay__amount {
      margin: 0;
      font-size: 34px;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
    .pay__desc {
      margin: 0;
    }
    .pay__ref {
      margin: 0;
      font-size: 13px;
      color: var(--ar-ink-500);
    }
    .pay__mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .pay__btn {
      margin-top: 8px;
      padding: 13px 22px;
      font: 600 16px inherit;
      color: #fff;
      background: var(--ar-blue-600);
      border: 0;
      border-radius: 8px;
      cursor: pointer;
    }
    .pay__btn:focus-visible {
      outline: 2px solid var(--ar-blue-600);
      outline-offset: 3px;
    }
    .pay__btn[disabled] {
      opacity: 0.6;
      cursor: progress;
    }
    .pay__small {
      margin: 0;
      font-size: 12.5px;
      color: var(--ar-ink-500);
    }
    .pay__note {
      max-width: 440px;
      margin: 16px auto;
      color: var(--ar-ink-500);
      text-align: center;
    }
    .pay__done {
      margin: 8px 0 0;
      font-weight: 600;
      color: var(--ar-green-600);
    }
    .pay__fail {
      margin: 4px 0 0;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font-size: 14px;
    }
  `,
})
export class ArPayPage {
  private readonly api = inject(PaymentPublicService);
  private readonly route = inject(ActivatedRoute);
  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  protected readonly Status = PaymentRequestStatus;
  protected readonly payment = signal<PublicPaymentDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly unavailable = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly checking = signal(false);

  constructor() {
    void this.load();
  }

  protected amount = rupees;
  protected label = (s: PaymentRequestStatus) => PAYMENT_STATUS_LABEL[s];

  private async load(): Promise<void> {
    try {
      this.payment.set(await firstValueFrom(this.api.get(this.token)));
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      this.unavailable.set(
        status === 404
          ? 'This payment link is not valid.'
          : apiMessage(e, 'This page could not be loaded. Please try again.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected async pay(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const [checkout, Razorpay] = await Promise.all([
        firstValueFrom(this.api.checkout(this.token)),
        loadRazorpay(),
      ]);
      const window = new Razorpay(
        payRequestOptions(
          checkout,
          (r) => void this.complete(r),
          () => {
            // Closed without finishing: a payment may still have gone through, so ask once.
            this.busy.set(false);
            void this.refresh();
          },
        ),
      );
      window.on('payment.failed', () => void this.refresh());
      window.open();
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'The payment could not be started. Please try again.'));
      this.busy.set(false);
    }
  }

  private async complete(r: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }): Promise<void> {
    this.checking.set(true);
    try {
      this.payment.set(
        await firstValueFrom(
          this.api.complete(this.token, {
            razorpayPaymentId: r.razorpay_payment_id,
            razorpayOrderId: r.razorpay_order_id,
            razorpaySignature: r.razorpay_signature,
          }),
        ),
      );
      if (this.payment()?.status === PaymentRequestStatus.Pending) {
        // The bank has not settled it yet: look again a few times before saying anything.
        for (let i = 0; i < 5 && this.payment()?.status === PaymentRequestStatus.Pending; i++) {
          await new Promise((res) => setTimeout(res, 2000));
          await this.refresh();
        }
      }
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'Your payment could not be confirmed yet. Refresh this page in a minute.'));
    } finally {
      this.checking.set(false);
      this.busy.set(false);
    }
  }

  private async refresh(): Promise<void> {
    try {
      this.payment.set(await firstValueFrom(this.api.get(this.token)));
    } catch {
      /* keep what is shown */
    }
  }
}
