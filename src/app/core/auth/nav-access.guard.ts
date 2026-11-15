import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '@abp/ng.core';

import { NAV, NavItem } from '../../layout/nav.model';
import { CurrentUserService } from '../services/current-user.service';
import { PlanService } from '../services/plan.service';
import { ToastService } from '../ui/toast.service';
import { canAccessNavItem, checkPolicy } from './permission';

const NAV_ITEMS: readonly NavItem[] = NAV.flatMap((g) => g.items);

// These pages open an action directly and require its grant in addition to module access.
const ACTION_PERMISSIONS: Readonly<Record<string, string>> = {
  '/meetings/new': 'AutoReach.Activities.Create',
  '/contacts/new': 'AutoReach.Contacts.Create',
  '/contacts/:id/edit': 'AutoReach.Contacts.Update',
  '/contacts/accounts/new': 'AutoReach.Contacts.Create',
  '/contacts/accounts/:accountId/edit': 'AutoReach.Contacts.Update',
  '/campaigns/new': 'AutoReach.Campaigns.Create',
  '/templates/new': 'AutoReach.Templates.Create',
  '/templates/:id/edit': 'AutoReach.Templates.Update',
  '/enquiries/new': 'AutoReach.Pipeline.Create',
  '/quotations/new': 'AutoReach.Quotations.Create',
  '/quotations/:id/edit': 'AutoReach.Quotations.Update',
  '/installed-base/new': 'AutoReach.InstalledBase.Create',
  '/projects/new': 'AutoReach.Projects.Create',
  '/projects/:id/edit': 'AutoReach.Projects.Update',
  '/documents/new': 'AutoReach.Library.Create',
  '/documents/:id/edit': 'AutoReach.Library.Update',
  '/documents/products/new': 'AutoReach.Library.Create',
  '/documents/products/import': 'AutoReach.Library.Create',
  '/documents/products/:id/edit': 'AutoReach.Library.Update',
  '/documents/price-lists/new': 'AutoReach.Library.Create',
  '/documents/price-lists/:id/edit': 'AutoReach.Library.Update',
  '/channels/connect': 'AutoReach.Channels.Onboard',
  '/channels/:id/voice-agent': 'AutoReach.Channels.Manage',
  '/channels/sms': 'AutoReach.Channels.Manage',
  '/campaigns/:id/ab-test': 'AutoReach.Campaigns',
  '/settings/teams/new': 'AutoReach.Teams.Manage',
  '/settings/teams/:id/edit': 'AutoReach.Teams.Manage',
  '/settings/email-templates/new': 'AutoReach.TextTemplates.Edit',
  '/platform/rates/new': 'AutoReach.Administration.ManageRateCards',
};

/**
 * The menu item a URL belongs to: the one whose route is the longest prefix of the path
 * (`/settings/members` → the Settings item). Undefined for a screen with no menu item.
 */
export function navItemForUrl(
  url: string,
  items: readonly NavItem[] = NAV_ITEMS,
): NavItem | undefined {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  let best: NavItem | undefined;
  for (const item of items) {
    const route = item.route.replace(/\/+$/, '');
    if (path === route || path.startsWith(route + '/')) {
      if (!best || route.length > best.route.length) best = item;
    }
  }
  return best;
}

/**
 * Whether this account may open a screen, by the same rule as the menu: permission and
 * host/tenant side (plan and feature gates are left to the screens). True for a screen with no
 * menu item. Use it to hide links into other screens.
 */
export function canOpenUrl(
  url: string,
  permissions: PermissionService,
  plan: PlanService,
  account: CurrentUserService,
): boolean {
  const item = navItemForUrl(url);
  return (
    !item ||
    canAccessNavItem({ ...item, plan: undefined, feature: undefined }, permissions, plan, account)
  );
}

/**
 * Whether a link to this screen belongs on a hub page (Settings, All reports) for this account:
 * the full menu rule, plan and feature gates included, since those pages stand in for menu items.
 * True for a screen with no menu item.
 */
export function showsInMenu(
  url: string,
  permissions: PermissionService,
  plan: PlanService,
  account: CurrentUserService,
): boolean {
  const item = navItemForUrl(url);
  return !item || canAccessNavItem(item, permissions, plan, account);
}

/**
 * Keeps typed-in URLs in line with the menu: a screen whose menu item is hidden for this
 * account can't be opened by URL either. Use the matched route so URL encoding and
 * matrix parameters cannot change the policy lookup. Pages without a menu match
 * must declare their own access rule.
 */
export const navAccessGuard: CanActivateFn = (route) => {
  const path =
    '/' +
    route.pathFromRoot
      .map((part) => part.routeConfig?.path)
      .filter(Boolean)
      .join('/');
  const item = navItemForUrl(path);
  const permission = ACTION_PERMISSIONS[path];
  const permissions = inject(PermissionService);
  if (
    (item || permission || route.data['authenticatedOnly'] === true) &&
    checkPolicy(permission, permissions) &&
    canOpenUrl(path, permissions, inject(PlanService), inject(CurrentUserService))
  ) {
    return true;
  }

  inject(ToastService).warning('You do not have permission to open this page.', 'No access');
  return inject(Router).createUrlTree(['/home']);
};
