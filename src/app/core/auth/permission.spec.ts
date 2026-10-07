import { describe, expect, it } from 'vitest';
import { PermissionService } from '@abp/ng.core';

import { SubscriptionPlan } from '../../proxy/billing/subscription-plan.enum';
import { NavItem } from '../../layout/nav.model';
import { canAccessNavItem, grantedPolicy } from './permission';
import { PlanService } from '../services/plan.service';
import { CurrentUserService } from '../services/current-user.service';

function createMockPermissions(grants: Record<string, boolean> = {}): PermissionService {
  return {
    getGrantedPolicy: (name: string) => {
      const parts = name.split('||').map((p) => p.trim());
      return parts.some((p) => Boolean(grants[p]));
    },
    configState: {
      getAll: () => ({
        currentUser: { isAuthenticated: true, tenantId: 't-1' },
        currentTenant: { isAvailable: true, id: 't-1' },
      }),
    },
  } as unknown as PermissionService;
}

function createMockAccount(isHost = false): CurrentUserService {
  return {
    isHost: () => isHost,
    isAuthenticated: () => true,
    tenantName: () => (isHost ? '' : 'Acme Corp'),
  } as unknown as CurrentUserService;
}

function createMockPlanService(
  plan: SubscriptionPlan,
  features: string[] = [],
): PlanService {
  const normFeatures = new Set(features.map((f) => f.toLowerCase()));
  return {
    plan: () => plan,
    hasPlan: (minPlan: SubscriptionPlan | undefined | null) => {
      if (minPlan == null) return true;
      return plan >= minPlan;
    },
    hasFeature: (feat: string | undefined | null) => {
      if (!feat) return true;
      return normFeatures.has(feat.toLowerCase());
    },
  } as unknown as PlanService;
}

describe('canAccessNavItem - Plan and Permission gating', () => {
  const inboxItem: NavItem = {
    label: 'Inbox',
    icon: 'inbox',
    route: '/inbox',
    permission: 'AutoReach.Inbox',
    tenantOnly: true,
  };

  const automationsItem: NavItem = {
    label: 'Automations',
    icon: 'automation',
    route: '/automations',
    permission: 'AutoReach.Automations',
    feature: 'AutomationBuilder',
    tenantOnly: true,
  };

  const quotationsItem: NavItem = {
    label: 'Quotations',
    icon: 'quotation',
    route: '/quotations',
    permission: 'AutoReach.Quotations',
    feature: 'PipelineCrm',
    tenantOnly: true,
  };

  const networkItem: NavItem = {
    label: 'Dealer network',
    icon: 'tower',
    route: '/network',
    permission: 'AutoReach.Network',
    feature: 'OemNetwork',
    tenantOnly: true,
  };

  const platformConsoleItem: NavItem = {
    label: 'Console',
    icon: 'globe',
    route: '/platform',
    permission: 'AutoReach.Administration.ViewPlatformMetrics',
    hostOnly: true,
  };

  it('allows Starter plan to see Inbox if permission is granted', () => {
    const permissions = createMockPermissions({ 'AutoReach.Inbox': true });
    const plan = createMockPlanService(SubscriptionPlan.Starter, []);
    const account = createMockAccount(false);

    expect(canAccessNavItem(inboxItem, permissions, plan, account)).toBe(true);
  });

  it('hides Inbox if user role lacks permission even if plan allows it', () => {
    const permissions = createMockPermissions({ 'AutoReach.Inbox': false });
    const plan = createMockPlanService(SubscriptionPlan.Starter, []);
    const account = createMockAccount(false);

    expect(canAccessNavItem(inboxItem, permissions, plan, account)).toBe(false);
  });

  it('hides Automations on Starter plan even if role has permission', () => {
    const permissions = createMockPermissions({ 'AutoReach.Automations': true });
    const plan = createMockPlanService(SubscriptionPlan.Starter, []);
    const account = createMockAccount(false);

    expect(canAccessNavItem(automationsItem, permissions, plan, account)).toBe(false);
  });

  it('shows Automations on Growth plan when feature is unlocked and permission granted', () => {
    const permissions = createMockPermissions({ 'AutoReach.Automations': true });
    const plan = createMockPlanService(SubscriptionPlan.Growth, ['AutomationBuilder']);
    const account = createMockAccount(false);

    expect(canAccessNavItem(automationsItem, permissions, plan, account)).toBe(true);
  });

  it('shows Automations on Starter if granted via add-on feature', () => {
    const permissions = createMockPermissions({ 'AutoReach.Automations': true });
    const plan = createMockPlanService(SubscriptionPlan.Starter, ['AutomationBuilder']);
    const account = createMockAccount(false);

    expect(canAccessNavItem(automationsItem, permissions, plan, account)).toBe(true);
  });

  it('hides Quotations on Growth plan, but shows on Pro plan', () => {
    const permissions = createMockPermissions({ 'AutoReach.Quotations': true });
    const growthPlan = createMockPlanService(SubscriptionPlan.Growth, ['AutomationBuilder']);
    const proPlan = createMockPlanService(SubscriptionPlan.Pro, ['AutomationBuilder', 'PipelineCrm']);
    const account = createMockAccount(false);

    expect(canAccessNavItem(quotationsItem, permissions, growthPlan, account)).toBe(false);
    expect(canAccessNavItem(quotationsItem, permissions, proPlan, account)).toBe(true);
  });

  it('hides Dealer network on Pro plan, but shows on Enterprise plan', () => {
    const permissions = createMockPermissions({ 'AutoReach.Network': true });
    const proPlan = createMockPlanService(SubscriptionPlan.Pro, ['PipelineCrm']);
    const entPlan = createMockPlanService(SubscriptionPlan.Enterprise, ['PipelineCrm', 'OemNetwork']);
    const account = createMockAccount(false);

    expect(canAccessNavItem(networkItem, permissions, proPlan, account)).toBe(false);
    expect(canAccessNavItem(networkItem, permissions, entPlan, account)).toBe(true);
  });

  it('segregates host and tenant navigation', () => {
    const hostPermissions = createMockPermissions({
      'AutoReach.Administration.ViewPlatformMetrics': true,
      'AutoReach.Quotations': true,
    });
    const entPlan = createMockPlanService(SubscriptionPlan.Enterprise, ['PipelineCrm']);
    const hostAccount = createMockAccount(true);
    const tenantAccount = createMockAccount(false);

    // Host sees Platform Console, but does NOT see tenant-only operational tools (Quotations)
    expect(canAccessNavItem(platformConsoleItem, hostPermissions, entPlan, hostAccount)).toBe(true);
    expect(canAccessNavItem(quotationsItem, hostPermissions, entPlan, hostAccount)).toBe(false);

    // Tenant user NEVER sees host-only platform console
    expect(canAccessNavItem(platformConsoleItem, hostPermissions, entPlan, tenantAccount)).toBe(false);
  });
});
