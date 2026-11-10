import { describe, expect, it } from 'vitest';

import {
  blankChallanLine,
  challanLineFromProduct,
  editChallanLine,
  toChallanLines,
  unitsFor,
} from './new-delivery-challan.logic';

describe('new delivery challan', () => {
  it('fills a line from a catalogue item, with its unit, keeping the quantity', () => {
    const line = challanLineFromProduct(
      {
        id: 'p1',
        partNumber: 'FLG-80',
        name: 'Flange 80 NB',
        description: null,
        hsnCode: '7307',
        unit: 'Pcs',
      },
      { ...blankChallanLine(), quantity: 12 },
    );
    expect(line).toEqual({
      itemName: 'Flange 80 NB',
      partNumber: 'FLG-80',
      description: 'Flange 80 NB',
      hsnCode: '7307',
      quantity: 12,
      unitOfMeasure: 'Pcs',
      productId: 'p1',
    });
    const units = ['Nos', 'Set', 'Kg'];
    expect(unitsFor(line, units)).toContain('Pcs');
    expect(unitsFor(blankChallanLine(), units)).not.toContain('Pcs');
    expect(unitsFor(blankChallanLine(), units)).toEqual(units);
  });

  it('keeps the unit typed when the catalogue has none, and unlinks a retyped item', () => {
    const line = challanLineFromProduct(
      { id: 'p2', partNumber: 'X', name: 'X' },
      { ...blankChallanLine(), unitOfMeasure: 'Kg' },
    );
    expect(line.unitOfMeasure).toBe('Kg');
    expect(editChallanLine(line, { quantity: 3 }).productId).toBe('p2');
    expect(editChallanLine(line, { itemName: 'Y' }).productId).toBeNull();
  });

  it('sends only filled lines, borrowing a missing number or description', () => {
    expect(
      toChallanLines([
        { ...blankChallanLine(), itemName: 'Flange machining' },
        { ...blankChallanLine(), partNumber: ' P-1 ', quantity: 2 },
        blankChallanLine(),
      ]),
    ).toEqual([
      {
        productId: undefined,
        partNumber: 'Flange machining',
        description: 'Flange machining',
        hsnCode: undefined,
        quantity: 1,
        unitOfMeasure: 'Nos',
      },
      {
        productId: undefined,
        partNumber: 'P-1',
        description: 'P-1',
        hsnCode: undefined,
        quantity: 2,
        unitOfMeasure: 'Nos',
      },
    ]);
  });
});
