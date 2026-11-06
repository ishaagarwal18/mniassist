import { describe, expect, it } from 'vitest';

import { DeliveryChallanDto } from '../../proxy/sales/delivery-challan.models';
import {
  DeliveryChallanStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
  SalesPaymentMode,
} from '../../proxy/sales/sales-enums';
import { SalesInvoiceDto } from '../../proxy/sales/sales-invoice.models';
import { SalesOrderDto } from '../../proxy/sales/sales-order.models';
import {
  canConfirmOrder,
  canDeliverChallan,
  canDispatchChallan,
  canFulfilOrder,
  canInvoiceChallan,
  canIssueInvoice,
  canPayInvoice,
  challanStatusLabel,
  dispatchFormFor,
  invoiceStatusTone,
  isInvoiceOverdue,
  listQuery,
  newRecordQuery,
  orderStatusLabel,
  paymentFormFor,
  paymentModeLabel,
  toDispatchDto,
  toSalesPaymentDto,
  validateDispatch,
  validateSalesPayment,
} from './sales-records.logic';

const order = (status: SalesOrderStatus) => ({ status }) as SalesOrderDto;
const challan = (p: Partial<DeliveryChallanDto>) => p as DeliveryChallanDto;
const invoice = (p: Partial<SalesInvoiceDto>) =>
  ({ balanceDueInPaise: 0, status: SalesInvoiceStatus.Issued, ...p }) as SalesInvoiceDto;

describe('sales records', () => {
  it('names statuses as the lists always have', () => {
    expect(orderStatusLabel(SalesOrderStatus.PartiallyDispatched)).toBe('Partially Dispatched');
    expect(challanStatusLabel(DeliveryChallanStatus.Dispatched)).toBe('In Transit');
    expect(invoiceStatusTone(SalesInvoiceStatus.PartiallyPaid)).toBe('amber');
    expect(paymentModeLabel(SalesPaymentMode.Card)).toBe('Card');
    expect(paymentModeLabel(SalesPaymentMode.Other)).toBe('Other');
  });

  it('allows confirming drafts and fulfilling confirmed orders only', () => {
    expect(canConfirmOrder(order(SalesOrderStatus.Draft))).toBe(true);
    expect(canConfirmOrder(order(SalesOrderStatus.Confirmed))).toBe(false);
    expect(canFulfilOrder(order(SalesOrderStatus.Confirmed))).toBe(true);
    expect(canFulfilOrder(order(SalesOrderStatus.PartiallyDispatched))).toBe(true);
    expect(canFulfilOrder(order(SalesOrderStatus.Draft))).toBe(false);
    expect(canFulfilOrder(order(SalesOrderStatus.Completed))).toBe(false);
  });

  it('moves a challan from draft to dispatched to delivered, billing either of the last two', () => {
    const draft = challan({ status: DeliveryChallanStatus.Draft });
    const sent = challan({ status: DeliveryChallanStatus.Dispatched });
    const there = challan({ status: DeliveryChallanStatus.Delivered });
    expect([canDispatchChallan(draft), canDeliverChallan(draft), canInvoiceChallan(draft)]).toEqual(
      [true, false, false],
    );
    expect([canDispatchChallan(sent), canDeliverChallan(sent), canInvoiceChallan(sent)]).toEqual([
      false,
      true,
      true,
    ]);
    expect([canDeliverChallan(there), canInvoiceChallan(there)]).toEqual([false, true]);
  });

  it('starts the dispatch form from the challan and checks it', () => {
    const f = dispatchFormFor(challan({ vehicleNumber: 'MH 12 AB 1234' }));
    expect(f).toEqual({
      transporterName: '',
      vehicleNumber: 'MH 12 AB 1234',
      lrNumber: '',
      eWayBillNumber: '',
    });
    expect(Object.keys(validateDispatch(f))).toEqual(['transporter']);
    expect(validateDispatch({ ...f, transporterName: 'VRL', eWayBillNumber: '1234' })).toEqual({
      eway: 'An e-Way Bill number has 12 digits.',
    });
    expect(
      validateDispatch({ ...f, transporterName: 'VRL', eWayBillNumber: '2819 8273 6412' }),
    ).toEqual({});
    expect(
      toDispatchDto({ ...f, transporterName: ' VRL ', eWayBillNumber: '2819 8273 6412' }),
    ).toEqual({
      transporterName: 'VRL',
      vehicleNumber: 'MH 12 AB 1234',
      lrNumber: undefined,
      eWayBillNumber: '281982736412',
    });
  });

  it('lets issued invoices with a balance take a payment, never drafts or cancelled ones', () => {
    expect(canIssueInvoice(invoice({ status: SalesInvoiceStatus.Draft }))).toBe(true);
    expect(canPayInvoice(invoice({ balanceDueInPaise: 100 }))).toBe(true);
    expect(canPayInvoice(invoice({ balanceDueInPaise: 0 }))).toBe(false);
    expect(
      canPayInvoice(invoice({ balanceDueInPaise: 100, status: SalesInvoiceStatus.Draft })),
    ).toBe(false);
    expect(
      canPayInvoice(invoice({ balanceDueInPaise: 100, status: SalesInvoiceStatus.Cancelled })),
    ).toBe(false);
  });

  it('calls an unpaid invoice past its due date overdue', () => {
    const now = new Date('2026-11-04T10:00:00Z');
    const due = '2026-11-01T00:00:00Z';
    expect(isInvoiceOverdue(invoice({ balanceDueInPaise: 1, dueDateUtc: due }), now)).toBe(true);
    expect(isInvoiceOverdue(invoice({ balanceDueInPaise: 0, dueDateUtc: due }), now)).toBe(false);
  });

  it('checks a payment against the balance and sends it in paise', () => {
    const f = paymentFormFor(invoice({ balanceDueInPaise: 1_250_50 }));
    expect(f.amount).toBe('1250.5');
    expect(validateSalesPayment(f, 1_250_50)).toEqual({});
    expect(validateSalesPayment({ ...f, amount: '1,300' }, 1_250_50)).toEqual({
      amount: 'More than the balance due.',
    });
    expect(validateSalesPayment({ ...f, amount: '0' }, 1_250_50)).toEqual({
      amount: 'Enter the amount received.',
    });
    expect(toSalesPaymentDto({ ...f, amount: '₹1,000.25', reference: ' UTR1 ' })).toEqual({
      amountInPaise: 1_000_25,
      paymentMode: SalesPaymentMode.NeftRtgs,
      referenceNumber: 'UTR1',
      remarks: undefined,
    });
  });

  it('carries the customer scope to a record and to a new record', () => {
    const contact = { customerId: 'c1', accountId: null, name: 'Suresh' };
    const account = { customerId: null, accountId: 'a1', name: 'Kalyani' };
    expect(listQuery(null)).toEqual({});
    expect(listQuery(account)).toEqual({ account: 'a1', name: 'Kalyani' });
    expect(newRecordQuery(contact)).toEqual({ customer: 'c1', customerName: 'Suresh' });
    expect(newRecordQuery(account)).toEqual({});
  });
});
