import { describe, expect, it } from 'vitest';

import { isCockpitPath, nextOrigin } from './cockpit-origin.logic';

const visit = { url: '/contacts/c1/360', name: 'Suresh Patil' };

describe('cockpit origin', () => {
  it('recognises the three cockpit routes', () => {
    expect(isCockpitPath('/contacts/360')).toBe(true);
    expect(isCockpitPath('/contacts/c1/360')).toBe(true);
    expect(isCockpitPath('/contacts/accounts/a1/360')).toBe(true);
    expect(isCockpitPath('/contacts/accounts')).toBe(false);
    expect(isCockpitPath('/sales/orders')).toBe(false);
  });

  it('starts when a screen is opened from a customer cockpit', () => {
    const o = nextOrigin(null, visit, '/contacts/c1/360', '/sales/orders?customer=c1&name=Suresh');
    expect(o).toEqual({
      kind: 'customer',
      cockpitUrl: '/contacts/c1/360',
      name: 'Suresh Patil',
      targetPath: '/sales/orders',
    });
  });

  it('keeps the account cockpit query (subsidiaries) for the way back', () => {
    const o = nextOrigin(
      null,
      null,
      '/contacts/accounts/a1/360?subsidiaries=1',
      '/helpdesk?open=t1',
    );
    expect(o?.cockpitUrl).toBe('/contacts/accounts/a1/360?subsidiaries=1');
    expect(o?.name).toBeNull();
  });

  it('holds while only the query changes, and ends on another screen', () => {
    const o = nextOrigin(null, visit, '/contacts/c1/360', '/sales/orders?customer=c1');
    expect(nextOrigin(o, visit, '/sales/orders?customer=c1', '/sales/orders')).toBe(o);
    expect(nextOrigin(o, visit, '/sales/orders', '/sales/invoices')).toBeNull();
  });

  it('has none on the cockpit or from the bare picker', () => {
    expect(nextOrigin(null, visit, '/sales/orders', '/contacts/c1/360')).toBeNull();
    expect(nextOrigin(null, null, '/contacts/360', '/contacts')).toBeNull();
  });

  it('recognises Vendor 360 and starts a vendor origin from it', () => {
    expect(isCockpitPath('/purchasing/vendor-360')).toBe(true);
    expect(isCockpitPath('/purchasing/vendor-360/s1')).toBe(true);
    expect(isCockpitPath('/purchasing/bills')).toBe(false);
    const o = nextOrigin(
      null,
      { url: '/purchasing/vendor-360/s1', name: 'Bharat Gears' },
      '/purchasing/vendor-360/s1',
      '/purchasing/bills?supplier=s1&name=Bharat%20Gears',
    );
    expect(o).toEqual({
      kind: 'vendor',
      cockpitUrl: '/purchasing/vendor-360/s1',
      name: 'Bharat Gears',
      targetPath: '/purchasing/bills',
    });
    expect(nextOrigin(o, null, '/purchasing/bills?supplier=s1', '/purchasing/bills')).toBe(o);
  });

  it('starts a campaign origin only from a campaign open on the list', () => {
    expect(isCockpitPath('/campaigns')).toBe(true);
    expect(isCockpitPath('/campaigns/new')).toBe(false);
    const o = nextOrigin(
      null,
      { url: '/campaigns?open=c1', name: 'September AMC renewal' },
      '/campaigns?open=c1',
      '/templates/t1/edit',
    );
    expect(o).toEqual({
      kind: 'campaign',
      cockpitUrl: '/campaigns?open=c1',
      name: 'September AMC renewal',
      targetPath: '/templates/t1/edit',
    });
    expect(nextOrigin(null, null, '/campaigns', '/templates')).toBeNull();
  });
});
