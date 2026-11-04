import { describe, expect, it } from 'vitest';

import type { VendorBillDto } from '../../../proxy/purchasing/vendor-bill.models';
import { VendorBillStatus, VendorPaymentMode } from '../../../proxy/purchasing/purchasing-enums';
import {
  PaymentForm,
  canApproveBill,
  canCancelBill,
  canPayBill,
  toPaymentDto,
  validatePayment,
} from './bill-detail.logic';

const bill = (over: Partial<VendorBillDto>) =>
  ({
    status: VendorBillStatus.Draft,
    balanceDueInPaise: 100_00,
    payments: [],
    ...over,
  }) as VendorBillDto;

const pay = (over: Partial<PaymentForm> = {}): PaymentForm => ({
  amount: '100',
  mode: VendorPaymentMode.NeftRtgs,
  reference: 'UTR1',
  date: '2026-11-04',
  tdsCertificate: '',
  remarks: '',
  ...over,
});

describe('bill actions', () => {
  it('approves drafts, pays approved bills with a balance, cancels unpaid ones', () => {
    expect(canApproveBill(bill({}))).toBe(true);
    expect(canPayBill(bill({}))).toBe(false);
    expect(canPayBill(bill({ status: VendorBillStatus.Approved }))).toBe(true);
    expect(canPayBill(bill({ status: VendorBillStatus.Approved, balanceDueInPaise: 0 }))).toBe(
      false,
    );
    expect(canCancelBill(bill({ status: VendorBillStatus.Approved }))).toBe(true);
    expect(canCancelBill(bill({ payments: [{} as never] }))).toBe(false);
    expect(canCancelBill(bill({ status: VendorBillStatus.Cancelled }))).toBe(false);
  });

  it('checks the payment against the balance and needs a reference except for cash', () => {
    expect(validatePayment(pay(), 100_00)).toEqual({});
    expect(validatePayment(pay({ amount: '100.01' }), 100_00)['amount']).toBe(
      'More than the balance due.',
    );
    expect(validatePayment(pay({ amount: '0' }), 100_00)['amount']).toBeTruthy();
    expect(validatePayment(pay({ reference: '' }), 100_00)['reference']).toBeTruthy();
    expect(validatePayment(pay({ reference: '', mode: VendorPaymentMode.Cash }), 100_00)).toEqual(
      {},
    );
  });

  it('builds the payment in paise', () => {
    expect(toPaymentDto(pay({ amount: '₹1,234.50' }))).toMatchObject({
      amountInPaise: 123_450,
      paymentMode: VendorPaymentMode.NeftRtgs,
      referenceNumber: 'UTR1',
      tdsCertificateNumber: undefined,
    });
  });
});
