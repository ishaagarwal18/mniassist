import { describe, expect, it } from 'vitest';
import { resolveNavTrail } from './nav-trail.logic';

describe('resolveNavTrail breadcrumb logic', () => {
  it('resolves Audience & Contacts -> Contacts for /contacts', () => {
    const trail = resolveNavTrail('/contacts', 'Contacts');
    expect(trail.groupHeading).toBe('Audience & Contacts');
    expect(trail.groupPrimaryRoute).toBe('/contacts');
    expect(trail.parentItem).toBeNull();
    expect(trail.activeItem?.label).toBe('Contacts');
    expect(trail.siblingItems.map((i) => i.label)).toContain('Contacts');
    expect(trail.siblingItems.map((i) => i.label)).toContain('Audiences');
    expect(trail.siblingItems.map((i) => i.label)).toContain('Accounts');
  });

  it('resolves Audience & Contacts -> Audience builder for /contacts/segments', () => {
    const trail = resolveNavTrail('/contacts/segments', 'Audience builder');
    expect(trail.groupHeading).toBe('Audience & Contacts');
    expect(trail.groupPrimaryRoute).toBe('/contacts');
    expect(trail.parentItem).toBeNull();
    expect(trail.activeItem?.label).toBe('Audiences');
  });

  it('resolves Audience & Contacts for /contacts/accounts and /contacts/360', () => {
    const accountsTrail = resolveNavTrail('/contacts/accounts', 'Accounts');
    expect(accountsTrail.groupHeading).toBe('Audience & Contacts');

    const c360Trail = resolveNavTrail('/contacts/360', 'Customer 360');
    expect(c360Trail.groupHeading).toBe('Audience & Contacts');
  });

  it('resolves Marketing & Campaigns -> Campaigns for /campaigns', () => {
    const trail = resolveNavTrail('/campaigns', 'Campaigns');
    expect(trail.groupHeading).toBe('Marketing & Campaigns');
    expect(trail.groupPrimaryRoute).toBe('/campaigns');
    expect(trail.activeItem?.label).toBe('Campaigns');
  });

  it('resolves nested sub-page parent item for /templates/new', () => {
    const trail = resolveNavTrail('/templates/new', 'New template');
    expect(trail.groupHeading).toBe('Marketing & Campaigns');
    expect(trail.parentItem?.label).toBe('Templates');
    expect(trail.parentItem?.route).toBe('/templates');
  });

  it('resolves Sales & CRM for /quotations and /enquiries', () => {
    const quoteTrail = resolveNavTrail('/quotations', 'Quotations');
    expect(quoteTrail.groupHeading).toBe('Sales & CRM');

    const enqTrail = resolveNavTrail('/enquiries', 'Enquiries');
    expect(enqTrail.groupHeading).toBe('Sales & CRM');
  });

  it('resolves Voice & Calling for /calls', () => {
    const trail = resolveNavTrail('/calls', 'Calls');
    expect(trail.groupHeading).toBe('Voice & Calling');
  });

  it('resolves Supply Chain & Inventory for /sales/orders', () => {
    const trail = resolveNavTrail('/sales/orders', 'Sales orders');
    expect(trail.groupHeading).toBe('Supply Chain & Inventory');
  });

  it('resolves Manufacturing for /manufacturing/bom', () => {
    const trail = resolveNavTrail('/manufacturing/bom', 'Bill of materials');
    expect(trail.groupHeading).toBe('Manufacturing');
  });

  it('resolves Field Service & AMC for /helpdesk', () => {
    const trail = resolveNavTrail('/helpdesk', 'Helpdesk');
    expect(trail.groupHeading).toBe('Field Service & AMC');
  });

  it('resolves Home for /getting-started and null group for /home root', () => {
    const gsTrail = resolveNavTrail('/getting-started', 'Get started');
    expect(gsTrail.groupHeading).toBe('Home');
    expect(gsTrail.groupPrimaryRoute).toBe('/home');

    const homeTrail = resolveNavTrail('/home', 'Home');
    expect(homeTrail.groupHeading).toBeNull();
  });

  it('respects explicit custom group when provided', () => {
    const trail = resolveNavTrail('/contacts', 'Custom Contacts', 'Audience & Contacts');
    expect(trail.groupHeading).toBe('Audience & Contacts');
    expect(trail.siblingItems.length).toBeGreaterThan(0);
  });

  it('ignores query parameters and fragments in URL matching', () => {
    const trail = resolveNavTrail('/contacts?tab=all#filters', 'Contacts');
    expect(trail.groupHeading).toBe('Audience & Contacts');
    expect(trail.activeItem?.label).toBe('Contacts');
  });
});
