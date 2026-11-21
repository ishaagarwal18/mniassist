import { DeliveryChallanDto } from '../../proxy/sales/delivery-challan.models';
import {
  DeliveryChallanStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
} from '../../proxy/sales/sales-enums';
import { SalesInvoiceDto } from '../../proxy/sales/sales-invoice.models';
import { SalesOrderDto, SalesOrderLineDto } from '../../proxy/sales/sales-order.models';
import { challanChain, invoiceChain, orderChain } from './sales-chain.logic';

const line = (dispatched: number, invoiced: number, qty = 10) =>
  ({
    quantity: qty,
    dispatchedQuantity: dispatched,
    invoicedQuantity: invoiced,
    outstandingDispatch: qty - dispatched,
    outstandingInvoice: qty - invoiced,
  }) as SalesOrderLineDto;

const order = (patch: Partial<SalesOrderDto>) =>
  ({
    id: 'o1',
    orderNumber: 'SO-1',
    status: SalesOrderStatus.Confirmed,
    lines: [],
    ...patch,
  }) as SalesOrderDto;

const states = (c: { steps: readonly { key: string; state: string }[] }) =>
  Object.fromEntries(c.steps.map((s) => [s.key, s.state]));

describe('sales chain', () => {
  it('a draft order links its quotation and asks to confirm', () => {
    const c = orderChain(order({ status: SalesOrderStatus.Draft, quotationId: 'q1' }));
    expect(c.steps[0].route).toBe('/quotations/q1/edit');
    expect(states(c)).toEqual({
      quote: 'done',
      order: 'current',
      delivery: 'todo',
      invoice: 'todo',
    });
    expect(c.next).toContain('Confirm sales order');
  });

  it('an order without a quotation shows that step as not used', () => {
    expect(states(orderChain(order({})))['quote']).toBe('skipped');
  });

  it('a half-dispatched order is partly delivered and asks for a challan', () => {
    const c = orderChain(order({ lines: [line(5, 0)] }));
    expect(states(c)['delivery']).toBe('partly');
    expect(c.next).toContain('Create delivery challan');
  });

  it('a dispatched, uninvoiced order asks for the invoice', () => {
    const c = orderChain(order({ lines: [line(10, 0)] }));
    expect(states(c)).toMatchObject({ delivery: 'done', invoice: 'todo' });
    expect(c.next).toContain('Generate sales invoice');
  });

  it('a cancelled order has no next step', () => {
    const c = orderChain(order({ status: SalesOrderStatus.Cancelled }));
    expect(c.cancelled).toBe(true);
    expect(c.next).toBeNull();
  });

  it('a delivered challan links its order and points to invoicing', () => {
    const c = challanChain({
      challanNumber: 'DC-1',
      status: DeliveryChallanStatus.Delivered,
      salesOrderId: 'o1',
      salesOrderNumber: 'SO-1',
    } as DeliveryChallanDto);
    expect(c.steps[0]).toMatchObject({ key: 'order', route: '/sales/orders/o1', number: 'SO-1' });
    expect(c.next).toContain('Generate sales invoice');
  });

  it('a paid invoice is finished', () => {
    const c = invoiceChain({
      invoiceNumber: 'INV-1',
      status: SalesInvoiceStatus.Paid,
      deliveryChallanId: 'd1',
    } as SalesInvoiceDto);
    expect(states(c)).toEqual({
      order: 'skipped',
      delivery: 'done',
      invoice: 'current',
      paid: 'done',
    });
    expect(c.next).toBeNull();
    expect(c.cancelled).toBe(false);
  });

  it('a part-paid invoice asks to record the payment', () => {
    const c = invoiceChain({
      invoiceNumber: 'INV-2',
      status: SalesInvoiceStatus.PartiallyPaid,
    } as SalesInvoiceDto);
    expect(states(c)['paid']).toBe('partly');
    expect(c.next).toContain('Record payment');
  });
});
