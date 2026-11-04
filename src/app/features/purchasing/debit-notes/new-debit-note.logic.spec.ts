import { describe, expect, it } from 'vitest';

import type { GoodsReceiptNoteDto } from '../../../proxy/purchasing/goods-receipt-note.models';
import type { VendorBillDto } from '../../../proxy/purchasing/vendor-bill.models';
import {
  DebitForm,
  blankDebitLine,
  debitTotals,
  linesFromBill,
  linesFromRejections,
  toCreateDebitDto,
  validateDebitForm,
} from './new-debit-note.logic';

const form = (over: Partial<DebitForm> = {}): DebitForm => ({
  supplierId: 's1',
  supplierName: 'Sundram Fasteners',
  vendorBillId: '',
  vendorBillNumber: '',
  goodsReceiptNoteId: '',
  goodsReceiptNoteNumber: '',
  reason: 'QC rejection',
  isInterState: false,
  remarks: '',
  lines: [{ ...blankDebitLine(), partNumber: 'BLT-16', quantity: 15, rate: 240 }],
  ...over,
});

const grn = {
  id: 'g1',
  grnNumber: 'GRN-1',
  lines: [
    {
      id: 'gl1',
      partNumber: 'BLT-16',
      description: 'Flange bolt',
      rejectedQuantity: 15,
      rejectionReason: 'Pitch out of tolerance',
    },
    { id: 'gl2', partNumber: 'NUT-16', description: 'Nut', rejectedQuantity: 0 },
  ],
} as unknown as GoodsReceiptNoteDto;

const bill = {
  id: 'b1',
  lines: [
    {
      goodsReceiptNoteLineId: 'gl1',
      partNumber: 'BLT-16',
      description: 'Flange bolt',
      billedQuantity: 200,
      unitPriceInPaise: 24_000,
      taxRateBasisPoints: 1200,
    },
  ],
} as unknown as VendorBillDto;

describe('new debit note', () => {
  it('accepts a complete form', () => {
    expect(validateDebitForm(form())).toEqual({});
  });

  it('needs the supplier, a reason and priced items', () => {
    const e = validateDebitForm(
      form({
        supplierId: '',
        reason: '',
        lines: [{ ...blankDebitLine(), partNumber: 'X', quantity: 0 }],
      }),
    );
    expect(Object.keys(e).sort()).toEqual(['line.0.quantity', 'line.0.rate', 'reason', 'supplier']);
    expect(validateDebitForm(form({ lines: [blankDebitLine()] }))['lines']).toBeTruthy();
  });

  it('debits the rejected items, priced from the bill', () => {
    const lines = linesFromRejections(grn, bill);
    expect(lines).toEqual([
      {
        partNumber: 'BLT-16',
        description: 'Flange bolt — Pitch out of tolerance',
        quantity: 15,
        rate: 240,
        taxRateBasisPoints: 1200,
      },
    ]);
    expect(linesFromRejections(grn)[0]).toMatchObject({ rate: 0, taxRateBasisPoints: 1800 });
  });

  it('copies a bill’s lines', () => {
    expect(linesFromBill(bill)[0]).toMatchObject({ quantity: 200, rate: 240 });
  });

  it('totals with GST split by supply type', () => {
    expect(debitTotals(form())).toEqual({
      taxable: 360_000,
      cgst: 32_400,
      sgst: 32_400,
      igst: 0,
      grand: 424_800,
    });
    expect(debitTotals(form({ isInterState: true }))).toMatchObject({ igst: 64_800 });
  });

  it('builds the API input', () => {
    const dto = toCreateDebitDto(
      form({ goodsReceiptNoteId: 'g1', goodsReceiptNoteNumber: 'GRN-1' }),
    );
    expect(dto).toMatchObject({
      supplierId: 's1',
      reason: 'QC rejection',
      goodsReceiptNoteId: 'g1',
      vendorBillId: undefined,
    });
    expect(dto.lines[0]).toEqual({
      partNumber: 'BLT-16',
      description: 'BLT-16',
      quantity: 15,
      unitPriceInPaise: 24_000,
      taxRateBasisPoints: 1800,
    });
  });
});
