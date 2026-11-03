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
});
