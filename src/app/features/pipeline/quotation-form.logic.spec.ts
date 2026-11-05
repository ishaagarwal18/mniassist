import { describe, expect, it } from 'vitest';
import { QuotationState, QuotePriceSource } from '../../proxy/pipeline';
import {
  QuoteHeader,
  parseEmails,
  unreachable,
  validateIssue,
  canIssueState,
  isQuotationLocked,
  parseValidDays,
  quotationPayload,
  validateQuotation,
} from './quotation-form.logic';
import { blankRow } from './quote-pricing';

const line = (description: string, quantity = '1') => ({
  ...blankRow(1),
  description,
  quantity,
  price: '1250',
});

const enquiryHeader: QuoteHeader = { mode: 'enquiry', enquiryId: 'e-1', contactId: '', title: '' };
const manualHeader: QuoteHeader = {
  mode: 'manual',
  enquiryId: 'e-ignored',
  contactId: 'c-1',
  title: '  Walk-in spares  ',
};

describe('quotation-form.logic', () => {
  it('needs an enquiry, or a customer for a manual quotation', () => {
    expect(validateQuotation({ ...enquiryHeader, enquiryId: '' }, [], false)).toContain('enquiry');
    expect(validateQuotation({ ...manualHeader, contactId: '' }, [], false)).toBe(
      'Pick the customer this quotation is for.',
    );
    expect(validateQuotation(manualHeader, [], false)).toBeNull();
  });

  it('checks every line, and needs one before issuing', () => {
    expect(validateQuotation(null, [line('  ')], false)).toBe('Every line needs a description.');
    expect(validateQuotation(null, [line('Contactor', '0')], false)).toBe(
      'Every line needs a quantity above zero.',
    );
    expect(validateQuotation(null, [], true)).toBe('Add at least one line before issuing.');
    expect(validateQuotation(null, [line('Contactor')], true)).toBeNull();
  });

  it('reads valid-for days as a whole number from 1 to 365', () => {
    expect(parseValidDays(' 30 ')).toBe(30);
    expect(parseValidDays('0')).toBeNull();
    expect(parseValidDays('2.5')).toBeNull();
    expect(parseValidDays('366')).toBeNull();
  });

  it('locks decided quotations and issues drafts and earlier issues again', () => {
    expect(isQuotationLocked(QuotationState.Won)).toBe(true);
    expect(isQuotationLocked(QuotationState.Issued)).toBe(false);
    expect(canIssueState(QuotationState.Draft)).toBe(true);
    expect(canIssueState(QuotationState.Issued)).toBe(true);
    expect(canIssueState(QuotationState.Lost)).toBe(false);
  });

  it('sends a manual quotation with its customer and title, and no enquiry', () => {
    const body = quotationPayload(manualHeader, null, '', 1800, [line('Contactor 32 A', '4')]);
    expect(body.enquiryId).toBeNull();
    expect(body.contactId).toBe('c-1');
    expect(body.title).toBe('Walk-in spares');
    expect(body.priceListId).toBeNull();
    expect(body.lines?.[0]).toMatchObject({
      order: 1,
      description: 'Contactor 32 A',
      quantity: 4,
      unitPriceInPaise: 125_000,
      priceSource: QuotePriceSource.Manual,
      useCataloguePrice: false,
    });
  });

  it('keeps an existing quotation on its enquiry', () => {
    const body = quotationPayload(null, 'e-9', 'pl-1', 1200, []);
    expect(body).toMatchObject({ enquiryId: 'e-9', contactId: null, priceListId: 'pl-1' });
  });
});

describe('quotation-form.logic issuing', () => {
  const people = [
    { id: 'c-1', name: 'Meera', waId: '919800000001', email: 'meera@deccan.example' },
    { id: 'c-2', name: 'Kiran', waId: null, email: null },
  ];
  const choice = {
    validDays: '30',
    whatsApp: true,
    email: false,
    to: ['c-1'],
    extraEmails: '',
    templateId: '',
  };

  it('splits typed addresses and drops repeats', () => {
    expect(parseEmails(' a@x.in, b@x.in;A@x.in  c@x.in ')).toEqual(['a@x.in', 'b@x.in', 'c@x.in']);
    expect(parseEmails('')).toEqual([]);
  });

  it('needs someone to send to on each chosen channel', () => {
    expect(validateIssue(choice, people)).toBeNull();
    expect(validateIssue({ ...choice, to: [] }, people)).toBe('Tick who gets it on WhatsApp.');
    expect(validateIssue({ ...choice, whatsApp: false, email: true, to: [] }, people)).toContain(
      'type an email address',
    );
    expect(
      validateIssue(
        { ...choice, whatsApp: false, email: true, to: [], extraEmails: 'buy@deccan.example' },
        people,
      ),
    ).toBeNull();
  });

  it('refuses a typed address that is not one, and bad days', () => {
    expect(validateIssue({ ...choice, email: true, extraEmails: 'nope' }, people)).toBe(
      'nope is not an email address.',
    );
    expect(validateIssue({ ...choice, validDays: '0' }, people)).toContain('Valid for');
  });

  it('names ticked people the chosen channels cannot reach', () => {
    expect(unreachable({ ...choice, to: ['c-1', 'c-2'], email: true }, people)).toEqual(['Kiran']);
    expect(unreachable({ ...choice, whatsApp: false, to: ['c-1'] }, people)).toEqual([]);
  });
});
