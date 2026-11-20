import { amountProblem, payRequestOptions, postToCheckout, rupees } from './payment-logic';

describe('payment helpers', () => {
  it('formats rupees with Indian grouping and two decimals', () => {
    expect(rupees(12345000)).toBe('₹1,23,450.00');
    expect(rupees(150)).toBe('₹1.50');
  });

  it('accepts a plain rupee amount within bounds and names what is wrong otherwise', () => {
    expect(amountProblem('1500')).toBeNull();
    expect(amountProblem('1,500.50')).toBeNull();
    expect(amountProblem('')).toContain('Enter');
    expect(amountProblem('12.345')).toContain('two decimals');
    expect(amountProblem('0.50')).toContain('at least');
    expect(amountProblem('200000000')).toContain('at most');
  });

  it('builds a hidden form posting each field to the checkout', () => {
    const form = postToCheckout(document, 'https://pay.example/checkout', {
      key: 'M1',
      txnid: 'T1',
      hash: 'x',
    });
    expect(form.method.toLowerCase()).toBe('post');
    expect(form.action).toBe('https://pay.example/checkout');
    expect(Array.from(form.querySelectorAll('input')).map((i) => `${i.name}=${i.value}`)).toEqual([
      'key=M1',
      'txnid=T1',
      'hash=x',
    ]);
    form.remove();
  });

  it('opens Razorpay on the order made for this attempt, with the seller named and the reference shown', () => {
    const handler = () => undefined;
    const o = payRequestOptions(
      {
        keyId: 'rzp_test_A',
        orderId: 'order_1',
        amountInPaise: 150000,
        currency: 'INR',
        payeeName: 'Vertex Drives',
        description: 'Advance',
        reference: 'PAY-2026-0001',
        testMode: true,
      },
      handler,
      () => undefined,
    );
    expect(o).toMatchObject({
      key: 'rzp_test_A',
      order_id: 'order_1',
      amount: 150000,
      name: 'Vertex Drives',
      description: 'Advance (PAY-2026-0001)',
    });
    expect(o.handler).toBe(handler);
  });
});
