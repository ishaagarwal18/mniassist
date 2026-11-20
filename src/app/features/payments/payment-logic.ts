import { PaymentRequestStatus, type PaymentCheckoutDto } from '../../proxy/payments/payment.service';

export const PAYMENT_STATUS_LABEL: Record<PaymentRequestStatus, string> = {
  [PaymentRequestStatus.Pending]: 'Awaiting payment',
  [PaymentRequestStatus.Paid]: 'Paid',
  [PaymentRequestStatus.Failed]: 'Last attempt failed',
  [PaymentRequestStatus.Expired]: 'Link expired',
  [PaymentRequestStatus.Cancelled]: 'Cancelled',
};

/** ₹1,23,450.00 — rupees, Indian grouping, always two decimals. */
export function rupees(paise: number): string {
  return (
    '₹' +
    (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/**
 * Why an amount typed into the request dialog cannot be used, or null when it can. Mirrors the server's own bounds (₹1 to
 * ₹10 crore, whole paise) so the person is told before the round trip.
 */
export function amountProblem(text: string): string | null {
  const t = text.trim().replace(/,/g, '');
  if (!t) return 'Enter the amount.';
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return 'Enter an amount in rupees, with up to two decimals.';
  const value = Number(t);
  if (value < 1) return 'The amount must be at least ₹1.';
  if (value > 100_000_000) return 'The amount must be at most ₹10 crore.';
  return null;
}

/** A form that sends the browser to a hosted checkout (PayU's), built off-screen and submitted. */
export function postToCheckout(
  doc: Document,
  actionUrl: string,
  fields: Record<string, string>,
): HTMLFormElement {
  const form = doc.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.style.display = 'none';
  for (const [name, value] of Object.entries(fields)) {
    const input = doc.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  doc.body.appendChild(form);
  return form;
}

/** Razorpay Checkout's options for a customer paying a payment request. */
export function payRequestOptions(
  c: PaymentCheckoutDto,
  handler: (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void,
  onDismiss: () => void,
) {
  return {
    key: c.keyId,
    order_id: c.orderId,
    amount: c.amountInPaise,
    currency: c.currency || 'INR',
    name: c.payeeName,
    description: `${c.description} (${c.reference})`,
    notes: { reference: c.reference },
    theme: { color: '#0f766e' },
    handler,
    modal: { ondismiss: onDismiss },
  };
}
