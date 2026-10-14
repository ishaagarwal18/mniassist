import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { PermissionService } from '@abp/ng.core';

import { NAV, NavItem } from '../../layout/nav.model';
import { CurrentUserService } from '../services/current-user.service';
import { PlanService } from '../services/plan.service';
import { ToastService } from '../ui/toast.service';
import { canAccessNavItem } from './permission';

const NAV_ITEMS: readonly NavItem[] = NAV.flatMap((g) => g.items);

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
 * Keeps typed-in URLs in line with the menu: a screen whose menu item is hidden for this
 * account (permission, host/tenant side) can't be opened by URL either. The host's built-in
 * admin passes everything, as in the menu. Plan and feature gates are left to the screens
 * themselves — the plan loads after sign-in, and those screens show their own upgrade prompt.
 */
export const navAccessGuard: CanActivateChildFn = (_route, state) => {
  const item = navItemForUrl(state.url);
  if (
    !item ||
    canOpenUrl(
      state.url,
      inject(PermissionService),
      inject(PlanService),
      inject(CurrentUserService),
    )
  ) {
    return true;
  }

  inject(ToastService).warning(`Your role doesn't include ${item.label}.`, 'No access');
  return inject(Router).createUrlTree(['/home']);
};
