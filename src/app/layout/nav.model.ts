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

  /**
   * Kept out of the sidebar to keep it to day-to-day work: a set-up page is opened from the
   * Settings page, a report from All reports. Menu search still finds it, it can still be starred
   * as a favourite, and its group still heads its breadcrumb.
   */
  readonly menu?: 'settings' | 'reports';
}

/** The sidebar item that stands for a page reached from a hub (Settings, All reports). */
export const HUB_ROUTE: Readonly<Record<NonNullable<NavItem['menu']>, string>> = {
  settings: '/settings',
  reports: '/reports',
};

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
        icon: 'getting-started',
        route: '/getting-started',
        //tenantOnly: true,
        untilSetupComplete: true,
      },
      { label: 'Home', icon: 'home', route: '/home' },
      // Everyone's own to-do list, so it sits above the departments.
      {
        label: 'Tasks',
        icon: 'check',
        route: '/tasks',
        permission: 'AutoReach.Activities',
        feature: 'PipelineCrm',
      },
      {
        label: 'Meetings',
        icon: 'clock',
        route: '/meetings',
        permission: 'AutoReach.Activities',
        feature: 'PipelineCrm',
      },
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
        icon: 'customer-360',
        route: '/contacts/360',
        permission: 'AutoReach.Customer360',
        //tenantOnly: true,
      },
      {
        label: 'Accounts',
        icon: 'accounts',
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
        icon: 'account-health',
        route: '/account-health',
        permission: 'AutoReach.Contacts',
        // tenantOnly: true,
      },
      {
        label: 'Duplicates',
        icon: 'copy',
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
        menu: 'settings',
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
        menu: 'settings',
        permission: 'AutoReach.Channels',
        //tenantOnly: true,
      },
      {
        label: 'Web forms',
        icon: 'template',
        route: '/forms',
        menu: 'settings',
        permission: 'AutoReach.Channels',
        //tenantOnly: true,
      },
      {
        label: 'Chat links & QR',
        icon: 'link',
        route: '/channels/widget',
        menu: 'settings',
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
        icon: 'vendor-360',
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
        icon: 'goods-receipt',
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
        icon: 'debit-note',
        route: '/purchasing/debit-notes',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.VendorDebitNotes',
        //tenantOnly: true,
      },
      {
        label: 'Stock',
        icon: 'stock',
        route: '/stock',
        permission: 'AutoReach.Inventory',
        feature: 'ErpSync',
        //tenantOnly: true,
      },
      {
        label: 'Stock planning',
        icon: 'stock-planning',
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
        label: 'Projects',
        icon: 'projects',
        route: '/projects',
        permission: 'AutoReach.Projects',
        feature: 'PipelineCrm',
      },
      {
        label: 'Forecast',
        icon: 'forecast',
        route: '/forecast',
        permission: 'AutoReach.Pipeline',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Projection plan',
        icon: 'projection-plan',
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
        icon: 'sales-orders',
        route: '/sales/orders',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.SalesOrders',
        //tenantOnly: true,
      },
      {
        label: 'Delivery challans',
        icon: 'delivery-challans',
        route: '/sales/challans',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.DeliveryChallans',
        //tenantOnly: true,
      },
      {
        label: 'Sales invoices',
        icon: 'sales-invoices',
        route: '/sales/invoices',
        feature: 'SalesAndPurchasing',
        permission: 'AutoReach.SalesInvoices',
        //tenantOnly: true,
      },
      {
        label: 'Milestones due',
        icon: 'clock',
        route: '/billing/due',
        feature: 'ProjectBilling',
        permission: 'AutoReach.ProjectBilling.Invoice',
      },
      {
        label: 'Retention',
        icon: 'retention',
        route: '/billing/retention',
        feature: 'ProjectBilling',
        permission: 'AutoReach.ProjectBilling.Invoice',
      },
      {
        label: 'Billing reports',
        icon: 'analytics',
        route: '/billing/reports',
        menu: 'reports',
        feature: 'ProjectBilling',
        permission: 'AutoReach.ProjectBilling.Reports',
      },
      {
        label: 'Re-orders',
        icon: 'reorders',
        route: '/reorders',
        permission: 'AutoReach.ReorderPortal',
        feature: 'ReorderPortal',
        //tenantOnly: true,
      },
      {
        label: 'Collections',
        icon: 'collections',
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
        icon: 'deal-registrations',
        route: '/oem/registrations',
        permission: 'AutoReach.Spa',
        feature: 'OemPricing',
      },
      {
        label: 'Special prices',
        icon: 'special-prices',
        route: '/oem/spa',
        permission: 'AutoReach.Spa',
        feature: 'OemPricing',
      },
      {
        label: 'OEM claims',
        icon: 'oem-claims',
        route: '/oem/claims',
        permission: 'AutoReach.Spa.Claims',
        feature: 'OemPricing',
      },
      {
        label: 'OEM reports',
        icon: 'analytics',
        route: '/oem/reports',
        menu: 'reports',
        permission: 'AutoReach.Spa.Reports',
        feature: 'OemPricing',
      },
      {
        label: 'OEM settings',
        icon: 'settings',
        route: '/oem/settings',
        menu: 'settings',
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
        icon: 'whatsapp-calls',
        route: '/calls/whatsapp',
        permission: 'AutoReach.Inbox',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'AI voice agents',
        icon: 'ai-agents',
        route: '/calls/ai-agents',
        permission: 'AutoReach.Channels.Manage',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'AI call batches',
        icon: 'ai-batches',
        route: '/calls/ai-batches',
        permission: 'AutoReach.Campaigns',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'Website call button',
        icon: 'phone',
        route: '/calls/web-widget',
        menu: 'settings',
        permission: 'AutoReach.Channels.Manage',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'Voice / IVR',
        icon: 'phone',
        route: '/channels/voice-ivr',
        menu: 'settings',
        permission: 'AutoReach.Channels',
        feature: 'Voice',
        //tenantOnly: true,
      },
      {
        label: 'AI impact report',
        icon: 'analytics',
        route: '/calls/ai-impact',
        menu: 'reports',
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
        icon: 'helpdesk',
        route: '/helpdesk',
        permission: 'AutoReach.Helpdesk',
        feature: 'Helpdesk',
        //tenantOnly: true,
      },
      {
        label: 'Field tickets',
        icon: 'field-tickets',
        route: '/field-service/tickets',
        feature: 'FieldService',
        permission: 'AutoReach.ServiceTickets',
        //tenantOnly: true,
      },
      {
        label: 'Field app',
        icon: 'field-app',
        route: '/field',
        permission: 'AutoReach.Helpdesk.Update',
        feature: 'Helpdesk',
        //tenantOnly: true,
      },
      {
        label: 'AMC contracts',
        icon: 'amc-contracts',
        route: '/field-service/amc',
        feature: 'FieldService',
        permission: 'AutoReach.AmcContracts',
        //tenantOnly: true,
      },
      {
        label: 'AMC renewals',
        icon: 'amc-renewals',
        route: '/renewals',
        permission: 'AutoReach.Renewals',
        feature: 'RenewalDesk',
        //tenantOnly: true,
      },
      {
        label: 'Installed base',
        icon: 'installed-base',
        route: '/installed-base',
        permission: 'AutoReach.InstalledBase',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Obsolescence radar',
        icon: 'obsolescence-radar',
        route: '/obsolescence',
        permission: 'AutoReach.Obsolescence',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Spares due',
        icon: 'spares-due',
        route: '/spares',
        permission: 'AutoReach.InstalledBase',
        feature: 'PipelineCrm',
        //tenantOnly: true,
      },
      {
        label: 'Remote maintenance',
        icon: 'remote-maintenance',
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
        icon: 'bill-of-materials',
        route: '/manufacturing/bom',
        feature: 'Manufacturing',
        permission: 'AutoReach.BillOfMaterials',
        //tenantOnly: true,
      },
      {
        label: 'Work orders',
        icon: 'work-orders',
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
        icon: 'chart-of-accounts',
        route: '/finance/chart-of-accounts',
        feature: 'Finance',
        permission: 'AutoReach.ChartOfAccounts',
        //tenantOnly: true,
      },
      {
        label: 'Journal vouchers',
        icon: 'journal-entries',
        route: '/finance/journal-entries',
        feature: 'Finance',
        permission: 'AutoReach.JournalEntries',
        //tenantOnly: true,
      },
      {
        label: 'Financial statements',
        icon: 'financial-statements',
        route: '/finance/statements',
        feature: 'Finance',
        permission: 'AutoReach.FinancialStatements',
        //tenantOnly: true,
      },
      {
        label: 'GST compliance',
        icon: 'gst-compliance',
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
        icon: 'products',
        route: '/documents/products',
        permission: 'AutoReach.Library',
        feature: 'DocumentLibrary',
        //tenantOnly: true,
      },
      {
        label: 'Lifecycle rules',
        icon: 'refresh',
        route: '/documents/lifecycle',
        menu: 'settings',
        permission: 'AutoReach.Library.Lifecycle',
        feature: 'DocumentLibrary',
        //tenantOnly: true,
      },
      {
        label: 'Fault codes',
        icon: 'fault-codes',
        route: '/documents/fault-codes',
        permission: 'AutoReach.FaultCodes',
        feature: 'DocumentLibrary',
      },
      {
        label: 'Price lists',
        icon: 'price-lists',
        route: '/documents/price-lists',
        permission: 'AutoReach.Library',
        feature: 'DocumentLibrary',
        //tenantOnly: true,
      },
      {
        label: 'Catalogue',
        icon: 'catalogue',
        route: '/channels/catalogue',
        permission: 'AutoReach.Channels',
        feature: 'DocumentLibrary',
        //tenantOnly: true,
      },
      {
        label: 'Documents',
        icon: 'documents',
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
        icon: 'dealer-network',
        route: '/network',
        permission: 'AutoReach.Network',
        feature: 'OemNetwork',
        //tenantOnly: true,
      },
      {
        label: 'Reseller programme',
        icon: 'reseller-programme',
        route: '/resellers',
        feature: 'Partners',
        permission: 'AutoReach.Resellers',
        //tenantOnly: true,
      },
      {
        label: 'Agency mode',
        icon: 'segment',
        route: '/settings/agency',
        menu: 'settings',
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
        icon: 'all-reports',
        route: '/reports',
        permission:
          'AutoReach.Analytics || AutoReach.Inventory || AutoReach.Payments || AutoReach.Pipeline',
        //tenantOnly: true,
      },
      {
        label: 'Analytics',
        icon: 'analytics-overview',
        route: '/analytics',
        permission: 'AutoReach.Analytics',
        feature: 'FullAnalytics',
        //tenantOnly: true,
      },
      {
        label: 'Campaign results',
        icon: 'campaign',
        route: '/analytics/campaigns',
        menu: 'reports',
        permission: 'AutoReach.Analytics',
        //tenantOnly: true,
      },
      {
        label: 'Ad attribution',
        icon: 'analytics',
        route: '/analytics/ads',
        menu: 'reports',
        permission: 'AutoReach.Analytics',
        feature: 'ClickToWhatsAppAttribution',
        //tenantOnly: true,
      },
      {
        label: 'Business reports',
        icon: 'document',
        route: '/reports/business',
        menu: 'reports',
        permission: 'AutoReach.Inventory || AutoReach.Payments',
        feature: 'FullAnalytics',
        //tenantOnly: true,
      },
      {
        label: 'Custom dashboards',
        icon: 'custom-dashboards',
        route: '/analytics/dashboards',
        permission: 'AutoReach.Analytics',
        feature: 'FullAnalytics',
        //tenantOnly: true,
      },
      {
        label: 'Scheduled reports',
        icon: 'clock',
        route: '/settings/reports',
        menu: 'reports',
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
        menu: 'settings',
        permission: 'AutoReach.Channels',
        //tenantOnly: true,
      },
      {
        label: 'Display name & PIN',
        icon: 'tower',
        route: '/channels/numbers',
        menu: 'settings',
        permission: 'AutoReach.Channels',
        //tenantOnly: true,
      },
      {
        label: 'Migrate a number',
        icon: 'refresh',
        route: '/channels/migrate',
        menu: 'settings',
        permission: 'AutoReach.Channels.Onboard',
        //tenantOnly: true,
      },
      {
        label: 'Telecom & numbers',
        icon: 'tower',
        route: '/channels/telecom',
        menu: 'settings',
        permission: 'AutoReach.Telecom || AutoReach.Channels.Manage || AutoReach.Channels',
      },
      {
        label: 'Email sending',
        icon: 'send',
        route: '/settings/email-sending',
        menu: 'settings',
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
        menu: 'settings',
        permission: 'AbpIdentity.Users',
      },
      {
        label: 'Members & invites',
        icon: 'user',
        route: '/settings/members',
        menu: 'settings',
        permission: 'AutoReach.Members',
        //tenantOnly: true,
      },
      {
        label: 'Teams',
        icon: 'contacts',
        route: '/settings/teams',
        menu: 'settings',
        permission: 'AutoReach.Teams',
        //tenantOnly: true,
      },
      {
        label: 'Pick lists',
        icon: 'filter',
        route: '/settings/pick-lists',
        menu: 'settings',
      },
      {
        label: 'Roles & permissions',
        icon: 'shield',
        route: '/admin/roles',
        menu: 'settings',
        permission: 'AbpIdentity.Roles',
      },
      {
        label: 'Sign-in rules',
        icon: 'shield',
        route: '/settings/security-policy',
        menu: 'settings',
        permission: 'AutoReach.SecurityPolicy',
      },
      {
        label: 'Support access',
        icon: 'user',
        route: '/settings/support-access',
        menu: 'settings',
        permission: 'AutoReach.Members',
        //tenantOnly: true,
      },
      {
        label: 'Audit log',
        icon: 'clock',
        route: '/admin/audit-logs',
        menu: 'settings',
        permission: 'AutoReach.AuditLogs',
      },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { label: 'Settings', icon: 'settings-menu', route: '/settings' },
      {
        label: 'Business profile',
        icon: 'document',
        route: '/settings/business-profile',
        menu: 'settings',
        // On the host it is the platform's profile, the supplier on subscription invoices.
        permission: 'AutoReach.Branding || AutoReach.Administration.ManageTenants',
      },
      {
        label: 'Branding',
        icon: 'settings',
        route: '/settings/branding',
        menu: 'settings',
        permission: 'AutoReach.Branding',
        //tenantOnly: true,
      },
      {
        label: 'Email templates',
        icon: 'mail',
        route: '/settings/email-templates',
        menu: 'settings',
        permission: 'AutoReach.TextTemplates',
      },
      {
        label: 'Integrations',
        icon: 'link',
        route: '/settings/integrations',
        menu: 'settings',
        permission: 'AutoReach.Integrations',
        feature: 'Connectors',
        //tenantOnly: true,
      },
      {
        label: 'AI assistant',
        icon: 'sparkle',
        route: '/settings/ai-assistant',
        menu: 'settings',
        permission: 'AutoReach.Integrations',
        feature: 'AiAssistant',
        ai: true,
        //tenantOnly: true,
      },
      {
        label: 'Tasks & meetings',
        icon: 'bell',
        route: '/settings/tasks-meetings',
        menu: 'settings',
        permission: 'AutoReach.Activities',
        //tenantOnly: true,
      },
      {
        label: 'Shipping',
        icon: 'send',
        route: '/settings/shipping',
        menu: 'settings',
        permission: 'AutoReach.ReorderPortal.Settings',
        feature: 'ReorderPortal',
        //tenantOnly: true,
      },
      {
        label: 'Compliance',
        icon: 'shield',
        route: '/compliance',
        menu: 'settings',
        permission: 'AutoReach.Compliance',
        //tenantOnly: true,
      },
      {
        label: 'DPDP readiness',
        icon: 'shield',
        route: '/compliance/dpdp',
        menu: 'settings',
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
        menu: 'settings',
        permission: 'AutoReach.Billing',
        //tenantOnly: true,
      },
      {
        label: 'Invoices',
        icon: 'document',
        route: '/billing/invoices',
        menu: 'settings',
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
        icon: 'platform-console',
        route: '/platform',
        permission: 'AutoReach.Administration.ViewPlatformMetrics',
        hostOnly: true,
      },
      // Daily work for the platform team, so it stays in the menu (Administration is set-up only).
      {
        label: 'Workspaces',
        icon: 'workspaces',
        route: '/admin/tenants',
        permission: 'AbpTenantManagement.Tenants',
        hostOnly: true,
      },
      {
        label: 'Feature flags',
        icon: 'feature-flags',
        route: '/platform/feature-flags',
        permission: 'AutoReach.Administration.ManageTenants',
        hostOnly: true,
      },
      {
        label: 'AI providers',
        icon: 'ai-providers',
        route: '/platform/ai-providers',
        permission: 'AutoReach.Administration.ManageTenants',
        hostOnly: true,
      },
      {
        label: 'Payment gateways',
        icon: 'payment-gateways',
        route: '/platform/payment-gateways',
        permission: 'AutoReach.Administration.ManageTenants',
        hostOnly: true,
      },
      {
        label: 'Phone numbers',
        icon: 'phone-numbers',
        route: '/platform/phone-numbers',
        permission: 'AutoReach.Administration.ManageTenants',
        hostOnly: true,
      },
      {
        label: 'Status page',
        icon: 'status-page',
        route: '/platform/status',
        permission: 'AutoReach.Administration.ManageTenants',
        hostOnly: true,
      },
    ],
  },
];
