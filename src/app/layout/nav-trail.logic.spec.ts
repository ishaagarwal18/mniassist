import { describe, expect, it } from 'vitest';
import { resolveNavTrail } from './nav-trail.logic';

describe('resolveNavTrail breadcrumb logic', () => {
  it('resolves Customers -> Contacts for /contacts', () => {
    const trail = resolveNavTrail('/contacts', 'Contacts');
    expect(trail.groupHeading).toBe('Customers');
    expect(trail.groupPrimaryRoute).toBe('/contacts');
    expect(trail.parentItem).toBeNull();
    expect(trail.activeItem?.label).toBe('Contacts');
    expect(trail.siblingItems.map((i) => i.label)).toContain('Contacts');
    expect(trail.siblingItems.map((i) => i.label)).toContain('Accounts');
    expect(trail.siblingItems.map((i) => i.label)).toContain('Customer 360');
  });

  it('resolves Marketing -> Audiences for /contacts/segments (audiences are for campaigns)', () => {
    const trail = resolveNavTrail('/contacts/segments', 'Audience builder');
    expect(trail.groupHeading).toBe('Marketing');
    expect(trail.groupPrimaryRoute).toBe('/campaigns');
    expect(trail.parentItem).toBeNull();
    expect(trail.activeItem?.label).toBe('Audiences');
  });

  it('resolves Customers for /contacts/accounts and /contacts/360', () => {
    expect(resolveNavTrail('/contacts/accounts', 'Accounts').groupHeading).toBe('Customers');
    expect(resolveNavTrail('/contacts/360', 'Customer 360').groupHeading).toBe('Customers');
  });

  it('resolves Marketing -> Campaigns for /campaigns', () => {
    const trail = resolveNavTrail('/campaigns', 'Campaigns');
    expect(trail.groupHeading).toBe('Marketing');
    expect(trail.groupPrimaryRoute).toBe('/campaigns');
    expect(trail.activeItem?.label).toBe('Campaigns');
  });

  it('resolves nested sub-page parent item for /templates/new', () => {
    const trail = resolveNavTrail('/templates/new', 'New template');
    expect(trail.groupHeading).toBe('Marketing');
    expect(trail.parentItem?.label).toBe('Templates');
    expect(trail.parentItem?.route).toBe('/templates');
  });

  it('resolves Sales for /quotations and /enquiries', () => {
    expect(resolveNavTrail('/quotations', 'Quotations').groupHeading).toBe('Sales');
    expect(resolveNavTrail('/enquiries', 'Enquiries').groupHeading).toBe('Sales');
  });

  it('resolves Calls for /calls and for the IVR set-up', () => {
    expect(resolveNavTrail('/calls', 'Calls').groupHeading).toBe('Calls');
    expect(resolveNavTrail('/channels/voice-ivr', 'Voice / IVR').groupHeading).toBe('Calls');
  });

  it('resolves Orders & invoices for sales orders, invoices, re-orders and collections', () => {
    for (const path of ['/sales/orders', '/sales/invoices', '/reorders', '/collections']) {
      expect(resolveNavTrail(path, '').groupHeading).toBe('Orders & invoices');
    }
  });

  it('resolves Purchasing & stock for purchasing and stock pages', () => {
    for (const path of ['/purchasing', '/purchasing/grn', '/stock', '/stock/planning']) {
      expect(resolveNavTrail(path, '').groupHeading).toBe('Purchasing & stock');
    }
  });

  it('resolves Manufacturing for /manufacturing/bom', () => {
    const trail = resolveNavTrail('/manufacturing/bom', 'Bill of materials');
    expect(trail.groupHeading).toBe('Manufacturing');
  });

  it('resolves Service for /helpdesk', () => {
    expect(resolveNavTrail('/helpdesk', 'Helpdesk').groupHeading).toBe('Service');
  });

  it('keeps setup pages out of the daily-work groups', () => {
    expect(resolveNavTrail('/settings/email-sending', '').groupHeading).toBe('Channels');
    expect(resolveNavTrail('/settings/agency', '').groupHeading).toBe('Partners');
    expect(resolveNavTrail('/documents/price-lists', '').groupHeading).toBe('Products & documents');
    expect(resolveNavTrail('/settings/teams', '').groupHeading).toBe('Administration');
    expect(resolveNavTrail('/billing/invoices', '').groupHeading).toBe('Billing');
  });

  it('resolves Home for /getting-started and null group for /home root', () => {
    const gsTrail = resolveNavTrail('/getting-started', 'Get started');
    expect(gsTrail.groupHeading).toBe('Home');
    expect(gsTrail.groupPrimaryRoute).toBe('/home');

    const homeTrail = resolveNavTrail('/home', 'Home');
    expect(homeTrail.groupHeading).toBeNull();
  });

  it('respects explicit custom group when provided', () => {
    const trail = resolveNavTrail('/contacts', 'Custom Contacts', 'Customers');
    expect(trail.groupHeading).toBe('Customers');
    expect(trail.siblingItems.length).toBeGreaterThan(0);
  });

  it('ignores query parameters and fragments in URL matching', () => {
    const trail = resolveNavTrail('/contacts?tab=all#filters', 'Contacts');
    expect(trail.groupHeading).toBe('Customers');
    expect(trail.activeItem?.label).toBe('Contacts');
  });
});
