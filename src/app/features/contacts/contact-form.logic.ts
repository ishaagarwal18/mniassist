import { DecisionRole } from '../../proxy/contacts';
import type { CreateUpdateContactDto } from '../../proxy/contacts/models';

export interface ContactDraft {
  waId: string;
  displayName: string;
  designation: string;
  companyName: string;
  accountId: string;
  email: string;
  website: string;
  city: string;
  state: string;
  role: DecisionRole;
}

export const BLANK_CONTACT_DRAFT: ContactDraft = {
  waId: '',
  displayName: '',
  designation: '',
  companyName: '',
  accountId: '',
  email: '',
  website: '',
  city: '',
  state: '',
  role: DecisionRole.Maintenance,
};

export const DECISION_ROLES = [
  { value: DecisionRole.Maintenance, label: 'Maintenance' },
  { value: DecisionRole.Purchase, label: 'Purchase' },
  { value: DecisionRole.Engineering, label: 'Engineering' },
  { value: DecisionRole.PlantHead, label: 'Plant head' },
  { value: DecisionRole.Dealer, label: 'Dealer' },
] as const;

export function cleanWhatsAppNumber(raw: string): string {
  return (raw || '').replace(/[^\d]/g, '');
}

export function validateContactDraft(draft: ContactDraft): string | null {
  const wa = cleanWhatsAppNumber(draft.waId);
  if (!wa) {
    return 'WhatsApp number is required.';
  }
  if (wa.length < 10) {
    return 'Enter the WhatsApp number in international format, e.g. 919821012345 (at least 10 digits).';
  }
  if (wa.length > 15) {
    return 'WhatsApp number cannot exceed 15 digits.';
  }
  if (draft.displayName && draft.displayName.trim().length > 128) {
    return 'Name cannot exceed 128 characters.';
  }
  if (draft.email && draft.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(draft.email.trim())) {
      return 'Please enter a valid email address.';
    }
  }
  if (draft.website && draft.website.trim().length > 256) {
    return 'Website URL cannot exceed 256 characters.';
  }
  return null;
}

export function syncAccountToDraft(
  draft: ContactDraft,
  account:
    { id: string; name: string; city?: string | null; state?: string | null } | null | undefined,
): ContactDraft {
  if (!account) {
    return { ...draft, accountId: '' };
  }
  return {
    ...draft,
    accountId: account.id,
    companyName: account.name,
    city: draft.city || account.city || '',
    state: draft.state || account.state || '',
  };
}

export function buildContactPayload(
  draft: ContactDraft,
  storedFields?: {
    languageCode?: string;
    ownerUserId?: string | null;
    tags?: readonly string[];
  },
): CreateUpdateContactDto {
  const waId = cleanWhatsAppNumber(draft.waId);
  const attributes: Record<string, string> = {};
  if (draft.website.trim()) {
    attributes['website'] = draft.website.trim();
  }

  return {
    waId,
    displayName: draft.displayName.trim() || undefined,
    companyName: draft.companyName.trim() || undefined,
    accountId: draft.accountId || null,
    designation: draft.designation.trim() || undefined,
    emailAddress: draft.email.trim() || null,
    city: draft.city.trim() || undefined,
    state: draft.state.trim() || undefined,
    role: draft.role,
    languageCode: storedFields?.languageCode || 'en',
    ownerUserId: storedFields?.ownerUserId ?? null,
    tags: [...(storedFields?.tags ?? [])],
    attributes,
  };
}
