import { razorpayOptions, readCheckoutReturn } from './platform-checkout';

describe('platform checkout', () => {
  it('reads what PayU leaves in the Billing URL', () => {
    expect(readCheckoutReturn({ payment: 'paid', checkout: 'abc' })).toEqual({
      checkoutId: 'abc',
      outcome: 'paid',
    });
    expect(readCheckoutReturn({ payment: 'unverified' })).toEqual({
      checkoutId: null,
      outcome: 'unverified',
    });
    expect(readCheckoutReturn({ payment: 'maybe' })).toBeNull();
    expect(readCheckoutReturn({})).toBeNull();
  });

  it('opens Razorpay on the server-made order, in rupees', () => {
    const o = razorpayOptions(
      {
        checkoutId: 'c1',
        gateway: 'Razorpay',
        amountInPaise: 500000,
        currency: 'INR',
        razorpay: {
          keyId: 'rzp_live_x',
          orderId: 'order_1',
          name: 'MNI Assist',
          description: 'MNI Assist wallet top-up',
          prefillEmail: 'a@b.c',
        },
      },
      () => undefined,
      () => undefined,
    );
    expect(o).toMatchObject({
      key: 'rzp_live_x',
      order_id: 'order_1',
      amount: 500000,
      currency: 'INR',
      prefill: { email: 'a@b.c', name: '', contact: '' },
    });
  });
});
