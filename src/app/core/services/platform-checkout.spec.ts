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
    expect(o).not.toHaveProperty('recurring');
  });

  it('asks Razorpay to save the card when the top-up sets up automatic top-ups', () => {
    const o = razorpayOptions(
      {
        checkoutId: 'c2',
        gateway: 'Razorpay',
        amountInPaise: 100000,
        currency: 'INR',
        razorpay: {
          keyId: 'rzp_test_x',
          orderId: 'order_2',
          name: 'MNI Assist',
          description: 'Wallet top-up, saving the card',
          customerId: 'cust_1',
          recurring: true,
        },
      },
      () => undefined,
      () => undefined,
    );
    expect(o).toMatchObject({ customer_id: 'cust_1', recurring: '1', order_id: 'order_2' });
  });
});
