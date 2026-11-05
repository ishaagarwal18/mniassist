import { describe, expect, it } from 'vitest';

import { type SalesParty, defaultShipIndex, shipToText } from '../sales-party';
import { blankLine, editLine, lineFromProduct, toOrderLines } from './new-sales-order.logic';

const party = (shipTo: SalesParty['shipTo']): SalesParty => ({
  accountId: 'a1',
  accountName: 'Kalyani Forge',
  gstin: null,
  billingAddress: 'Gat 12, Chakan',
  billingStateCode: '27',
  shipTo,
});
const site = (label: string, isDefault = false) => ({
  label,
  text: `${label} address`,
  isDefault,
});

describe('new sales order', () => {
  it('fills a line from a catalogue item, keeping the quantity', () => {
    const line = lineFromProduct(
      {
        id: 'p1',
        partNumber: 'VFD-7K5',
        name: 'Drive 7.5 kW',
        description: null,
        hsnCode: '8504',
        listPriceInPaise: 42_500_00,
        taxRateBasisPoints: null,
      },
      { ...blankLine(), quantity: 3 },
    );
    expect(line).toEqual({
      itemName: 'Drive 7.5 kW',
      partNumber: 'VFD-7K5',
      description: 'Drive 7.5 kW',
      hsnCode: '8504',
      quantity: 3,
      unitPrice: 42_500,
      taxRateBasisPoints: 1800,
      productId: 'p1',
    });
  });

  it('unlinks the catalogue item when its name or number is retyped, not when the price is', () => {
    const picked = { ...blankLine(), partNumber: 'A', productId: 'p1' };
    expect(editLine(picked, { unitPrice: 10 }).productId).toBe('p1');
    expect(editLine(picked, { partNumber: 'B' }).productId).toBeNull();
    expect(editLine(picked, { itemName: 'x' }).productId).toBeNull();
  });

  it('sends lines with a part number and quantity, in paise', () => {
    const lines = toOrderLines([
      { ...blankLine(), itemName: 'Bearing', partNumber: ' 6205 ', unitPrice: 120.5, quantity: 2 },
      { ...blankLine(), partNumber: '', quantity: 1 },
      { ...blankLine(), partNumber: 'X', quantity: 0 },
    ]);
    expect(lines).toEqual([
      {
        productId: undefined,
        partNumber: '6205',
        description: 'Bearing',
        hsnCode: undefined,
        quantity: 2,
        unitPriceInPaise: 12_050,
        discountPercent: 0,
        taxRateBasisPoints: 1800,
      },
    ]);
  });

  it("starts the site address at the account's default shipping address, else the billing address", () => {
    const two = party([site('Plant 1'), site('Plant 2', true)]);
    expect(defaultShipIndex(two)).toBe(1);
    expect(shipToText(two, 1)).toBe('Plant 2 address');
    expect(defaultShipIndex(party([site('Plant 1')]))).toBe(0);
    const none = party([]);
    expect(defaultShipIndex(none)).toBe(-1);
    expect(shipToText(none, -1)).toBe('Gat 12, Chakan');
  });
});
