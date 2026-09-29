import { parseMove, qty } from './stock-logic';

describe('stock logic', () => {
  it('reads each kind of move the way the API expects it', () => {
    expect(parseMove('receive', '12', '')).toEqual({ quantity: 12 });
    expect(parseMove('receive', '0', '')).toEqual({ error: 'Enter a quantity above zero.' });
    expect(parseMove('issue', '2.5', '')).toEqual({ quantity: 2.5 });
    expect(parseMove('adjust', '-2', 'Damaged')).toEqual({ quantity: -2 });
    expect('error' in parseMove('adjust', '-2', ' ')).toBe(true);
    expect('error' in parseMove('adjust', '0', 'x')).toBe(true);
    expect(parseMove('count', '0', '')).toEqual({ quantity: 0 });
    expect(parseMove('min', '', '')).toEqual({ quantity: null });
    expect(parseMove('receive', '1,250', '')).toEqual({ quantity: 1250 });
    expect('error' in parseMove('receive', '1.2345', '')).toBe(true);
    expect('error' in parseMove('count', 'ten', '')).toBe(true);
  });

  it('shows quantities plainly', () => {
    expect(qty(1250)).toBe('1,250');
    expect(qty(0.125)).toBe('0.125');
  });
});
