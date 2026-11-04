import { describe, expect, it } from 'vitest';

import type { PurchaseOrderDto } from '../../../proxy/inventory/purchasing.service';
import {
  GrnForm,
  blankGrnLine,
  linesFromOrder,
  localDateTime,
  shortBy,
  toCreateGrnDto,
  validateGrnForm,
} from './new-goods-receipt.logic';

const form = (over: Partial<GrnForm> = {}): GrnForm => ({
  supplierId: 's1',
  supplierName: 'Bharat Gears',
  purchaseOrderId: '',
  purchaseOrderReference: '',
  locationId: '',
  locationName: '',
  challanNumber: 'DC-1',
  challanDate: '2026-11-04',
  gateEntryNumber: '',
  gateInTime: '2026-11-04T10:30',
  vehicleNumber: 'mh 14 hg 8921',
  transporterName: '',
  remarks: '',
  lines: [{ ...blankGrnLine(), partNumber: 'GR-120', receivedQuantity: 5, challanQuantity: 5 }],
  ...over,
});

const po: PurchaseOrderDto = {
  id: 'po1',
  reference: 'PO-1',
  supplierId: 's1',
  supplierName: 'Bharat Gears',
  locationId: 'l1',
  locationName: 'Main store',
  state: 'PartlyReceived',
  creationTime: '2026-11-01T00:00:00Z',
  subtotalInPaise: 0,
  lines: [
    {
      id: 'pl1',
      productId: 'p1',
      partNumber: 'GR-120',
      description: 'Helical gear',
      quantity: 50,
      unitCostInPaise: 100,
      receivedQuantity: 20,
      outstanding: 30,
      tracking: 'None',
    },
    {
      id: 'pl2',
      productId: 'p2',
      partNumber: 'SH-40',
      description: 'Shaft',
      quantity: 10,
      unitCostInPaise: 100,
      receivedQuantity: 10,
      outstanding: 0,
      tracking: 'None',
    },
  ],
};

describe('new goods receipt', () => {
  it('accepts a complete form', () => {
    expect(validateGrnForm(form())).toEqual({});
  });

  it('needs a real supplier and the challan number', () => {
    const e = validateGrnForm(form({ supplierId: '', challanNumber: '  ' }));
    expect(Object.keys(e).sort()).toEqual(['challanNumber', 'supplier']);
  });

  it('ignores untouched lines but needs at least one item', () => {
    expect(validateGrnForm(form({ lines: [blankGrnLine()] }))['lines']).toBeTruthy();
    const ok = form();
    ok.lines.push(blankGrnLine());
    expect(validateGrnForm(ok)).toEqual({});
    expect(toCreateGrnDto(ok).lines).toHaveLength(1);
  });

  it('flags a line with no part number or nothing received', () => {
    const e = validateGrnForm(
      form({
        lines: [{ ...blankGrnLine(), description: 'Gear', receivedQuantity: 0 }],
      }),
    );
    expect(e['line.0.partNumber']).toBeTruthy();
    expect(e['line.0.receivedQuantity']).toBeTruthy();
  });

  it('fills the lines with what is still to come on the order', () => {
    const lines = linesFromOrder(po);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      purchaseOrderLineId: 'pl1',
      productId: 'p1',
      orderedQuantity: 50,
      challanQuantity: 30,
      receivedQuantity: 30,
    });
  });

  it('builds the API input with the order link and trimmed optional fields', () => {
    const dto = toCreateGrnDto(
      form({ purchaseOrderId: 'po1', purchaseOrderReference: 'PO-1', lines: linesFromOrder(po) }),
    );
    expect(dto).toMatchObject({
      supplierId: 's1',
      purchaseOrderId: 'po1',
      challanNumber: 'DC-1',
      vehicleNumber: 'MH 14 HG 8921',
      gateEntryNumber: undefined,
      locationId: undefined,
    });
    expect(dto.lines[0]).toMatchObject({ purchaseOrderLineId: 'pl1', orderedQuantity: 50 });
  });

  it('works out a shortfall against the challan', () => {
    expect(shortBy({ ...blankGrnLine(), challanQuantity: 10, receivedQuantity: 7 })).toBe(3);
    expect(shortBy({ ...blankGrnLine(), challanQuantity: 10, receivedQuantity: 12 })).toBe(0);
  });

  it('formats a local date-time for the input', () => {
    expect(localDateTime(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05T09:07');
  });
});
