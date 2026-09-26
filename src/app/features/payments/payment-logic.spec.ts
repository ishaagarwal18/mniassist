import { amountProblem, postToCheckout, rupees } from './payment-logic';

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
    const form = postToCheckout(document, 'https://pay.example/checkout', { mercid: 'M1', bdorderid: 'BD1', rdata: 'x' });
    expect(form.method.toLowerCase()).toBe('post');
    expect(form.action).toBe('https://pay.example/checkout');
    expect(Array.from(form.querySelectorAll('input')).map((i) => `${i.name}=${i.value}`)).toEqual(['mercid=M1', 'bdorderid=BD1', 'rdata=x']);
    form.remove();
  });
});
