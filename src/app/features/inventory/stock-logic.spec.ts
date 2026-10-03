import { parseLots, parseMove, qty } from './stock-logic';

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

  it('takes one serial number per unit received, each once', () => {
    expect(parseLots('receive', 'Serial', 2, '1J9204\n1J9205', '')).toEqual({
      lots: [
        { number: '1J9204', quantity: 1 },
        { number: '1J9205', quantity: 1 },
      ],
    });
    expect('error' in parseLots('receive', 'Serial', 3, '1J9204, 1J9205', '')).toBe(true);
    expect('error' in parseLots('receive', 'Serial', 2, 'a\nA', '')).toBe(true);
    expect('error' in parseLots('receive', 'Serial', 1, '', '')).toBe(true);
  });

  it('lets an issue pick the oldest when no number is given, and needs one for a count', () => {
    expect(parseLots('issue', 'Serial', 1, '', '')).toEqual({ lots: null });
    expect('error' in parseLots('count', 'Batch', 4, '', '')).toBe(true);
    expect(parseLots('adjust', 'Batch', -2, 'B-7', '')).toEqual({
      lots: [{ number: 'B-7', quantity: 2, expiresOn: null }],
    });
  });

  it('keeps a batch expiry on receipt only, and ignores numbers for untracked parts', () => {
    expect(parseLots('receive', 'Batch', 10, 'B-2027', '2027-03-31')).toEqual({
      lots: [{ number: 'B-2027', quantity: 10, expiresOn: '2027-03-31' }],
    });
    expect('error' in parseLots('receive', 'Batch', 10, 'B1\nB2', '')).toBe(true);
    expect(parseLots('receive', 'None', 10, 'anything', '')).toEqual({ lots: null });
  });
});
