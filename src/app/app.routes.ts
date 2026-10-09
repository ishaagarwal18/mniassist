import { Routes } from '@angular/router';
import { appAuthGuard } from './core/auth/auth.guard';

/** Every feature is lazily loaded — the shell and the design system are the
 *  only things in the initial bundle. */
export const routes: Routes = [
  {
    // The public front page: what AutoReach is and what it costs. No login, no app shell.
    // Must stay ahead of the shell below, whose empty path would otherwise claim `/`.
    path: '',
    pathMatch: 'full',
    title: 'MNI Assist · AI Business Engagement Platform for Industrial Companies',
    loadComponent: () => import('./features/landing/landing').then((m) => m.ArLanding),
  },
  {
    path: 'login',
    title: 'Sign in · MNI Assist',
    loadComponent: () => import('./features/account/login').then((m) => m.ArLogin),
  },
  {
    path: 'signup',
    title: 'Create a workspace · MNI Assist',
    loadComponent: () => import('./features/account/signup').then((m) => m.ArSignup),
  },
  {
    path: 'forgot-password',
    title: 'Reset your password · MNI Assist',
    loadComponent: () =>
      import('./features/account/forgot-password').then((m) => m.ArForgotPassword),
  },
  {
    path: 'reset-password',
    title: 'Choose a new password · MNI Assist',
    loadComponent: () => import('./features/account/reset-password').then((m) => m.ArResetPassword),
  },
  {
    path: 'confirm-email',
    title: 'Confirm your email · MNI Assist',
    loadComponent: () => import('./features/account/confirm-email').then((m) => m.ArConfirmEmail),
  },
  {
    // The customer's signing page: no login, no app shell. The link is the credential.
    path: 'sign/:token',
    title: 'Review and sign · MNI Assist',
    loadComponent: () => import('./features/signing/quote-signing').then((m) => m.ArQuoteSigning),
  },
  {
    // A lead-capture form's public page: no login, no app shell. The address is all a visitor holds.
    path: 'f/:code',
    title: 'Enquiry form',
    loadComponent: () => import('./features/forms/public-form').then((m) => m.ArPublicForm),
  },
  {
    // A customer's pay page, from the link sent in their conversation: no login, no app shell.
    path: 'pay/:token',
    title: 'Pay securely',
    loadComponent: () => import('./features/payments/pay-page').then((m) => m.ArPayPage),
  },
  {
    // The public "raise a ticket" page: no login, no app shell, the same way a lead-capture form's page works.
    path: 't/:code',
    title: 'Raise a ticket',
    loadComponent: () => import('./features/helpdesk/ticket-portal').then((m) => m.ArTicketPortal),
  },
  {
    // A customer's spares re-order page, from their personal WhatsApp link: no login, no app shell. A code to their WhatsApp opens it.
    path: 'r/:token',
    title: 'Re-order spares',
    loadComponent: () => import('./features/reorder/reorder-page').then((m) => m.ArReorderPage),
  },
  {
    // A distributor's password sign-in page for the re-order portal: number and password, or a WhatsApp code to set one.
    path: 'reorder/:code',
    title: 'Sign in · Re-order spares',
    loadComponent: () =>
      import('./features/reorder/reorder-sign-in').then((m) => m.ArReorderSignIn),
  },
  {
    // A distributor's public catalogue: anyone looks up parts and sends an enquiry. No login, no app shell.
    path: 'catalogue/:code',
    title: 'Spares catalogue',
    loadComponent: () => import('./features/reorder/catalogue-page').then((m) => m.ArCataloguePage),
  },
  {
    path: 'privacy',
    title: 'Privacy Policy · MNI Assist',
    loadComponent: () => import('./features/legal/privacy-policy').then((m) => m.ArPrivacyPolicy),
  },
  {
    // The field engineer's phone app: signed in, but no app shell. Works offline once loaded.
    path: 'field',
    title: 'Field · MNI Assist',
    canActivate: [appAuthGuard],
    loadComponent: () => import('./features/field/field').then((m) => m.ArField),
  },
  {
    path: '',
    // Lazy like every screen: the shell brings the sidebar, call bars and SignalR,
    // which a visitor to the public pages (landing, sign-in, pay links) never needs.
    loadComponent: () => import('./layout/app-shell').then((m) => m.ArAppShell),
    canActivate: [appAuthGuard],
    canActivateChild: [appAuthGuard],
    children: [
      {
        path: 'home',
        title: 'Home · MNI Assist',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.ArDashboard),
      },
      {
        path: 'getting-started',
        title: 'Get started · MNI Assist',
        loadComponent: () =>
          import('./features/onboarding/wizard').then((m) => m.ArOnboardingWizard),
      },
      {
        path: 'inbox',
        title: 'Inbox · MNI Assist',
        loadComponent: () => import('./features/inbox/inbox').then((m) => m.ArInbox),
      },
      {
        path: 'contacts',
        title: 'Contacts · MNI Assist',
        loadComponent: () => import('./features/contacts/contacts').then((m) => m.ArContacts),
      },
      {
        path: 'contacts/segments',
        title: 'Audience builder · MNI Assist',
        loadComponent: () => import('./features/contacts/segments').then((m) => m.ArSegments),
      },
      {
        path: 'contacts/accounts',
        title: 'Accounts · MNI Assist',
        loadComponent: () => import('./features/contacts/accounts').then((m) => m.ArAccounts),
      },
      {
        path: 'contacts/duplicates',
        title: 'Duplicates · MNI Assist',
        loadComponent: () => import('./features/contacts/duplicates').then((m) => m.ArDuplicates),
      },
      {
        path: 'campaigns',
        title: 'Campaigns · MNI Assist',
        loadComponent: () =>
          import('./features/campaigns/campaign-builder').then((m) => m.ArCampaignBuilder),
      },
      {
        path: 'templates',
        title: 'Templates · MNI Assist',
        loadComponent: () => import('./features/templates/templates').then((m) => m.ArTemplates),
      },
      {
        path: 'templates/new',
        title: 'New template · MNI Assist',
        loadComponent: () =>
          import('./features/templates/template-composer').then((m) => m.ArTemplateComposer),
      },
      {
        path: 'templates/:id/edit',
        title: 'Edit template · MNI Assist',
        loadComponent: () =>
          import('./features/templates/template-composer').then((m) => m.ArTemplateComposer),
      },
      {
        path: 'analytics',
        title: 'Analytics · MNI Assist',
        loadComponent: () => import('./features/analytics/analytics').then((m) => m.ArAnalytics),
      },
      {
        path: 'analytics/campaigns',
        title: 'Campaign results · MNI Assist',
        loadComponent: () =>
          import('./features/analytics/campaign-results').then((m) => m.ArCampaignResults),
      },
      {
        path: 'analytics/ads',
        title: 'Ad attribution · MNI Assist',
        loadComponent: () =>
          import('./features/analytics/ad-attribution').then((m) => m.ArAdAttribution),
      },
      {
        path: 'analytics/dashboards',
        title: 'Custom dashboards · MNI Assist',
        loadComponent: () =>
          import('./features/analytics/dashboards').then((m) => m.ArCustomDashboards),
      },
      {
        path: 'enquiries',
        title: 'Enquiries · MNI Assist',
        loadComponent: () => import('./features/pipeline/enquiries').then((m) => m.ArEnquiries),
      },
      {
        path: 'enquiries/pipelines',
        title: 'Pipelines · MNI Assist',
        loadComponent: () =>
          import('./features/pipeline/pipeline-stages').then((m) => m.ArPipelineStages),
      },
      {
        path: 'forecast',
        title: 'Forecast · MNI Assist',
        loadComponent: () => import('./features/pipeline/forecast').then((m) => m.ArForecast),
      },
      {
        path: 'quotations',
        title: 'Quotations · MNI Assist',
        loadComponent: () => import('./features/pipeline/quotations').then((m) => m.ArQuotations),
      },
      {
        path: 'renewals',
        title: 'AMC renewals · MNI Assist',
        loadComponent: () => import('./features/pipeline/renewals').then((m) => m.ArRenewals),
      },
      {
        path: 'spares',
        title: 'Spares due · MNI Assist',
        loadComponent: () => import('./features/pipeline/spares').then((m) => m.ArSpares),
      },
      {
        path: 'collections',
        title: 'Collections · MNI Assist',
        loadComponent: () => import('./features/payments/collections').then((m) => m.ArCollections),
      },
      {
        path: 'stock',
        title: 'Stock · MNI Assist',
        loadComponent: () => import('./features/inventory/stock').then((m) => m.ArStock),
      },
      {
        path: 'stock/planning',
        title: 'Stock planning · MNI Assist',
        loadComponent: () =>
          import('./features/inventory/stock-planning').then((m) => m.ArStockPlanning),
      },
      {
        path: 'reports',
        title: 'Reports · MNI Assist',
        loadComponent: () => import('./features/reports/reports-hub').then((m) => m.ArReportsHub),
      },
      {
        path: 'reports/business',
        title: 'Business reports · MNI Assist',
        loadComponent: () =>
          import('./features/reports/business-reports').then((m) => m.ArBusinessReports),
      },
      {
        path: 'purchasing',
        title: 'Purchasing · MNI Assist',
        loadComponent: () => import('./features/inventory/purchasing').then((m) => m.ArPurchasing),
      },
      {
        path: 'reorders',
        title: 'Re-orders · MNI Assist',
        loadComponent: () => import('./features/reorder/reorders').then((m) => m.ArReorders),
      },
      {
        path: 'network',
        title: 'Dealer network · MNI Assist',
        loadComponent: () => import('./features/network/network').then((m) => m.ArNetwork),
      },
      {
        path: 'network/incoming',
        title: 'Leads for us · MNI Assist',
        data: { tab: 'incoming' },
        loadComponent: () => import('./features/network/network').then((m) => m.ArNetwork),
      },
      {
        path: 'account-health',
        title: 'Account health · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/account-health').then((m) => m.ArAccountHealth),
      },
      {
        path: 'compliance/dpdp',
        title: 'DPDP readiness · MNI Assist',
        loadComponent: () => import('./features/compliance/dpdp').then((m) => m.ArDpdp),
      },
      {
        path: 'installed-base',
        title: 'Installed base · MNI Assist',
        loadComponent: () =>
          import('./features/pipeline/installed-base').then((m) => m.ArInstalledBase),
      },
      {
        path: 'compliance',
        title: 'Compliance · MNI Assist',
        loadComponent: () => import('./features/compliance/compliance').then((m) => m.ArCompliance),
      },
      {
        path: 'automations',
        title: 'Automations · MNI Assist',
        loadComponent: () =>
          import('./features/automations/automations').then((m) => m.ArAutomations),
      },
      {
        path: 'automations/:id',
        title: 'Automation builder · MNI Assist',
        loadComponent: () =>
          import('./features/automations/automation-builder').then((m) => m.ArAutomationBuilder),
      },
      {
        path: 'flows',
        title: 'Flows · MNI Assist',
        loadComponent: () => import('./features/flows/flows').then((m) => m.ArFlows),
      },
      {
        path: 'flows/:id',
        title: 'Flow designer · MNI Assist',
        loadComponent: () => import('./features/flows/flow-designer').then((m) => m.ArFlowDesigner),
      },
      {
        path: 'tasks',
        title: 'Tasks · MNI Assist',
        loadComponent: () => import('./features/activities/tasks').then((m) => m.ArTasks),
      },
      {
        path: 'forms',
        title: 'Web forms · MNI Assist',
        loadComponent: () => import('./features/forms/forms').then((m) => m.ArWebForms),
      },
      {
        path: 'calls',
        title: 'Calls · MNI Assist',
        loadComponent: () => import('./features/calls/calls').then((m) => m.ArCalls),
      },
      {
        path: 'calls/whatsapp',
        title: 'WhatsApp calls · MNI Assist',
        loadComponent: () =>
          import('./features/calls/whatsapp-calls').then((m) => m.ArWhatsAppCalls),
      },
      {
        path: 'helpdesk',
        title: 'Helpdesk · MNI Assist',
        loadComponent: () => import('./features/helpdesk/helpdesk').then((m) => m.ArHelpdesk),
      },
      {
        path: 'meetings',
        title: 'Meetings · MNI Assist',
        loadComponent: () => import('./features/activities/meetings').then((m) => m.ArMeetings),
      },
      {
        path: 'documents',
        title: 'Documents · MNI Assist',
        loadComponent: () => import('./features/documents/documents').then((m) => m.ArDocuments),
      },
      {
        path: 'documents/products',
        title: 'Products · MNI Assist',
        loadComponent: () => import('./features/documents/products').then((m) => m.ArProducts),
      },
      {
        path: 'documents/price-lists',
        title: 'Price lists · MNI Assist',
        loadComponent: () => import('./features/documents/price-lists').then((m) => m.ArPriceLists),
      },
      {
        path: 'billing',
        title: 'Billing · MNI Assist',
        loadComponent: () => import('./features/billing/billing').then((m) => m.ArBilling),
      },
      {
        path: 'channels',
        title: 'Channels · MNI Assist',
        loadComponent: () => import('./features/channels/channels').then((m) => m.ArChannels),
      },
      {
        path: 'channels/numbers',
        title: 'Numbers · MNI Assist',
        loadComponent: () => import('./features/channels/numbers').then((m) => m.ArNumbers),
      },
      {
        path: 'channels/telecom',
        title: 'Telecom & Reseller Numbers · MNI Assist',
        loadComponent: () => import('./features/channels/telecom').then((m) => m.ArTelecom),
      },
      {
        path: 'channels/widget',
        title: 'Chat links & QR · MNI Assist',
        loadComponent: () =>
          import('./features/channels/chat-widgets').then((m) => m.ArChatWidgets),
      },
      {
        path: 'channels/migrate',
        title: 'Migrate a number · MNI Assist',
        loadComponent: () =>
          import('./features/channels/migrate-number').then((m) => m.ArMigrateNumber),
      },
      {
        path: 'channels/catalogue',
        title: 'Catalogue · MNI Assist',
        loadComponent: () => import('./features/channels/catalogue').then((m) => m.ArCatalogue),
      },
      {
        path: 'channels/voice-ivr',
        title: 'Voice / IVR · MNI Assist',
        loadComponent: () => import('./features/channels/voice-ivr').then((m) => m.ArVoiceIvr),
      },
      {
        path: 'notifications',
        title: 'Notifications · MNI Assist',
        loadComponent: () =>
          import('./features/notifications/notifications').then((m) => m.ArNotifications),
      },
      {
        path: 'billing/invoices',
        title: 'Invoices · MNI Assist',
        loadComponent: () => import('./features/billing/invoices').then((m) => m.ArInvoices),
      },
      {
        path: 'settings',
        title: 'Settings · MNI Assist',
        loadComponent: () => import('./features/settings/settings').then((m) => m.ArSettings),
      },
      {
        path: 'settings/profile',
        title: 'Your profile · MNI Assist',
        loadComponent: () => import('./features/account/profile').then((m) => m.ArProfile),
      },
      {
        path: 'settings/members',
        title: 'Members & invites · MNI Assist',
        loadComponent: () => import('./features/settings/members').then((m) => m.ArMembers),
      },
      {
        path: 'settings/branding',
        title: 'Branding · MNI Assist',
        loadComponent: () => import('./features/settings/branding').then((m) => m.ArBranding),
      },
      {
        path: 'admin/tenants',
        title: 'Workspaces · MNI Assist',
        loadComponent: () => import('./features/admin/tenants').then((m) => m.ArAdminTenants),
      },
      {
        path: 'admin/users',
        title: 'Users · MNI Assist',
        loadComponent: () => import('./features/admin/users').then((m) => m.ArAdminUsers),
      },
      {
        path: 'admin/roles',
        title: 'Roles & permissions · MNI Assist',
        loadComponent: () => import('./features/admin/roles').then((m) => m.ArAdminRoles),
      },
      {
        path: 'settings/security-policy',
        title: 'Sign-in and password rules · MNI Assist',
        loadComponent: () =>
          import('./features/settings/security-policy').then((m) => m.ArSecurityPolicy),
      },
      {
        path: 'settings/email-templates',
        title: 'Email templates · MNI Assist',
        loadComponent: () =>
          import('./features/settings/email-templates').then((m) => m.ArEmailTemplates),
      },
      {
        path: 'admin/audit-logs',
        title: 'Audit log · MNI Assist',
        loadComponent: () => import('./features/admin/audit-logs').then((m) => m.ArAdminAuditLogs),
      },
      {
        path: 'settings/reports',
        title: 'Scheduled reports · MNI Assist',
        loadComponent: () =>
          import('./features/settings/reports').then((m) => m.ArScheduledReports),
      },
      {
        path: 'settings/integrations',
        title: 'Integrations · MNI Assist',
        loadComponent: () =>
          import('./features/settings/integrations').then((m) => m.ArIntegrations),
      },
      {
        path: 'settings/ai-assistant',
        title: 'AI assistant · MNI Assist',
        loadComponent: () =>
          import('./features/settings/ai-assistant').then((m) => m.ArAiAssistant),
      },
      {
        path: 'settings/payments',
        title: 'Payments · MNI Assist',
        loadComponent: () =>
          import('./features/payments/payments-settings').then((m) => m.ArPaymentsSettings),
      },
      {
        path: 'settings/email-sending',
        title: 'Email sending · MNI Assist',
        loadComponent: () =>
          import('./features/settings/email-sending').then((m) => m.ArEmailSending),
      },
      {
        path: 'settings/support-access',
        title: 'Support access · MNI Assist',
        loadComponent: () =>
          import('./features/settings/support-access').then((m) => m.ArSupportAccess),
      },
      {
        path: 'settings/agency',
        title: 'Agency mode · MNI Assist',
        loadComponent: () => import('./features/settings/agency').then((m) => m.ArAgency),
      },
      {
        path: 'platform',
        title: 'Platform · MNI Assist',
        loadComponent: () => import('./features/platform/console').then((m) => m.ArPlatformConsole),
      },
      {
        path: 'platform/feature-flags',
        title: 'Feature flags · MNI Assist',
        loadComponent: () =>
          import('./features/platform/feature-flags').then((m) => m.ArFeatureFlags),
      },
      { path: '**', redirectTo: 'home' },
    ],
  },
];
