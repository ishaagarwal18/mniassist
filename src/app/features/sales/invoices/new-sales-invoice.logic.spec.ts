import type { ProductDto } from '../../../proxy/library/product.service';
import {
  blankInvoiceLine,
  editInvoiceLine,
  gstPercentFrom,
  invoiceLineFromProduct,
  invoiceTotals,
  lineTaxablePaise,
  plusDays,
  toInvoiceLines,
} from './new-sales-invoice.logic';

const product = {
  id: 'p-1',
  name: 'Servo motor 2 kW',
  partNumber: 'SM-2000',
  description: '',
  hsnCode: '85015210',
  listPriceInPaise: 4_550_000,
  taxRateBasisPoints: 1800,
} as ProductDto;

describe('new sales invoice lines', () => {
  it('fills a line from a catalogue product and keeps the quantity typed', () => {
    const line = invoiceLineFromProduct(product, { ...blankInvoiceLine(), quantity: 3 });
    expect(line).toEqual(
      expect.objectContaining({
        itemName: 'Servo motor 2 kW',
        partNumber: 'SM-2000',
        description: 'Servo motor 2 kW',
        hsnCode: '85015210',
        unitPrice: 45_500,
        gstPercent: 18,
        quantity: 3,
        productId: 'p-1',
      }),
    );
  });

  it('maps unusual catalogue GST to 18% and keeps the offered rates', () => {
    const offered = [0, 5, 12, 18, 28];
    expect(gstPercentFrom(500, offered)).toBe(5);
    expect(gstPercentFrom(2800, offered)).toBe(28);
    expect(gstPercentFrom(1234, offered)).toBe(18);
    expect(gstPercentFrom(undefined, offered)).toBe(18);
    expect(gstPercentFrom(25, [0.25, 18])).toBe(0.25);
  });

  it('unlinks the product when its name or item number is typed over', () => {
    const picked = invoiceLineFromProduct(product, blankInvoiceLine());
    expect(editInvoiceLine(picked, { quantity: 2 }).productId).toBe('p-1');
    expect(editInvoiceLine(picked, { partNumber: 'X' }).productId).toBeNull();
    expect(editInvoiceLine(picked, { itemName: 'Other' }).productId).toBeNull();
  });

  it('sends started lines only, filling the item number and description from each other', () => {
    const lines = [
      { ...blankInvoiceLine(), itemName: 'Panel wiring', unitPrice: 1200 },
      blankInvoiceLine(),
      { ...blankInvoiceLine(), partNumber: 'AMC-1', gstPercent: 12 },
    ];
    const sent = toInvoiceLines(lines, false);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toEqual(
      expect.objectContaining({
        partNumber: 'Panel wiring',
        description: 'Panel wiring',
        unitPriceInPaise: 120_000,
        taxRateBasisPoints: 1800,
      }),
    );
    expect(sent[1]).toEqual(
      expect.objectContaining({
        partNumber: 'AMC-1',
        description: 'AMC-1',
        taxRateBasisPoints: 1200,
      }),
    );
    expect(toInvoiceLines(lines, true).every((l) => l.taxRateBasisPoints === 0)).toBe(true);
  });

  it('totals taxable value after discount, and no GST on a bill of supply', () => {
    const line = { ...blankInvoiceLine(), quantity: 2, unitPrice: 1000, discountPercent: 10 };
    expect(lineTaxablePaise(line)).toBe(180_000);
    expect(invoiceTotals([line], false)).toEqual({ taxable: 180_000, tax: 32_400 });
    expect(invoiceTotals([line], true)).toEqual({ taxable: 180_000, tax: 0 });
  });

  it('adds days to a date across a month end', () => {
    expect(plusDays('2026-11-15', 30)).toBe('2026-12-15');
    expect(plusDays('2026-01-31', 1)).toBe('2026-02-01');
  });
});
