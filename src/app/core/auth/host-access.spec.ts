import { describe, expect, it } from 'vitest';
import { isHostAdministrator, isHostContext } from './host-access';

describe('host administrator identity', () => {
  it('recognizes the authenticated host admin role regardless of role casing', () => {
    expect(isHostAdministrator({
      currentUser: { isAuthenticated: true, tenantId: null, roles: ['Admin'] },
      currentTenant: { isAvailable: false },
    })).toBe(true);
  });

  it('does not grant a tenant admin host access when the tenant name/config has not loaded', () => {
    const config = { currentUser: { isAuthenticated: true, tenantId: 'tenant-1', roles: ['admin'] } };
    expect(isHostContext(config)).toBe(false);
    expect(isHostAdministrator(config)).toBe(false);
  });

  it('does not grant host overrides while operating inside a tenant', () => {
    expect(isHostAdministrator({
      currentUser: { isAuthenticated: true, roles: ['admin'] },
      currentTenant: { id: 'tenant-1', isAvailable: true },
    })).toBe(false);
  });

  it('does not grant full access to ordinary host users or signed-out admins', () => {
    expect(isHostAdministrator({ currentUser: { isAuthenticated: true, roles: ['Agent'] } })).toBe(false);
    expect(isHostAdministrator({ currentUser: { isAuthenticated: false, roles: ['admin'] } })).toBe(false);
    expect(isHostAdministrator(undefined)).toBe(false);
  });
});
