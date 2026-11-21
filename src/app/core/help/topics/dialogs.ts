import type { HelpDialog } from '../help-topics';

/*
 * The popups (dialogs) each screen opens, keyed by the route path exactly as app.routes.ts declares it.
 * Shown in the help panel as "Popups on this screen". A popup used on several screens is defined once
 * below and listed under each of them. Matching is exact: a child route does not inherit its parent's popups.
 */

// ── Shared popups ────────────────────────────────────────────────────────────

const TASK: HelpDialog = {
  name: 'New task / Edit task',
  opens: '+ New task, or clicking a task.',
  text: 'Gives someone a job to do by a date, with a reminder. Saving puts it on their task list; finishing a repeating task makes the next one.',
  fields: [
    { name: 'What has to be done', text: 'The task in a few words, e.g. “Send revised quote to Kirloskar”.' },
    { name: 'Due', text: 'Optional date and time. A task with a due date can repeat.' },
    { name: 'Priority', text: 'How urgent it is; high-priority tasks sort first.' },
    { name: 'Who does it', text: 'The colleague the task is assigned to.' },
    { name: 'Remind them / Remind them by', text: 'When before the due time to remind them, and by email, WhatsApp or SMS.' },
    { name: 'Notes', text: 'Anything that helps the person do it.' },
    { name: 'Cancel task / Delete', text: 'Cancel keeps the task as cancelled in the history; Delete removes it.' },
  ],
};

const MEETING: HelpDialog = {
  name: 'Schedule a meeting / Edit meeting',
  opens: '+ Schedule meeting, or clicking a meeting.',
  text: 'Books a meeting or site visit with a start time, length, place and guests, and reminds everyone before it.',
  fields: [
    { name: 'Title', text: 'What the meeting is about.' },
    { name: 'Starts / Length', text: 'Start date and time and how long it lasts.' },
    { name: 'Kind', text: 'Call, video, site visit or in-office meeting.' },
    { name: 'Where', text: 'An address, or a Teams, Google Meet or Zoom link. The provider buttons open the provider to create the meeting; paste the join link back here.' },
    { name: 'Guests', text: 'Colleagues who attend. + Add a guest adds another; × removes one.' },
    { name: 'Remind / Remind by', text: 'When before the start to remind everyone, and by which channel.' },
    { name: 'Notes', text: 'Agenda or anything to bring.' },
  ],
};

const SHARE_ACTIVITY: HelpDialog = {
  name: 'Share task / Share meeting',
  opens: 'Share on a task or meeting.',
  text: 'Sends the task or meeting details to someone, by email, WhatsApp or SMS, with an optional note.',
  fields: [
    { name: 'Send by', text: 'The channel to send on.' },
    { name: 'Send to', text: 'The person’s email address or mobile number.' },
    { name: 'A note with it', text: 'Optional message sent above the details.' },
  ],
};

const CALL: HelpDialog = {
  name: 'Call <contact>',
  opens: 'The Call button on a contact, enquiry or conversation.',
  text: 'Places a phone call to the contact, either from your browser or by ringing your own phone first and then connecting the customer. The call is logged and can be recorded.',
  fields: [
    { name: 'How to call', text: 'Call in browser uses your computer’s microphone; Ring my phone rings your mobile first, then dials the customer.' },
    { name: 'Ring me on', text: 'Your own number for Ring my phone. Tick Use this number from now on to remember it.' },
    { name: 'Record the call', text: 'Records the conversation. The customer hears the recording notice.' },
  ],
};

const CALL_OUTCOME: HelpDialog = {
  name: 'How did the call go?',
  opens: 'Appears after a call ends, or Add outcome on a call.',
  text: 'Records the result of a call (connected, no answer, call back, interested and so on) and a short note, so the team knows what happened.',
  fields: [
    { name: 'Outcome', text: 'Pick the result that fits best. It is used in call reports.' },
    { name: 'What was said', text: 'Optional short summary of the call.' },
    { name: 'Not now', text: 'Closes without recording; you can add it later.' },
  ],
};

const LOG_CALL: HelpDialog = {
  name: 'Log a call with <contact>',
  opens: 'Log a call on an enquiry.',
  text: 'Records a call that already happened on your own phone. Nothing is dialled.',
  fields: [
    { name: 'Direction', text: 'I called them, or They called me.' },
    { name: 'Started / Minutes on the call', text: 'When the call started and how long it lasted.' },
    { name: 'How it went', text: 'The call outcome.' },
    { name: 'What was said', text: 'Optional note.' },
  ],
};

const RAISE_TICKET: HelpDialog = {
  name: 'Raise a ticket for <contact>',
  opens: 'Raise ticket on an enquiry or contact.',
  text: 'Opens a service ticket for a customer’s problem. Its due time is set from the priority’s SLA in Helpdesk settings.',
  fields: [
    { name: 'What’s wrong', text: 'One line describing the problem.' },
    { name: 'Category', text: 'Optional grouping, such as Breakdown or Installation.' },
    { name: 'Priority', text: 'Urgent, High, Normal or Low. The hours shown are the SLA.' },
    { name: 'Details', text: 'Machine, error code, what the customer has tried.' },
  ],
};

const TICKET_DETAIL: HelpDialog = {
  name: 'Ticket <reference>',
  opens: 'Clicking a ticket.',
  text: 'Works one ticket: change its status and priority, see its activity, and add an internal note or reply to the customer. A reply goes on the ticket’s conversation, or by email when the ticket has none.',
  fields: [
    { name: 'Status / Priority', text: 'Change them here; the due time follows the priority.' },
    { name: 'Note or reply', text: 'Type the text, then choose Internal note (team only) or Reply to customer.' },
    { name: 'Customer satisfaction', text: 'The star rating the customer gave, once resolved.' },
    { name: 'Activity', text: 'Every change and message on the ticket, oldest first.' },
    { name: 'Delete ticket', text: 'Removes the ticket.' },
  ],
};

const ROUTE_LEAD: HelpDialog = {
  name: 'Route to a dealer',
  opens: 'Route to dealer on an enquiry or in Dealer network.',
  text: 'Hands an enquiry to a dealer in your network. The best match by territory and product line is suggested; equal matches take turns. The dealer must accept within the hours set in Network settings.',
  fields: [
    { name: 'Best match', text: 'The dealer whose PIN codes, cities or states and product lines cover this customer.' },
    { name: 'Consent line', text: 'Confirms the customer may be contacted by a dealer.' },
  ],
};

const CONTACT_FORM: HelpDialog = {
  name: 'New contact / Edit contact',
  opens: '+ New contact, or Edit on a contact.',
  text: 'Adds or edits one person. You can fill it in from a vCard or a visiting-card photo; check each field before saving. The WhatsApp number must be unique in the workspace.',
  fields: [
    { name: 'Fill in from', text: 'Upload a vCard (.vcf) or a card photo to fill the form.' },
    { name: 'WhatsApp number', text: 'With the country code, e.g. 91 for India.' },
    { name: 'Name / Designation / Company / Email', text: 'Who they are. Email must be unique too.' },
    { name: 'Account', text: 'The company account they belong to, so they share its orders and machines.' },
    { name: 'Decision role', text: 'Their part in buying: decision maker, influencer, user and so on.' },
    { name: 'City / State', text: 'Used for dealer routing and segments.' },
  ],
};

const CONTACT_IMPORT: HelpDialog = {
  name: 'Import contacts',
  opens: 'Import on Contacts, Segments or Get started.',
  text: 'Brings in contacts from a CSV or Excel file in steps: upload, match columns, check problems, record consent, import. Large files import in the background with a progress bar.',
  fields: [
    { name: 'Country code for numbers without one', text: 'Added to numbers that have no country code.' },
    { name: 'Check again / Back', text: 'Re-checks after you fix the file, or returns to the previous step.' },
    { name: 'Where did these contacts agree to hear from you?', text: 'The consent source; required for marketing.' },
    { name: 'They may receive', text: 'Which kinds of message they agreed to.' },
    { name: 'Opt-in evidence / Consent notice version', text: 'Proof of consent and which notice they saw, kept for DPDP.' },
  ],
};

const SEND_REORDER_LINK: HelpDialog = {
  name: 'Re-order link for <contact>',
  opens: 'Send re-order link.',
  text: 'Sends the customer a personal link to their re-order page on WhatsApp. They confirm a code before prices show. The link works for the days set in Re-order settings.',
};

const VOICE_AGENT: HelpDialog = {
  name: 'Voice agent',
  opens: 'Voice agent on a number, or the agent editor.',
  text: 'Sets up the AI that answers calls on a number: its instructions, greeting, voice, language, engine, speech settings and what to extract from each call. Save keeps a draft; Publish makes it live for new calls. Version history restores an earlier draft.',
  fields: [
    { name: 'Starting template', text: 'Replaces the draft name, instructions and greeting with a starter. Nothing changes until you save.' },
    { name: 'Agent instructions / Opening greeting', text: 'What the agent should do and the first thing it says.' },
    { name: 'Voice / Preferred language', text: 'How it sounds; Follow caller answers in the caller’s language.' },
    { name: 'Maximum call length', text: '30 to 600 seconds.' },
    { name: 'Analysis', text: 'Fields to pull out of each call (summary, sentiment, goal met, custom fields).' },
  ],
};

const CUSTOMER_ACTIONS: HelpDialog[] = [
  {
    name: 'Record payment',
    opens: 'Record payment on Customer 360.',
    text: 'Records money received from the customer against an invoice. It reduces what they owe.',
    fields: [
      { name: 'Invoice', text: 'The invoice being paid.' },
      { name: 'Amount received (INR)', text: 'How much came in.' },
      { name: 'Payment mode / Reference number', text: 'UPI, NEFT, cheque, cash; and the UTR or cheque number.' },
    ],
  },
  {
    name: 'Create delivery challan',
    opens: 'Create delivery challan on Customer 360.',
    text: 'Makes a draft challan for goods going to this customer, optionally against one of their sales orders.',
    fields: [{ name: 'Sales order', text: 'The order the goods are dispatched against.' }],
  },
  {
    name: 'Create invoice',
    opens: 'Create invoice on Customer 360.',
    text: 'Makes a draft invoice for this customer, optionally from one of their sales orders.',
    fields: [{ name: 'Sales order', text: 'The order being invoiced.' }],
  },
];

const EMAIL_CONTACT: HelpDialog = {
  name: 'Email <contact>',
  opens: 'Message customer → Email on Customer 360.',
  text: 'Sends an email to the customer from your workspace’s email channel. It is logged on their timeline.',
  fields: [
    { name: 'Subject', text: 'The email subject line.' },
    { name: 'Message', text: 'The email body.' },
  ],
};

const EDIT_ENQUIRY: HelpDialog = {
  name: 'Edit enquiry',
  opens: 'Edit in the enquiry panel.',
  text: 'Changes the enquiry’s title, requirement, estimated value and expected order date. Value and date feed the forecast.',
};

const ENQUIRY_PANEL: HelpDialog = {
  name: 'Enquiry detail (side panel)',
  opens: 'Clicking an enquiry card.',
  text: 'Everything about one enquiry: Overview, Notes & history, Calls & tickets, and Partners. From here you edit it, add tasks and meetings, call, raise a ticket, route it to a dealer, or mark it lost with a reason (price, competitor, no budget, and so on).',
};

const ENQUIRY_POPUPS: HelpDialog[] = [
  ENQUIRY_PANEL,
  EDIT_ENQUIRY,
  TASK,
  MEETING,
  CALL,
  LOG_CALL,
  CALL_OUTCOME,
  RAISE_TICKET,
  TICKET_DETAIL,
  ROUTE_LEAD,
];

const C360 = [...CUSTOMER_ACTIONS, EMAIL_CONTACT];

const TWO_FACTOR: HelpDialog[] = [
  {
    name: 'Set up your authenticator app',
    opens: 'Turn on two-step verification in Settings.',
    text: 'Scan the QR code with Google Authenticator, Microsoft Authenticator or similar, then enter the 6-digit code it shows to switch two-step sign-in on.',
  },
  {
    name: 'Save your recovery codes',
    opens: 'Appears after setup or after making new codes.',
    text: 'One-time codes that let you sign in if you lose your phone. Copy or download them and keep them safe; each works once.',
  },
  {
    name: 'New recovery codes',
    opens: 'New recovery codes in Settings.',
    text: 'Makes a fresh set of recovery codes; the old ones stop working. Confirm with a code from your app.',
  },
  {
    name: 'Turn off two-step verification?',
    opens: 'Turn off in Settings.',
    text: 'Signing in will need only your password again. Enter your password and a current code to confirm.',
  },
];

// ── Popups by screen ─────────────────────────────────────────────────────────

export const DIALOG_HELP: Readonly<Record<string, readonly HelpDialog[]>> = {
  // Sales pipeline
  enquiries: [
    {
      name: 'New enquiry',
      opens: '+ New enquiry.',
      text: 'Quick-adds a deal for a contact. It starts in the pipeline’s first stage.',
      fields: [
        { name: 'Contact', text: 'Who the enquiry is from.' },
        { name: 'Title / Requirement', text: 'Short name for the deal and what the customer needs.' },
        { name: 'Est. value (₹)', text: 'Optional; feeds the board totals and forecast.' },
        { name: 'Source', text: 'Where it came from, for lead-source reports.' },
      ],
    },
    ...ENQUIRY_POPUPS,
  ],
  'enquiries/pipelines': [
    {
      name: 'New pipeline / Rename pipeline',
      opens: '+ New pipeline, or Rename.',
      text: 'Creates a separate sales process (for example Projects or Spares) or renames one. Start from copies the stages of an existing pipeline.',
    },
    {
      name: 'Add stage / Edit stage',
      opens: '+ Add stage, or Edit on a stage.',
      text: 'Names a stage and says what it counts as (open, won, lost). Scoring, reports, CRM sync and automations treat the stage as the kind you pick.',
    },
    {
      name: 'Delete pipeline / Delete stage',
      opens: 'Delete.',
      text: 'Removes it. Choose Move enquiries to so no enquiry is left without a stage.',
    },
  ],
  forecast: [
    {
      name: 'Quotas · <period>',
      opens: 'Set quotas.',
      text: 'Sales targets in rupees for each month or quarter. Blank means none; a quarter with no quota uses the sum of its months.',
    },
    {
      name: 'Forecast assumptions',
      opens: 'Assumptions.',
      text: 'The chance of winning at each stage, and the month your financial year starts. The weighted forecast multiplies each enquiry’s value by its stage’s chance.',
    },
  ],
  quotations: [
    {
      name: 'Signature · <quotation>',
      opens: 'Send for signature on an issued quotation.',
      text: 'Sends the customer a link to read and e-sign the quotation, on WhatsApp or by email. Signing accepts it and marks the enquiry won. Changing the quotation afterwards stops the link; Withdraw stops it at once.',
      fields: [
        { name: 'Who signs', text: 'The person at the customer who signs.' },
        { name: 'WhatsApp number / Email', text: 'Where the link is sent.' },
        { name: 'Link works for (days)', text: 'After this the link expires.' },
        { name: 'Approved template', text: 'The WhatsApp template that carries the link.' },
      ],
    },
  ],
  'pipeline/ai-negotiator': [
    {
      name: 'Start a negotiation',
      opens: 'Start a negotiation.',
      text: 'Lets the AI negotiator handle a customer’s price request on an issued quotation, within the limits you set.',
      fields: [
        { name: 'Quotation', text: 'An issued quotation with no negotiation open.' },
        { name: 'What the customer asked for', text: 'Their request in their words, e.g. “10% off and 60 days credit”.' },
      ],
    },
    {
      name: 'Take over <session>',
      opens: 'Take over on a negotiation.',
      text: 'You decide instead of the AI: counter-offer, accept the current price, or walk away. Accepting revises and reissues the quotation.',
      fields: [
        { name: 'Your price (₹) / Payment terms', text: 'Your counter-offer.' },
        { name: 'Why', text: 'Kept in the negotiation history.' },
        { name: 'Message for the customer', text: 'Optional text sent with your decision.' },
      ],
    },
  ],
  'pipeline/projection-plan': [
    {
      name: 'New plan',
      opens: '+ New plan.',
      text: 'Creates a sales plan for a financial year from a revenue target and gross margin. The target is split into 4 quarters and 5 business lines that you can then change.',
    },
    {
      name: 'Generate a plan',
      opens: 'Generate.',
      text: 'Builds a draft plan from your last 12 months of issued invoices, grown by the rate you give, plus the open pipeline weighted by stage. Check it, then activate.',
    },
  ],
  'installed-base': [
    {
      name: 'Register a machine / Edit machine',
      opens: '+ Register a machine, or Edit.',
      text: 'Records a machine installed at a customer site with its serial number, warranty, AMC and maintenance dates. These dates drive renewal and service reminders.',
      fields: [
        { name: 'Description / Part number / Serial number / Make / Model', text: 'What the machine is.' },
        { name: 'Site name / Site city', text: 'Where it is installed.' },
        { name: 'Commissioned on / Warranty ends on', text: 'Start of service and end of warranty.' },
        { name: 'AMC ends on / AMC value / AMC term', text: 'The maintenance contract: renewal date, value before GST, and length in months.' },
        { name: 'Calibration due on / Maintenance every (days)', text: 'Schedules service reminders.' },
      ],
    },
    {
      name: 'Import AMC values',
      opens: 'Import AMC values.',
      text: 'Updates AMC values for many machines from a CSV. Check shows what will change and any problems before you import.',
    },
  ],
  'installed-base/new': [
    {
      name: 'Register a machine',
      opens: 'Register a machine.',
      text: 'Records a machine for a contact with its serial number, AMC end date, value and term, make, model and site.',
    },
  ],
  renewals: [
    {
      name: 'Mark lost: <machine>',
      opens: 'Mark lost on a renewal.',
      text: 'The AMC renewal leaves the board and counts against the renewal rate. Give a reason if you know it.',
    },
    {
      name: 'Renewal settings',
      opens: 'Settings.',
      text: 'Yearly price uplift for renewals, the AMC item code your Tally or SAP uses, and which pipeline renewal enquiries go to.',
    },
  ],
  reminders: [
    {
      name: 'Plan reminders',
      opens: 'Plan reminders.',
      text: 'Schedules WhatsApp reminders for everything due in the look-ahead window, using the template you choose. Running it again never doubles anyone’s reminders.',
    },
  ],
  spares: [
    {
      name: 'Remind customers on WhatsApp',
      opens: 'Reminders.',
      text: 'Sends customers a WhatsApp reminder when spares are due, with automatic follow-ups if they don’t answer.',
      fields: [
        { name: 'Send reminders automatically', text: 'Turns the reminders on.' },
        { name: 'Approved WhatsApp template', text: 'The message sent first.' },
        { name: 'Follow up after (days) / Follow-ups at most / Follow-up template', text: 'How follow-ups are sent when there is no reply.' },
      ],
    },
    SEND_REORDER_LINK,
  ],
  network: [
    {
      name: 'Invite a dealer / Territory · <dealer>',
      opens: 'Invite a dealer, or Edit territory.',
      text: 'Invites a dealer with a one-time code (valid 14 days), and sets the territory and product lines whose enquiries they receive.',
      fields: [
        { name: 'PIN code prefixes / Cities / States', text: 'Where the dealer covers. 4110 matches every PIN starting 4110.' },
        { name: 'Product lines', text: 'Which products they sell.' },
      ],
    },
    {
      name: '<enquiry> · <state>',
      opens: 'Clicking a routed lead.',
      text: 'Shows a lead you handed to a dealer: their quote items and activity. Take back, Route again, or Close without a dealer when it stalls.',
    },
    {
      name: 'Network settings',
      opens: 'Settings.',
      text: 'How many hours (1–168) a dealer has to accept a lead before it can be routed again.',
    },
    ROUTE_LEAD,
  ],
  'network/incoming': [
    {
      name: 'Conversation with <OEM>',
      opens: 'Conversation on a lead you received.',
      text: 'A copy of the OEM’s WhatsApp conversation with the customer before the lead came to you. Reply from your own inbox.',
    },
    ROUTE_LEAD,
  ],
  'account-health': [
    {
      name: 'Tune the health score',
      opens: 'Tune.',
      text: 'Sets how many points each signal adds or takes away from a customer’s 0–100 health score, and caps per signal. Saving rescores every customer; Restore defaults undoes your changes.',
    },
  ],

  // Contacts and customers
  contacts: [CONTACT_FORM, CONTACT_IMPORT, SEND_REORDER_LINK],
  'contacts/accounts': [
    CONTACT_FORM,
    {
      name: 'Contacts at <account>',
      opens: 'Contacts on an account.',
      text: 'The people linked to an account. Assign an existing contact, add a new one, or Unlink someone. Tick Include contacts at subsidiaries to see the whole group.',
    },
  ],
  'contacts/segments': [
    {
      name: 'Save segment / Edit segment',
      opens: 'Save segment.',
      text: 'Saves the filter rule, not today’s list: whoever matches is worked out again each time a campaign sends.',
    },
    CONTACT_IMPORT,
  ],
  'contacts/duplicates': [
    {
      name: 'Merge contacts',
      opens: 'Merge on a duplicate pair.',
      text: 'Choose which record survives and which value to keep for each field. The other record is removed and its messages, deals, quotations and service history move to the survivor.',
    },
  ],
  'contacts/360': C360,
  'contacts/:id/360': C360,
  'contacts/accounts/:accountId/360': C360,
  'contacts/accounts/credit': [
    {
      name: 'Customer company: buyers and credit',
      opens: 'Clicking a company.',
      text: 'Who at the company can order on the re-order portal and the company’s credit rules.',
      fields: [
        { name: 'Role', text: 'Orders directly, Needs approval (above an amount), or Approver.' },
        { name: 'Credit limit / Payment terms', text: 'Blank means no limit, and advance payment.' },
        { name: 'Flag orders when overdue by', text: 'New orders are flagged once a bill is this many days late.' },
        { name: 'On hold', text: 'Flags every new order so someone speaks to the customer first. The reason is for staff only.' },
      ],
    },
  ],

  // Activities and calls
  tasks: [TASK, SHARE_ACTIVITY],
  meetings: [
    MEETING,
    SHARE_ACTIVITY,
    { name: 'Meeting details', opens: 'Clicking a meeting.', text: 'Shows the meeting’s time, place, guests and notes, with Edit and Share.' },
  ],
  calls: [CALL_OUTCOME],
  'calls/whatsapp': [
    {
      name: 'Recording notice',
      opens: 'Recording notice.',
      text: 'What a customer hears when a WhatsApp call starts recording. Upload a short clip (audio, up to 1 MB), or use the two-beep tone.',
    },
  ],
  'calls/whatsapp/ivr': [
    {
      name: 'Call menu (IVR)',
      opens: 'Call menu.',
      text: 'The keypad menu WhatsApp callers hear (“Press 1 for sales…”). Spoken prompt or your own recording, how long to wait for a key, and how often to repeat.',
    },
  ],
  'calls/whatsapp/conversations': [
    {
      name: 'AI conversations',
      opens: 'Clicking a conversation.',
      text: 'One AI-handled call: the transcript, the analysis (summary, sentiment, goal met, extracted fields), actions taken and cost.',
    },
  ],
  'calls/ai-agents/:id': [VOICE_AGENT],

  // Inbox and messaging
  inbox: [
    CALL,
    {
      name: 'Request a payment',
      opens: '₹ in the message box.',
      text: 'Sends the customer a secure link in this conversation to pay by UPI, card or net banking. The payment shows in Payments once made.',
    },
    {
      name: 'Draft a quote from this file',
      opens: 'Draft quote on a PDF, image or Excel the customer sent.',
      text: 'Reads the customer’s enquiry or BOQ and drafts a quotation from it, matching lines to your catalogue. Unclear lines are shown; Review line by line to check each.',
    },
    {
      name: 'Reply buttons',
      opens: 'Buttons in the message box.',
      text: 'Sends a message with up to three tap-to-reply buttons. Works inside the 24-hour window.',
    },
    {
      name: 'Share a location',
      opens: 'Location in the attach menu.',
      text: 'Sends a map pin: paste a Google Maps link or coordinates, with an optional name and address.',
    },
    { name: 'Saved replies', opens: 'Saved replies in the message box.', text: 'Search and insert a canned reply.' },
    { name: 'Attach a document', opens: 'Document in the attach menu.', text: 'Pick a brochure, datasheet or price list from Documents to send.' },
    { name: 'Filter conversations', opens: 'Filter.', text: 'Show conversations by status, priority, number, team or assignee.' },
    { name: 'My mentions', opens: '@ in the inbox header.', text: 'Notes where a colleague mentioned you.' },
    SEND_REORDER_LINK,
  ],
  'canned-replies': [
    {
      name: 'New canned reply / Edit reply',
      opens: '+ New reply, or Edit.',
      text: 'Saves a reply the team uses often. Type its shortcut after / in the inbox to insert it.',
    },
  ],
  templates: [
    {
      name: 'Preview <template>',
      opens: 'Preview on a template.',
      text: 'Shows how the template looks on WhatsApp. Type sample values for each variable to see the result.',
    },
  ],
  campaigns: [
    {
      name: 'New campaign',
      opens: '+ New campaign.',
      text: 'Starts a campaign: name it, pick the WhatsApp number and an approved template. Then choose the audience and fill the variables.',
    },
    {
      name: 'Schedule <campaign>',
      opens: 'Schedule.',
      text: 'When the campaign sends (India time), whether it repeats daily, weekly or monthly, and until when. Quiet hours hold messages overnight; No marketing on Sundays skips Sundays.',
    },
  ],
  automations: [
    {
      name: 'New automation',
      opens: '+ New automation.',
      text: 'Creates a paused draft with a trigger: a keyword, a new message, a deal reaching a stage, or a call result. Add the steps in the editor, then activate.',
    },
    {
      name: 'Dry-run: <automation>',
      opens: 'Dry-run.',
      text: 'Shows the steps the automation would take for a contact, and where it would stop. Nothing is sent.',
    },
  ],
  flows: [
    { name: 'New flow', opens: '+ New flow.', text: 'Creates a draft WhatsApp form with one empty screen. Build the screens, then publish to Meta.' },
    { name: '<flow> — funnel', opens: 'Funnel.', text: 'How many customers started, finished, and dropped at each screen.' },
    { name: '<flow> — responses', opens: 'Responses.', text: 'The answers customers submitted.' },
    { name: 'Flow data exchange', opens: 'Data exchange.', text: 'Connects a WhatsApp number so flows can fetch live data, such as stock or slots, while the customer fills them in.' },
  ],

  // Channels
  channels: [
    {
      name: 'Connect a WhatsApp number',
      opens: 'Connect a number.',
      text: 'Links a WhatsApp Business number through Facebook’s secure sign-in window. Return here when you finish.',
    },
    VOICE_AGENT,
  ],
  'channels/numbers': [
    {
      name: 'Connect a WhatsApp number',
      opens: 'Connect a number.',
      text: 'Links a WhatsApp Business number through Facebook’s secure sign-in window.',
    },
    {
      name: 'Release <number>?',
      opens: 'Release on a number.',
      text: 'Stops this workspace using the number at once and deletes its stored token and PIN. Conversations and history stay. Type the number to confirm.',
    },
  ],
  'channels/catalogue': [
    {
      name: 'Add product / Edit product',
      opens: '+ Add product, or Edit.',
      text: 'A WhatsApp catalogue listing: SKU, name, price, stock and image. Listings made from Products follow the product’s name and price.',
    },
    {
      name: 'Add from products',
      opens: 'Add from products.',
      text: 'Pick products to list on this channel. They go out of stock if the product is taken off sale.',
    },
  ],
  'channels/widget': [
    {
      name: 'New chat link / Edit chat link',
      opens: '+ New chat link, or Edit.',
      text: 'A click-to-chat link for a website, ad or print, with a source for reports and an optional pre-filled message.',
    },
    { name: '<chat link>', opens: 'Get link.', text: 'The wa.me link, QR code and website widget snippet to copy.' },
  ],
  'channels/lead-forms': [
    {
      name: 'Choose the Pages to connect',
      opens: 'Connect after Facebook sign-in.',
      text: 'Pick the Facebook Pages whose lead-ad forms should come in as contacts and enquiries.',
    },
  ],
  'channels/telecom': [
    { name: 'KYC · <number>', opens: 'KYC on a number.', text: 'Records the number’s KYC status (Pending, Verified, Rejected, Exempt), document reference and notes.' },
    { name: 'Add Number to Inventory Pool', opens: 'Add number (host).', text: 'Adds a phone number from a carrier to the pool, with rental and setup fees.' },
    { name: 'Allocate Number to Workspace', opens: 'Allocate (host).', text: 'Gives a pooled number to a workspace with its WhatsApp display name.' },
    { name: 'Release Number from Workspace', opens: 'Release (host).', text: 'Takes a number back with a reason and a cooling-off period before reuse.' },
    { name: 'Edit Telecom Entity Registration', opens: 'Edit registration.', text: 'Legal entity, DoT licence, DLT entity ID, TRAI telemarketer ID, carrier and nodal officer details.' },
    { name: 'Compliance & SIM-binding certificate', opens: 'Certificate.', text: 'A summary of the telecom compliance checks for audit.' },
  ],
  'channels/voice-ivr': [
    {
      name: 'Add branch',
      opens: '+ Add branch on a prompt.',
      text: 'What pressing a digit does: go to another prompt, transfer to a person’s number, or hang up.',
    },
  ],

  // Products, documents, stock and purchasing
  'documents/products': [
    {
      name: 'New product / Edit product',
      opens: '+ New product, or Edit.',
      text: 'A catalogue item for quotations and invoices: part number, unit, prices before GST, GST %, HSN, make, series and ratings.',
    },
    { name: 'Import products', opens: 'Import.', text: 'Paste spreadsheet rows. Existing part numbers are updated; new ones added.' },
    { name: 'Units of measure', opens: 'Units.', text: 'The units products are sold in. Add your own; one can be removed once nothing uses it.' },
  ],
  documents: [
    {
      name: 'Upload a document / Edit document',
      opens: 'Upload, or Edit.',
      text: 'A brochure, datasheet or certificate to send customers. Link it to part numbers, and choose who may see it.',
    },
    { name: 'Sent to · <document>', opens: 'Sent to.', text: 'Who the document was sent to, and when.' },
  ],
  'documents/price-lists': [
    {
      name: 'New price list / Edit price list',
      opens: '+ New price list, or Edit.',
      text: 'Special prices for a region or distributor tier from a date. Blank region or tier means any.',
    },
  ],
  stock: [
    {
      name: 'Receive / Issue / Adjust stock / Record a count',
      opens: 'The movement buttons on a part.',
      text: 'Moves stock in or out of a location. A cost on receipt moves the average cost. Serial or batch parts ask for numbers and expiry.',
    },
    { name: 'Minimum level', opens: 'Min level.', text: 'Stock level that flags the part for re-ordering.' },
    { name: 'Tracking · <part>', opens: 'Tracking.', text: 'Choose whether the part is tracked by serial number, batch, or quantity only.' },
    { name: 'Serials / Batches · <part>', opens: 'Serials or Batches.', text: 'Which serials or batches are in stock and where.' },
    { name: 'Trace a batch or serial number', opens: 'Trace.', text: 'Every movement of one batch or serial: when it came in and where it went.' },
    { name: 'History · <part>', opens: 'History.', text: 'All movements of a part.' },
    { name: 'Import stock', opens: 'Import.', text: 'Load opening stock from a CSV; the lines are checked before importing.' },
    { name: 'Stock settings', opens: 'Settings.', text: 'Locations, the default location, and whether won quotations take parts from stock.' },
  ],
  purchasing: [
    {
      name: 'New purchase order / Edit',
      opens: '+ New purchase order, or Edit.',
      text: 'Orders parts from a supplier into a location, with quantity and rate. Expected date defaults from the supplier’s lead time.',
    },
    {
      name: 'Receive <PO>',
      opens: 'Receive.',
      text: 'Enter what arrived; it goes into stock at the order’s cost. Serials, batch and expiry are optional.',
    },
  ],
  'purchasing/bills/new': [
    {
      name: 'New catalogue item',
      opens: '+ New item on a bill line.',
      text: 'Adds a part that isn’t in the catalogue yet, so it can be picked on this and later bills, orders and quotations.',
    },
  ],
  'manufacturing/work-orders': [
    { name: 'Issue material', opens: 'Issue material.', text: 'Records components taken from stock for this work order, with scrap.' },
    { name: 'Complete step', opens: 'Complete on a routing step.', text: 'Hours taken, who checked it, and whether it passed QC.' },
    {
      name: 'Complete and receive goods',
      opens: 'Complete.',
      text: 'Records the good quantity made and the scrap. Good quantity goes into stock.',
    },
  ],

  // Service
  'helpdesk/settings': [
    {
      name: 'Helpdesk settings',
      opens: 'Settings.',
      text: 'SLA hours per priority, and the self-service portal where customers raise tickets without signing in.',
    },
  ],
  'field-service/tickets': [
    {
      name: 'Resolve ticket',
      opens: 'Resolve.',
      text: 'Closes a field ticket with the root cause, what was done, the customer’s representative and their rating.',
    },
  ],
  'field-service/remote-maintenance': [
    {
      name: 'Escalate to a field visit',
      opens: 'Escalate.',
      text: 'Raises a field service ticket carrying the full diagnostic history, so the engineer knows what was tried.',
    },
  ],
  field: [{ name: 'Help · Field Service', opens: '? on the field app.', text: 'How the field app works.' }],

  // Projects
  'projects/:id': [
    {
      name: 'Move to <stage>',
      opens: 'Moving the project to another stage.',
      text: 'Moves the project on. When it ends, say how: Won, Lost (and who won), or Dropped.',
    },
    {
      name: '<spec category>',
      opens: 'A category in Specification.',
      text: 'Whether your products are specified in this part of the tender, the clause text and its value.',
    },
  ],
  'projects/tender-feed': [
    { name: 'Paste an alert', opens: 'Paste.', text: 'Paste a tender alert email; it is read and added to the feed.' },
  ],

  // Re-order portal
  'reorders/send': [
    { name: 'Choose the customer', opens: 'Send a link.', text: 'Pick who gets a personal re-order link.' },
    SEND_REORDER_LINK,
  ],
  'reorders/settings': [
    {
      name: 'How the portal works',
      opens: 'Edit.',
      text: 'Turns the portal on, sets link life, minimum order, the stock warning, password sign-in, the public catalogue and the WhatsApp templates used.',
    },
  ],
  'reorders/dispatch/:quotationId': [
    {
      name: 'Dispatch <order>',
      opens: 'Dispatch.',
      text: 'Records the courier and docket number. Get rates compares Shiprocket prices; with an AWB the shipment tracks itself.',
    },
  ],
  'collections/settings': [
    {
      name: 'Reminder settings',
      opens: 'Edit.',
      text: 'Automatic WhatsApp payment reminders: credit days, the template, and whether to include a pay link.',
    },
  ],

  // Finance and compliance
  'finance/chart-of-accounts': [
    { name: 'Edit <account>', opens: 'Edit.', text: 'Rename an account or turn it off. Code, category and balance side are fixed.' },
  ],
  'finance/gst-compliance': [
    {
      name: 'Add a register entry',
      opens: '+ Add entry.',
      text: 'Adds an invoice raised outside the app to the GST register for GSTR-1. Invoices from this app are added on their own.',
    },
  ],
  compliance: [
    { name: 'Log a DPDP request', opens: 'Log a request.', text: 'Records a privacy request (access, correction, erasure) received by email, phone or post.' },
    { name: 'Log a data breach', opens: 'Log an incident.', text: 'Records a personal-data breach: what happened, severity, when it was found and how many people.' },
  ],

  // Billing and analytics
  billing: [
    { name: 'Top up wallet', opens: 'Top up.', text: 'Add money to the message wallet. You pay on the gateway’s page; the wallet is credited once payment is confirmed.' },
  ],
  'billing/invoices': [
    { name: 'Check Meta’s invoice', opens: 'Check.', text: 'Compares Meta’s monthly invoice lines with what was recorded for a number.' },
    { name: 'Generate a GST invoice', opens: 'Generate.', text: 'Bills wallet usage for a period to a customer’s legal name and GSTIN.' },
  ],
  analytics: [{ name: 'Enquiries behind this figure', opens: 'Clicking a figure.', text: 'Lists the enquiries a number is made of.' }],
  'analytics/dashboards': [
    {
      name: 'New dashboard / Edit dashboard',
      opens: '+ New dashboard, or Edit.',
      text: 'Up to 12 tiles, each a metric shown as a number, line, bar or table for a period. Drag to reorder; share with the workspace.',
    },
  ],
  'analytics/ads': [
    { name: 'Choose the ad accounts to connect', opens: 'Connect.', text: 'Pick Meta ad accounts; the last 90 days of spend are imported at once.' },
  ],

  // Settings
  settings: TWO_FACTOR,
  'settings/teams': [
    { name: 'New team / Edit team', opens: '+ New team, or Edit.', text: 'A team, its members and lead, how conversations are shared, and which numbers route to it.' },
    { name: 'Add a routing rule / Edit rule', opens: '+ Add rule.', text: 'Sends new conversations to a team or person by number, contact role, words in the first message or a contact detail.' },
  ],
  'settings/members': [
    { name: 'Devices · <member>', opens: 'Devices.', text: 'Where the member is signed in. Sign out one device, or everywhere.' },
  ],
  'settings/reports': [
    { name: 'New report / Edit report', opens: '+ New report.', text: 'A report sent on a schedule by email, in-app or WhatsApp.' },
    { name: '<report subject>', opens: 'Preview.', text: 'What the report will contain.' },
  ],
  'settings/pick-lists': [
    { name: 'Add a custom field / Edit', opens: '+ Add field.', text: 'An extra field on contacts or enquiries. Where it is kept, its type and key are fixed once created.' },
  ],
  'settings/integrations': [
    { name: 'Add a webhook endpoint', opens: '+ Add endpoint.', text: 'A URL that receives events you choose, such as new messages or won deals.' },
    { name: '<CRM> — field mapping', opens: 'Mapping.', text: 'Which fields sync to your CRM, and whether WhatsApp messages go on its timeline.' },
    { name: 'Add a Tally or SAP connection', opens: '+ Add connection.', text: 'Connects Tally or SAP Business One with its address, company and sign-in.' },
    { name: '<connection> — what to sync', opens: 'What to sync.', text: 'Which records sync, and the ledger, group and code prefix used.' },
  ],
  'settings/email-templates': [
    { name: 'New email template', opens: '+ New template.', text: 'An email with a key, subject and HTML body used by the system.' },
  ],
  'settings/ai-assistant': [
    { name: 'Add a knowledge article / Edit', opens: '+ Add article.', text: 'Text the AI assistant may answer customers from.' },
  ],
  'settings/support-access': [
    { name: 'Grant support access', opens: 'Grant access.', text: 'Lets MNI Assist support enter your workspace for a set time. Every action is logged; revoke any time.' },
  ],

  // Administration (host)
  'admin/users': [
    { name: 'New user / Edit user', opens: '+ New user, or Edit.', text: 'A sign-in: username, name, email, password and whether it is active.' },
    { name: 'Permissions · <user>', opens: 'Permissions.', text: 'Grant or revoke individual permissions on top of the user’s roles.' },
    { name: 'Security · <user>', opens: 'Security.', text: 'Lock or unlock the account, or set a new password (signs them out everywhere).' },
  ],
  'admin/roles': [
    { name: 'New role', opens: '+ New role.', text: 'A role name, and whether new users get it by default.' },
  ],
  'admin/tenants': [
    { name: 'New workspace / Rename workspace', opens: '+ New workspace.', text: 'Creates a customer workspace with its admin sign-in.' },
    { name: 'Features · <workspace>', opens: 'Features.', text: 'Turn features on or off for one workspace.' },
    { name: 'Manage · <workspace>', opens: 'Manage.', text: 'Plan, billing, grace allowance, users, invoices, database, suspend or reactivate, or enter the workspace.' },
  ],
  'admin/audit-logs': [
    { name: 'Request', opens: 'Clicking a log row.', text: 'The full request: who, when, URL, result and the actions it ran.' },
    { name: '<entity> changes', opens: 'Changes.', text: 'Every recorded change to a record, oldest first.' },
  ],
  platform: [
    { name: 'Schedule a rate', opens: 'Schedule a rate.', text: 'A new per-message price from a date: what Meta charges and what workspaces pay.' },
  ],
  'platform/newsletter': [
    {
      name: 'New newsletter / Edit newsletter',
      opens: 'New newsletter, or Edit on a draft (View on a sent one).',
      text: 'Write the subject line and the body in simple HTML, with a live preview beside it showing the unsubscribe footer each email gets. Save draft keeps it; Send to … sends it to every confirmed subscriber.',
      fields: [
        { name: 'Subject line', text: 'What subscribers see in their inbox.' },
        { name: 'Body (HTML)', text: 'Headings, paragraphs, lists, links and images, with inline styles.' },
        { name: 'Send a test', text: 'Sends it to one address only, with [Test] in the subject.' },
      ],
    },
    {
      name: 'Send a test',
      opens: 'Send a test in the editor.',
      text: 'Asks which address to send the test to (yours by default). Nobody on the list gets it.',
    },
    {
      name: 'Send “…”?',
      opens: 'Send on a draft, or Send to … in the editor.',
      text: 'Confirms how many confirmed subscribers it goes to. Once sending starts it can’t be changed or stopped.',
    },
    {
      name: 'Erase …?',
      opens: 'Erase on a subscriber.',
      text: 'Deletes the address and its consent record for good, as for a data-erasure request.',
    },
  ],
  'platform/plans': [
    { name: 'New plan / Edit plan', opens: '+ New plan.', text: 'A plan with monthly fee, limits, selling points and order on Billing.' },
  ],
  'platform/feature-flags': [
    { name: 'New feature flag rule', opens: '+ New rule.', text: 'Turns a feature on for everyone, a percentage, or one workspace.' },
  ],
  'platform/status': [
    { name: 'New incident / Update incident', opens: '+ New incident.', text: 'An outage or maintenance notice on the public status page.' },
  ],
  resellers: [
    { name: 'Add a partner / Register as a reseller partner', opens: '+ Add partner.', text: 'A reseller company and its contact.' },
    { name: 'Edit contact details', opens: 'Edit.', text: 'Partner details and the bank account commissions are paid to.' },
    { name: 'Tier for <partner>', opens: 'Tier.', text: 'Partner tier, billing model, commission and wholesale discount.' },
    { name: 'Branding & white-label', opens: 'Branding.', text: 'Brand name, colours and logos shown to the partner’s clients.' },
    { name: 'Add a client workspace', opens: '+ Add client.', text: 'A workspace for a partner’s client with plan and price.' },
  ],
};
