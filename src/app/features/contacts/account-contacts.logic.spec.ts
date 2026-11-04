import { describe, expect, it } from 'vitest';
import {
  buildContactAssignPayload,
  buildContactCreatePayload,
  buildContactUnlinkPayload,
  DecisionRole,
  filterAssignableContacts,
  INITIAL_MOCK_PEOPLE,
  validateNewContactDraft,
} from './account-contacts.logic';

describe('account-contacts.logic', () => {
  const account = { id: 'acc-1', name: 'Deccan Valves' };

  it('filters assignable contacts by excluding already assigned ones', () => {
    const list = filterAssignableContacts(INITIAL_MOCK_PEOPLE, 'acc-1');
    expect(list.some((c) => c.id === 'cnt-1')).toBe(false); // cnt-1 is on acc-1
    expect(list.some((c) => c.id === 'cnt-2')).toBe(true); // cnt-2 is on acc-4
    expect(list.some((c) => c.id === 'cnt-13')).toBe(true); // cnt-13 is unassigned
  });

  it('filters assignable contacts by search query', () => {
    const list = filterAssignableContacts(INITIAL_MOCK_PEOPLE, 'acc-1', 'Rohan');
    expect(list).toHaveLength(1);
    expect(list[0].displayName).toBe('Rohan Mehta');

    const phoneMatch = filterAssignableContacts(INITIAL_MOCK_PEOPLE, 'acc-1', '919823456782');
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
    const sourceContact = INITIAL_MOCK_PEOPLE.find((c) => c.id === 'cnt-13')!;
    const payload = buildContactAssignPayload(sourceContact, account);

    expect(payload.accountId).toBe('acc-1');
    expect(payload.companyName).toBe('Deccan Valves');
    expect(payload.displayName).toBe(sourceContact.displayName);
    expect(payload.waId).toBe(sourceContact.waId);
  });

  it('builds contact unlink payload clearing accountId', () => {
    const sourceContact = INITIAL_MOCK_PEOPLE.find((c) => c.id === 'cnt-1')!;
    const payload = buildContactUnlinkPayload(sourceContact);

    expect(payload.accountId).toBeNull();
    expect(payload.companyName).toBeNull();
    expect(payload.displayName).toBe(sourceContact.displayName);
  });
});
