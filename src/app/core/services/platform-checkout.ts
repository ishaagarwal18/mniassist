import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { postToCheckout } from '../../features/payments/payment-logic';
import {
  PlatformCheckoutService,
  type CheckoutGatewayDto,
  type CheckoutStartDto,
} from '../../proxy/billing/platform-checkout.service';
import { ConfirmService } from '../ui/confirm.service';

/** Razorpay's checkout script; loaded only when someone pays with it. */
export const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

export type CheckoutOutcome = 'paid' | 'redirected' | 'dismissed' | 'failed';

/** What PayU's return leaves in the Billing URL: `?checkout=<id>&payment=paid|failed|unverified`. */
export function readCheckoutReturn(
  params: Record<string, string | undefined>,
): { checkoutId: string | null; outcome: 'paid' | 'failed' | 'unverified' } | null {
  const p = params['payment'];
  if (p !== 'paid' && p !== 'failed' && p !== 'unverified') return null;
  return { checkoutId: params['checkout'] ?? null, outcome: p };
}

/** Razorpay Checkout's options for a started checkout. */
export function razorpayOptions(
  start: CheckoutStartDto,
  handler: (r: RazorpayResponse) => void,
  onDismiss: () => void,
) {
  const r = start.razorpay!;
  return {
    key: r.keyId,
    order_id: r.orderId,
    amount: start.amountInPaise,
    currency: start.currency || 'INR',
    name: r.name,
    description: r.description,
    prefill: {
      name: r.prefillName ?? '',
      email: r.prefillEmail ?? '',
      contact: r.prefillContact ?? '',
    },
    theme: { color: '#0f766e' },
    handler,
    modal: { ondismiss: onDismiss },
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', cb: (e: unknown) => void): void;
}

type RazorpayCtor = new (options: ReturnType<typeof razorpayOptions>) => RazorpayInstance;

/**
 * Takes a workspace through paying the platform (M11-7): asks which gateway when more than
 * one is set up, then opens Razorpay's checkout over the page, or sends the browser to PayU
 * (which brings it back to /billing). The wallet or invoice is credited server-side once the
 * gateway's signature checks out.
 */
@Injectable({ providedIn: 'root' })
export class PlatformCheckoutRunner {
  private readonly api = inject(PlatformCheckoutService);
  private readonly dialogs = inject(ConfirmService);
  private scriptLoad: Promise<RazorpayCtor> | null = null;

  async gateways(): Promise<CheckoutGatewayDto[]> {
    try {
      return (await firstValueFrom(this.api.getGateways())).items ?? [];
    } catch {
      return [];
    }
  }

  /** The gateway to use: the only one, or the person's choice. Null when they cancel. */
  async choose(gateways: CheckoutGatewayDto[], title: string): Promise<string | null> {
    if (gateways.length === 1) return gateways[0].name;
    const answer = await this.dialogs.prompt({
      title,
      fields: [
        {
          key: 'gateway',
          label: 'Pay with',
          value: gateways[0].name,
          options: gateways.map((g) => ({ value: g.name, label: g.label })),
          required: true,
        },
      ],
      confirmText: 'Continue to payment',
    });
    return answer?.['gateway'] ?? null;
  }

  async pay(start: CheckoutStartDto): Promise<CheckoutOutcome> {
    if (start.payU) {
      postToCheckout(document, start.payU.actionUrl, start.payU.fields).submit();
      return 'redirected';
    }

    const Razorpay = await this.loadRazorpay();
    return new Promise<CheckoutOutcome>((resolve) => {
      let settled = false;
      const done = (o: CheckoutOutcome) => {
        if (!settled) {
          settled = true;
          resolve(o);
        }
      };
      const instance = new Razorpay(
        razorpayOptions(
          start,
          async (r) => {
            try {
              await firstValueFrom(
                this.api.completeRazorpay({
                  checkoutId: start.checkoutId,
                  razorpayPaymentId: r.razorpay_payment_id,
                  razorpayOrderId: r.razorpay_order_id,
                  razorpaySignature: r.razorpay_signature,
                }),
              );
              done('paid');
            } catch {
              done('failed');
            }
          },
          () => done('dismissed'),
        ),
      );
      instance.on('payment.failed', () => done('failed'));
      instance.open();
    });
  }

  private loadRazorpay(): Promise<RazorpayCtor> {
    const existing = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
    if (existing) return Promise.resolve(existing);
    this.scriptLoad ??= new Promise<RazorpayCtor>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = RAZORPAY_SCRIPT;
      s.async = true;
      s.onload = () => {
        const ctor = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
        if (ctor) resolve(ctor);
        else reject(new Error('Razorpay did not load.'));
      };
      s.onerror = () => {
        this.scriptLoad = null;
        reject(new Error('Razorpay could not be reached.'));
      };
      document.head.appendChild(s);
    });
    return this.scriptLoad;
  }
}
