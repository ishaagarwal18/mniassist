import { Gstr1Section } from '../../../proxy/finance/finance-enums';
import {
  RegisterEntryDraft,
  entryProblem,
  periodOf,
  splitTax,
  toRegisterInput,
} from './register-entry.logic';

const draft = (over: Partial<RegisterEntryDraft> = {}): RegisterEntryDraft => ({
  documentNumber: 'TL/0091',
  documentDate: '2026-04-12',
  section: Gstr1Section.B2B_4A,
  gstin: '27ABCDE1234F1Z5',
  legalName: 'Acme Engineering',
  placeOfSupply: '27',
  reverseCharge: false,
  taxable: '10,000',
  rate: '18',
  cess: '',
  ...over,
});

describe('register entry', () => {
  it('splits tax by place of supply', () => {
    expect(splitTax(1_000_000, 18, true)).toEqual({ igst: 180_000, cgst: 0, sgst: 0 });
    expect(splitTax(1_000_000, 18, false)).toEqual({ igst: 0, cgst: 90_000, sgst: 90_000 });
  });

  it('needs a GSTIN for B2B but not for B2C small', () => {
    expect(entryProblem(draft({ gstin: '' }))).toMatch(/GSTIN/);
    expect(entryProblem(draft({ gstin: '', section: Gstr1Section.B2CS_7 }))).toBeNull();
    expect(entryProblem(draft({ gstin: '27ABC', section: Gstr1Section.B2CS_7 }))).toMatch(/valid/);
  });

  it('files the entry in the month of the document, with the invoice value worked out', () => {
    expect(periodOf('2026-04-12')).toBe('042026');
    const within = toRegisterInput(draft(), '27');
    expect(within.cgstAmountInPaise).toBe(90_000);
    expect(within.totalInvoiceValueInPaise).toBe(1_180_000);
    expect(toRegisterInput(draft({ placeOfSupply: '29' }), '27').igstAmountInPaise).toBe(180_000);
  });
});
