import { describe, expect, it } from 'vitest';
import {
  GstHeadsDto,
  Gstr2bDocumentType,
  Gstr2bLineDto,
  Gstr2bLineMatch,
  Gstr3bSummaryDto,
} from '../../../proxy/finance';
import { documentLabel, lineTax, matchLabel } from './gstr2b-panel';
import { gstr3bTableRows, setOffRows } from './gstr3b.logic';

const heads = (igst = 0, cgst = 0, sgst = 0, cess = 0): GstHeadsDto => ({
  igstInPaise: igst,
  cgstInPaise: cgst,
  sgstInPaise: sgst,
  cessInPaise: cess,
  totalInPaise: igst + cgst + sgst + cess,
});

const summary = (over: Partial<Gstr3bSummaryDto> = {}): Gstr3bSummaryDto => ({
  returnPeriod: '112026',
  outwardTaxableInPaise: 1_000_000,
  outwardTaxPayableInPaise: 180_000,
  eligibleItcInPaise: 0,
  itcIgstInPaise: 0,
  itcCgstInPaise: 0,
  itcSgstInPaise: 0,
  netGstPayableInCashInPaise: 0,
  electronicCreditLedgerBalanceInPaise: 0,
  outwardTax: heads(0, 90_000, 90_000),
  nilRatedInPaise: 50_000,
  reverseChargeTaxableInPaise: 10_000,
  reverseChargeTax: heads(1_800),
  itcImports: heads(900, 0, 0, 10),
  itcReverseCharge: heads(1_800),
  itcAllOther: heads(0, 20_000, 20_000),
  itcReversed: heads(0, 1_000, 1_000),
  netItc: heads(2_700, 19_000, 19_000, 10),
  itcIneligible: heads(0, 500, 500),
  paidFromCredit: heads(0, 21_700, 19_000),
  payableInCash: heads(1_800, 68_300, 71_000),
  creditCarriedForward: heads(0, 0, 0, 10),
  hasGstr2b: true,
  billsMatched: 3,
  billsWithTaxMismatch: 1,
  billsMissingIn2b: 2,
  gstr2bInvoicesNotInBooks: 1,
  gstr2bNotInBooksTaxInPaise: 9_000,
  notes: [],
  ...over,
});

describe('GSTR-3B rows', () => {
  it('lays out tables 3.1 and 4 in the form’s order, in rupees', () => {
    const rows = gstr3bTableRows(summary());
    expect(rows.map((r) => r.heading.split(' ')[0])).toEqual([
      '3.1(a)',
      '3.1(c)',
      '3.1(d)',
      '4(A)(1)',
      '4(A)(3)',
      '4(A)(5)',
      '4(B)(2)',
      '4(C)',
      '4(D)(2)',
    ]);
    expect(rows[0]).toMatchObject({
      taxable: 10_000,
      cgst: 900,
      sgst: 900,
      totalTax: 1_800,
      type: 'outward',
    });
    expect(rows[1]).toMatchObject({ taxable: 500, totalTax: 0 });
    expect(rows[3]).toMatchObject({ igst: 9, cess: 0.1 });
    expect(rows[6].type).toBe('reversal');
    expect(rows[7]).toMatchObject({ totalTax: 407.1, type: 'itc' });
  });

  it('shows the set-off with reverse-charge tax apart, as it can only be paid in cash', () => {
    const rows = setOffRows(summary());
    expect(rows.map((r) => r.heading)).toEqual([
      'Tax on outward supplies',
      'Paid from input tax credit',
      'Reverse-charge tax (cash only)',
      'Payable in cash',
      'Credit carried forward',
    ]);
    expect(rows[2].igst).toBe(18);
    expect(rows[3].total).toBe(1_411);
  });
});

describe('GSTR-2B lines', () => {
  const line = (over: Partial<Gstr2bLineDto> = {}): Gstr2bLineDto => ({
    id: '1',
    documentType: Gstr2bDocumentType.Invoice,
    supplierGstin: '27AABCS1429B1Z1',
    documentNumber: 'INV/1',
    invoiceValueInPaise: 118_000,
    taxableInPaise: 100_000,
    igstInPaise: 0,
    cgstInPaise: 9_000,
    sgstInPaise: 9_000,
    cessInPaise: 100,
    isReverseCharge: false,
    isItcAvailable: true,
    match: Gstr2bLineMatch.Matched,
    ...over,
  });

  it('labels each match and document type in plain words', () => {
    expect(matchLabel(Gstr2bLineMatch.Matched)).toEqual({ label: 'Matched', tone: 'good' });
    expect(matchLabel(Gstr2bLineMatch.TaxMismatch).label).toBe('Tax differs');
    expect(matchLabel(Gstr2bLineMatch.NotInBooks).tone).toBe('bad');
    expect(documentLabel(Gstr2bDocumentType.CreditNote)).toBe('Credit note');
    expect(documentLabel(Gstr2bDocumentType.Import)).toBe('Import');
  });

  it('adds every head, cess included, into the reported tax', () => {
    expect(lineTax(line())).toBe(18_100);
  });
});
