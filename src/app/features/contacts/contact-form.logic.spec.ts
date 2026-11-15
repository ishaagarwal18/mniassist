import { describe, expect, it } from 'vitest';
import { DecisionRole } from '../../proxy/contacts';
import {
  BLANK_CONTACT_DRAFT,
  ContactDraft,
  buildContactPayload,
  cleanWhatsAppNumber,
  syncAccountToDraft,
  validateContactDraft,
} from './contact-form.logic';

describe('contact-form.logic', () => {
  describe('cleanWhatsAppNumber', () => {
    it('strips spaces, dashes, parentheses and plus signs', () => {
      expect(cleanWhatsAppNumber('+91 98210-12345')).toBe('919821012345');
      expect(cleanWhatsAppNumber('(020) 2543-9876')).toBe('02025439876');
    });

    it('handles empty or nullish strings safely', () => {
      expect(cleanWhatsAppNumber('')).toBe('');
      expect(cleanWhatsAppNumber(null as unknown as string)).toBe('');
    });
  });

  describe('validateContactDraft', () => {
    it('fails when WhatsApp number is missing or empty', () => {
      const draft: ContactDraft = { ...BLANK_CONTACT_DRAFT, waId: '' };
      expect(validateContactDraft(draft)).toContain('WhatsApp number is required');
    });

    it('fails when WhatsApp number is less than 10 digits', () => {
      const draft: ContactDraft = { ...BLANK_CONTACT_DRAFT, waId: '98210' };
      expect(validateContactDraft(draft)).toContain('at least 10 digits');
    });

    it('fails when WhatsApp number exceeds 15 digits', () => {
      const draft: ContactDraft = { ...BLANK_CONTACT_DRAFT, waId: '1234567890123456' };
      expect(validateContactDraft(draft)).toContain('cannot exceed 15 digits');
    });

    it('fails when email format is invalid', () => {
      const draft: ContactDraft = {
        ...BLANK_CONTACT_DRAFT,
        waId: '919821012345',
        email: 'invalid-email',
      };
      expect(validateContactDraft(draft)).toContain('valid email address');
    });

    it('fails when name exceeds 128 characters', () => {
      const draft: ContactDraft = {
        ...BLANK_CONTACT_DRAFT,
        waId: '919821012345',
        displayName: 'A'.repeat(129),
      };
      expect(validateContactDraft(draft)).toContain('cannot exceed 128 characters');
    });

    it('passes on a valid complete draft', () => {
      const draft: ContactDraft = {
        ...BLANK_CONTACT_DRAFT,
        waId: '919821012345',
        displayName: 'Vikram Joshi',
        email: 'vikram@example.com',
        designation: 'VP Engineering',
        companyName: 'Bajaj Heavy Works',
        city: 'Pune',
        state: 'Maharashtra',
      };
      expect(validateContactDraft(draft)).toBeNull();
    });

    it('passes when optional fields like email and name are empty', () => {
      const draft: ContactDraft = {
        ...BLANK_CONTACT_DRAFT,
        waId: '+91 98210 12345',
      };
      expect(validateContactDraft(draft)).toBeNull();
    });
  });

  describe('syncAccountToDraft', () => {
    it('populates company name, city, and state from selected account', () => {
      const draft: ContactDraft = { ...BLANK_CONTACT_DRAFT };
      const account = {
        id: 'acc-1',
        name: 'Bharat Forge Ltd.',
        city: 'Pune',
        state: 'Maharashtra',
      };

      const result = syncAccountToDraft(draft, account);
      expect(result.accountId).toBe('acc-1');
      expect(result.companyName).toBe('Bharat Forge Ltd.');
      expect(result.city).toBe('Pune');
      expect(result.state).toBe('Maharashtra');
    });

    it('preserves existing city and state if already filled in draft', () => {
      const draft: ContactDraft = {
        ...BLANK_CONTACT_DRAFT,
        city: 'Nashik',
        state: 'Maharashtra',
      };
      const account = {
        id: 'acc-2',
        name: 'Mahindra CIE',
        city: 'Pune',
        state: 'Maharashtra',
      };

      const result = syncAccountToDraft(draft, account);
      expect(result.city).toBe('Nashik');
      expect(result.companyName).toBe('Mahindra CIE');
    });

    it('clears accountId if account is null', () => {
      const draft: ContactDraft = { ...BLANK_CONTACT_DRAFT, accountId: 'acc-1' };
      const result = syncAccountToDraft(draft, null);
      expect(result.accountId).toBe('');
    });
  });

  describe('buildContactPayload', () => {
    it('builds a clean CreateUpdateContactDto payload', () => {
      const draft: ContactDraft = {
        waId: '+91 98210 12345',
        displayName: 'Neha Sharma',
        designation: 'Procurement Manager',
        companyName: 'Tata Motors',
        accountId: 'acc-tata',
        email: 'neha@tatamotors.com',
        website: 'https://tatamotors.com',
        city: 'Pune',
        state: 'Maharashtra',
        role: DecisionRole.Purchase,
      };

      const payload = buildContactPayload(draft, {
        languageCode: 'hi',
        ownerUserId: 'u-123',
        tags: ['vip', 'plant-visit'],
      });

      expect(payload.waId).toBe('919821012345');
      expect(payload.displayName).toBe('Neha Sharma');
      expect(payload.companyName).toBe('Tata Motors');
      expect(payload.accountId).toBe('acc-tata');
      expect(payload.emailAddress).toBe('neha@tatamotors.com');
      expect(payload.role).toBe(DecisionRole.Purchase);
      expect(payload.attributes?.['website']).toBe('https://tatamotors.com');
      expect(payload.languageCode).toBe('hi');
      expect(payload.ownerUserId).toBe('u-123');
      expect(payload.tags).toEqual(['vip', 'plant-visit']);
    });

    it('sends a cleared website as empty so the saved one is removed, with the custom fields', () => {
      const draft: ContactDraft = {
        waId: '919821012345',
        displayName: 'Neha',
        designation: '',
        companyName: '',
        accountId: '',
        email: '',
        website: '  ',
        city: '',
        state: '',
        role: DecisionRole.Purchase,
      };
      const payload = buildContactPayload(draft, undefined, { plant_site: 'Chakan' });
      expect(payload.attributes).toEqual({ plant_site: 'Chakan', website: '' });
    });
  });
});
