import type { ContactDto, CreateUpdateContactDto } from '../../proxy/contacts/models';

export enum DecisionRole {
  Unknown = 0,
  Maintenance = 1,
  Purchase = 2,
  Engineering = 3,
  PlantHead = 4,
  Dealer = 5,
}

export interface NewContactDraft {
  name: string;
  phone: string;
  email?: string;
  designation?: string;
  role?: DecisionRole;
}

export const BLANK_NEW_CONTACT_DRAFT: NewContactDraft = {
  name: '',
  phone: '',
  email: '',
  designation: '',
  role: DecisionRole.Unknown,
};

/**
 * Filter contacts for assignment to an account.
 * Excludes contacts already assigned to this account.
 * If query is non-empty, matches against name, phone, email, or company.
 */
export function filterAssignableContacts(
  allContacts: readonly ContactDto[],
  currentAccountId: string,
  searchFilter = '',
): ContactDto[] {
  const q = searchFilter.trim().toLowerCase();
  return allContacts.filter((c) => {
    if (c.accountId === currentAccountId) return false;
    if (!q) return true;
    const name = (c.displayName ?? '').toLowerCase();
    const phone = (c.waId ?? '').toLowerCase();
    const email = (c.emailAddress ?? '').toLowerCase();
    const company = (c.companyName ?? '').toLowerCase();
    const desig = (c.designation ?? '').toLowerCase();
    return (
      name.includes(q) ||
      phone.includes(q) ||
      email.includes(q) ||
      company.includes(q) ||
      desig.includes(q)
    );
  });
}

/**
 * Validates new contact input fields.
 */
export function validateNewContactDraft(draft: NewContactDraft): string | null {
  if (!draft.name || !draft.name.trim()) {
    return 'Contact name is required.';
  }
  const digits = (draft.phone ?? '').replace(/[^\d]/g, '');
  if (digits.length < 10) {
    return 'Enter a valid WhatsApp/mobile number with at least 10 digits.';
  }
  if (draft.email && draft.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(draft.email.trim())) {
      return 'Enter a valid email address.';
    }
  }
  return null;
}

/**
 * Builds the CreateUpdateContactDto to create a new contact and assign it to an account.
 */
export function buildContactCreatePayload(
  account: { id: string; name: string },
  draft: NewContactDraft,
): CreateUpdateContactDto {
  const digits = draft.phone.replace(/[^\d]/g, '');
  return {
    waId: digits,
    displayName: draft.name.trim(),
    companyName: account.name,
    accountId: account.id,
    designation: draft.designation?.trim() || undefined,
    emailAddress: draft.email?.trim() || undefined,
    role: draft.role ?? DecisionRole.Unknown,
  };
}

/**
 * Builds the CreateUpdateContactDto to assign an existing contact to an account.
 */
export function buildContactAssignPayload(
  contact: ContactDto,
  account: { id: string; name: string },
): CreateUpdateContactDto {
  return {
    waId: contact.waId ?? '',
    displayName: contact.displayName,
    companyName: account.name,
    accountId: account.id,
    designation: contact.designation,
    emailAddress: contact.emailAddress,
    role: contact.role,
    languageCode: contact.languageCode,
    city: contact.city,
    state: contact.state,
    ownerUserId: contact.ownerUserId,
    tags: contact.tags ? [...contact.tags] : undefined,
    attributes: contact.attributes ? { ...contact.attributes } : undefined,
  };
}

/**
 * Builds the CreateUpdateContactDto to unlink a contact from its account.
 */
export function buildContactUnlinkPayload(contact: ContactDto): CreateUpdateContactDto {
  return {
    waId: contact.waId ?? '',
    displayName: contact.displayName,
    companyName: null,
    accountId: null,
    designation: contact.designation,
    emailAddress: contact.emailAddress,
    role: contact.role,
    languageCode: contact.languageCode,
    city: contact.city,
    state: contact.state,
    ownerUserId: contact.ownerUserId,
    tags: contact.tags ? [...contact.tags] : undefined,
    attributes: contact.attributes ? { ...contact.attributes } : undefined,
  };
}
