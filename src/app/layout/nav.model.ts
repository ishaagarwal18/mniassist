import { IconName } from '../ui/icon';

export interface NavItem {
  readonly label: string;
  readonly icon: IconName;
  readonly route: string;
  readonly badge?: 'inbox' | 'enquiries' | 'alerts';
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
      { label: 'Notifications', icon: 'alert', route: '/notifications', badge: 'alerts' },
      { label: 'Inbox', icon: 'inbox', route: '/inbox', badge: 'inbox' },
      { label: 'Contacts', icon: 'contacts', route: '/contacts' },
      { label: 'Audiences', icon: 'segment', route: '/contacts/segments' },
      { label: 'Campaigns', icon: 'campaign', route: '/campaigns' },
      { label: 'Templates', icon: 'template', route: '/templates' },
      { label: 'Automations', icon: 'automation', route: '/automations' },
      { label: 'Flows', icon: 'flow', route: '/flows' },
    ],
  },
  {
    heading: 'Pipeline',
    items: [
      { label: 'Enquiries', icon: 'enquiry', route: '/enquiries', badge: 'enquiries' },
      { label: 'Quotations', icon: 'quotation', route: '/quotations' },
      { label: 'Installed base', icon: 'machine', route: '/installed-base' },
      { label: 'Documents', icon: 'document', route: '/documents' },
    ],
  },
  {
    heading: 'Platform',
    items: [
      { label: 'Console', icon: 'globe', route: '/platform' },
    ],
  },
  {
    heading: 'Account',
    items: [
      { label: 'Analytics', icon: 'analytics', route: '/analytics' },
      { label: 'Channels', icon: 'channel', route: '/channels' },
      { label: 'Numbers', icon: 'tower', route: '/channels/numbers' },
      { label: 'Billing', icon: 'billing', route: '/billing' },
      { label: 'Invoices', icon: 'document', route: '/billing/invoices' },
      { label: 'Integrations', icon: 'link', route: '/settings/integrations' },
      { label: 'Support access', icon: 'user', route: '/settings/support-access' },
      { label: 'Compliance', icon: 'shield', route: '/compliance' },
      { label: 'Settings', icon: 'settings', route: '/settings' },
    ],
  },
];
