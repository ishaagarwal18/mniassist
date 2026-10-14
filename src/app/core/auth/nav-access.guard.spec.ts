import { describe, expect, it } from 'vitest';

import type { NavItem } from '../../layout/nav.model';
import { navItemForUrl } from './nav-access.guard';

const item = (route: string, label = route): NavItem => ({ label, icon: 'home', route });

describe('navItemForUrl', () => {
  const items = [item('/settings'), item('/settings/billing'), item('/templates'), item('/home')];

  it('matches a menu route exactly, ignoring query, fragment and a trailing slash', () => {
    expect(navItemForUrl('/templates', items)?.route).toBe('/templates');
    expect(navItemForUrl('/templates/?status=draft#top', items)?.route).toBe('/templates');
  });

  it('picks the longest route that prefixes the path', () => {
    expect(navItemForUrl('/settings/billing/invoices', items)?.route).toBe('/settings/billing');
    expect(navItemForUrl('/settings/members', items)?.route).toBe('/settings');
  });

  it('does not treat a shared word start as a prefix', () => {
    expect(navItemForUrl('/templates-library', items)).toBeUndefined();
  });

  it('returns nothing for a screen with no menu item', () => {
    expect(navItemForUrl('/profile', items)).toBeUndefined();
  });

  it('finds the real menu items by default', () => {
    expect(navItemForUrl('/inbox')?.permission).toBe('AutoReach.Inbox');
  });
});
