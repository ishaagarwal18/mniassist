import { describeGroup, describePermission } from './permission-text';

describe('describePermission', () => {
  it('explains ABP built-in keys in plain words', () => {
    const t = describePermission('FeatureManagement.ManageHostFeatures', 'Manage Host features');
    expect(t.title).toBe('Change platform-wide features');
    expect(t.detail).toContain('whole platform');
  });

  it('describes a module base permission as opening the screen', () => {
    const t = describePermission('AutoReach.Contacts', 'Contacts and consent', null);
    expect(t.title).toBe('Contacts and consent');
    expect(t.detail).toContain('Open Contacts and consent');
  });

  it('tells apart children that reuse the module label', () => {
    const create = describePermission(
      'AutoReach.Contacts.Create',
      'Contacts and consent',
      'Contacts and consent',
    );
    const del = describePermission(
      'AutoReach.Contacts.Delete',
      'Contacts and consent',
      'Contacts and consent',
    );
    expect(create.title).toBe('Add contacts');
    expect(del.title).toBe('Delete contacts');
  });

  it('builds readable nouns from multi-word and acronym modules', () => {
    expect(describePermission('AutoReach.SalesOrders.Cancel', 'x', 'x').title).toBe(
      'Cancel sales orders',
    );
    expect(describePermission('AutoReach.AmcContracts.Create', 'x', 'x').title).toBe(
      'Add AMC contracts',
    );
    expect(describePermission('AutoReach.Renewals.Settings', 'x', 'x').title).toBe(
      'Renewals settings',
    );
  });

  it('keeps a specific label from the API as the title', () => {
    const t = describePermission('AutoReach.Payments.Request', 'Request a payment', 'Payments');
    expect(t.title).toBe('Request a payment');
    expect(t.detail).toBe('Ask customers for payments.');
  });

  it('falls back to the words of an unknown action', () => {
    const t = describePermission('AutoReach.Things.DoSomethingNew', 'Things', 'Things');
    expect(t.title).toBe('Do something new');
    expect(t.detail).toBe('Do something new in Things.');
  });

  it('never shows a raw key as the title', () => {
    for (const key of [
      'AbpIdentity.Users.ManagePermissions',
      'SettingManagement.Emailing',
      'AutoReach.Inbox.ViewAll',
    ]) {
      expect(describePermission(key, key, 'Parent').title).not.toContain('.');
    }
  });
});

describe('describeGroup', () => {
  it('renames ABP groups', () => {
    expect(describeGroup('AbpIdentity', 'Identity management')).toBe('Users and roles');
    expect(describeGroup('AutoReach', 'AutoReach')).toBe('AutoReach');
    expect(describeGroup('Other', 'Other label')).toBe('Other label');
  });
});
