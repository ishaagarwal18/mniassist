import { profileChanges, profileForm } from './number-health';

describe('business profile form', () => {
  const original = profileForm({ about: 'Drives', email: 'sales@acme.in', vertical: 'RETAIL' });

  it('fills blanks for fields Meta has no value for', () => {
    expect(original).toEqual({
      about: 'Drives',
      description: '',
      email: 'sales@acme.in',
      website: '',
      address: '',
      vertical: 'RETAIL',
    });
  });

  it('sends nothing when nothing changed', () => {
    expect(profileChanges({ ...original, about: ' Drives ' }, original)).toEqual({});
  });

  it('sends only the changed fields', () => {
    expect(profileChanges({ ...original, address: 'Pune' }, original)).toEqual({ address: 'Pune' });
  });

  it('sends an emptied field as blank so WhatsApp clears it', () => {
    expect(profileChanges({ ...original, about: '' }, original)).toEqual({ about: '' });
  });
});
