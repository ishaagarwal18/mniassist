import { describe, expect, it } from 'vitest';

import { REPORT_GROUPS } from '../features/reports/reports-hub';
import { HUB_ROUTE, NAV } from './nav.model';

const items = NAV.flatMap((g) => g.items);

describe('sidebar menu', () => {
  it('keeps every sidebar group short enough to scan', () => {
    for (const group of NAV) {
      const inSidebar = group.items.filter((i) => !i.menu && !i.top);
      expect(inSidebar.length, group.heading ?? 'top').toBeLessThanOrEqual(9);
    }
  });

  it('has a sidebar item for each hub', () => {
    for (const route of Object.values(HUB_ROUTE)) {
      const hub = items.find((i) => i.route === route);
      expect(hub, route).toBeDefined();
      expect(hub?.menu, route).toBeUndefined();
    }
  });

  it('lists every report kept off the sidebar on All reports', () => {
    const listed = new Set(REPORT_GROUPS.flatMap((g) => g.reports.map((r) => r.route)));
    for (const item of items.filter((i) => i.menu === 'reports')) {
      expect(listed.has(item.route), item.route).toBe(true);
    }
  });

  it('gives each page one menu entry', () => {
    const routes = items.map((i) => i.route);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
