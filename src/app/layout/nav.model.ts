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

  /** Shown in tenant workspace mode and to the host administrator. */
  readonly tenantOnly?: boolean;

  /** An AI feature: drawn with the teal AI marker instead of the blue one. */
  readonly ai?: boolean;

  /** Shown as an icon in every screen's header (beside the theme switch), not in the sidebar. */
  readonly top?: boolean;

  /** Only until the setup checklist is complete (Get started): see {@link visibleForSetup}. */
  readonly untilSetupComplete?: boolean;
}

/** False for an item that is only shown during setup, once every step of the checklist is done. */
export function visibleForSetup(item: NavItem, setupComplete: boolean): boolean {
  return !(item.untilSetupComplete && setupComplete);
}

export interface NavGroup {
  readonly heading: string | null;
  readonly items: readonly NavItem[];
}

export const NAV: readonly NavGroup[] = [
  {
    heading: null,
    items: [
      {
        label: 'Get started',
        icon: 'check',
        route: '/getting-started',
        //tenantOnly: true,
        untilSetupComplete: true,
      },
      { label: 'Home', icon: 'home', route: '/home' },
      { label: 'Notifications', icon: 'bell', route: '/notifications', badge: 'alerts', top: true },
      {
        label: 'Inbox',
        icon: 'inbox',
        route: '/inbox',
        badge: 'inbox',
        permission: 'AutoReach.Inbox',
        top: true,
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Customers',
    items: [
      {
        label: 'Customer 360',
        icon: 'contacts',
        route: '/contacts/360',
        permission: 'AutoReach.Customer360',
        //tenantOnly: true,
      },
      {
        label: 'Accounts',
        icon: 'contacts',
        route: '/contacts/accounts',
        permission: 'AutoReach.Contacts',
        //tenantOnly: true,
      },
      {
        label: 'Contacts',
        icon: 'contacts',
        route: '/contacts',
        permission: 'AutoReach.Contacts',
        //tenantOnly: true,
      },
      {
        label: 'Account health',
        icon: 'analytics',
        route: '/account-health',
        permission: 'AutoReach.Contacts',
        // tenantOnly: true,
      },
      {
        label: 'Duplicates',
        icon: 'contacts',
        route: '/contacts/duplicates',
        permission: 'AutoReach.Contacts.Merge',
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Marketing',
    items: [
      {
        label: 'Audiences',
        icon: 'segment',
        route: '/contacts/segments',
        permission: 'AutoReach.Segments',
        //tenantOnly: true,
      },
      {
        label: 'Campaigns',
        icon: 'campaign',
        route: '/campaigns',
        permission: 'AutoReach.Campaigns',
        //tenantOnly: true,
      },
      {
        label: 'Templates',
        icon: 'template',
        route: '/templates',
        permission: 'AutoReach.Templates',
        //tenantOnly: true,
      },
      {
        label: 'Automations',
        icon: 'automation',
        route: '/automations',
        permission: 'AutoReach.Automations',
        feature: 'AutomationBuilder',
        //tenantOnly: true,
      },
      {
        label: 'Auto-replies',
        icon: 'clock',
        route: '/auto-replies',
        permission: 'AutoReach.Automations',
        //tenantOnly: true,
      },
      {
        label: 'Flows',
        icon: 'flow',
        route: '/flows',
        permission: 'AutoReach.Flows',
        feature: 'Flows',
        //tenantOnly: true,
      },
      {
        label: 'Lead forms',
        icon: 'campaign',
        route: '/channels/lead-forms',
        permission: 'AutoReach.Channels',
        //tenantOnly: true,
      },
      {
        label: 'Web forms',
        icon: 'template',
        route: '/forms',
        permission: 'AutoReach.Channels',
        //tenantOnly: true,
      },
      {
        label: 'Chat links & QR',
        icon: 'link',
        route: '/channels/widget',
        permission: 'AutoReach.Channels',
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Purchasing & stock',
    items: [
      {
        label: 'Vendor 360',
        icon: 'contacts',
        route: '/purchasing/vendor-360',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.Vendor360',
        //tenantOnly: true,
      },
      {
        label: 'Purchasing',
        icon: 'document',
        route: '/purchasing',
        permission: 'AutoReach.Inventory',
        feature: 'ErpSync',
        //tenantOnly: true,
      },
      {
        label: 'Goods receipt (GRN)',
        icon: 'machine',
        route: '/purchasing/grn',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.GoodsReceiptNotes',
        //tenantOnly: true,
      },
      {
        label: 'Vendor bills',
        icon: 'billing',
        route: '/purchasing/bills',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.VendorBills',
        //tenantOnly: true,
      },
      {
        label: 'Debit notes',
        icon: 'document',
        route: '/purchasing/debit-notes',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.VendorDebitNotes',
        //tenantOnly: true,
      },
      {
        label: 'Stock',
        icon: 'machine',
        route: '/stock',
        permission: 'AutoReach.Inventory',
        feature: 'ErpSync',
        //tenantOnly: true,
      },
      {
        label: 'Stock planning',
        icon: 'analytics',
        route: '/stock/planning',
        permission: 'AutoReach.Inventory',
        feature: 'ErpSync',
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Sales',
    items: [
      {
        label: 'Enquiries',
        icon: 'enquiry',
        route: '/enquiries',
        badge: 'enquiries',
        permission: 'AutoReach.Pipeline',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Quotations',
        icon: 'quotation',
        route: '/quotations',
        permission: 'AutoReach.Quotations',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Tasks',
        icon: 'check',
        route: '/tasks',
        permission: 'AutoReach.Activities',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Meetings',
        icon: 'clock',
        route: '/meetings',
        permission: 'AutoReach.Activities',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Projects',
        icon: 'tower',
        route: '/projects',
        permission: 'AutoReach.Projects',
        feature: 'PipelineCrm',
      },
      {
        label: 'Forecast',
        icon: 'analytics',
        route: '/forecast',
        permission: 'AutoReach.Pipeline',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Projection plan',
        icon: 'analytics',
        route: '/pipeline/projection-plan',
        permission: 'AutoReach.ProjectionPlans',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'AI negotiator',
        icon: 'sparkle',
        route: '/pipeline/ai-negotiator',
        permission: 'AutoReach.NegotiationAgent',
        feature: 'PipelineCrm',
        ai: true,
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Orders & invoices',
    items: [
      {
        label: 'Sales orders',
        icon: 'document',
        route: '/sales/orders',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.SalesOrders',
        //tenantOnly: true,
      },
      {
        label: 'Delivery challans',
        icon: 'machine',
        route: '/sales/challans',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.DeliveryChallans',
        //tenantOnly: true,
      },
      {
        label: 'Sales invoices',
        icon: 'billing',
        route: '/sales/invoices',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.SalesInvoices',
        //tenantOnly: true,
      },
      {
        label: 'Re-orders',
        icon: 'send',
        route: '/reorders',
        permission: 'AutoReach.ReorderPortal',
        feature: 'ReorderPortal',
        //tenantOnly: true,
      },
      {
        label: 'Collections',
        icon: 'billing',
        route: '/collections',
        permission: 'AutoReach.Collections',
        feature: 'Payments',
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'OEM pricing',
    items: [
      {
        label: 'Deal registrations',
        icon: 'shield',
        route: '/oem/registrations',
        permission: 'AutoReach.Spa',
        feature: 'OemPricing',
      },
      {
        label: 'Special prices',
        icon: 'billing',
        route: '/oem/spa',
        permission: 'AutoReach.Spa',
        feature: 'OemPricing',
      },
      {
        label: 'OEM claims',
        icon: 'analytics',
        route: '/oem/claims',
        permission: 'AutoReach.Spa.Claims',
        feature: 'OemPricing',
      },
      {
        label: 'OEM settings',
        icon: 'settings',
        route: '/oem/settings',
        permission: 'AutoReach.Spa',
        feature: 'OemPricing',
      },
    ],
  },
  {
    heading: 'Calls',
    items: [
      {
        label: 'Calls',
        icon: 'phone',
        route: '/calls',
        permission: 'AutoReach.Inbox',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'WhatsApp calls',
        icon: 'phone',
        route: '/calls/whatsapp',
        permission: 'AutoReach.Inbox',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'AI voice agents',
        icon: 'phone',
        route: '/calls/ai-agents',
        permission: 'AutoReach.Channels.Manage',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'AI call batches',
        icon: 'phone',
        route: '/calls/ai-batches',
        permission: 'AutoReach.Campaigns',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'Website call button',
        icon: 'phone',
        route: '/calls/web-widget',
        permission: 'AutoReach.Channels.Manage',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'Voice / IVR',
        icon: 'phone',
        route: '/channels/voice-ivr',
        permission: 'AutoReach.Channels',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'AI impact report',
        icon: 'analytics',
        route: '/calls/ai-impact',
        permission: 'AutoReach.Analytics',
        feature: 'Voice',
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Service',
    items: [
      {
        label: 'Helpdesk',
        icon: 'help',
        route: '/helpdesk',
        permission: 'AutoReach.Helpdesk',
        feature: 'Helpdesk',
        //tenantOnly: true,
      },
      {
        label: 'Field tickets',
        icon: 'help',
        route: '/field-service/tickets',
        feature: 'FieldService',
        permission: 'AutoReach.ServiceTickets',
        //tenantOnly: true,
      },
      {
        label: 'Field app',
        icon: 'phone',
        route: '/field',
        permission: 'AutoReach.Helpdesk.Update',
        feature: 'Helpdesk',
        //tenantOnly: true,
      },
      {
        label: 'AMC contracts',
        icon: 'clock',
        route: '/field-service/amc',
        feature: 'FieldService',
        permission: 'AutoReach.AmcContracts',
        //tenantOnly: true,
      },
      {
        label: 'AMC renewals',
        icon: 'refresh',
        route: '/renewals',
        permission: 'AutoReach.Renewals',
        feature: 'RenewalDesk',
        //tenantOnly: true,
      },
      {
        label: 'Installed base',
        icon: 'machine',
        route: '/installed-base',
        permission: 'AutoReach.InstalledBase',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Obsolescence radar',
        icon: 'machine',
        route: '/obsolescence',
        permission: 'AutoReach.Obsolescence',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Spares due',
        icon: 'machine',
        route: '/spares',
        permission: 'AutoReach.InstalledBase',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Remote maintenance',
        icon: 'sparkle',
        route: '/field-service/remote-maintenance',
        feature: 'FieldService',
        permission: 'AutoReach.RemoteMaintenance',
        ai: true,
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Manufacturing',
    items: [
      {
        label: 'Bill of materials',
        icon: 'document',
        route: '/manufacturing/bom',
        feature: 'Manufacturing',
        permission: 'AutoReach.BillOfMaterials',
        //tenantOnly: true,
      },
      {
        label: 'Work orders',
        icon: 'machine',
        route: '/manufacturing/work-orders',
        feature: 'Manufacturing',
        permission: 'AutoReach.WorkOrders',
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Finance',
    items: [
      {
        label: 'Chart of accounts',
        icon: 'document',
        route: '/finance/chart-of-accounts',
        feature: 'Finance',
        permission: 'AutoReach.ChartOfAccounts',
        //tenantOnly: true,
      },
      {
        label: 'Journal vouchers',
        icon: 'billing',
        route: '/finance/journal-entries',
        feature: 'Finance',
        permission: 'AutoReach.JournalEntries',
        //tenantOnly: true,
      },
      {
        label: 'Financial statements',
        icon: 'analytics',
        route: '/finance/statements',
        feature: 'Finance',
        permission: 'AutoReach.FinancialStatements',
        //tenantOnly: true,
      },
      {
        label: 'GST compliance',
        icon: 'check',
        route: '/finance/gst-compliance',
        feature: 'Finance',
        permission: 'AutoReach.GstCompliance',
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Products & documents',
    items: [
      {
        label: 'Products',
        icon: 'machine',
        route: '/documents/products',
        permission: 'AutoReach.Library',
        feature: 'DocumentLibrary',
        //tenantOnly: true,
      },
      {
        label: 'Lifecycle rules',
        icon: 'refresh',
        route: '/documents/lifecycle',
        permission: 'AutoReach.Library.Lifecycle',
        feature: 'DocumentLibrary',
        //tenantOnly: true,
      },
      {
        label: 'Fault codes',
        icon: 'alert',
        route: '/documents/fault-codes',
        permission: 'AutoReach.FaultCodes',
        feature: 'DocumentLibrary',
      },
      {
        label: 'Price lists',
        icon: 'billing',
        route: '/documents/price-lists',
        permission: 'AutoReach.Library',
        feature: 'DocumentLibrary',
        //tenantOnly: true,
      },
      {
        label: 'Catalogue',
        icon: 'template',
        route: '/channels/catalogue',
        permission: 'AutoReach.Channels',
        feature: 'DocumentLibrary',
        //tenantOnly: true,
      },
      {
        label: 'Documents',
        icon: 'document',
        route: '/documents',
        permission: 'AutoReach.Library',
        feature: 'DocumentLibrary',
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Partners',
    items: [
      {
        label: 'Dealer network',
        icon: 'tower',
        route: '/network',
        permission: 'AutoReach.Network',
        feature: 'OemNetwork',
        //tenantOnly: true,
      },
      {
        label: 'Reseller programme',
        icon: 'globe',
        route: '/resellers',
        feature: 'Partners',
        permission: 'AutoReach.Resellers',
        //tenantOnly: true,
      },
      {
        label: 'Agency mode',
        icon: 'segment',
        route: '/settings/agency',
        feature: 'Partners',
        permission: 'AutoReach.Agency',
        //tenantOnly: true,
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
        //tenantOnly: true,
      },
      {
        label: 'Analytics',
        icon: 'analytics',
        route: '/analytics',
        permission: 'AutoReach.Analytics',
        feature: 'FullAnalytics',
        //tenantOnly: true,
      },
      {
        label: 'Campaign results',
        icon: 'campaign',
        route: '/analytics/campaigns',
        permission: 'AutoReach.Analytics',
        //tenantOnly: true,
      },
      {
        label: 'Ad attribution',
        icon: 'analytics',
        route: '/analytics/ads',
        permission: 'AutoReach.Analytics',
        feature: 'ClickToWhatsAppAttribution',
        //tenantOnly: true,
      },
      {
        label: 'Business reports',
        icon: 'document',
        route: '/reports/business',
        permission: 'AutoReach.Inventory || AutoReach.Payments',
        feature: 'FullAnalytics',
        //tenantOnly: true,
      },
      {
        label: 'Custom dashboards',
        icon: 'analytics',
        route: '/analytics/dashboards',
        permission: 'AutoReach.Analytics',
        feature: 'FullAnalytics',
        //tenantOnly: true,
      },
      {
        label: 'Scheduled reports',
        icon: 'clock',
        route: '/settings/reports',
        permission: 'AutoReach.Analytics',
        feature: 'FullAnalytics',
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Channels',
    items: [
      {
        label: 'Channels',
        icon: 'channel',
        route: '/channels',
        permission: 'AutoReach.Channels',
        //tenantOnly: true,
      },
      {
        label: 'Display name & PIN',
        icon: 'tower',
        route: '/channels/numbers',
        permission: 'AutoReach.Channels',
        //tenantOnly: true,
      },
      {
        label: 'Migrate a number',
        icon: 'refresh',
        route: '/channels/migrate',
        permission: 'AutoReach.Channels.Onboard',
        //tenantOnly: true,
      },
      {
        label: 'Telecom & numbers',
        icon: 'tower',
        route: '/channels/telecom',
        permission: 'AutoReach.Telecom || AutoReach.Channels.Manage || AutoReach.Channels',
      },
      {
        label: 'Email sending',
        icon: 'send',
        route: '/settings/email-sending',
        permission: 'AutoReach.Channels',
        feature: 'Email',
        //tenantOnly: true,
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
        label: 'Members & invites',
        icon: 'user',
        route: '/settings/members',
        permission: 'AutoReach.Members',
        //tenantOnly: true,
      },
      {
        label: 'Teams',
        icon: 'contacts',
        route: '/settings/teams',
        permission: 'AutoReach.Teams',
        //tenantOnly: true,
      },
      {
        label: 'Roles & permissions',
        icon: 'shield',
        route: '/admin/roles',
        permission: 'AbpIdentity.Roles',
      },
      {
        label: 'Sign-in rules',
        icon: 'shield',
        route: '/settings/security-policy',
        permission: 'AutoReach.SecurityPolicy',
      },
      {
        label: 'Support access',
        icon: 'user',
        route: '/settings/support-access',
        permission: 'AutoReach.Members',
        //tenantOnly: true,
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
    heading: 'Settings',
    items: [
      { label: 'Settings', icon: 'settings', route: '/settings' },
      {
        label: 'Business profile',
        icon: 'document',
        route: '/settings/business-profile',
        // On the host it is the platform's profile, the supplier on subscription invoices.
        permission: 'AutoReach.Branding || AutoReach.Administration.ManageTenants',
      },
      {
        label: 'Branding',
        icon: 'settings',
        route: '/settings/branding',
        permission: 'AutoReach.Branding',
        //tenantOnly: true,
      },
      {
        label: 'Email templates',
        icon: 'mail',
        route: '/settings/email-templates',
        permission: 'AutoReach.TextTemplates',
      },
      {
        label: 'Integrations',
        icon: 'link',
        route: '/settings/integrations',
        permission: 'AutoReach.Integrations',
        feature: 'Connectors',
        //tenantOnly: true,
      },
      {
        label: 'AI assistant',
        icon: 'sparkle',
        route: '/settings/ai-assistant',
        permission: 'AutoReach.Integrations',
        feature: 'AiAssistant',
        ai: true,
        //tenantOnly: true,
      },
      {
        label: 'Tasks & meetings',
        icon: 'bell',
        route: '/settings/tasks-meetings',
        permission: 'AutoReach.Activities',
        //tenantOnly: true,
      },
      {
        label: 'Shipping',
        icon: 'send',
        route: '/settings/shipping',
        permission: 'AutoReach.ReorderPortal.Settings',
        feature: 'ReorderPortal',
        //tenantOnly: true,
      },
      {
        label: 'Compliance',
        icon: 'shield',
        route: '/compliance',
        permission: 'AutoReach.Compliance',
        //tenantOnly: true,
      },
      {
        label: 'DPDP readiness',
        icon: 'shield',
        route: '/compliance/dpdp',
        permission: 'AutoReach.Compliance',
        //tenantOnly: true,
      },
    ],
  },
  {
    heading: 'Billing',
    items: [
      {
        label: 'Billing',
        icon: 'billing',
        route: '/billing',
        permission: 'AutoReach.Billing',
        //tenantOnly: true,
      },
      {
        label: 'Invoices',
        icon: 'document',
        route: '/billing/invoices',
        permission: 'AutoReach.Billing',
        //tenantOnly: true,
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
      {
        label: 'AI providers',
        icon: 'settings',
        route: '/platform/ai-providers',
        permission: 'AutoReach.Administration.ManageTenants',
        hostOnly: true,
      },
      {
        label: 'Payment gateways',
        icon: 'billing',
        route: '/platform/payment-gateways',
        permission: 'AutoReach.Administration.ManageTenants',
        hostOnly: true,
      },
      {
        label: 'Phone numbers',
        icon: 'phone',
        route: '/platform/phone-numbers',
        permission: 'AutoReach.Administration.ManageTenants',
        hostOnly: true,
      },
      {
        label: 'Status page',
        icon: 'shield',
        route: '/platform/status',
        permission: 'AutoReach.Administration.ManageTenants',
        hostOnly: true,
      },
    ],
  },
];
