import { IconName } from '../ui/icon';

export interface NavItem {
  readonly label: string;
  readonly icon: IconName;
  readonly route: string;
  readonly badge?: 'inbox' | 'enquiries' | 'alerts';

  /** ABP policy name; the item is hidden when it is not granted. May be an OR list. */
  readonly permission?: string;
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
      { label: 'Notifications', icon: 'alert', route: '/notifications', badge: 'alerts' },
      {
        label: 'Inbox',
        icon: 'inbox',
        route: '/inbox',
        badge: 'inbox',
        permission: 'AutoReach.Inbox',
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
        label: 'Documents',
        icon: 'document',
        route: '/documents',
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
    heading: 'Account',
    items: [
      {
        label: 'Analytics',
        icon: 'analytics',
        route: '/analytics',
        permission: 'AutoReach.Analytics',
      },
      {
        label: 'Scheduled reports',
        icon: 'clock',
        route: '/settings/reports',
        permission: 'AutoReach.Analytics',
      },
      { label: 'Channels', icon: 'channel', route: '/channels', permission: 'AutoReach.Channels' },
      {
        label: 'Numbers',
        icon: 'tower',
        route: '/channels/numbers',
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
        label: 'Users & roles',
        icon: 'user',
        route: '/settings/members',
        permission: 'AutoReach.Members',
      },
      {
        label: 'Support access',
        icon: 'user',
        route: '/settings/support-access',
        permission: 'AutoReach.Members',
      },
      {
        label: 'Compliance',
        icon: 'shield',
        route: '/compliance',
        permission: 'AutoReach.Compliance',
      },
      { label: 'Settings', icon: 'settings', route: '/settings' },
    ],
  },
];
