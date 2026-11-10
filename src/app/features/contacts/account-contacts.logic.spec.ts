import { describe, expect, it } from 'vitest';
import type { ContactDto } from '../../proxy/contacts/models';
import {
  buildContactAssignPayload,
  buildContactCreatePayload,
  buildContactUnlinkPayload,
  DecisionRole,
  filterAssignableContacts,
  validateNewContactDraft,
} from './account-contacts.logic';

/** Test contacts across two accounts. */
const PEOPLE: ContactDto[] = [
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

describe('account-contacts.logic', () => {
  const account = { id: 'acc-1', name: 'Deccan Valves' };

  it('filters assignable contacts by excluding already assigned ones', () => {
    const list = filterAssignableContacts(PEOPLE, 'acc-1');
    expect(list.some((c) => c.id === 'cnt-1')).toBe(false); // cnt-1 is on acc-1
    expect(list.some((c) => c.id === 'cnt-2')).toBe(true); // cnt-2 is on acc-4
    expect(list.some((c) => c.id === 'cnt-13')).toBe(true); // cnt-13 is unassigned
  });

  it('filters assignable contacts by search query', () => {
    const list = filterAssignableContacts(PEOPLE, 'acc-1', 'Rohan');
    expect(list).toHaveLength(1);
    expect(list[0].displayName).toBe('Rohan Mehta');

    const phoneMatch = filterAssignableContacts(PEOPLE, 'acc-1', '919823456782');
    expect(phoneMatch).toHaveLength(1);
    expect(phoneMatch[0].displayName).toBe('Sunil Gokhale');
  });

  it('validates new contact draft fields', () => {
    expect(validateNewContactDraft({ name: '', phone: '919822011000' })).toContain(
      'name is required',
    );
    expect(validateNewContactDraft({ name: 'Test', phone: '123' })).toContain('at least 10 digits');
    expect(
      validateNewContactDraft({ name: 'Test', phone: '919822011000', email: 'invalid-email' }),
    ).toContain('valid email');
    expect(
      validateNewContactDraft({ name: 'Test', phone: '919822011000', email: 'valid@example.com' }),
    ).toBeNull();
  });

  it('builds contact creation payload', () => {
    const payload = buildContactCreatePayload(account, {
      name: 'Vikas Sharma',
      phone: '+91 (982) 201-1999',
      email: 'vikas@deccanvalves.com',
      designation: 'VP Engineering',
      role: DecisionRole.Engineering,
    });

    expect(payload.displayName).toBe('Vikas Sharma');
    expect(payload.waId).toBe('919822011999');
    expect(payload.companyName).toBe('Deccan Valves');
    expect(payload.accountId).toBe('acc-1');
    expect(payload.designation).toBe('VP Engineering');
    expect(payload.role).toBe(DecisionRole.Engineering);
  });

  it('builds contact assign payload preserving existing fields', () => {
    const sourceContact = PEOPLE.find((c) => c.id === 'cnt-13')!;
    const payload = buildContactAssignPayload(sourceContact, account);

    expect(payload.accountId).toBe('acc-1');
    expect(payload.companyName).toBe('Deccan Valves');
    expect(payload.displayName).toBe(sourceContact.displayName);
    expect(payload.waId).toBe(sourceContact.waId);
  });

  it('builds contact unlink payload clearing accountId', () => {
    const sourceContact = PEOPLE.find((c) => c.id === 'cnt-1')!;
    const payload = buildContactUnlinkPayload(sourceContact);

    expect(payload.accountId).toBeNull();
    expect(payload.companyName).toBeNull();
    expect(payload.displayName).toBe(sourceContact.displayName);
  });
});
