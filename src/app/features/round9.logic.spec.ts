import { describe, expect, it } from 'vitest';

import { limitsProblem } from './channels/sending-limits-card';
import { parseLeadDays } from './pipeline/plan-reminders-dialog';
import { toVariables } from './templates/template-preview-dialog';
import {
  OPEN_ORDER_STATUSES,
  challanLinesFromOrder,
  toChallanLines,
} from './sales/challans/new-delivery-challan.logic';
import { SalesOrderStatus } from '../proxy/sales/sales-enums';
import type { SalesOrderDto } from '../proxy/sales/sales-order.models';

describe('sending limits', () => {
  it('accepts the API ranges and refuses the rest', () => {
    expect(limitsProblem(20, 80)).toBeNull();
    expect(limitsProblem(95, 80)).toContain('90');
    expect(limitsProblem(20, 0)).toContain('1 to 1000');
    expect(limitsProblem(20, 1.5)).toContain('whole number');
  });
});

describe('reminder lead days', () => {
  it('reads a list largest first without repeats', () => {
    expect(parseLeadDays('7, 30 7')).toEqual([30, 7]);
    expect(parseLeadDays('')).toBeNull();
    expect(parseLeadDays('0')).toBeNull();
    expect(parseLeadDays('1,2,3,4,5,6')).toBeNull();
  });
});

describe('template preview variables', () => {
  it('numbers the values from 1 and drops blanks', () => {
    expect(toVariables(['Ravi', ' ', 'AMC-12 '])).toEqual({ '1': 'Ravi', '3': 'AMC-12' });
  });
});

describe('challan from a sales order', () => {
  const order = {
    lines: [
      { id: 'l1', partNumber: 'P-1', description: 'Drive', quantity: 5, dispatchedQuantity: 2 },
      { id: 'l2', partNumber: 'P-2', description: 'Motor', quantity: 1, dispatchedQuantity: 1 },
    ],
  } as unknown as SalesOrderDto;

  it('takes only what is still to dispatch, linked to its order line', () => {
    const lines = challanLinesFromOrder(order);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ quantity: 3, salesOrderLineId: 'l1', partNumber: 'P-1' });
    expect(toChallanLines(lines)[0].salesOrderLineId).toBe('l1');
  });

  it('treats confirmed, in-production and part-dispatched orders as open', () => {
    expect(OPEN_ORDER_STATUSES).toContain(SalesOrderStatus.PartiallyDispatched);
    expect(OPEN_ORDER_STATUSES).not.toContain(SalesOrderStatus.Dispatched);
  });
});
