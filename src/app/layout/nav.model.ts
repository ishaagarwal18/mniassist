import { IconName } from '../ui/icon';
import { SubscriptionPlan } from '../proxy/billing/subscription-plan.enum';

export interface NavItem {
  readonly label: string;
  readonly icon: IconName;
  readonly route: string;
  readonly badge?: 'inbox' | 'enquiries' | 'alerts';

  /** ABP policy name; the item is hidden when it is not granted. May be an OR list. */
  readonly permission?: string;

  /** Minimum subscription plan required (Starter, Growth, Pro, Enterprise). */
  readonly plan?: SubscriptionPlan;

  /** Specific PlanFeature name required (e.g. 'AutomationBuilder', 'PipelineCrm', etc.). */
  readonly feature?: string;

  /** Shown only for platform host administration. Hidden for tenant workspaces. */
  readonly hostOnly?: boolean;

  /** Shown only in tenant workspace mode. Hidden for host platform administrators. */
  readonly tenantOnly?: boolean;

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
      { label: 'Get started', icon: 'check', route: '/getting-started', tenantOnly: true },
      { label: 'Notifications', icon: 'bell', route: '/notifications', badge: 'alerts', top: true },
      {
        label: 'Inbox',
        icon: 'inbox',
        route: '/inbox',
        badge: 'inbox',
        permission: 'AutoReach.Inbox',
        top: true,
        tenantOnly: true,
      },
      {
        label: 'Contacts',
        icon: 'contacts',
        route: '/contacts',
        permission: 'AutoReach.Contacts',
        tenantOnly: true,
      },
      {
        label: 'Audiences',
        icon: 'segment',
        route: '/contacts/segments',
        permission: 'AutoReach.Segments',
        tenantOnly: true,
      },
      {
        label: 'Accounts',
        icon: 'contacts',
        route: '/contacts/accounts',
        permission: 'AutoReach.Contacts',
        tenantOnly: true,
      },
      {
        label: 'Account health',
        icon: 'analytics',
        route: '/account-health',
        permission: 'AutoReach.Contacts',
        tenantOnly: true,
      },
      {
        label: 'Duplicates',
        icon: 'contacts',
        route: '/contacts/duplicates',
        permission: 'AutoReach.Contacts.Merge',
        tenantOnly: true,
      },
      {
        label: 'Campaigns',
        icon: 'campaign',
        route: '/campaigns',
        permission: 'AutoReach.Campaigns',
        tenantOnly: true,
      },
      {
        label: 'Templates',
        icon: 'template',
        route: '/templates',
        permission: 'AutoReach.Templates',
        tenantOnly: true,
      },
      {
        label: 'Automations',
        icon: 'automation',
        route: '/automations',
        permission: 'AutoReach.Automations',
        feature: 'AutomationBuilder',
        tenantOnly: true,
      },
      {
        label: 'Flows',
        icon: 'flow',
        route: '/flows',
        permission: 'AutoReach.Flows',
        feature: 'Flows',
        tenantOnly: true,
      },
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
        feature: 'PipelineCrm',
        tenantOnly: true,
      },
      {
        label: 'Tasks',
        icon: 'check',
        route: '/tasks',
        permission: 'AutoReach.Activities',
        feature: 'PipelineCrm',
        tenantOnly: true,
      },
      {
        label: 'Meetings',
        icon: 'clock',
        route: '/meetings',
        permission: 'AutoReach.Activities',
        feature: 'PipelineCrm',
        tenantOnly: true,
      },
      {
        label: 'Calls',
        icon: 'phone',
        route: '/calls',
        permission: 'AutoReach.Inbox',
        feature: 'Voice',
        tenantOnly: true,
      },
      {
        label: 'WhatsApp calls',
        icon: 'phone',
        route: '/calls/whatsapp',
        permission: 'AutoReach.Inbox',
        feature: 'Voice',
        tenantOnly: true,
      },
      {
        label: 'Helpdesk',
        icon: 'help',
        route: '/helpdesk',
        permission: 'AutoReach.Helpdesk',
        feature: 'Helpdesk',
        tenantOnly: true,
      },
      {
        label: 'Forecast',
        icon: 'analytics',
        route: '/forecast',
        permission: 'AutoReach.Pipeline',
        feature: 'PipelineCrm',
        tenantOnly: true,
      },
      {
        label: 'Quotations',
        icon: 'quotation',
        route: '/quotations',
        permission: 'AutoReach.Quotations',
        feature: 'PipelineCrm',
        tenantOnly: true,
      },
      {
        label: 'Installed base',
        icon: 'machine',
        route: '/installed-base',
        permission: 'AutoReach.InstalledBase',
        feature: 'PipelineCrm',
        tenantOnly: true,
      },
      {
        label: 'AMC renewals',
        icon: 'refresh',
        route: '/renewals',
        permission: 'AutoReach.Renewals',
        feature: 'RenewalDesk',
        tenantOnly: true,
      },
      {
        label: 'Spares due',
        icon: 'machine',
        route: '/spares',
        permission: 'AutoReach.InstalledBase',
        feature: 'PipelineCrm',
        tenantOnly: true,
      },
      {
        label: 'Re-orders',
        icon: 'send',
        route: '/reorders',
        permission: 'AutoReach.ReorderPortal',
        feature: 'ReorderPortal',
        tenantOnly: true,
      },
      {
        label: 'Stock',
        icon: 'machine',
        route: '/stock',
        permission: 'AutoReach.Inventory',
        feature: 'ErpSync',
        tenantOnly: true,
      },
      {
        label: 'Stock planning',
        icon: 'analytics',
        route: '/stock/planning',
        permission: 'AutoReach.Inventory',
        feature: 'ErpSync',
        tenantOnly: true,
      },
      {
        label: 'Purchasing',
        icon: 'document',
        route: '/purchasing',
        permission: 'AutoReach.Inventory',
        feature: 'ErpSync',
        tenantOnly: true,
      },
      {
        label: 'Collections',
        icon: 'billing',
        route: '/collections',
        permission: 'AutoReach.Collections',
        feature: 'Payments',
        tenantOnly: true,
      },
      {
        label: 'Dealer network',
        icon: 'tower',
        route: '/network',
        permission: 'AutoReach.Network',
        feature: 'OemNetwork',
        tenantOnly: true,
      },
      {
        label: 'Field app',
        icon: 'phone',
        route: '/field',
        permission: 'AutoReach.Helpdesk.Update',
        feature: 'Helpdesk',
        tenantOnly: true,
      },
      {
        label: 'Documents',
        icon: 'document',
        route: '/documents',
        permission: 'AutoReach.Library',
        feature: 'DocumentLibrary',
        tenantOnly: true,
      },
      {
        label: 'Products',
        icon: 'machine',
        route: '/documents/products',
        permission: 'AutoReach.Library',
        feature: 'DocumentLibrary',
        tenantOnly: true,
      },
      {
        label: 'Price lists',
        icon: 'billing',
        route: '/documents/price-lists',
        permission: 'AutoReach.Library',
        feature: 'DocumentLibrary',
        tenantOnly: true,
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
        tenantOnly: true,
      },
      {
        label: 'Sign-in rules',
        icon: 'shield',
        route: '/settings/security-policy',
        permission: 'AutoReach.SecurityPolicy',
      },
      {
        label: 'Email templates',
        icon: 'mail',
        route: '/settings/email-templates',
        permission: 'AutoReach.TextTemplates',
      },
      {
        label: 'Audit log',
        icon: 'clock',
        route: '/admin/audit-logs',
        permission: 'AutoReach.AuditLogs',
      },
      {
        label: 'Workspaces',
        icon: 'globe',
        route: '/admin/tenants',
        permission: 'AbpTenantManagement.Tenants',
        hostOnly: true,
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
        hostOnly: true,
      },
      {
        label: 'Feature flags',
        icon: 'settings',
        route: '/platform/feature-flags',
        permission: 'AutoReach.Administration.ManageTenants',
        hostOnly: true,
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
        tenantOnly: true,
      },
      {
        label: 'Analytics',
        icon: 'analytics',
        route: '/analytics',
        permission: 'AutoReach.Analytics',
        feature: 'FullAnalytics',
        tenantOnly: true,
      },
      {
        label: 'Campaign results',
        icon: 'campaign',
        route: '/analytics/campaigns',
        permission: 'AutoReach.Analytics',
        tenantOnly: true,
      },
      {
        label: 'Ad attribution',
        icon: 'analytics',
        route: '/analytics/ads',
        permission: 'AutoReach.Analytics',
        feature: 'ClickToWhatsAppAttribution',
        tenantOnly: true,
      },
      {
        label: 'Business reports',
        icon: 'document',
        route: '/reports/business',
        permission: 'AutoReach.Inventory || AutoReach.Payments',
        feature: 'FullAnalytics',
        tenantOnly: true,
      },
      {
        label: 'Custom dashboards',
        icon: 'analytics',
        route: '/analytics/dashboards',
        permission: 'AutoReach.Analytics',
        feature: 'FullAnalytics',
        tenantOnly: true,
      },
      {
        label: 'Scheduled reports',
        icon: 'clock',
        route: '/settings/reports',
        permission: 'AutoReach.Analytics',
        feature: 'FullAnalytics',
        tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Account',
    items: [
      {
        label: 'Channels',
        icon: 'channel',
        route: '/channels',
        permission: 'AutoReach.Channels',
        tenantOnly: true,
      },
      {
        label: 'Numbers',
        icon: 'tower',
        route: '/channels/numbers',
        permission: 'AutoReach.Channels',
        tenantOnly: true,
      },
      {
        label: 'Web forms',
        icon: 'template',
        route: '/forms',
        permission: 'AutoReach.Channels',
        tenantOnly: true,
      },
      {
        label: 'Chat links & QR',
        icon: 'link',
        route: '/channels/widget',
        permission: 'AutoReach.Channels',
        tenantOnly: true,
      },
      {
        label: 'Migrate a number',
        icon: 'refresh',
        route: '/channels/migrate',
        permission: 'AutoReach.Channels.Onboard',
        tenantOnly: true,
      },
      {
        label: 'Catalogue',
        icon: 'template',
        route: '/channels/catalogue',
        permission: 'AutoReach.Channels',
        feature: 'DocumentLibrary',
        tenantOnly: true,
      },
      {
        label: 'Voice / IVR',
        icon: 'phone',
        route: '/channels/voice-ivr',
        permission: 'AutoReach.Channels',
        feature: 'Voice',
        tenantOnly: true,
      },
      {
        label: 'Billing',
        icon: 'billing',
        route: '/billing',
        permission: 'AutoReach.Billing',
        tenantOnly: true,
      },
      {
        label: 'Invoices',
        icon: 'document',
        route: '/billing/invoices',
        permission: 'AutoReach.Billing',
        tenantOnly: true,
      },
      {
        label: 'Integrations',
        icon: 'link',
        route: '/settings/integrations',
        permission: 'AutoReach.Integrations',
        feature: 'Connectors',
        tenantOnly: true,
      },
      {
        label: 'AI assistant',
        icon: 'sparkle',
        route: '/settings/ai-assistant',
        permission: 'AutoReach.Integrations',
        feature: 'AiAssistant',
        ai: true,
        tenantOnly: true,
      },
      {
        label: 'Email sending',
        icon: 'send',
        route: '/settings/email-sending',
        permission: 'AutoReach.Channels',
        feature: 'Email',
        tenantOnly: true,
      },
      {
        label: 'Payments',
        icon: 'billing',
        route: '/settings/payments',
        permission: 'AutoReach.Payments',
        feature: 'Payments',
        tenantOnly: true,
      },
      {
        label: 'Support access',
        icon: 'user',
        route: '/settings/support-access',
        permission: 'AutoReach.Members',
        tenantOnly: true,
      },
      {
        label: 'Agency mode',
        icon: 'segment',
        route: '/settings/agency',
        permission: 'AutoReach.Agency',
        tenantOnly: true,
      },
      {
        label: 'Compliance',
        icon: 'shield',
        route: '/compliance',
        permission: 'AutoReach.Compliance',
        tenantOnly: true,
      },
      {
        label: 'DPDP readiness',
        icon: 'shield',
        route: '/compliance/dpdp',
        permission: 'AutoReach.Compliance',
        tenantOnly: true,
      },
      {
        label: 'Branding',
        icon: 'settings',
        route: '/settings/branding',
        permission: 'AutoReach.Branding',
        tenantOnly: true,
      },
      { label: 'Settings', icon: 'settings', route: '/settings' },
    ],
  },
];
