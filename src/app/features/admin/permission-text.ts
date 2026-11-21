/**
 * Plain-English names and explanations for permissions, shown in the Permissions dialog (users) and on Roles & permissions.
 *
 * The API sends a permission key ("AutoReach.Contacts.Delete", "FeatureManagement.ManageHostFeatures") and a label, but most
 * child permissions carry their module's label ("Contacts and consent" for Create, Update, Delete…), so the key was the only
 * way to tell them apart. Here every permission gets:
 *  - a title: what the tick box is ("Delete contacts"), and
 *  - a detail: one sentence on what someone with it can do.
 * The raw key stays available as a tooltip for support.
 *
 * Order of preference: an exact entry in EXACT, then the API label when it is specific (not just the module's label), then a
 * sentence built from the action at the end of the key (Create, Approve…) and the module it belongs to.
 */

export interface PermissionText {
  title: string;
  detail: string;
}

/** Permission groups (the top rows). ABP's built-in groups get names an admin recognises. */
const GROUPS: Record<string, string> = {
  AutoReach: 'AutoReach',
  AbpIdentity: 'Users and roles',
  AbpTenantManagement: 'Workspaces (platform)',
  FeatureManagement: 'Plan features (platform)',
  SettingManagement: 'System settings',
};

export function describeGroup(
  name: string | null | undefined,
  label: string | null | undefined,
): string {
  return (name && GROUPS[name]) || label || name || '';
}

/** Permissions whose meaning cannot be read off the key: ABP built-ins and AutoReach actions that need context. */
const EXACT: Record<string, PermissionText> = {
  // ABP: users and roles
  'AbpIdentity.Roles': {
    title: 'Roles',
    detail: 'Open Roles & permissions and see the roles in this workspace.',
  },
  'AbpIdentity.Roles.Create': { title: 'Add roles', detail: 'Create new roles.' },
  'AbpIdentity.Roles.Update': {
    title: 'Edit roles',
    detail: 'Rename roles and change their settings.',
  },
  'AbpIdentity.Roles.Delete': {
    title: 'Delete roles',
    detail: 'Remove roles that are no longer used.',
  },
  'AbpIdentity.Roles.ManagePermissions': {
    title: 'Change what roles can do',
    detail: 'Tick and untick the permissions of any role.',
  },
  'AbpIdentity.Users': { title: 'Users', detail: 'Open the Users page and see who has access.' },
  'AbpIdentity.Users.Create': { title: 'Add users', detail: 'Create new user accounts.' },
  'AbpIdentity.Users.Update': {
    title: 'Edit users',
    detail: 'Change a user’s name, email, phone or password, and lock or unlock them.',
  },
  'AbpIdentity.Users.Update.ManageRoles': {
    title: 'Change users’ roles',
    detail: 'Give users a role or take one away.',
  },
  'AbpIdentity.Users.Delete': { title: 'Delete users', detail: 'Remove user accounts.' },
  'AbpIdentity.Users.ManagePermissions': {
    title: 'Give users extra permissions',
    detail: 'Grant or remove permissions for one user, on top of their roles.',
  },
  'AbpIdentity.Users.Import': {
    title: 'Import users',
    detail: 'Add many users at once from a file.',
  },
  'AbpIdentity.UserLookup': {
    title: 'Look up users',
    detail: 'Find users by name in pickers (for example when assigning work).',
  },
  // ABP: workspaces, features, settings
  'AbpTenantManagement.Tenants': {
    title: 'Workspaces',
    detail: 'See every customer workspace on the platform. For platform staff only.',
  },
  'AbpTenantManagement.Tenants.Create': {
    title: 'Add workspaces',
    detail: 'Create new customer workspaces.',
  },
  'AbpTenantManagement.Tenants.Update': {
    title: 'Edit workspaces',
    detail: 'Rename workspaces and change their details.',
  },
  'AbpTenantManagement.Tenants.Delete': {
    title: 'Delete workspaces',
    detail: 'Remove a customer workspace and its access.',
  },
  'AbpTenantManagement.Tenants.ManageFeatures': {
    title: 'Change a workspace’s features',
    detail: 'Turn features on or off and set limits for one customer workspace.',
  },
  'AbpTenantManagement.Tenants.ManageConnectionStrings': {
    title: 'Change a workspace’s database',
    detail: 'Point a workspace at its own database. Technical; for platform staff only.',
  },
  'FeatureManagement.ManageHostFeatures': {
    title: 'Change platform-wide features',
    detail:
      'Turn features on or off and set limits for the whole platform, not just one workspace. For platform staff only.',
  },
  'SettingManagement.Emailing': {
    title: 'Email sending settings',
    detail: 'Change the mail server and the “from” address used for outgoing email.',
  },
  'SettingManagement.Emailing.Test': {
    title: 'Send a test email',
    detail: 'Send a test message to check the email settings work.',
  },
  'SettingManagement.TimeZone': {
    title: 'Time zone',
    detail: 'Change the time zone used for dates and schedules.',
  },

  // AutoReach actions that need context
  'AutoReach.Channels.Onboard': {
    title: 'Connect WhatsApp numbers',
    detail: 'Connect a new WhatsApp Business number through Meta sign-up.',
  },
  'AutoReach.Channels.Manage': {
    title: 'Manage WhatsApp channels',
    detail: 'Change channel settings, profile and webhooks, or disconnect a number.',
  },
  'AutoReach.Channels.ViewHealth': {
    title: 'See channel health',
    detail: 'See quality rating, messaging limits and delivery health for each number.',
  },
  'AutoReach.Contacts.ManageConsent': {
    title: 'Change consent',
    detail: 'Record or withdraw a contact’s opt-in for marketing messages.',
  },
  'AutoReach.Contacts.Merge': {
    title: 'Merge duplicate contacts',
    detail: 'Combine two contact records into one. This cannot be undone.',
  },
  'AutoReach.Contacts.ManageCustomFields': {
    title: 'Manage custom fields',
    detail: 'Add, rename or remove the extra fields kept on contacts.',
  },
  'AutoReach.Templates.Submit': {
    title: 'Submit templates to Meta',
    detail: 'Send message templates to WhatsApp (Meta) for approval.',
  },
  'AutoReach.Campaigns.Send': {
    title: 'Send campaigns',
    detail: 'Send or schedule a campaign to its audience. Separate from creating one.',
  },
  'AutoReach.Campaigns.ViewReport': {
    title: 'See campaign reports',
    detail: 'See delivery, read and reply results for campaigns.',
  },
  'AutoReach.Inbox.Reply': {
    title: 'Reply to customers',
    detail: 'Send messages in inbox conversations.',
  },
  'AutoReach.Inbox.Assign': {
    title: 'Assign conversations',
    detail: 'Hand a conversation to another team member or team.',
  },
  'AutoReach.Inbox.ViewAll': {
    title: 'See all conversations',
    detail: 'See every conversation in the inbox, not only the ones assigned to them.',
  },
  'AutoReach.Inbox.Note': {
    title: 'Add internal notes',
    detail: 'Write notes on a conversation that only the team can see.',
  },
  'AutoReach.Inbox.ManageCannedReplies': {
    title: 'Manage saved replies',
    detail: 'Add, edit or remove the ready-made replies the team can insert.',
  },
  'AutoReach.Inbox.ManageLabels': {
    title: 'Manage labels',
    detail: 'Add, rename or remove the labels used to tag conversations.',
  },
  'AutoReach.Automations.Activate': {
    title: 'Switch automations on or off',
    detail: 'Turn an automation on so it starts running, or pause it.',
  },
  'AutoReach.Flows.Publish': {
    title: 'Publish WhatsApp Flows',
    detail: 'Make a WhatsApp Flow live so customers can use it.',
  },
  'AutoReach.Pipeline.ViewAll': {
    title: 'See everyone’s enquiries',
    detail: 'See enquiries owned by every team member, not only their own.',
  },
  'AutoReach.Pipeline.Manage': {
    title: 'Set up the pipeline',
    detail: 'Change pipeline stages and enquiry settings.',
  },
  'AutoReach.Quotations.Issue': {
    title: 'Issue quotations',
    detail: 'Finalise a quotation and send it to the customer. Issued quotations can’t be edited.',
  },
  'AutoReach.Activities.ViewAll': {
    title: 'See everyone’s tasks and meetings',
    detail: 'See tasks and meetings of every team member, not only their own.',
  },
  'AutoReach.Projects': {
    title: 'Projects',
    detail:
      'See projects they own or are on the team of: the companies, people, stage and timeline.',
  },
  'AutoReach.Projects.Create': {
    title: 'Create projects',
    detail: 'Start a project record for a plant or line.',
  },
  'AutoReach.Projects.Update': {
    title: 'Edit projects',
    detail: 'Change details, parties and people, move the stage and add notes.',
  },
  'AutoReach.Projects.Delete': {
    title: 'Delete projects',
    detail: 'Remove a project. Its enquiries stay.',
  },
  'AutoReach.Projects.ViewAll': {
    title: 'See all projects',
    detail: 'See every project in the workspace, not only their own and their team’s.',
  },
  'AutoReach.Projects.Manage': {
    title: 'Project settings',
    detail: 'Keep the competitor brand list and project settings.',
  },
  'AutoReach.FaultCodes': {
    title: 'Breakdown assistant',
    detail: 'See breakdown tickets’ downtime clocks and, as the library fills, fault-code answers.',
  },
  'AutoReach.FaultCodes.Manage': {
    title: 'Breakdown assistant settings',
    detail:
      'Set the escalation policies breakdown tickets follow (and, later, manage the fault-code library).',
  },
  'AutoReach.InstalledBase.Qr': {
    title: 'Machine QR stickers',
    detail:
      'Make, print, replace and switch off the QR stickers customers scan to report a breakdown or ask for service.',
  },
  'AutoReach.InstalledBase.Components': {
    title: 'Record machine components',
    detail:
      'Add, import and edit the parts inside installed machines (PLC, drives, HMI) for the obsolescence radar.',
  },
  'AutoReach.Library.Lifecycle': {
    title: 'Manage lifecycle rules',
    detail:
      'Set makers’ phase-out stages, last-buy dates and replacements, and import their lists. Re-scores the radar.',
  },
  'AutoReach.Obsolescence': {
    title: 'Use the obsolescence radar',
    detail: 'See customer machines holding phased-out parts, and dismiss or assign them.',
  },
  'AutoReach.Obsolescence.Manage': {
    title: 'Manage the obsolescence radar',
    detail:
      'Change the risk points, and the customer notice: its template, automatic sending and follow-up.',
  },
  'AutoReach.InstalledBase.ManageReminders': {
    title: 'Manage service reminders',
    detail: 'Set up the reminders sent for installed machines (service due, warranty end).',
  },
  'AutoReach.Billing.TopUp': {
    title: 'Top up the wallet',
    detail: 'Add money to the workspace wallet.',
  },
  'AutoReach.Billing.ManagePlan': {
    title: 'Change the subscription plan',
    detail: 'Upgrade, downgrade or cancel the workspace’s plan.',
  },
  'AutoReach.Billing.ViewInvoices': {
    title: 'See billing invoices',
    detail: 'See and download the invoices for this workspace’s subscription.',
  },
  'AutoReach.Billing.IssueInvoices': {
    title: 'Issue billing invoices',
    detail: 'Raise subscription invoices to workspaces. For platform staff only.',
  },
  'AutoReach.Billing.Reconcile': {
    title: 'Reconcile payments',
    detail: 'Match received payments against billing invoices.',
  },
  'AutoReach.Compliance.HandleRequests': {
    title: 'Handle data requests',
    detail: 'Act on customers’ requests to see, correct or delete their data.',
  },
  'AutoReach.Compliance.ManageRetention': {
    title: 'Set data retention',
    detail: 'Choose how long messages and records are kept before deletion.',
  },
  'AutoReach.Compliance.ManageBreaches': {
    title: 'Record data breaches',
    detail: 'Log and track data breach reports.',
  },
  'AutoReach.Compliance.ManageConsentText': {
    title: 'Edit consent wording',
    detail: 'Change the opt-in wording shown to customers.',
  },
  'AutoReach.Agency.ManageClients': {
    title: 'Manage client workspaces',
    detail: 'Add client workspaces to the agency and work inside them.',
  },
  'AutoReach.Administration.ManageTenants': {
    title: 'Manage customer workspaces',
    detail: 'Create, suspend and change customer workspaces. For platform staff only.',
  },
  'AutoReach.Administration.ManageRateCards': {
    title: 'Set message prices',
    detail:
      'Change the per-message and per-minute rates charged to workspaces. For platform staff only.',
  },
  'AutoReach.Administration.ViewPlatformMetrics': {
    title: 'See platform figures',
    detail: 'See usage and revenue across all workspaces. For platform staff only.',
  },
  'AutoReach.Administration.Impersonate': {
    title: 'Sign in as a customer workspace',
    detail: 'Open any customer workspace as its admin, for support. Every use is logged.',
  },
  'AutoReach.Teams.Manage': {
    title: 'Manage teams',
    detail: 'Create teams and choose who is in them.',
  },
  'AutoReach.Members.Invite': {
    title: 'Invite members',
    detail: 'Invite new people to the workspace.',
  },
  'AutoReach.Members.Deactivate': {
    title: 'Deactivate members',
    detail: 'Stop a member signing in, without deleting their history.',
  },
  'AutoReach.Members.RevokeSessions': {
    title: 'Sign members out',
    detail: 'End a member’s sessions on all devices.',
  },
  'AutoReach.Members.ManageSso': {
    title: 'Set up single sign-on',
    detail: 'Let members sign in with the company’s Google or Microsoft account.',
  },
  'AutoReach.Members.ResetTwoFactor': {
    title: 'Reset two-step sign-in',
    detail: 'Clear a member’s two-step sign-in so they can set it up again.',
  },
  'AutoReach.Members.Impersonate': {
    title: 'Sign in as a member',
    detail: 'Use the app as another member to check what they see. Every use is logged.',
  },
  'AutoReach.AuditLogs': {
    title: 'Audit log',
    detail: 'See the record of who did what, and when.',
  },
  'AutoReach.SecurityPolicy.Manage': {
    title: 'Change sign-in and password rules',
    detail: 'Set password strength, lock-out and two-step sign-in rules for everyone.',
  },
  'AutoReach.TextTemplates.Edit': {
    title: 'Edit email templates',
    detail: 'Change the wording of emails the system sends (invites, password reset…).',
  },
  'AutoReach.SupportAccess.Grant': {
    title: 'Let support in',
    detail: 'Give the AutoReach support team temporary access to this workspace.',
  },
  'AutoReach.Helpdesk.ViewAll': {
    title: 'See all service tickets',
    detail: 'See tickets assigned to every team member, not only their own.',
  },
  'AutoReach.Helpdesk.Reply': {
    title: 'Reply on tickets',
    detail: 'Send replies to customers on service tickets.',
  },
  'AutoReach.ReorderPortal.SendLinks': {
    title: 'Send re-order links',
    detail: 'Send customers a link to their re-order page.',
  },
  'AutoReach.Telecom.ResellNumbers': {
    title: 'Resell phone numbers',
    detail: 'Buy phone numbers and assign them to customer workspaces. For platform staff only.',
  },
  'AutoReach.SalesOrders.Confirm': {
    title: 'Confirm sales orders',
    detail: 'Confirm an order so it can be delivered and invoiced.',
  },
  'AutoReach.DeliveryChallans.Dispatch': {
    title: 'Dispatch challans',
    detail: 'Mark goods on a delivery challan as sent.',
  },
  'AutoReach.DeliveryChallans.Deliver': {
    title: 'Mark challans delivered',
    detail: 'Record that the customer received the goods.',
  },
  'AutoReach.SalesInvoices.Issue': {
    title: 'Issue invoices',
    detail: 'Finalise an invoice and send it to the customer. Issued invoices can’t be edited.',
  },
  'AutoReach.SalesInvoices.RecordPayment': {
    title: 'Record customer payments',
    detail: 'Mark money received against an invoice.',
  },
  'AutoReach.Customer360.View': {
    title: 'See Customer 360',
    detail: 'Open the single page that shows everything about one customer.',
  },
  'AutoReach.Vendor360.View': {
    title: 'See Vendor 360',
    detail: 'Open the single page that shows everything about one supplier.',
  },
  'AutoReach.GoodsReceiptNotes.Inspect': {
    title: 'Inspect received goods',
    detail: 'Record quality checks on goods received from suppliers.',
  },
  'AutoReach.GoodsReceiptNotes.Approve': {
    title: 'Approve goods receipts',
    detail: 'Accept received goods so they are added to stock.',
  },
  'AutoReach.VendorBills.Approve': {
    title: 'Approve supplier bills',
    detail: 'Approve a supplier bill so it can be paid.',
  },
  'AutoReach.VendorBills.RecordPayment': {
    title: 'Record supplier payments',
    detail: 'Mark money paid against a supplier bill.',
  },
  'AutoReach.VendorDebitNotes.Issue': {
    title: 'Issue debit notes',
    detail: 'Finalise a debit note and send it to the supplier.',
  },
  'AutoReach.WorkOrders.Release': {
    title: 'Release work orders',
    detail: 'Send a work order to the shop floor so production can start.',
  },
  'AutoReach.WorkOrders.Complete': {
    title: 'Complete work orders',
    detail: 'Mark production finished and add the output to stock.',
  },
  'AutoReach.AmcContracts.Renew': {
    title: 'Renew AMC contracts',
    detail: 'Extend an annual maintenance contract for another term.',
  },
  'AutoReach.ServiceTickets.Resolve': {
    title: 'Resolve field tickets',
    detail: 'Mark a field service ticket as fixed.',
  },
  'AutoReach.ServiceTickets.Close': {
    title: 'Close field tickets',
    detail: 'Close a resolved field service ticket for good.',
  },
  'AutoReach.JournalEntries.Post': {
    title: 'Post journal entries',
    detail: 'Post an entry to the ledger. Posted entries can only be reversed, not edited.',
  },
  'AutoReach.FinancialStatements.View': {
    title: 'See financial statements',
    detail: 'See the profit and loss, balance sheet and trial balance.',
  },
  'AutoReach.GstCompliance.GenerateEInvoice': {
    title: 'Generate e-invoices',
    detail: 'Register invoices on the GST portal and get their IRN.',
  },
  'AutoReach.GstCompliance.GenerateEWayBill': {
    title: 'Generate e-way bills',
    detail: 'Create e-way bills for goods in transit.',
  },
  'AutoReach.GstCompliance.FileGstr': {
    title: 'File GST returns',
    detail: 'Prepare and file GSTR returns.',
  },
  'AutoReach.GstCompliance.ManageConnection': {
    title: 'Manage the GST portal connection',
    detail:
      'Choose test, sandbox or live, and set the Masters India account e-invoices and e-way bills go through.',
  },
  'AutoReach.NegotiationAgent.ManagePolicy': {
    title: 'Set negotiation limits',
    detail: 'Set the discounts and terms the AI negotiator may offer.',
  },
  'AutoReach.NegotiationAgent.ViewSessions': {
    title: 'See negotiations',
    detail: 'Read the AI negotiator’s conversations with customers.',
  },
  'AutoReach.NegotiationAgent.Intervene': {
    title: 'Take over a negotiation',
    detail: 'Step into a live negotiation and reply instead of the AI.',
  },
  'AutoReach.NegotiationAgent.Simulate': {
    title: 'Test the negotiator',
    detail: 'Try the AI negotiator in a practice conversation.',
  },
  'AutoReach.ProjectionPlans.SimulateScenarios': {
    title: 'Try what-if scenarios',
    detail: 'Change assumptions on a projection plan to see the effect.',
  },
  'AutoReach.RemoteMaintenance.Diagnose': {
    title: 'Diagnose machines remotely',
    detail: 'Read machine data and run checks from a distance.',
  },
  'AutoReach.RemoteMaintenance.Escalate': {
    title: 'Escalate machine issues',
    detail: 'Turn a remote issue into a field visit or higher-level ticket.',
  },
  'AutoReach.RemoteMaintenance.Resolve': {
    title: 'Resolve machine issues',
    detail: 'Mark a remote maintenance issue as fixed.',
  },
  'AutoReach.Resellers.ManagePartners': {
    title: 'Manage resellers',
    detail: 'Add resellers and change their terms.',
  },
  'AutoReach.Resellers.ManageBranding': {
    title: 'Manage reseller branding',
    detail: 'Set the logo, colours and domain resellers show their clients.',
  },
  'AutoReach.Resellers.ManageClients': {
    title: 'Manage reseller clients',
    detail: 'Move client workspaces between resellers.',
  },
  'AutoReach.Resellers.ViewFinancials': {
    title: 'See reseller earnings',
    detail: 'See resellers’ sales, commission and amounts owed.',
  },
  'AutoReach.Resellers.ProcessPayouts': {
    title: 'Pay resellers',
    detail: 'Approve and record commission payouts to resellers.',
  },
};

/** What each common action at the end of a key means. `{n}` is the module's records ("sales orders"). */
const ACTIONS: Record<string, PermissionText> = {
  Create: { title: 'Add {n}', detail: 'Create new {n}.' },
  Update: { title: 'Edit {n}', detail: 'Change existing {n}.' },
  Edit: { title: 'Edit {n}', detail: 'Change existing {n}.' },
  Delete: { title: 'Delete {n}', detail: 'Remove {n} permanently.' },
  Cancel: {
    title: 'Cancel {n}',
    detail: 'Cancel {n} that are no longer needed. They stay on record as cancelled.',
  },
  Import: { title: 'Import {n}', detail: 'Add many {n} at once from a spreadsheet.' },
  Export: { title: 'Export {n}', detail: 'Download {n} as a spreadsheet file.' },
  View: { title: 'See {n}', detail: 'Open and read {n}.' },
  ViewAll: {
    title: 'See everyone’s {n}',
    detail: 'See {n} of every team member, not only their own.',
  },
  Manage: { title: 'Manage {n}', detail: 'Set up and change {n}.' },
  Settings: { title: '{N} settings', detail: 'Change how {n} work for the whole workspace.' },
  ManageSettings: { title: '{N} settings', detail: 'Change how {n} work for the whole workspace.' },
  Approve: { title: 'Approve {n}', detail: 'Approve {n} so they move to the next step.' },
  Issue: {
    title: 'Issue {n}',
    detail: 'Finalise {n} and send them out. Issued ones can’t be edited.',
  },
  Send: { title: 'Send {n}', detail: 'Send {n} to their recipients.' },
  Assign: { title: 'Assign {n}', detail: 'Hand {n} to a team member.' },
  Reply: { title: 'Reply on {n}', detail: 'Send replies to customers on {n}.' },
  Resolve: { title: 'Resolve {n}', detail: 'Mark {n} as fixed.' },
  Close: { title: 'Close {n}', detail: 'Close {n} for good.' },
  Complete: { title: 'Complete {n}', detail: 'Mark {n} as finished.' },
  Confirm: { title: 'Confirm {n}', detail: 'Confirm {n} so work on them can go ahead.' },
  Publish: { title: 'Publish {n}', detail: 'Make {n} live.' },
  Activate: { title: 'Switch {n} on or off', detail: 'Start or pause {n}.' },
  Renew: { title: 'Renew {n}', detail: 'Extend {n} for another term.' },
  Post: { title: 'Post {n}', detail: 'Post {n} to the books.' },
  RecordPayment: {
    title: 'Record payments on {n}',
    detail: 'Mark money received or paid against {n}.',
  },
  Route: { title: 'Route {n}', detail: 'Pass {n} on to the right person or partner.' },
  Request: { title: 'Request {n}', detail: 'Ask customers for {n}.' },
};

/** Words in module keys that should keep their capitals. */
const ACRONYMS: Record<string, string> = {
  amc: 'AMC',
  gst: 'GST',
  gstr: 'GSTR',
  sso: 'SSO',
  '360': '360',
};

/** "SalesOrders" → "sales orders", "AmcContracts" → "Service contracts (AMC)". */
function words(segment: string): string {
  return segment
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(' ')
    .map((w) => ACRONYMS[w.toLowerCase()] ?? w.toLowerCase())
    .join(' ');
}

function capital(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function fill(t: string, n: string): string {
  return t.replace(/\{n\}/g, n).replace(/\{N\}/g, capital(n));
}

/**
 * @param key        the permission key, e.g. "AutoReach.SalesOrders.Confirm"
 * @param label      the label the API sent for it
 * @param parentLabel the label of the permission it sits under (absent for a module's base permission)
 */
export function describePermission(
  key: string,
  label: string | null | undefined,
  parentLabel?: string | null,
): PermissionText {
  const exact = EXACT[key];
  if (exact) return exact;

  const parts = key.split('.');
  const apiLabel = (label ?? '').trim();
  const specific = !!apiLabel && apiLabel !== key && apiLabel !== (parentLabel ?? '').trim();

  // A module's base permission ("AutoReach.Contacts"): opening the screen.
  if (!parentLabel) {
    const name = specific ? apiLabel : capital(words(parts[parts.length - 1]));
    return {
      title: name,
      detail: `Open ${name} and see its records. Needed for the other ${name} permissions under it.`,
    };
  }

  // An action under a module ("AutoReach.Contacts.Delete").
  const action = parts[parts.length - 1];
  const noun = parts.length >= 3 ? words(parts[parts.length - 2]) : words(action);
  const known = ACTIONS[action];
  const built: PermissionText = known
    ? { title: fill(known.title, noun), detail: fill(known.detail, noun) }
    : {
        title: capital(words(action)),
        detail: `${capital(words(action))} in ${parentLabel}.`,
      };
  return specific ? { title: apiLabel, detail: built.detail } : built;
}
