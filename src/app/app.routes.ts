import { Routes } from '@angular/router';
import { ArAppShell } from './layout/app-shell';
import { appAuthGuard } from './core/auth/auth.guard';

/** Every feature is lazily loaded — the shell and the design system are the
 *  only things in the initial bundle. */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · AutoReach',
    loadComponent: () => import('./features/account/login').then((m) => m.ArLogin),
  },
  {
    path: 'signup',
    title: 'Create a workspace · AutoReach',
    loadComponent: () => import('./features/account/signup').then((m) => m.ArSignup),
  },
  {
    path: 'forgot-password',
    title: 'Reset your password · AutoReach',
    loadComponent: () => import('./features/account/forgot-password').then((m) => m.ArForgotPassword),
  },
  {
    path: 'reset-password',
    title: 'Choose a new password · AutoReach',
    loadComponent: () => import('./features/account/reset-password').then((m) => m.ArResetPassword),
  },
  {
    path: 'privacy',
    title: 'Privacy Policy · AutoReach',
    loadComponent: () =>
      import('./features/legal/privacy-policy').then((m) => m.ArPrivacyPolicy),
  },
  {
    path: '',
    component: ArAppShell,
    canActivate: [appAuthGuard],
    canActivateChild: [appAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        title: 'Home · AutoReach',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.ArDashboard),
      },
      {
        path: 'getting-started',
        title: 'Get started · AutoReach',
        loadComponent: () =>
          import('./features/onboarding/wizard').then((m) => m.ArOnboardingWizard),
      },
      {
        path: 'inbox',
        title: 'Inbox · AutoReach',
        loadComponent: () => import('./features/inbox/inbox').then((m) => m.ArInbox),
      },
      {
        path: 'contacts',
        title: 'Contacts · AutoReach',
        loadComponent: () => import('./features/contacts/contacts').then((m) => m.ArContacts),
      },
      {
        path: 'contacts/segments',
        title: 'Audience builder · AutoReach',
        loadComponent: () => import('./features/contacts/segments').then((m) => m.ArSegments),
      },
      {
        path: 'contacts/accounts',
        title: 'Accounts · AutoReach',
        loadComponent: () => import('./features/contacts/accounts').then((m) => m.ArAccounts),
      },
      {
        path: 'campaigns',
        title: 'Campaigns · AutoReach',
        loadComponent: () =>
          import('./features/campaigns/campaign-builder').then((m) => m.ArCampaignBuilder),
      },
      {
        path: 'templates',
        title: 'Templates · AutoReach',
        loadComponent: () => import('./features/templates/templates').then((m) => m.ArTemplates),
      },
      {
        path: 'templates/new',
        title: 'New template · AutoReach',
        loadComponent: () =>
          import('./features/templates/template-composer').then((m) => m.ArTemplateComposer),
      },
      {
        path: 'templates/:id/edit',
        title: 'Edit template · AutoReach',
        loadComponent: () =>
          import('./features/templates/template-composer').then((m) => m.ArTemplateComposer),
      },
      {
        path: 'analytics',
        title: 'Analytics · AutoReach',
        loadComponent: () => import('./features/analytics/analytics').then((m) => m.ArAnalytics),
      },
      {
        path: 'analytics/dashboards',
        title: 'Custom dashboards · AutoReach',
        loadComponent: () =>
          import('./features/analytics/dashboards').then((m) => m.ArCustomDashboards),
      },
      {
        path: 'enquiries',
        title: 'Enquiries · AutoReach',
        loadComponent: () => import('./features/pipeline/enquiries').then((m) => m.ArEnquiries),
      },
      {
        path: 'quotations',
        title: 'Quotations · AutoReach',
        loadComponent: () => import('./features/pipeline/quotations').then((m) => m.ArQuotations),
      },
      {
        path: 'installed-base',
        title: 'Installed base · AutoReach',
        loadComponent: () =>
          import('./features/pipeline/installed-base').then((m) => m.ArInstalledBase),
      },
      {
        path: 'compliance',
        title: 'Compliance · AutoReach',
        loadComponent: () => import('./features/compliance/compliance').then((m) => m.ArCompliance),
      },
      {
        path: 'automations',
        title: 'Automations · AutoReach',
        loadComponent: () =>
          import('./features/automations/automations').then((m) => m.ArAutomations),
      },
      {
        path: 'automations/:id',
        title: 'Automation builder · AutoReach',
        loadComponent: () =>
          import('./features/automations/automation-builder').then((m) => m.ArAutomationBuilder),
      },
      {
        path: 'flows',
        title: 'Flows · AutoReach',
        loadComponent: () => import('./features/flows/flows').then((m) => m.ArFlows),
      },
      {
        path: 'flows/:id',
        title: 'Flow designer · AutoReach',
        loadComponent: () => import('./features/flows/flow-designer').then((m) => m.ArFlowDesigner),
      },
      {
        path: 'documents',
        title: 'Documents · AutoReach',
        loadComponent: () => import('./features/documents/documents').then((m) => m.ArDocuments),
      },
      {
        path: 'documents/price-lists',
        title: 'Price lists · AutoReach',
        loadComponent: () => import('./features/documents/price-lists').then((m) => m.ArPriceLists),
      },
      {
        path: 'billing',
        title: 'Billing · AutoReach',
        loadComponent: () => import('./features/billing/billing').then((m) => m.ArBilling),
      },
      {
        path: 'channels',
        title: 'Channels · AutoReach',
        loadComponent: () => import('./features/channels/channels').then((m) => m.ArChannels),
      },
      {
        path: 'channels/numbers',
        title: 'Numbers · AutoReach',
        loadComponent: () => import('./features/channels/numbers').then((m) => m.ArNumbers),
      },
      {
        path: 'channels/widget',
        title: 'Chat links & QR · AutoReach',
        loadComponent: () =>
          import('./features/channels/chat-widgets').then((m) => m.ArChatWidgets),
      },
      {
        path: 'channels/migrate',
        title: 'Migrate a number · AutoReach',
        loadComponent: () =>
          import('./features/channels/migrate-number').then((m) => m.ArMigrateNumber),
      },
      {
        path: 'channels/catalogue',
        title: 'Catalogue · AutoReach',
        loadComponent: () => import('./features/channels/catalogue').then((m) => m.ArCatalogue),
      },
      {
        path: 'channels/voice-ivr',
        title: 'Voice / IVR · AutoReach',
        loadComponent: () => import('./features/channels/voice-ivr').then((m) => m.ArVoiceIvr),
      },
      {
        path: 'notifications',
        title: 'Notifications · AutoReach',
        loadComponent: () =>
          import('./features/notifications/notifications').then((m) => m.ArNotifications),
      },
      {
        path: 'billing/invoices',
        title: 'Invoices · AutoReach',
        loadComponent: () => import('./features/billing/invoices').then((m) => m.ArInvoices),
      },
      {
        path: 'settings',
        title: 'Settings · AutoReach',
        loadComponent: () => import('./features/settings/settings').then((m) => m.ArSettings),
      },
      {
        path: 'settings/profile',
        title: 'Your profile · AutoReach',
        loadComponent: () => import('./features/account/profile').then((m) => m.ArProfile),
      },
      {
        path: 'settings/members',
        title: 'Members & invites · AutoReach',
        loadComponent: () => import('./features/settings/members').then((m) => m.ArMembers),
      },
      {
        path: 'settings/branding',
        title: 'Branding · AutoReach',
        loadComponent: () => import('./features/settings/branding').then((m) => m.ArBranding),
      },
      {
        path: 'admin/tenants',
        title: 'Workspaces · AutoReach',
        loadComponent: () => import('./features/admin/tenants').then((m) => m.ArAdminTenants),
      },
      {
        path: 'admin/users',
        title: 'Users · AutoReach',
        loadComponent: () => import('./features/admin/users').then((m) => m.ArAdminUsers),
      },
      {
        path: 'admin/roles',
        title: 'Roles & permissions · AutoReach',
        loadComponent: () => import('./features/admin/roles').then((m) => m.ArAdminRoles),
      },
      {
        path: 'settings/reports',
        title: 'Scheduled reports · AutoReach',
        loadComponent: () =>
          import('./features/settings/reports').then((m) => m.ArScheduledReports),
      },
      {
        path: 'settings/integrations',
        title: 'Integrations · AutoReach',
        loadComponent: () =>
          import('./features/settings/integrations').then((m) => m.ArIntegrations),
      },
      {
        path: 'settings/ai-assistant',
        title: 'AI assistant · AutoReach',
        loadComponent: () =>
          import('./features/settings/ai-assistant').then((m) => m.ArAiAssistant),
      },
      {
        path: 'settings/email-sending',
        title: 'Email sending · AutoReach',
        loadComponent: () =>
          import('./features/settings/email-sending').then((m) => m.ArEmailSending),
      },
      {
        path: 'settings/support-access',
        title: 'Support access · AutoReach',
        loadComponent: () =>
          import('./features/settings/support-access').then((m) => m.ArSupportAccess),
      },
      {
        path: 'settings/agency',
        title: 'Agency mode · AutoReach',
        loadComponent: () => import('./features/settings/agency').then((m) => m.ArAgency),
      },
      {
        path: 'platform',
        title: 'Platform · AutoReach',
        loadComponent: () => import('./features/platform/console').then((m) => m.ArPlatformConsole),
      },
      {
        path: 'platform/feature-flags',
        title: 'Feature flags · AutoReach',
        loadComponent: () =>
          import('./features/platform/feature-flags').then((m) => m.ArFeatureFlags),
      },
      { path: '**', redirectTo: 'home' },
    ],
  },
];
