import { Routes } from '@angular/router';
import { appAuthGuard } from './core/auth/auth.guard';
import { navAccessGuard } from './core/auth/nav-access.guard';
import { setupIncompleteGuard } from './features/onboarding/setup-incomplete.guard';

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
    // The public status page (T-19): no sign-in and no shell, so it opens when sign-in is what is broken.
    path: 'status',
    title: 'System status · MNI Assist',
    loadComponent: () => import('./features/status/status-page').then((m) => m.ArStatusPage),
  },
  {
    // Where Google / Microsoft send the browser back after "Sign in with…" (M01-7).
    path: 'login/external',
    title: 'Signing in · MNI Assist',
    loadComponent: () =>
      import('./features/account/external-login-callback').then((m) => m.ArExternalLoginCallback),
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
    path: 'roi',
    title: 'ROI calculator · MNI Assist',
    loadComponent: () => import('./features/landing/roi-calculator').then((m) => m.ArRoiCalculator),
  },
  {
    path: 'industries',
    title: 'Industries · MNI Assist',
    loadComponent: () => import('./features/landing/industry-page').then((m) => m.ArIndustryPage),
  },
  {
    path: 'industries/:segment',
    title: 'Industries · MNI Assist',
    loadComponent: () => import('./features/landing/industry-page').then((m) => m.ArIndustryPage),
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
    canActivateChild: [appAuthGuard, navAccessGuard],
    children: [
      {
        path: 'home',
        data: { preload: true },
        title: 'Home · MNI Assist',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.ArDashboard),
      },
      {
        path: 'getting-started',
        title: 'Get started · MNI Assist',
        // Gone once every step is done: the menu hides it and the address opens Home.
        canActivate: [setupIncompleteGuard],
        loadComponent: () =>
          import('./features/onboarding/wizard').then((m) => m.ArOnboardingWizard),
      },
      {
        path: 'inbox',
        data: { preload: true },
        title: 'Inbox · MNI Assist',
        loadComponent: () => import('./features/inbox/inbox').then((m) => m.ArInbox),
      },
      {
        path: 'contacts',
        data: { preload: true },
        title: 'Contacts · MNI Assist',
        loadComponent: () => import('./features/contacts/contacts').then((m) => m.ArContacts),
      },
      {
        path: 'contacts/new',
        title: 'New Contact · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/contact-form').then((m) => m.ArContactForm),
      },
      {
        path: 'contacts/:id/edit',
        title: 'Edit Contact · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/contact-form').then((m) => m.ArContactForm),
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
        path: 'contacts/accounts/new',
        title: 'New Account · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/account-form').then((m) => m.ArAccountForm),
      },
      {
        path: 'contacts/accounts/credit',
        title: 'Buyers & credit · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/account-credit').then((m) => m.ArAccountCredit),
      },
      {
        path: 'contacts/accounts/:accountId/rollup',
        title: 'Account roll-up · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/account-rollup').then((m) => m.ArAccountRollup),
      },
      {
        path: 'contacts/accounts/:accountId/edit',
        title: 'Edit Account · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/account-form').then((m) => m.ArAccountForm),
      },
      {
        path: 'contacts/360',
        title: 'Customer 360 · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/customer-360').then((m) => m.ArCustomer360),
      },
      {
        path: 'contacts/accounts/:accountId/360',
        title: 'Customer 360 · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/customer-360').then((m) => m.ArCustomer360),
      },
      {
        path: 'contacts/:id/message',
        title: 'Message customer · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/customer-message').then((m) => m.ArCustomerMessage),
      },
      {
        path: 'contacts/:id/360',
        title: 'Customer 360 · MNI Assist',
        loadComponent: () =>
          import('./features/contacts/customer-360').then((m) => m.ArCustomer360),
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
        path: 'campaigns/new',
        title: 'New Campaign · MNI Assist',
        loadComponent: () =>
          import('./features/campaigns/campaign-form').then((m) => m.ArCampaignForm),
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
        // Facebook sends the person back here after "Connect an ad account".
        path: 'analytics/ads/callback',
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
        path: 'enquiries/new',
        title: 'New Enquiry · MNI Assist',
        loadComponent: () =>
          import('./features/pipeline/enquiry-form').then((m) => m.ArEnquiryForm),
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
        path: 'pipeline/ai-negotiator',
        title: 'Autonomous AI Negotiator · MNI Assist',
        loadComponent: () =>
          import('./features/pipeline/ai-negotiator/ai-negotiator').then((m) => m.ArAiNegotiator),
      },
      {
        path: 'pipeline/projection-plan',
        title: 'Projection Plan · MNI Assist',
        loadComponent: () =>
          import('./features/projections/projection-plan/projection-plan').then(
            (m) => m.ArProjectionPlan,
          ),
      },
      {
        path: 'sales/orders',
        title: 'Sales orders · MNI Assist',
        loadComponent: () => import('./features/sales/orders/orders').then((m) => m.ArSalesOrders),
      },
      {
        path: 'sales/orders/new',
        title: 'New sales order · MNI Assist',
        loadComponent: () =>
          import('./features/sales/new-sales-record-pages').then((m) => m.ArNewSalesOrderPage),
      },
      {
        path: 'sales/challans',
        title: 'Delivery challans · MNI Assist',
        loadComponent: () =>
          import('./features/sales/challans/delivery-challans').then((m) => m.ArDeliveryChallans),
      },
      {
        path: 'sales/challans/new',
        title: 'New delivery challan · MNI Assist',
        loadComponent: () =>
          import('./features/sales/new-sales-record-pages').then((m) => m.ArNewDeliveryChallanPage),
      },
      {
        path: 'sales/invoices',
        title: 'Sales invoices · MNI Assist',
        loadComponent: () =>
          import('./features/sales/invoices/sales-invoices').then((m) => m.ArSalesInvoices),
      },
      {
        path: 'sales/invoices/new',
        title: 'New invoice · MNI Assist',
        loadComponent: () =>
          import('./features/sales/new-sales-record-pages').then((m) => m.ArNewSalesInvoicePage),
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
        path: 'reports/exports',
        title: 'My exports · MNI Assist',
        loadComponent: () => import('./features/reports/my-exports').then((m) => m.ArMyExports),
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
        path: 'purchasing/grn',
        title: 'Goods receipt (GRN) · MNI Assist',
        loadComponent: () =>
          import('./features/purchasing/grn/goods-receipt-notes').then(
            (m) => m.GoodsReceiptNotesComponent,
          ),
      },
      {
        path: 'purchasing/bills',
        title: 'Vendor bills · MNI Assist',
        loadComponent: () =>
          import('./features/purchasing/bills/vendor-bills').then((m) => m.VendorBillsComponent),
      },
      {
        path: 'purchasing/debit-notes',
        title: 'Vendor debit notes · MNI Assist',
        loadComponent: () =>
          import('./features/purchasing/debit-notes/vendor-debit-notes').then(
            (m) => m.VendorDebitNotesComponent,
          ),
      },
      {
        path: 'purchasing/vendor-360',
        title: 'Vendor 360 · MNI Assist',
        loadComponent: () =>
          import('./features/purchasing/vendor-360/vendor-360').then((m) => m.Vendor360Component),
      },
      {
        path: 'purchasing/vendor-360/:id',
        title: 'Vendor 360 · MNI Assist',
        loadComponent: () =>
          import('./features/purchasing/vendor-360/vendor-360').then((m) => m.Vendor360Component),
      },
      {
        path: 'manufacturing/bom',
        title: 'Bill of materials · MNI Assist',
        loadComponent: () =>
          import('./features/manufacturing/bom/bill-of-materials').then(
            (m) => m.BillOfMaterialsComponent,
          ),
      },
      {
        path: 'manufacturing/work-orders',
        title: 'Work orders · MNI Assist',
        loadComponent: () =>
          import('./features/manufacturing/work-orders/work-orders').then(
            (m) => m.WorkOrdersComponent,
          ),
      },
      {
        path: 'field-service/amc',
        title: 'AMC contracts · MNI Assist',
        loadComponent: () =>
          import('./features/field-service/amc/amc-contracts').then((m) => m.AmcContractsComponent),
      },
      {
        path: 'field-service/tickets',
        title: 'Field tickets · MNI Assist',
        loadComponent: () =>
          import('./features/field-service/tickets/field-service-tickets').then(
            (m) => m.FieldServiceTicketsComponent,
          ),
      },
      {
        path: 'field-service/remote-maintenance',
        title: 'AI Remote Maintenance & Diagnostics · MNI Assist',
        loadComponent: () =>
          import('./features/field-service/remote-maintenance/remote-maintenance').then(
            (m) => m.ArRemoteMaintenance,
          ),
      },
      {
        path: 'finance/chart-of-accounts',
        title: 'Chart of accounts · MNI Assist',
        loadComponent: () =>
          import('./features/finance/chart-of-accounts/chart-of-accounts').then(
            (m) => m.ChartOfAccountsComponent,
          ),
      },
      {
        path: 'finance/journal-entries',
        title: 'Journal vouchers · MNI Assist',
        loadComponent: () =>
          import('./features/finance/journal-entries/journal-entries').then(
            (m) => m.JournalEntriesComponent,
          ),
      },
      {
        path: 'finance/statements',
        title: 'Financial statements · MNI Assist',
        loadComponent: () =>
          import('./features/finance/statements/financial-statements').then(
            (m) => m.FinancialStatementsComponent,
          ),
      },
      {
        path: 'finance/gst-compliance',
        title: 'GST compliance · MNI Assist',
        loadComponent: () =>
          import('./features/finance/gst-compliance/gst-compliance').then(
            (m) => m.GstComplianceComponent,
          ),
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
        path: 'installed-base/new',
        title: 'Register a machine · MNI Assist',
        loadComponent: () =>
          import('./features/pipeline/register-machine').then((m) => m.ArRegisterMachine),
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
        path: 'auto-replies',
        title: 'Auto-replies · MNI Assist',
        loadComponent: () =>
          import('./features/automations/auto-replies').then((m) => m.ArAutoReplies),
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
        path: 'calls/ai-agents',
        title: 'AI voice agents · MNI Assist',
        loadComponent: () => import('./features/calls/voice-agents').then((m) => m.ArVoiceAgents),
      },
      {
        path: 'whats-new',
        title: "What's new · MNI Assist",
        loadComponent: () => import('./features/help/whats-new').then((m) => m.ArWhatsNew),
      },
      {
        path: 'calls/ai-impact',
        title: 'AI impact report · MNI Assist',
        loadComponent: () => import('./features/calls/voice-impact').then((m) => m.ArVoiceImpact),
      },
      {
        path: 'calls/web-widget',
        title: 'Website call button · MNI Assist',
        loadComponent: () =>
          import('./features/calls/voice-web-widgets').then((m) => m.ArVoiceWebWidgets),
      },
      {
        path: 'calls/ai-batches',
        title: 'AI call batches · MNI Assist',
        loadComponent: () =>
          import('./features/calls/voice-call-batches').then((m) => m.ArVoiceCallBatches),
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
        title: 'Display name & PIN · MNI Assist',
        loadComponent: () => import('./features/channels/numbers').then((m) => m.ArNumbers),
      },
      {
        path: 'channels/telecom',
        title: 'Telecom & Reseller Numbers · MNI Assist',
        loadComponent: () => import('./features/channels/telecom').then((m) => m.ArTelecom),
      },
      {
        path: 'resellers',
        title: 'Reseller programme · MNI Assist',
        loadComponent: () => import('./features/resellers/resellers').then((m) => m.ArResellers),
      },
      {
        path: 'channels/lead-forms',
        title: 'Lead forms · MNI Assist',
        loadComponent: () => import('./features/channels/lead-forms').then((m) => m.ArLeadForms),
      },
      {
        // Facebook sends the person back here after "Connect a Facebook Page".
        path: 'channels/lead-forms/callback',
        title: 'Lead forms · MNI Assist',
        loadComponent: () => import('./features/channels/lead-forms').then((m) => m.ArLeadForms),
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
        path: 'settings/teams',
        title: 'Teams · MNI Assist',
        loadComponent: () => import('./features/settings/teams').then((m) => m.ArTeams),
      },
      {
        path: 'settings/business-profile',
        title: 'Business profile · MNI Assist',
        loadComponent: () =>
          import('./features/settings/business-profile').then((m) => m.ArBusinessProfile),
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
        path: 'settings/shipping',
        title: 'Shipping · MNI Assist',
        loadComponent: () =>
          import('./features/settings/shipping-settings').then((m) => m.ArShippingSettings),
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
      {
        path: 'platform/payment-gateways',
        title: 'Payment gateways · MNI Assist',
        loadComponent: () =>
          import('./features/platform/payment-gateways').then((m) => m.ArPaymentGateways),
      },
      {
        path: 'platform/phone-numbers',
        title: 'Phone numbers · MNI Assist',
        loadComponent: () =>
          import('./features/platform/phone-numbers').then((m) => m.ArPhoneNumbers),
      },
      {
        path: 'platform/ai-providers',
        title: 'AI providers · MNI Assist',
        loadComponent: () =>
          import('./features/platform/ai-providers').then((m) => m.ArAiProviders),
      },
      {
        path: 'platform/status',
        title: 'Status page · MNI Assist',
        loadComponent: () =>
          import('./features/platform/status-incidents').then((m) => m.ArStatusIncidents),
      },
      { path: '**', redirectTo: 'home' },
    ],
  },
];
