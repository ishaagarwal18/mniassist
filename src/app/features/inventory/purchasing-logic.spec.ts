import { draftTotal, readLines } from './purchasing-logic';

const line = (quantity: string, cost: string) => ({
  productId: 'p1',
  partNumber: 'AF-2901',
  name: 'Air filter',
  quantity,
  cost,
});

describe('purchasing logic', () => {
  it('reads order lines in rupees as paise', () => {
    expect(readLines([line('10', '1,300')])).toEqual({
      lines: [{ productId: 'p1', quantity: 10, unitCostInPaise: 130000 }],
    });
    expect(readLines([line('2.5', '₹ 99.50')])).toEqual({
      lines: [{ productId: 'p1', quantity: 2.5, unitCostInPaise: 9950 }],
    });
  });

  it('says what is wrong with a line', () => {
    expect(readLines([])).toEqual({ error: 'Add at least one part.' });
    expect('error' in readLines([line('0', '10')])).toBe(true);
    expect('error' in readLines([line('5', 'ten')])).toBe(true);
  });

  it('adds up the lines as typed', () => {
    expect(draftTotal([line('10', '1300'), line('2', '50.5'), line('', '9')])).toBe(
      130000 * 10 + 10100,
    );
  });
});
