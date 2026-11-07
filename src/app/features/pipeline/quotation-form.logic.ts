import type { CreateUpdateQuotationDto } from '../../proxy/pipeline';
import { QuotationState } from '../../proxy/pipeline';
import { QuoteRow, percentToBasisPoints, rupeesToPaise, taxBasisPointsOf } from './quote-pricing';

/** A line left at ₹0 for a person to price, still unpriced. */
export function isUnpriced(row: QuoteRow): boolean {
  return !!row.mustBePriced && rupeesToPaise(row.price) === 0;
}

/** Who a new quotation is for: an open enquiry, or a customer directly (a manual quotation). */
export type QuoteFor = 'enquiry' | 'manual';

export interface QuoteHeader {
  mode: QuoteFor;
  enquiryId: string;
  contactId: string;
  /** What a manual quotation is for; becomes the title of the enquiry opened behind it. */
  title: string;
}

/** Won, lost and expired quotations are a record of what was offered: shown, not changed. */
export function isQuotationLocked(state: QuotationState | null | undefined): boolean {
  return (
    state === QuotationState.Won ||
    state === QuotationState.Lost ||
    state === QuotationState.Expired
  );
}

/** A draft is issued; an issued or revised one is issued again as the next revision. */
export function canIssueState(state: QuotationState | null | undefined): boolean {
  return (
    state == null ||
    state === QuotationState.Draft ||
    state === QuotationState.Issued ||
    state === QuotationState.Revised
  );
}

/** What stops the quotation being saved, or null. `issuing` also needs at least one line. */
export function validateQuotation(
  header: QuoteHeader | null,
  rows: QuoteRow[],
  issuing: boolean,
): string | null {
  if (header) {
    if (header.mode === 'enquiry' && !header.enquiryId) {
      return 'Pick the enquiry this quotation is for, or switch to a manual quotation.';
    }
    if (header.mode === 'manual' && !header.contactId) {
      return 'Pick the customer this quotation is for.';
    }
  }
  if (rows.some((r) => !r.description.trim())) return 'Every line needs a description.';
  if (rows.some((r) => !(Number(r.quantity) > 0))) return 'Every line needs a quantity above zero.';
  if (issuing && rows.length === 0) return 'Add at least one line before issuing.';
  const unpriced = issuing ? rows.find(isUnpriced) : undefined;
  if (unpriced) return `Price the line “${unpriced.description.trim()}” before issuing.`;
  return null;
}

/** "Valid for" as typed: a whole number of days, 1 to 365, else null. */
export function parseValidDays(text: string): number | null {
  const days = Number(text.trim());
  return Number.isInteger(days) && days >= 1 && days <= 365 ? days : null;
}

/** The request body. `header` is only sent for a new quotation; an existing one keeps its enquiry. */
export function quotationPayload(
  header: QuoteHeader | null,
  existingEnquiryId: string | null,
  priceListId: string,
  taxRateBasisPoints: number,
  rows: QuoteRow[],
): CreateUpdateQuotationDto {
  const manual = header?.mode === 'manual';
  return {
    enquiryId: header ? (manual ? null : header.enquiryId) : existingEnquiryId,
    contactId: manual ? header!.contactId : null,
    title: manual ? header!.title.trim() || null : null,
    priceListId: priceListId || null,
    taxRateBasisPoints,
    lines: rows.map((r, i) => ({
      order: i + 1,
      partNumber: r.partNumber.trim() || null,
      description: r.description.trim(),
      quantity: Number(r.quantity) || 0,
      unit: r.unit.trim() || 'no',
      unitPriceInPaise: rupeesToPaise(r.price),
      discountBasisPoints: percentToBasisPoints(r.discount),
      taxRateBasisPoints: taxBasisPointsOf(r),
      useCataloguePrice: r.fromList && !r.keep,
      keepPricing: r.fromList && r.keep,
      priceSource: r.source,
      priceListId: r.priceListId,
      listPriceInPaise: r.listPaise,
      mustBePriced: !!r.mustBePriced,
    })),
  };
}

/** Someone a quotation can be sent to: the quotation's contact, or another person of the same customer account. */
export interface QuoteRecipient {
  id: string;
  name: string;
  waId: string | null;
  email: string | null;
}

export interface IssueChoice {
  validDays: string;
  whatsApp: boolean;
  email: boolean;
  /** Ids of the recipients ticked. */
  to: string[];
  /** Addresses typed in, separated by commas, semicolons or spaces. */
  extraEmails: string;
  templateId: string;
}

/** Typed addresses, split and de-duplicated (case-insensitively), in the order typed. */
export function parseEmails(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[\s,;]+/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0 && !seen.has(a.toLowerCase()) && !!seen.add(a.toLowerCase()));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What stops the quotation being issued as chosen, or null. */
export function validateIssue(choice: IssueChoice, recipients: QuoteRecipient[]): string | null {
  if (parseValidDays(choice.validDays) === null) {
    return 'Valid for must be a whole number of days, 1 to 365.';
  }
  const to = recipients.filter((r) => choice.to.includes(r.id));
  const extra = parseEmails(choice.extraEmails);
  const bad = extra.find((a) => !EMAIL.test(a));
  if (choice.email && bad) return `${bad} is not an email address.`;
  if (choice.whatsApp && to.length === 0) return 'Tick who gets it on WhatsApp.';
  if (choice.email && to.length === 0 && extra.length === 0) {
    return 'Tick who gets it by email, or type an email address.';
  }
  return null;
}

/** Ticked recipients with no way to get it by the chosen channels: worth saying before issuing. */
export function unreachable(choice: IssueChoice, recipients: QuoteRecipient[]): string[] {
  return recipients
    .filter((r) => choice.to.includes(r.id))
    .filter((r) => (!choice.whatsApp || !r.waId) && (!choice.email || !r.email))
    .filter(() => choice.whatsApp || choice.email)
    .map((r) => r.name);
}
