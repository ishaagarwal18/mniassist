import { describe, expect, it } from 'vitest';

import type { PurchaseOrderDto } from '../../../proxy/inventory/purchasing.service';
import { GrnStatus, QcInspectionStatus } from '../../../proxy/purchasing/purchasing-enums';
import type { GoodsReceiptNoteDto } from '../../../proxy/purchasing/goods-receipt-note.models';
import {
  BillForm,
  billTotals,
  billUploadProblem,
  blankBillLine,
  formFromReading,
  lineTaxable,
  linesFromReceipt,
  toCreateBillDto,
  validateBillForm,
} from './new-vendor-bill.logic';

const form = (over: Partial<BillForm> = {}): BillForm => ({
  supplierId: 's1',
  supplierName: 'Bharat Gears',
  supplierGstin: '',
  vendorInvoiceNumber: 'INV-1',
  invoiceDate: '2026-11-01',
  dueDate: '2026-12-01',
  isInterState: false,
  purchaseOrderId: '',
  purchaseOrderReference: '',
  goodsReceiptNoteId: '',
  goodsReceiptNoteNumber: '',
  tds: '194Q',
  isReverseCharge: false,
  remarks: '',
  lines: [{ ...blankBillLine(), partNumber: 'GR-120', quantity: 10, rate: 1000 }],
  ...over,
});

const grn: GoodsReceiptNoteDto = {
  id: 'g1',
  grnNumber: 'GRN-1',
  supplierId: 's1',
  supplierName: 'Bharat Gears',
  purchaseOrderId: 'po1',
  challanNumber: 'DC-1',
  challanDateUtc: '2026-11-01T00:00:00Z',
  status: GrnStatus.Approved,
  qcStatus: QcInspectionStatus.PartiallyPassed,
  lines: [
    {
      id: 'gl1',
      goodsReceiptNoteId: 'g1',
      lineNumber: 1,
      purchaseOrderLineId: 'pl1',
      partNumber: 'GR-120',
      description: 'Gear',
      orderedQuantity: 50,
      challanQuantity: 50,
      receivedQuantity: 50,
      acceptedQuantity: 45,
      rejectedQuantity: 5,
      unitOfMeasure: 'NOS',
    },
    {
      id: 'gl2',
      goodsReceiptNoteId: 'g1',
      lineNumber: 2,
      partNumber: 'SH-40',
      description: 'Shaft',
      orderedQuantity: 5,
      challanQuantity: 5,
      receivedQuantity: 5,
      acceptedQuantity: 0,
      rejectedQuantity: 5,
      unitOfMeasure: 'NOS',
    },
  ],
} as GoodsReceiptNoteDto;

const order = {
  id: 'po1',
  lines: [{ id: 'pl1', partNumber: 'GR-120', unitCostInPaise: 125_000 }],
} as unknown as PurchaseOrderDto;

describe('new vendor bill', () => {
  it('accepts a complete form', () => {
    expect(validateBillForm(form())).toEqual({});
  });

  it('needs the supplier, invoice number and a due date after the invoice', () => {
    const e = validateBillForm(
      form({ supplierId: '', vendorInvoiceNumber: ' ', dueDate: '2026-10-01' }),
    );
    expect(Object.keys(e).sort()).toEqual(['dueDate', 'supplier', 'vendorInvoiceNumber']);
  });

  it('checks the GSTIN shape and line rates', () => {
    const e = validateBillForm(
      form({
        supplierGstin: '27ABC',
        lines: [{ ...blankBillLine(), partNumber: 'X', quantity: 1, rate: 0, hsnCode: '12' }],
      }),
    );
    expect(e['supplierGstin']).toBeTruthy();
    expect(e['line.0.rate']).toBeTruthy();
    expect(e['line.0.hsnCode']).toBeTruthy();
    expect(validateBillForm(form({ supplierGstin: '27AABCB1234F1Z5' }))).toEqual({});
  });

  it('works out the taxable value after discount', () => {
    expect(lineTaxable({ ...blankBillLine(), quantity: 2, rate: 500, discountPercent: 10 })).toBe(
      90_000,
    );
  });

  it('splits GST by supply type and takes TDS off the taxable value', () => {
    const intra = billTotals(form());
    expect(intra).toEqual({
      taxable: 1_000_000,
      cgst: 90_000,
      sgst: 90_000,
      igst: 0,
      grand: 1_180_000,
      tds: 1_000,
      net: 1_179_000,
    });
    const inter = billTotals(form({ isInterState: true, tds: 'none' }));
    expect(inter).toMatchObject({ cgst: 0, sgst: 0, igst: 180_000, tds: 0, net: 1_180_000 });
  });

  it('bills the accepted quantities of a receipt at the order rate', () => {
    const lines = linesFromReceipt(grn, order);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      goodsReceiptNoteLineId: 'gl1',
      purchaseOrderLineId: 'pl1',
      quantity: 45,
      rate: 1250,
    });
  });

  it('builds the API input with the TDS section and rate', () => {
    const dto = toCreateBillDto(form({ tds: '194C-2', supplierGstin: '27aabcb1234f1z5' }));
    expect(dto).toMatchObject({
      tdsSection: '194C',
      tdsRateBasisPoints: 200,
      supplierGstin: '27AABCB1234F1Z5',
      isInterState: false,
    });
    expect(dto.lines[0]).toMatchObject({ billedQuantity: 10, unitPriceInPaise: 100_000 });
    expect(toCreateBillDto(form({ tds: 'none' }))).toMatchObject({
      tdsSection: undefined,
      tdsRateBasisPoints: 0,
    });
  });
});

describe('reading an uploaded bill', () => {
  const reading = {
    supplierName: 'Bharat Gears',
    supplierGstin: '27AABCB1234F1Z5',
    matchedSupplierId: 's9',
    matchedSupplierName: 'Bharat Precision Gears',
    invoiceNumber: 'BPG/0912',
    invoiceDate: '2026-10-28',
    isInterState: false,
    isReverseCharge: false,
    grandTotalInPaise: 11_800_00,
    lines: [
      {
        partNumber: 'GR-1',
        description: 'Gear',
        hsnCode: '84834000',
        quantity: 10,
        unitPriceInPaise: 1_000_00,
        discountPercent: 0,
        taxRateBasisPoints: 1800,
      },
    ],
  };

  it('accepts PDFs and photos within the size limits', () => {
    expect(billUploadProblem({ type: 'application/pdf', size: 9 * 1024 * 1024 })).toBeNull();
    expect(billUploadProblem({ type: 'image/png', size: 6 * 1024 * 1024 })).toContain('5 MB');
    expect(billUploadProblem({ type: 'text/plain', size: 10 })).toBeTruthy();
  });

  it('fills the form from the reading, due 30 days on when the bill gives no date', () => {
    const { form: f, warnings } = formFromReading(form(), reading);
    expect(f).toMatchObject({
      supplierId: 's9',
      supplierName: 'Bharat Precision Gears',
      vendorInvoiceNumber: 'BPG/0912',
      invoiceDate: '2026-10-28',
      dueDate: '2026-11-27',
      supplierGstin: '27AABCB1234F1Z5',
    });
    expect(f.lines[0]).toMatchObject({
      partNumber: 'GR-1',
      quantity: 10,
      rate: 1000,
      hsnCode: '84834000',
    });
    expect(warnings).toEqual([]);
  });

  it('warns about an unknown supplier, an unclear supply type and totals that do not add up', () => {
    const { form: f, warnings } = formFromReading(form(), {
      ...reading,
      matchedSupplierId: undefined,
      isInterState: null,
      grandTotalInPaise: 20_000_00,
    });
    expect(f.supplierId).toBe('');
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toContain("isn't in your suppliers");
    expect(warnings[2]).toContain('Check the quantities and rates');
  });
});
