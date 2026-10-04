import { IconName } from '../ui/icon';

export interface NavItem {
  readonly label: string;
  readonly icon: IconName;
  readonly route: string;
  readonly badge?: 'inbox' | 'enquiries' | 'alerts';

  /** ABP policy name; the item is hidden when it is not granted. May be an OR list. */
  readonly permission?: string;

  /** An AI feature: drawn with the teal AI marker instead of the blue one. */
  readonly ai?: boolean;

  /** Shown as an icon in every screen's header (beside the theme switch), not in the sidebar. */
  readonly top?: boolean;
}

export interface NavGroup {
  readonly heading: string | null;
  readonly items: readonly NavItem[];
}

export const NAV: readonly NavGroup[] = [
  {
    heading: null,
    items: [
      { label: 'Home', icon: 'home', route: '/home' },
      { label: 'Get started', icon: 'check', route: '/getting-started' },
      { label: 'Notifications', icon: 'bell', route: '/notifications', badge: 'alerts', top: true },
      {
        label: 'Inbox',
        icon: 'inbox',
        route: '/inbox',
        badge: 'inbox',
        permission: 'AutoReach.Inbox',
        top: true,
      },
      { label: 'Contacts', icon: 'contacts', route: '/contacts', permission: 'AutoReach.Contacts' },
      {
        label: 'Audiences',
        icon: 'segment',
        route: '/contacts/segments',
        permission: 'AutoReach.Segments',
      },
      {
        label: 'Accounts',
        icon: 'contacts',
        route: '/contacts/accounts',
        permission: 'AutoReach.Contacts',
      },
      {
        label: 'Account health',
        icon: 'analytics',
        route: '/account-health',
        permission: 'AutoReach.Contacts',
      },
      {
        label: 'Duplicates',
        icon: 'contacts',
        route: '/contacts/duplicates',
        permission: 'AutoReach.Contacts.Merge',
      },
      {
        label: 'Campaigns',
        icon: 'campaign',
        route: '/campaigns',
        permission: 'AutoReach.Campaigns',
      },
      {
        label: 'Templates',
        icon: 'template',
        route: '/templates',
        permission: 'AutoReach.Templates',
      },
      {
        label: 'Automations',
        icon: 'automation',
        route: '/automations',
        permission: 'AutoReach.Automations',
      },
      { label: 'Flows', icon: 'flow', route: '/flows', permission: 'AutoReach.Flows' },
    ],
  },
  {
    heading: 'Pipeline',
    items: [
      {
        label: 'Enquiries',
        icon: 'enquiry',
        route: '/enquiries',
        badge: 'enquiries',
        permission: 'AutoReach.Pipeline',
      },
      {
        label: 'Tasks',
        icon: 'check',
        route: '/tasks',
        permission: 'AutoReach.Activities',
      },
      {
        label: 'Meetings',
        icon: 'clock',
        route: '/meetings',
        permission: 'AutoReach.Activities',
      },
      {
        label: 'Calls',
        icon: 'phone',
        route: '/calls',
        permission: 'AutoReach.Inbox',
      },
      {
        label: 'WhatsApp calls',
        icon: 'phone',
        route: '/calls/whatsapp',
        permission: 'AutoReach.Inbox',
      },
      {
        label: 'Helpdesk',
        icon: 'help',
        route: '/helpdesk',
        permission: 'AutoReach.Helpdesk',
      },
      {
        label: 'Forecast',
        icon: 'analytics',
        route: '/forecast',
        permission: 'AutoReach.Pipeline',
      },
      {
        label: 'Quotations',
        icon: 'quotation',
        route: '/quotations',
        permission: 'AutoReach.Quotations',
      },
      {
        label: 'Installed base',
        icon: 'machine',
        route: '/installed-base',
        permission: 'AutoReach.InstalledBase',
      },
      {
        label: 'AMC renewals',
        icon: 'refresh',
        route: '/renewals',
        permission: 'AutoReach.Renewals',
      },
      {
        label: 'Spares due',
        icon: 'machine',
        route: '/spares',
        permission: 'AutoReach.InstalledBase',
      },
      {
        label: 'Re-orders',
        icon: 'send',
        route: '/reorders',
        permission: 'AutoReach.ReorderPortal',
      },
      {
        label: 'Stock',
        icon: 'machine',
        route: '/stock',
        permission: 'AutoReach.Inventory',
      },
      {
        label: 'Stock planning',
        icon: 'analytics',
        route: '/stock/planning',
        permission: 'AutoReach.Inventory',
      },
      {
        label: 'Purchasing',
        icon: 'document',
        route: '/purchasing',
        permission: 'AutoReach.Inventory',
      },
      {
        label: 'Collections',
        icon: 'billing',
        route: '/collections',
        permission: 'AutoReach.Collections',
      },
      {
        label: 'Dealer network',
        icon: 'tower',
        route: '/network',
        permission: 'AutoReach.Network',
      },
      {
        label: 'Field app',
        icon: 'phone',
        route: '/field',
        permission: 'AutoReach.Helpdesk.Update',
      },
      {
        label: 'Documents',
        icon: 'document',
        route: '/documents',
        permission: 'AutoReach.Library',
      },
      {
        label: 'Products',
        icon: 'machine',
        route: '/documents/products',
        permission: 'AutoReach.Library',
      },
      {
        label: 'Price lists',
        icon: 'billing',
        route: '/documents/price-lists',
        permission: 'AutoReach.Library',
      },
    ],
  },
  {
    heading: 'Administration',
    items: [
      {
        label: 'Users',
        icon: 'user',
        route: '/admin/users',
        permission: 'AbpIdentity.Users',
      },
      {
        label: 'Roles & permissions',
        icon: 'shield',
        route: '/admin/roles',
        permission: 'AbpIdentity.Roles',
      },
      {
        label: 'Members & invites',
        icon: 'user',
        route: '/settings/members',
        permission: 'AutoReach.Members',
      },
      {
        label: 'Workspaces',
        icon: 'globe',
        route: '/admin/tenants',
        permission: 'AbpTenantManagement.Tenants',
      },
    ],
  },
  {
    heading: 'Platform',
    items: [
      {
        label: 'Console',
        icon: 'globe',
        route: '/platform',
        permission: 'AutoReach.Administration.ViewPlatformMetrics',
      },
      {
        label: 'Feature flags',
        icon: 'settings',
        route: '/platform/feature-flags',
        permission: 'AutoReach.Administration.ManageTenants',
      },
    ],
  },
  {
    heading: 'Reports',
    items: [
      {
        label: 'All reports',
        icon: 'document',
        route: '/reports',
        permission:
          'AutoReach.Analytics || AutoReach.Inventory || AutoReach.Payments || AutoReach.Pipeline',
      },
      {
        label: 'Analytics',
        icon: 'analytics',
        route: '/analytics',
        permission: 'AutoReach.Analytics',
      },
      {
        label: 'Campaign results',
        icon: 'campaign',
        route: '/analytics/campaigns',
        permission: 'AutoReach.Analytics',
      },
      {
        label: 'Ad attribution',
        icon: 'analytics',
        route: '/analytics/ads',
        permission: 'AutoReach.Analytics',
      },
      {
        label: 'Business reports',
        icon: 'document',
        route: '/reports/business',
        permission: 'AutoReach.Inventory || AutoReach.Payments',
      },
      {
        label: 'Custom dashboards',
        icon: 'analytics',
        route: '/analytics/dashboards',
        permission: 'AutoReach.Analytics',
      },
      {
        label: 'Scheduled reports',
        icon: 'clock',
        route: '/settings/reports',
        permission: 'AutoReach.Analytics',
      },
    ],
  },
  {
    heading: 'Account',
    items: [
      { label: 'Channels', icon: 'channel', route: '/channels', permission: 'AutoReach.Channels' },
      {
        label: 'Numbers',
        icon: 'tower',
        route: '/channels/numbers',
        permission: 'AutoReach.Channels',
      },
      {
        label: 'Web forms',
        icon: 'template',
        route: '/forms',
        permission: 'AutoReach.Channels',
      },
      {
        label: 'Chat links & QR',
        icon: 'link',
        route: '/channels/widget',
        permission: 'AutoReach.Channels',
      },
      {
        label: 'Migrate a number',
        icon: 'refresh',
        route: '/channels/migrate',
        permission: 'AutoReach.Channels.Onboard',
      },
      {
        label: 'Catalogue',
        icon: 'template',
        route: '/channels/catalogue',
        permission: 'AutoReach.Channels',
      },
      {
        label: 'Voice / IVR',
        icon: 'phone',
        route: '/channels/voice-ivr',
        permission: 'AutoReach.Channels',
      },
      { label: 'Billing', icon: 'billing', route: '/billing', permission: 'AutoReach.Billing' },
      {
        label: 'Invoices',
        icon: 'document',
        route: '/billing/invoices',
        permission: 'AutoReach.Billing',
      },
      {
        label: 'Integrations',
        icon: 'link',
        route: '/settings/integrations',
        permission: 'AutoReach.Integrations',
      },
      {
        label: 'AI assistant',
        icon: 'sparkle',
        route: '/settings/ai-assistant',
        permission: 'AutoReach.Integrations',
        ai: true,
      },
      {
        label: 'Email sending',
        icon: 'send',
        route: '/settings/email-sending',
        permission: 'AutoReach.Channels',
      },
      {
        label: 'Payments',
        icon: 'billing',
        route: '/settings/payments',
        permission: 'AutoReach.Payments',
      },
      {
        label: 'Support access',
        icon: 'user',
        route: '/settings/support-access',
        permission: 'AutoReach.Members',
      },
      {
        label: 'Agency mode',
        icon: 'segment',
        route: '/settings/agency',
        permission: 'AutoReach.Agency',
      },
      {
        label: 'Compliance',
        icon: 'shield',
        route: '/compliance',
        permission: 'AutoReach.Compliance',
      },
      {
        label: 'DPDP readiness',
        icon: 'shield',
        route: '/compliance/dpdp',
        permission: 'AutoReach.Compliance',
      },
      {
        label: 'Branding',
        icon: 'settings',
        route: '/settings/branding',
        permission: 'AutoReach.Branding',
      },
      { label: 'Settings', icon: 'settings', route: '/settings' },
    ],
  },
];
