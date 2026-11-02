import { describe, expect, it } from 'vitest';
import { LeadSource } from '../../proxy/pipeline';
import {
  BLANK_ENQUIRY_DRAFT,
  EnquiryDraft,
  parseEstimatedValueInPaise,
  validateEnquiryDraft,
} from './enquiry-form.logic';

describe('enquiry-form.logic', () => {
  it('fails validation when contact is not selected', () => {
    const draft: EnquiryDraft = {
      ...BLANK_ENQUIRY_DRAFT,
      contactId: '',
      title: 'Packaging Line Automation',
    };
    expect(validateEnquiryDraft(draft)).toBe('Pick the contact this enquiry is for.');
  });

  it('fails validation when title is blank', () => {
    const draft: EnquiryDraft = {
      ...BLANK_ENQUIRY_DRAFT,
      contactId: 'c-101',
      title: '   ',
    };
    expect(validateEnquiryDraft(draft)).toBe('Give the enquiry a short title.');
  });

  it('fails validation when title exceeds 256 characters', () => {
    const draft: EnquiryDraft = {
      ...BLANK_ENQUIRY_DRAFT,
      contactId: 'c-101',
      title: 'T'.repeat(257),
    };
    expect(validateEnquiryDraft(draft)).toBe('Enquiry title cannot exceed 256 characters.');
  });

  it('passes on valid complete enquiry draft', () => {
    const draft: EnquiryDraft = {
      contactId: 'c-101',
      contactLabel: 'Ramesh Patel · Bharat Forge',
      pipelineId: 'pipe-industrial',
      title: '50 HP VFD Control Panel Retrofit',
      requirement: 'Delivery needed by Q4; IP55 enclosure required',
      valueRupees: '350000',
      source: LeadSource.Exhibition,
    };
    expect(validateEnquiryDraft(draft)).toBeNull();
  });

  describe('parseEstimatedValueInPaise', () => {
    it('parses formatted rupee strings into paise', () => {
      expect(parseEstimatedValueInPaise('₹3,50,000')).toBe(35000000);
      expect(parseEstimatedValueInPaise('12500.50')).toBe(1250050);
    });

    it('handles numeric numbers directly', () => {
      expect(parseEstimatedValueInPaise(50000)).toBe(5000000);
    });

    it('returns undefined for empty or 0 amounts', () => {
      expect(parseEstimatedValueInPaise('')).toBeUndefined();
      expect(parseEstimatedValueInPaise('0')).toBeUndefined();
      expect(parseEstimatedValueInPaise(null)).toBeUndefined();
      expect(parseEstimatedValueInPaise(undefined)).toBeUndefined();
    });
  });
});
