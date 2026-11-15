import { Gstr1Section } from '../../../proxy/finance/finance-enums';
import type { CreateGstAuditRegisterDto } from '../../../proxy/finance/gst-compliance.models';

/** A register entry as typed: amounts in rupees, the date as yyyy-MM-dd. */
export interface RegisterEntryDraft {
  documentNumber: string;
  documentDate: string;
  section: Gstr1Section;
  gstin: string;
  legalName: string;
  placeOfSupply: string;
  reverseCharge: boolean;
  taxable: string;
  rate: string;
  cess: string;
}

export const SECTIONS = [
  { value: Gstr1Section.B2B_4A, label: 'B2B invoice (4A)' },
  { value: Gstr1Section.B2CL_5, label: 'B2C large, inter-state (5)' },
  { value: Gstr1Section.B2CS_7, label: 'B2C small (7)' },
  { value: Gstr1Section.CDNR_9B, label: 'Credit / debit note to a registered buyer (9B)' },
  { value: Gstr1Section.EXP_6, label: 'Export (6)' },
  { value: Gstr1Section.NIL_8, label: 'Nil rated / exempt (8)' },
] as const;

export const GST_RATES = ['0', '0.25', '3', '5', '12', '18', '28'];

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const toPaise = (rupees: string) => Math.round(Number(rupees.replace(/,/g, '') || '0') * 100);

/** The tax on the entry: IGST across states, CGST and SGST split evenly within one. */
export function splitTax(
  taxablePaise: number,
  ratePercent: number,
  interState: boolean,
): { igst: number; cgst: number; sgst: number } {
  const tax = Math.round((taxablePaise * ratePercent) / 100);
  if (interState) return { igst: tax, cgst: 0, sgst: 0 };
  const half = Math.round(tax / 2);
  return { igst: 0, cgst: half, sgst: half };
}

/** Inter-state when the place of supply is not our own state; exports always are. */
export function isInterState(d: RegisterEntryDraft, ownStateCode: string | null): boolean {
  if (d.section === Gstr1Section.EXP_6 || d.section === Gstr1Section.B2CL_5) return true;
  return !!ownStateCode && d.placeOfSupply !== ownStateCode;
}

/** The first problem with the draft, or null when it can be saved. Mirrors the API's checks. */
export function entryProblem(d: RegisterEntryDraft): string | null {
  const number = d.documentNumber.trim();
  if (!number || number.length > 16)
    return 'Enter the document number (up to 16 characters, as on the invoice).';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.documentDate)) return 'Pick the document date.';
  const gstin = d.gstin.trim().toUpperCase();
  const needsGstin = d.section === Gstr1Section.B2B_4A || d.section === Gstr1Section.CDNR_9B;
  if (needsGstin && !GSTIN.test(gstin))
    return "A B2B entry or credit/debit note needs the customer's 15-character GSTIN.";
  if (gstin && !GSTIN.test(gstin))
    return "That GSTIN isn't valid. It has 15 characters, like 27ABCDE1234F1Z5.";
  if (!d.legalName.trim()) return "Enter the customer's legal name.";
  if (!/^\d{2}$/.test(d.placeOfSupply)) return 'Choose the place of supply.';
  for (const [v, what] of [
    [d.taxable, 'taxable value'],
    [d.cess, 'cess'],
  ] as const) {
    const n = Number(v.replace(/,/g, '') || '0');
    if (!Number.isFinite(n) || n < 0) return `The ${what} must be an amount of zero or more.`;
  }
  if (!(Number(d.taxable.replace(/,/g, '')) > 0)) return 'Enter the taxable value.';
  if (!GST_RATES.includes(d.rate)) return 'Choose the GST rate.';
  return null;
}

/** The return period a document belongs to: its month, as MMYYYY. */
export function periodOf(date: string): string {
  const [y, m] = date.split('-');
  return `${m}${y}`;
}

export function toRegisterInput(
  d: RegisterEntryDraft,
  ownStateCode: string | null,
): CreateGstAuditRegisterDto {
  const taxable = toPaise(d.taxable);
  const rate = Number(d.rate);
  const cess = toPaise(d.cess);
  const t = splitTax(taxable, rate, isInterState(d, ownStateCode));
  return {
    documentNumber: d.documentNumber.trim(),
    documentDateUtc: new Date(`${d.documentDate}T00:00:00`).toISOString(),
    returnPeriod: periodOf(d.documentDate),
    section: d.section,
    counterpartyGstin: d.gstin.trim().toUpperCase(),
    counterpartyLegalName: d.legalName.trim(),
    placeOfSupplyStateCode: d.placeOfSupply,
    isReverseChargeApplicable: d.reverseCharge,
    taxableAmountInPaise: taxable,
    gstRatePercent: rate,
    igstAmountInPaise: t.igst,
    cgstAmountInPaise: t.cgst,
    sgstAmountInPaise: t.sgst,
    cessAmountInPaise: cess,
    totalInvoiceValueInPaise: taxable + t.igst + t.cgst + t.sgst + cess,
  };
}
