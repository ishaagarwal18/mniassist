import { NAV, NavGroup, NavItem } from './nav.model';

export interface NavTrail {
  /** The group heading (e.g. 'Customers', 'Marketing', 'Sales'). */
  readonly groupHeading: string | null;

  /** Primary route of the group (e.g. '/contacts', '/campaigns', '/enquiries'). */
  readonly groupPrimaryRoute: string;

  /** Sibling pages in the same group that can be navigated to. */
  readonly siblingItems: readonly NavItem[];

  /** An intermediate parent page if on a sub-route (e.g. 'Templates' when on '/templates/new'). */
  readonly parentItem: NavItem | null;

  /** The currently matched NavItem. */
  readonly activeItem: NavItem | null;
}

/**
 * Resolves the navigation trail (parent group, intermediate parents, and current item)
 * for any given page route and title, enabling "Customers -> Contacts" breadcrumb navigation.
 */
export function resolveNavTrail(
  currentUrl: string,
  pageTitle: string,
  customGroup?: string | null,
  navGroups: readonly NavGroup[] = NAV,
): NavTrail {
  const path = (currentUrl || '').split(/[?#;]/)[0];

  // 1. If customGroup is explicitly supplied
  if (customGroup) {
    const group = navGroups.find((g) => g.heading?.toLowerCase() === customGroup.toLowerCase());
    if (group) {
      const items = group.items.filter((i) => !i.top);
      return {
        groupHeading: group.heading,
        groupPrimaryRoute: items[0]?.route ?? path,
        siblingItems: items,
        parentItem: null,
        activeItem: items.find((i) => i.route === path) ?? null,
      };
    }
    return {
      groupHeading: customGroup,
      groupPrimaryRoute: path,
      siblingItems: [],
      parentItem: null,
      activeItem: null,
    };
  }

  // 2. Find longest matching NavItem across all groups
  let bestItem: NavItem | null = null;
  let bestGroup: NavGroup | null = null;
  let bestRouteLength = -1;

  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.top) continue; // Skip header-only items like Notifications or Inbox top badge
      if (path === item.route) {
        if (item.route.length > bestRouteLength) {
          bestRouteLength = item.route.length;
          bestItem = item;
          bestGroup = group;
        }
      } else if (path.startsWith(item.route + '/')) {
        if (item.route.length > bestRouteLength) {
          bestRouteLength = item.route.length;
          bestItem = item;
          bestGroup = group;
        }
      }
    }
  }

  // If no group matched through non-top items, check all items (including top/home)
  if (!bestGroup) {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (path === item.route || path.startsWith(item.route + '/')) {
          bestItem = item;
          bestGroup = group;
          break;
        }
      }
      if (bestGroup) break;
    }
  }

  if (bestGroup) {
    let heading = bestGroup.heading;
    const items = bestGroup.items.filter((i) => !i.top);
    let primaryRoute = items[0]?.route ?? bestItem?.route ?? path;

    // Handle pages with no explicit group heading (e.g. Home vs Getting Started)
    if (!heading) {
      if (path === '/getting-started') {
        heading = 'Home';
        primaryRoute = '/home';
      } else if (path === '/inbox') {
        heading = 'Customers';
        primaryRoute = '/contacts';
      } else {
        // Home, Tasks, Meetings: the top of the menu, which Home heads.
        primaryRoute = '/home';
      }
    }

    // Determine if bestItem is a parent of a sub-page (e.g. /templates/new under Templates)
    let parentItem: NavItem | null = null;
    if (
      bestItem &&
      path !== bestItem.route &&
      path.startsWith(bestItem.route + '/') &&
      pageTitle.trim().toLowerCase() !== bestItem.label.trim().toLowerCase()
    ) {
      parentItem = bestItem;
    }

    return {
      groupHeading: heading,
      groupPrimaryRoute: primaryRoute,
      siblingItems: items.length > 0 ? items : bestGroup.items,
      parentItem,
      activeItem: bestItem,
    };
  }

  // Fallback for paths not found in NAV (e.g. standalone routes)
  return {
    groupHeading: null,
    groupPrimaryRoute: path,
    siblingItems: [],
    parentItem: null,
    activeItem: null,
  };
}
