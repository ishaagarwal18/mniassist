import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  PaymentPublicService,
  PaymentRequestStatus,
  PublicPaymentDto,
} from '../../proxy/payments/payment.service';
import { apiMessage } from '../signing/signing-logic';
import { PAYMENT_STATUS_LABEL, postToCheckout, rupees } from './payment-logic';

/**
 * The page a customer opens from the link sent in their conversation: who is asking, what for, how much — and a button that
 * takes them to BillDesk to pay. No login and no app shell; the link is all they hold. After paying, BillDesk sends them back
 * here, and the page waits a little for BillDesk's own word before saying paid, since the browser coming back proves nothing.
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
              {{ busy() ? 'Opening BillDesk…' : 'Pay ' + amount(p.amountInPaise) }}
            </button>
            <p class="pay__small">
              You'll be taken to BillDesk's secure page to pay by UPI, card or net banking.
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
      background: #f3f5f8;
    }
    .pay {
      padding: 32px 16px 48px;
      font:
        400 15px/1.5 system-ui,
        -apple-system,
        'Segoe UI',
        Roboto,
        sans-serif;
      color: #16202e;
    }
    .pay__card {
      max-width: 440px;
      margin: 0 auto;
      padding: 28px 24px;
      background: #fff;
      border: 1px solid #c9d1dc;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      text-align: center;
    }
    .pay__card--paid {
      border-color: #9ccfae;
      background: #f3faf5;
    }
    .pay__payee {
      margin: 0;
      color: #5b6676;
      font-size: 14px;
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
      color: #5b6676;
    }
    .pay__mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .pay__btn {
      margin-top: 8px;
      padding: 13px 22px;
      font: 600 16px inherit;
      color: #fff;
      background: #0b6b63;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
    }
    .pay__btn:focus-visible {
      outline: 2px solid #0b6b63;
      outline-offset: 3px;
    }
    .pay__btn[disabled] {
      opacity: 0.6;
      cursor: progress;
    }
    .pay__small {
      margin: 0;
      font-size: 12.5px;
      color: #5b6676;
    }
    .pay__note {
      max-width: 440px;
      margin: 16px auto;
      color: #5b6676;
      text-align: center;
    }
    .pay__done {
      margin: 8px 0 0;
      font-weight: 600;
      color: #1d6b3a;
    }
    .pay__fail {
      margin: 4px 0 0;
      padding: 10px 12px;
      border-radius: 8px;
      background: #fdeceb;
      color: #b42318;
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
    void this.load(this.route.snapshot.queryParamMap.get('returned') === '1');
  }

  protected amount = rupees;
  protected label = (s: PaymentRequestStatus) => PAYMENT_STATUS_LABEL[s];

  private async load(returned: boolean): Promise<void> {
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

    // Back from BillDesk: its webhook may land a moment after the customer does, so look again a few times before saying anything.
    if (returned && this.payment()?.status === PaymentRequestStatus.Pending) {
      this.checking.set(true);
      for (let i = 0; i < 5 && this.payment()?.status === PaymentRequestStatus.Pending; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          this.payment.set(await firstValueFrom(this.api.get(this.token)));
        } catch {
          break;
        }
      }
      this.checking.set(false);
    }
  }

  protected async pay(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const checkout = await firstValueFrom(this.api.checkout(this.token));
      postToCheckout(document, checkout.actionUrl, checkout.fields).submit();
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'The payment could not be started. Please try again.'));
      this.busy.set(false);
    }
  }
}
