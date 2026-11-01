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

/**
 * Initial mock people dataset for development and offline testing.
 */
export const INITIAL_MOCK_PEOPLE: ContactDto[] = [
  {
    id: 'cnt-1',
    displayName: 'Rajesh Sharma',
    waId: '919822011001',
    companyName: 'Deccan Valves',
    accountId: 'acc-1',
    designation: 'Managing Director',
    role: DecisionRole.PlantHead,
    emailAddress: 'rajesh.sharma@deccanvalves.com',
    city: 'Pune',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-2',
    displayName: 'Sandeep Rao',
    waId: '919822011002',
    companyName: 'Deccan Valves — Pune plant',
    accountId: 'acc-4',
    designation: 'Plant Head & Operations',
    role: DecisionRole.Engineering,
    emailAddress: 'sandeep.rao@deccanvalves.com',
    city: 'Pune',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-3',
    displayName: 'Amit Verma',
    waId: '919822011003',
    companyName: 'Deccan Valves — Pune plant',
    accountId: 'acc-4',
    designation: 'Quality Control Lead',
    role: DecisionRole.Engineering,
    emailAddress: 'amit.verma@deccanvalves.com',
    city: 'Pune',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-4',
    displayName: 'Kavita Deshmukh',
    waId: '919822011004',
    companyName: 'Deccan Valves — Pune plant',
    accountId: 'acc-4',
    designation: 'Senior Purchase Executive',
    role: DecisionRole.Purchase,
    emailAddress: 'kavita.d@deccanvalves.com',
    city: 'Pune',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-5',
    displayName: 'Nilesh Patil',
    waId: '919822011005',
    companyName: 'Deccan Valves — Pune plant',
    accountId: 'acc-4',
    designation: 'Maintenance Engineer',
    role: DecisionRole.Maintenance,
    emailAddress: 'nilesh.patil@deccanvalves.com',
    city: 'Pune',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-6',
    displayName: 'Ganesh Shinde',
    waId: '919822011006',
    companyName: 'Deccan Valves — Nashik plant',
    accountId: 'acc-5',
    designation: 'Works Manager',
    role: DecisionRole.PlantHead,
    emailAddress: 'ganesh.s@deccanvalves.com',
    city: 'Nashik',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-7',
    displayName: 'Pooja Kulkarni',
    waId: '919822011007',
    companyName: 'Deccan Valves — Nashik plant',
    accountId: 'acc-5',
    designation: 'Stores & Spares Incharge',
    role: DecisionRole.Purchase,
    emailAddress: 'pooja.k@deccanvalves.com',
    city: 'Nashik',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-8',
    displayName: 'Priya Nambiar',
    waId: '919936022001',
    companyName: 'Kohinoor Instruments',
    accountId: 'acc-2',
    designation: 'Procurement Manager',
    role: DecisionRole.Purchase,
    emailAddress: 'priya.n@kohinoor-instruments.com',
    city: 'Nashik',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-9',
    displayName: 'Anand Kulkarni',
    waId: '919936022002',
    companyName: 'Kohinoor Instruments',
    accountId: 'acc-2',
    designation: 'Technical Director',
    role: DecisionRole.PlantHead,
    emailAddress: 'anand.k@kohinoor-instruments.com',
    city: 'Nashik',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-10',
    displayName: 'Devendra Joshi',
    waId: '919712033001',
    companyName: 'Sanand Press Works',
    accountId: 'acc-3',
    designation: 'General Manager',
    role: DecisionRole.PlantHead,
    emailAddress: 'd.joshi@sanandpress.com',
    city: 'Ahmedabad',
    state: 'Gujarat',
  },
  {
    id: 'cnt-11',
    displayName: 'Bhavin Patel',
    waId: '919712033002',
    companyName: 'Sanand Press Works',
    accountId: 'acc-3',
    designation: 'Toolroom Supervisor',
    role: DecisionRole.Maintenance,
    emailAddress: 'bhavin.p@sanandpress.com',
    city: 'Ahmedabad',
    state: 'Gujarat',
  },
  {
    id: 'cnt-12',
    displayName: 'Hiren Shah',
    waId: '919712033003',
    companyName: 'Sanand Press Works',
    accountId: 'acc-3',
    designation: 'Supply Chain Officer',
    role: DecisionRole.Purchase,
    emailAddress: 'hiren.shah@sanandpress.com',
    city: 'Ahmedabad',
    state: 'Gujarat',
  },
  {
    id: 'cnt-13',
    displayName: 'Rohan Mehta',
    waId: '919823456781',
    companyName: 'Mehta Engineering',
    accountId: null,
    designation: 'Commercial Head',
    role: DecisionRole.Purchase,
    emailAddress: 'rohan@mehta-eng.com',
    city: 'Pune',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-14',
    displayName: 'Sunil Gokhale',
    waId: '919823456782',
    companyName: 'Precision Tech',
    accountId: null,
    designation: 'Project Lead',
    role: DecisionRole.Engineering,
    emailAddress: 'sunil@precisiontech.in',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
  {
    id: 'cnt-15',
    displayName: 'Meera Iyer',
    waId: '919823456783',
    companyName: 'Apex Hydraulics',
    accountId: null,
    designation: 'Purchase Executive',
    role: DecisionRole.Purchase,
    emailAddress: 'meera.iyer@apexhydraulics.com',
    city: 'Bengaluru',
    state: 'Karnataka',
  },
];
