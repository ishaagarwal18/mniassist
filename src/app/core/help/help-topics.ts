/**
 * The help behind every screen's "?" button. Keyed by the route's path exactly
 * as `app.routes.ts` declares it (`templates/:id/edit`, not a resolved URL), so
 * the top bar finds a screen's topic without the screen passing anything in.
 * <p>
 * "What it does" stays the one-line `help` each screen already hands its top
 * bar — that text sits next to the screen it describes and changes with it.
 * A topic adds the two things a sentence can't carry: why it's worth using,
 * and the steps to get something done. `summary` overrides the screen's own
 * line only where one topic serves several routes and needs wording that fits
 * them all.
 * </p>
 */
export interface HelpTopic {
  readonly summary?: string;
  readonly benefits: readonly string[];
  readonly steps: readonly string[];
  readonly tips?: readonly string[];
}

const CUSTOMER_360: HelpTopic = {
  benefits: [
    'Orders, invoices, service tickets and installed machines for one customer, on one screen.',
    'See what a customer owes and what is open before you call them.',
  ],
  steps: [
    'Open a contact or account and choose Customer 360.',
    'A contact (one person) shows their conversations, enquiries and service. Orders, delivery challans, invoices, payments and credit are on their account: use Open account 360, or link the contact to an account first.',
    'On an account, use + New Order, Create delivery challan, Create invoice or Record payment, and open any order, invoice or ticket for the detail.',
  ],
};

const VENDOR_360: HelpTopic = {
  benefits: [
    'Purchase orders, receipts, bills and debit notes for one vendor, on one screen.',
    'Shows overdue bills and how reliably the vendor delivers.',
  ],
  steps: [
    'Choose a vendor to see their history.',
    'Everything about this supplier opens each related screen on just this vendor: orders, receipts, bills, debit notes, stock and finance.',
    'Use + Inward GRN to receive goods, or Open bill / Open GRN to work one record.',
    'On the screen you opened, the breadcrumb Vendor 360 · <vendor> brings you back here.',
  ],
};

const TEMPLATE_COMPOSER: HelpTopic = {
  benefits: [
    'Catches the issues Meta most often rejects before you submit, so approval is faster.',
    'Variables personalise one template for every customer, with sample values for the reviewer.',
    'Buttons (quick replies, a website, a phone number) turn a message into a one-tap action.',
  ],
  steps: [
    'Pick the category honestly: Marketing for promotions, Utility for updates about an order or service, Authentication for codes.',
    'Choose a header type if you want one (text, image, video or document), then write the body.',
    'Use + Add variable for anything that changes per customer, and give each a realistic sample.',
    'Add buttons if the customer should reply or act in one tap.',
    'Click Check, fix anything it flags, then Save & submit. Save draft keeps it without sending to Meta.',
  ],
  tips: [
    'Meta decides approval. Check the status on the Templates screen before building a campaign on it.',
  ],
};

const AUTOMATION_BUILDER: HelpTopic = {
  benefits: [
    'Replies, follow-ups and hand-offs happen on time without anyone watching the inbox.',
    'Branches (If…, Wait for a reply) let one automation treat each customer differently.',
    'Canvas and List show the same automation, so use whichever is clearer to you.',
  ],
  steps: [
    'Use Add step (List) or drag from the palette (Canvas) to add what should happen first.',
    'Join steps in order. On the canvas, drag from the dot on a step’s bottom edge to the next step.',
    'For If… and Wait for a reply, connect both ways out, or leave one empty to end the journey there.',
    'Add AI voice call to have the voice agent ring the contact; its two ways out are goal met and otherwise. An If… step after it can check the call’s answer, sentiment or extracted fields.',
    'Go back to Automations and use Dry-run to check it before turning it on.',
  ],
};

const FLOW_DESIGNER: HelpTopic = {
  benefits: [
    'Structured answers (dates, choices, quantities) instead of free text you have to read and retype.',
    'No hand-written Flow JSON: it is generated as you design.',
    'Required fields make sure you always get the details you need.',
  ],
  steps: [
    'Use + Add screen for each step of the form, in the order the customer sees them.',
    'On each screen, use + Add field and choose a type: Text, Paragraph, Dropdown, Radio buttons, Checkboxes, Date or Opt-in.',
    'Mark which fields are required.',
    'Return to Flows to publish it and watch the Funnel once customers start using it.',
  ],
};

const NETWORK: HelpTopic = {
  summary:
    'For OEMs and their dealers. The OEM invites dealers, gives each a territory and routes enquiries to them. A dealer accepts or declines the leads it is sent.',
  benefits: [
    'Every enquiry reaches the dealer who covers that customer, quickly.',
    'The OEM still sees each lead’s stage, quotes and activity after handing it over.',
    'Leads that stall can be taken back or routed again, so none are lost.',
  ],
  steps: [
    'As the OEM: click Invite a dealer and share the code, then Edit territory for each dealer.',
    'Route an enquiry to a dealer. Track it under the With dealers, Waiting, Won and Lost tabs.',
    'Use Take back or Route again if a dealer is not acting on a lead.',
    'As a dealer: enter the OEM’s invite code, then accept or decline each lead under Leads for us.',
  ],
};

const ACCOUNT_FORM: HelpTopic = {
  benefits: [
    'Create or update customer accounts with standardized company details.',
    'Select industry and location from verified master data catalogs.',
    'Place accounts into a parent-subsidiary hierarchy for accurate corporate rollups.',
  ],
  steps: [
    'Enter the account or subsidiary name and choose its industry from the master catalog.',
    'Specify the street address, state, and city (cities filter automatically by selected state).',
    'Select a parent account if organizing under an existing corporate group or company.',
    'Click Save account to store the changes.',
  ],
};

const CONTACT_FORM: HelpTopic = {
  benefits: [
    'Create or update contacts with verified WhatsApp communication capabilities.',
    'Link contacts directly to parent corporate accounts and industrial clusters.',
    'Fast-track data entry using AI visiting card scanning and vCard imports.',
  ],
  steps: [
    'Enter the primary WhatsApp phone number in international format (e.g. 919821012345).',
    'Add full name, designation, and company account link.',
    'Set commercial decision authority role (Purchase, Maintenance, Plant Head...).',
    'Choose operating state and industrial cluster from verified catalogs.',
  ],
  tips: [
    'Scan a visiting card photo to automatically extract names, designations, and numbers.',
    'Linking a contact to an account automatically aggregates their pipeline and activity.',
  ],
};

export const HELP_TOPICS: Readonly<Record<string, HelpTopic>> = {
  home: {
    benefits: [
      'See the health of your WhatsApp numbers and your wallet balance without opening other screens.',
      'Spot problems such as a low balance or a quality drop before they stop a send.',
      'Start your next campaign in one click.',
    ],
    steps: [
      'Check the channel strip at the top: quality, messaging tier and today’s usage.',
      'Look at the wallet balance and top up from Billing if it is low.',
      'Click New campaign to start a send, or Open on any card to go to its full screen.',
    ],
  },
  'getting-started': {
    benefits: [
      'A clear order for setting up the workspace, so nothing important is missed.',
      'Steps you have already done tick themselves off.',
      'Dismissing it only hides the list. Nothing is lost.',
    ],
    steps: [
      'The rail at the top shows every step; ticked ones are done. It opens on the next one to do.',
      'Use Go and do it to open the screen that completes the step, or verify your number right here.',
      'Click I’ve done this for steps you finished outside MNI Assist; it moves on to the next one.',
      'Use Back, Skip for now or the rail to move between steps. Dismiss hides the whole checklist.',
    ],
  },
  inbox: {
    benefits: [
      'One place for every customer conversation, across all connected channels.',
      'Assign conversations so each customer has one clear owner.',
      'Quote, send a payment or re-order link, or call without leaving the chat.',
    ],
    steps: [
      'Pick a conversation from the list. Use Filters to show only unassigned or your own.',
      'Click Assign to give it to a teammate, or reply yourself with Send.',
      'If the 24-hour window has closed, use Choose a template to start the conversation again.',
      'Use Call, Call on WhatsApp, Quote from this… or Re-order link when the customer needs more than a message.',
      'Click Resolve when the conversation is done.',
    ],
    tips: [
      '“Window closed” means the customer has not messaged in 24 hours. Only approved templates can be sent then.',
    ],
  },
  contacts: {
    benefits: [
      'Your full customer list, with consent shown clearly so you only message people who agreed.',
      'Import existing lists instead of typing them in.',
      'Filter by role (Purchase, Maintenance, Plant head…) to reach the right person.',
    ],
    steps: [
      'Click New contact to add one person, or Import to bring in a list.',
      'Use Filter to narrow the list by role, consent or other details.',
      'Open a contact to see their conversations, deals and machines.',
      'Use Re-order link to send a customer their personal spares re-order page.',
    ],
    tips: [
      'An imported list is the weakest evidence of consent. Confirm it before marketing to those contacts.',
    ],
  },
  'contacts/segments': {
    benefits: [
      'Target exactly the customers a campaign is meant for.',
      'Membership is checked again at send time, so an opt-out made today is always respected.',
      'Save an audience once and reuse it in any campaign.',
    ],
    steps: [
      'Click + condition to add a rule, for example City is Pune, or Role is Purchase.',
      'Use + any-group when any one of several rules is enough, and + exclusion to leave people out.',
      'Check the count of matching contacts.',
      'Click Save segment and give it a clear name.',
    ],
  },
  'contacts/accounts': {
    benefits: [
      'See contacts by the company or plant they work for.',
      'Roll numbers up from plant to company to group.',
      'Know every person you deal with at one customer.',
    ],
    steps: [
      'Click New account for a group or company.',
      'Use Add subsidiary to put a company or plant under it (up to five levels).',
      'Link contacts to the right account.',
      'Click Rollup to see totals that include everything beneath an account.',
    ],
  },
  'contacts/accounts/new': ACCOUNT_FORM,
  'contacts/accounts/:accountId/edit': ACCOUNT_FORM,
  'contacts/new': CONTACT_FORM,
  'contacts/:id/edit': CONTACT_FORM,
  'contacts/duplicates': {
    benefits: [
      'One record per person, so customers are not messaged twice.',
      'History from both records is kept when you merge.',
      'Nothing merges without your confirmation.',
    ],
    steps: [
      'Look through the suggested pairs and why each was matched (phone, email or name).',
      'Click Review & merge, choose which record to keep, and check the preview.',
      'Confirm the merge, or click Not duplicates to stop that pair being suggested.',
    ],
  },
  'account-health': {
    benefits: [
      'Know which customers are at risk before they leave.',
      'Every score shows its reasons, so you know what to fix.',
      'Scores update every night from what MNI Assist already records.',
    ],
    steps: [
      'Filter to At risk to see the customers who need attention first.',
      'Open a customer to see the reasons behind their score.',
      'Act on the biggest reason, for example an overdue ticket or an unpaid invoice.',
      'Use Tune scoring to change the points for each reason, or Restore defaults.',
    ],
  },
  campaigns: {
    benefits: [
      'Send an approved message to a whole audience at a set time.',
      'Pre-flight checks stop sends that would breach limits or consent.',
      'Pause and resume a running campaign at any time.',
    ],
    steps: [
      'Click New campaign.',
      'Choose the channel, an approved template and an audience.',
      'Fill in any variables and set the schedule.',
      'Review the pre-flight checks and fix anything that fails, then launch.',
      'Use Pause or Resume while it runs. Results appear in Analytics.',
      'Open a campaign to reach everything about it: its template, its audience, results, wallet and follow-up automations. The breadcrumb on those screens leads back to the campaign.',
    ],
  },
  'campaigns/new': {
    benefits: [
      'Create and name a new WhatsApp broadcast campaign draft.',
      'Select verified sending numbers and compliant approved message templates.',
      'Prepare template variables and audience targeting for pre-flight verification.',
    ],
    steps: [
      'Give the campaign a descriptive internal name.',
      'Select the WhatsApp business number to dispatch from.',
      'Choose an approved message template registered for that number.',
      'Click Create Draft to proceed to audience selection and variable mapping.',
    ],
  },
  templates: {
    benefits: [
      'Message customers outside the 24-hour reply window.',
      'Approved templates are ready to reuse in campaigns and automations.',
      'Library templates give you a tested starting point.',
    ],
    steps: [
      'Click New template, or Add library templates to start from a ready-made one.',
      'Submit it for Meta review from the composer.',
      'Click Sync from Meta to refresh approval status.',
      'Use an approved template in a campaign, an automation or the inbox.',
    ],
  },
  'templates/new': TEMPLATE_COMPOSER,
  'templates/:id/edit': TEMPLATE_COMPOSER,
  automations: {
    benefits: [
      'Answer keywords, run drip sequences and follow up automatically.',
      'React to events such as a new contact, a stage change or a completed Flow.',
      'Dry-run shows what would happen before any customer is affected.',
    ],
    steps: [
      'Click New automation and choose a trigger, for example Inbound keyword or Enquiry stage changed.',
      'Build the steps in the builder.',
      'Click Dry-run and check the result.',
      'Turn it on. New automations start paused.',
    ],
  },
  'automations/:id': AUTOMATION_BUILDER,
  'auto-replies': {
    benefits: [
      'Greet every new customer the moment they write, on any plan.',
      'Tell customers when you are closed, without an agent on duty.',
      'Set a closure such as Diwali week once, and it switches itself off after.',
    ],
    steps: [
      'Write the welcome message and tick Send a welcome.',
      'Set your business hours and time zone, and list your holidays.',
      'Write the away message and choose how long to wait before replying to the same customer again.',
      'For a closure, tick Out of office, choose the first and last closed day, and write the message.',
      'Click Save. The line at the top says what a customer writing now would get.',
    ],
  },
  flows: {
    benefits: [
      'Collect structured details (an RFQ, a booking, a service ticket) inside WhatsApp.',
      'Fewer back-and-forth messages and fewer mistakes.',
      'Funnel shows exactly which question makes people stop.',
    ],
    steps: [
      'Click New flow, then Design to build its screens.',
      'Publish it and use it from a template button or an automation.',
      'Click Funnel to see where people drop off, and improve that question.',
      'Click Deprecate when a Flow should no longer be used.',
    ],
  },
  'flows/:id': FLOW_DESIGNER,
  forms: {
    benefits: [
      'Capture enquiries from your website straight into the pipeline.',
      'Each submission finds or creates the contact and records their consent.',
      'Share it as a link or embed it in a page.',
    ],
    steps: [
      'Click New form and use Add a question for each field you need.',
      'Use ↑ ↓ to set the order of questions.',
      'Click Copy link to share it, or Embed on a website and Copy embed code for your web developer.',
      'Open Submissions to see what has come in.',
    ],
  },
  enquiries: {
    benefits: [
      'Every open deal on one board, by stage.',
      'Moving a card updates the real record. There is no separate copy to keep in step.',
      'See how much value is in play at a glance.',
    ],
    steps: [
      'Click New enquiry, or let forms, Flows and ads create them for you.',
      'Open a card to see its contact, calls, tasks, quotations and tickets.',
      'Click Advance → to move it to the next stage.',
      'Use Pipelines to switch to, or set up, a different sales process.',
    ],
  },
  'enquiries/new': {
    benefits: [
      'Enter new sales opportunities directly into your active sales pipeline.',
      'Link technical requirements and scope of supply directly to the customer contact.',
      'Estimate commercial value in Rupees to automatically update funnel analytics.',
    ],
    steps: [
      'Pick an existing customer contact or create a new contact inline.',
      'Select the destination sales pipeline for deal qualification.',
      'Enter a clear title describing the equipment or project scope.',
      'Provide technical requirements, estimated value, and acquisition lead source.',
      'Click Create Enquiry to place the deal into the opening pipeline stage.',
    ],
  },
  'enquiries/pipelines': {
    benefits: [
      'Run different sales processes, such as projects and spares, each with its own stages.',
      'Reports and automations still work, because every stage maps to one of the seven built-in stages.',
      'A default pipeline gets new enquiries automatically.',
    ],
    steps: [
      'Click New pipeline and name it.',
      'Use Add stage, then ↑ ↓ to order the stages. Won and Lost are always last.',
      'Map each stage to the built-in stage it is closest to.',
      'Click Make default for the pipeline new enquiries should go into.',
    ],
  },
  forecast: {
    benefits: [
      'Know what you are likely to sell this month or quarter.',
      'Compare Expected, Commit and Best case to plan with confidence.',
      'Track progress against quotas.',
    ],
    steps: [
      'Choose Month or Quarter, and use ← → to move between periods.',
      'Read the Expected, Commit and Best case figures.',
      'Fix deals listed with no close date, or a date that has passed. They are not counted.',
      'Use Set quotas and Assumptions to adjust targets and stage chances. Save today’s forecast keeps a record.',
    ],
  },
  quotations: {
    benefits: [
      'All quotes in one list, with the follow-ups that are due shown first.',
      'Send a PDF or ask for an e-signature in a few clicks.',
      'Loss reasons feed the loss analysis in Analytics.',
    ],
    steps: [
      'Click New quotation and pick the enquiry, then add products and prices.',
      'Click Issue, then send the PDF or request a Signature.',
      'Follow up on quotes due today.',
      'Mark each one Won or Lost. Lost needs a reason.',
    ],
  },
  'installed-base': {
    benefits: [
      'A register of every machine you have supplied, and where it is.',
      'AMC, calibration and warranty reminders go out on time, automatically.',
      'Service history stays with the machine.',
    ],
    steps: [
      'Click Register machine and enter the customer, model, serial number and key dates.',
      'Use Import AMC values to bring in contract values in bulk.',
      'Click Log service after each visit.',
      'Click Retire when a machine is no longer in use.',
    ],
  },
  renewals: {
    benefits: [
      'No AMC lapses unnoticed. Every renewal due in the next 90 days is listed.',
      'Reminders go out 30 and 7 days before the end date.',
      'Renewal quotes are drafted for you from last term’s value plus your uplift.',
    ],
    steps: [
      'Choose 30, 60 or 90 days to see what is coming up.',
      'Check and issue any renewal quote a customer has asked for.',
      'Use Mark lost if a customer will not renew.',
      'Use Settings to set the yearly uplift and the pipeline renewal enquiries go into.',
    ],
  },
  spares: {
    benefits: [
      'Sell consumables (filters, kits, oils) when customers actually need them.',
      'Due dates are worked out from each machine and its wear rules.',
      'Quote all of a customer’s due parts in one go.',
    ],
    steps: [
      'Set up which parts each model wears out, and how often, under Rules.',
      'Review the parts now due, grouped by customer.',
      'Quote the due parts, or send a Re-order link so the customer can order them.',
      'Click Changed today when a part is replaced, to restart its clock.',
      'Turn on Customer reminders to message customers automatically.',
    ],
  },
  reorders: {
    benefits: [
      'Customers order spares themselves from a personal WhatsApp link, at their own prices.',
      'Every order arrives as a draft quotation, ready to check and issue.',
      'Dispatch and delivery are tracked through to the customer.',
    ],
    steps: [
      'Click Send a re-order link to give a customer their personal page.',
      'Open To check and issue, check each request, and issue the quotation.',
      'When paid or ordered, mark Dispatch, In transit and Delivered as it ships.',
      'Use Portal settings, Companies and Shipping to set up how the portal works.',
    ],
  },
  'stock/planning': {
    summary:
      'Projects every stocked part forward: how fast it is used, how long the stock in hand and on order lasts, the day it runs out, and what to order now to stay covered through the supplier’s lead time.',
    benefits: [
      'See stock-outs coming weeks ahead, not when a customer is waiting.',
      'Order the right quantity: enough for the lead time, a safety buffer and the next month, not a guess.',
      'Spot money tied up in parts nobody has used for months, and in more stock than you will need.',
    ],
    steps: [
      'Start with the parts marked Out and Order now; the list is sorted by urgency.',
      'Pick a part to see its projected balance week by week against its reorder point.',
      'Adjust the assumptions (usage window, safety days, cover) to match how you buy.',
      'Raise the purchase orders from Purchasing; parts on order count as soon as the order is sent.',
    ],
    tips: [
      'Usage is what was issued from stock in the window. A part sold without being issued from stock looks unused.',
      'Lead time comes from the supplier of the part’s latest purchase order; set it on the supplier.',
    ],
  },
  reports: {
    benefits: [
      'Every report in one place, grouped by the question it answers.',
      'Only the reports you have access to are listed.',
    ],
    steps: [
      'Pick the report that answers your question.',
      'Choose a period at its top; the same period carries over to the other reports.',
    ],
  },
  'reports/exports': {
    summary:
      'Large exports — analytics and the audit log — run in the background and land here, with a download link that also goes to your email.',
    benefits: [
      'Ask for a year of data without waiting on the page; carry on working while it builds.',
      'Download it again from here for 7 days, from any device you sign in on.',
    ],
    steps: [
      'Start an export from Analytics or Audit logs; it appears here as Queued, then Ready.',
      'Select Download when it is Ready, or use the link in the email.',
    ],
    tips: ['Links stop working after 7 days and the file is deleted; ask for a fresh export then.'],
  },
  'reports/business': {
    summary:
      'The owner’s view of stock and money: what stock is worth, how it turns over and which parts carry the business; what customers owe, how old it is and how fast payment links get paid.',
    benefits: [
      'Know the value of stock on the shelves and how many days of sales it represents.',
      'See which few parts carry most of the value (ABC), and which have not moved in 90 days.',
      'Follow collections: what was collected, how quickly links are paid, who owes the most and for how long.',
    ],
    steps: [
      'Choose the period at the top; every figure and chart follows it.',
      'Switch between the Stock and Payments tabs.',
      'Export any table to Excel or CSV from its toolbar to share it.',
    ],
    tips: [
      'Receivables (ageing, DSO, top debtors) need the ERP connection; payment-link figures work on their own.',
    ],
  },
  stock: {
    benefits: [
      'Know how many of each part you have at each location.',
      'Every change is recorded as a movement, so any figure can be explained.',
      'Parts on open re-orders are held so you don’t promise the same stock twice.',
    ],
    steps: [
      'Click Set up stock and choose to keep stock here or read it from Tally or SAP.',
      'Use Receive, Issue, Adjust or Count to record changes.',
      'Set a Minimum for each part so purchasing can suggest re-orders.',
      'Open History, or Trace a serial or batch number, to see where stock went.',
    ],
  },
  purchasing: {
    benefits: [
      'Raise supplier orders from suggestions based on low stock.',
      'Stock received is valued at moving average cost.',
      'Sent orders show as on order on the Stock screen.',
    ],
    steps: [
      'Add suppliers under Suppliers (New supplier).',
      'Open Reorder suggestions and start an order, or click New order.',
      'Click Mark sent when the order goes to the supplier.',
      'Click Receive when goods arrive. Stock updates automatically.',
    ],
  },
  collections: {
    benefits: [
      'Get paid sooner with automatic, polite WhatsApp reminders.',
      'Reminders stop by themselves once your ERP shows the invoice is paid.',
      'See every unpaid invoice from Tally or SAP in one list.',
    ],
    steps: [
      'Make sure your ERP is connected under Integrations.',
      'Open Settings and choose the approved reminder template.',
      'Switch reminders on: 3 days before the due date, then 7 and 15 days overdue.',
      'Check the list for invoices that are still unpaid after the last reminder.',
    ],
  },
  network: NETWORK,
  'network/incoming': NETWORK,
  tasks: {
    benefits: [
      'Never miss a follow-up. You are reminded before each task is due.',
      'Finished tasks show on the deal’s timeline.',
      'See your own tasks, or everyone’s.',
    ],
    steps: [
      'Click New task, add what needs doing, a due date and, if relevant, the deal.',
      'Switch between Mine and Everyone.',
      'Tick a task when it is done.',
    ],
  },
  meetings: {
    benefits: [
      'Schedule meetings around everyone’s availability.',
      'Accept, decline and record outcomes in one place.',
      'Add any meeting to your own calendar app.',
    ],
    steps: [
      'Click Schedule, add people, and pick a time (or a suggested free time).',
      'Use ‹ › and Today to move through the week. Switch between Mine and Everyone.',
      'Open a meeting to Accept, Decline, Edit or Add to calendar.',
      'Afterwards, Mark done or No-show so the history is accurate.',
    ],
  },
  calls: {
    benefits: [
      'Call customers from the app. Your phone rings first, then theirs.',
      'Calls from your own phone can be written up too, so the record is complete.',
      'Call outcomes are kept on the deal’s history.',
    ],
    steps: [
      'Start a call from a contact or deal.',
      'After the call, click Say how it went and choose the outcome.',
      'Switch between Mine and Everyone to review calls.',
      'Use Edit to correct a call’s details later.',
    ],
  },
  'calls/whatsapp': {
    benefits: [
      'Customers can call your WhatsApp number from the app they already use.',
      'Your team can call customers who have allowed it.',
      'Recordings, when switched on, are saved with the call.',
      'A call menu sends callers to Sales, Purchase or Service, and can read out a ticket or order status they key in.',
    ],
    steps: [
      'Answer incoming calls from the call bar that appears near the bottom of the screen.',
      'Set up the menu and its sub-menus under Call menu (IVR), choosing the team each option rings.',
      'During a call, use Look up to see the caller’s tickets and orders, search records or ask technical support.',
      'Review past calls here and use Play to listen to recordings.',
      'Set the Recording notice so customers are told calls are recorded.',
    ],
  },
  'calls/ai-agents': {
    benefits: [
      'Build a voice agent once and let it answer on several WhatsApp numbers.',
      'Change it in one place: every number assigned to it uses the new published version on its next call.',
      'See which number used which agent, and when, in each agent’s assignment history.',
    ],
    steps: [
      'Create an agent, blank or starting from a number’s current agent.',
      'Click Edit agent to write, test and publish it, as for a number’s own agent.',
      'Choose Assign to a number; a number on another shared agent moves to this one.',
      'Click Unassign to give a number back its own agent; deleting an agent does this for all its numbers.',
      'A number assigned to an agent that isn’t published isn’t answered by AI.',
    ],
  },
  'whats-new': {
    benefits: [
      'See what has shipped lately, newest first.',
      'Each change says what you can now do, with a link to the screen.',
    ],
    steps: [
      'Read the latest release at the top.',
      'Select Open beside a change to go straight to the feature.',
    ],
  },
  'calls/ai-impact': {
    benefits: [
      'See what your AI voice agents did: calls, goals met, meetings, leads, tickets and payment links.',
      'Compare what the calls cost with the staff time they would have taken.',
      'Download it as a PDF for a pilot review, or as CSV.',
    ],
    steps: [
      'Choose the period, and a number if you want just one.',
      'Enter how long a person takes per call and what an hour of their time costs.',
      'Select Show, then PDF or CSV to download.',
    ],
  },
  'calls/web-widget': {
    benefits: [
      'Visitors to your website talk to your AI voice agent from the browser, with one click.',
      'Each call is kept like any AI call: transcript, analysis, actions and follow-ups.',
      'The visitor becomes a contact, with their name and mobile number.',
    ],
    steps: [
      'Add a call button, choose the number whose published agent answers, and list your websites.',
      'Copy the embed code and paste it before </body> on your website’s pages.',
      'Set a daily limit: AI minutes cost money, and calls stop for the day at the limit.',
      'Make a new embed code if the code was copied somewhere it shouldn’t be; the old one stops at once.',
    ],
  },
  'calls/ai-batches': {
    benefits: [
      'Your published voice agent calls a list of people for you: renewals, reminders, feedback or follow-ups.',
      'Each person’s own details from the file are used in the call.',
      'People who don’t pick up are tried again later, up to the number of attempts you set.',
    ],
    steps: [
      'Create a batch, choose the WhatsApp number and say why the agent is calling.',
      'Upload a CSV with a phone column; other columns become details the agent can use.',
      'Set the calling hours (09:00–21:00 at most), calls at once, attempts and the gap between them.',
      'Start calling, and watch who was reached; pause or cancel at any time.',
      'Only people who allowed WhatsApp calls and haven’t opted out are called.',
    ],
  },
  helpdesk: {
    benefits: [
      'Every service ticket in one place, however it was raised.',
      'Replies go back on the channel the ticket came in on.',
      'Field engineers update tickets from the field app.',
    ],
    steps: [
      'Open a ticket to see the customer, the machine and the conversation.',
      'Assign it, reply to the customer, and update its status.',
      'Switch between Mine and Everyone to manage the queue.',
      'Use Settings to set response times by priority, turn on the public ticket portal, and set the field visit sign-off code.',
    ],
  },
  documents: {
    benefits: [
      'Datasheets and drawings ready to send in a chat, found by part number.',
      'Control who can receive each document.',
      'Everyone sends the current version.',
    ],
    steps: [
      'Click Upload document and add its part numbers.',
      'Set Access: Public, Verified dealers only, or Named accounts only.',
      'Send documents from the inbox. Use Edit to replace or retag one.',
    ],
  },
  'documents/products': {
    benefits: [
      'One list of the parts you quote, with units and list prices.',
      'Quotations fill in prices automatically.',
      'Import your existing catalogue in one go.',
    ],
    steps: [
      'Click New product, or Import to bring in a spreadsheet.',
      'Enter the part number, unit and list price.',
      'Use Edit to update prices. Set customer-specific prices in Price lists.',
    ],
  },
  'documents/price-lists': {
    benefits: [
      'Different prices for different regions and distributor tiers.',
      'The right list is chosen for each customer automatically.',
      'Discounts are measured against the product’s list price.',
    ],
    steps: [
      'Click New price list and choose the region and distributor tier it applies to.',
      'Use + Add item to add products and their prices.',
      'Keep only one active list for each region and tier, so the right price is always clear.',
    ],
  },
  analytics: {
    benefits: [
      'See message volume, spend, and how templates and agents perform.',
      'See how your pipeline converts, by stage, source, owner or pipeline.',
      'Export for meetings and management reports.',
    ],
    steps: [
      'Choose a period at the top. Leave Compare on to see each figure against the period just before.',
      'Switch between By stage, By source, By owner and By pipeline.',
      'Export as CSV, Excel or PDF.',
    ],
    tips: [
      'The period you pick is shared by every report screen, so it follows you from page to page.',
      'Days are counted in India Standard Time, so a message sent at 1 a.m. counts on that day.',
    ],
  },
  'analytics/campaigns': {
    benefits: [
      'See what each campaign brought in, not just how many messages were delivered.',
      'Compare campaigns on reply rate, enquiries and cost per enquiry.',
      'Know which campaigns to repeat and which to stop.',
    ],
    steps: [
      'Choose a period at the top.',
      'Read the funnel from Sent to Won to see where people drop off.',
      'Sort the table by Enquiries or Cost / enquiry; click a campaign to open it.',
    ],
    tips: [
      'An enquiry is credited to a campaign when the recipient opened it within 14 days of the campaign message.',
    ],
  },
  'analytics/ads': {
    benefits: [
      'See which Click-to-WhatsApp and lead-form ads bring conversations that turn into enquiries and orders.',
      'Connect your Meta ad account and each ad shows what it cost, per chat or lead and per enquiry.',
      'Ads that spent money and brought nothing are listed too, so you know what to switch off.',
    ],
    steps: [
      'Choose a period at the top.',
      'Select Connect an ad account and sign in with someone who can see the ad account in Meta Business Manager.',
      'Sort by Per enquiry or Won value to find the ads worth more budget.',
    ],
    tips: [
      'MNI Assist only reads spend (Meta’s ads_read permission). It cannot create, change or pause ads.',
      'Spend updates every six hours. Facebook’s sign-in lasts about 60 days; you are warned a week before it runs out.',
    ],
  },
  'analytics/ads/callback': {
    summary: 'Finishing the Facebook sign-in for ad spend. Choose the ad accounts to connect.',
    benefits: [
      'The Facebook sign-in stays on the server; your browser never holds it.',
      'The last 90 days of spend are imported as soon as you connect.',
    ],
    steps: [
      'Tick the ad accounts your ads run from.',
      'Select Connect. Spend appears beside each ad in the report.',
    ],
  },
  'analytics/dashboards': {
    benefits: [
      'Your own view of just the numbers you care about.',
      'Share a dashboard with the whole team.',
      'No need to rebuild a report each week.',
    ],
    steps: [
      'Click New dashboard.',
      'Click + Add widget and choose metrics from the catalogue.',
      'Arrange the widgets, then turn on Shared if the team should see it.',
    ],
  },
  'settings/reports': {
    benefits: [
      'Key numbers arrive by themselves, daily, weekly or monthly.',
      'Managers stay informed without logging in.',
      'Choose from campaign, pipeline, agent and executive reports.',
    ],
    steps: [
      'Click New report and choose the report type.',
      'Pick how often it goes out (Daily, Weekly or Monthly) and who receives it.',
      'Click Send now to check it looks right.',
    ],
  },
  channels: {
    benefits: [
      'See every connected WhatsApp number and its health.',
      'The usage meter warns you before you hit today’s sending limit.',
      'Connect new numbers in a guided flow.',
    ],
    steps: [
      'Click Connect a number and follow the Meta sign-up steps.',
      'Watch the usage meter: amber past 60%, red past 80%.',
      'If it is high, spread sends over more of the day.',
    ],
  },
  'channels/numbers': {
    benefits: [
      'Manage the display name customers see.',
      'Protect the number with a two-step verification PIN.',
      'Keep details in step with Meta.',
    ],
    steps: [
      'Click Refresh from Meta to load current details.',
      'Change the display name and click Submit for review.',
      'Set the two-step PIN and store it safely. It is shown only once.',
    ],
  },
  'channels/lead-forms': {
    summary:
      'Facebook and Instagram lead ads, straight into enquiries. Connect the Facebook Page your lead ads run on, and every lead-form submission becomes a contact and an enquiry shared out by lead rotation.',
    benefits: [
      'No downloading CSVs from Facebook: leads arrive within a minute of someone submitting the form.',
      'Each enquiry says which form and ad it came from, so you can see which ads bring real enquiries.',
      'Leads missed while the connection was down are fetched automatically every 15 minutes.',
    ],
    steps: [
      'Connect a Facebook Page, sign in with someone who is an admin of the Page, and allow every permission asked for.',
      'Choose the Pages to connect. Instagram lead ads come through the Facebook Page linked to the Instagram account.',
      'Leave "Open an enquiry for each lead" on to put leads in the pipeline, or turn it off to only make contacts.',
    ],
    tips: [
      'Someone who submits your form agrees to be contacted about what they asked for. They are added for marketing only if they tick one of your form’s own disclaimer boxes.',
      'A lead marked Failed shows why. Fix the cause (for example, connect the Page again), then use Try again.',
    ],
  },
  'channels/lead-forms/callback': {
    summary: 'Finishing the Facebook sign-in for lead forms. Choose the Pages to connect.',
    benefits: [
      'The Page access stays on the server; your browser never holds it.',
      'Pages already connected are marked, so connecting again only refreshes them.',
    ],
    steps: [
      'Tick the Pages your lead ads run on.',
      'Select Connect. New leads from those Pages start arriving straight away.',
    ],
  },
  'channels/widget': {
    benefits: [
      'Start WhatsApp chats from your website, print and exhibitions.',
      'Each link and QR code is tracked separately, so you know what works.',
      'Pause a link without breaking it.',
    ],
    steps: [
      'Click New link and name where it will be used, for example an exhibition stand.',
      'Click Get link & QR to download the code or copy the link.',
      'Put it on your site, brochure or stand, and watch the clicks come in.',
    ],
  },
  'channels/migrate': {
    benefits: [
      'Keep your existing business number when moving to MNI Assist.',
      'Use automation, campaigns and team inboxes on that number.',
      'A guided process, confirmed with you before anything starts.',
    ],
    steps: [
      'Read Before you start. Chat history in the WhatsApp Business app does not carry over.',
      'Tick to confirm you understand, then enter the country code and number.',
      'Choose SMS or Voice call for the code, then enter the verification code.',
      'Enter the two-step PIN (6 digits) if the number has one.',
    ],
  },
  'channels/catalogue': {
    benefits: [
      'Show products inside WhatsApp so customers can browse and ask.',
      'Build it from the products you already quote.',
      'Edits update the product in place, without creating duplicates.',
    ],
    steps: [
      'Click Add from products, or Add product for a new item.',
      'Use Edit or Remove to keep it current.',
      'Click Sync to send your changes to Meta.',
    ],
  },
  'channels/voice-ivr': {
    benefits: [
      'Callers reach the right team through a phone menu.',
      'Changes apply to the next call. No redeploy needed.',
      'Build the menu here instead of in Exotel’s dashboard.',
    ],
    steps: [
      'Complete Connect to Exotel once.',
      'Click New prompt for each menu message, then Add branch for each key press.',
      'Click Set as entry point on the first prompt callers hear.',
      'Click Save, then call the number to test it.',
    ],
  },
  notifications: {
    benefits: [
      'One list of everything that needs your attention.',
      'Critical items, such as a stalled campaign or a rejected template, stand out.',
      'Clear items as you deal with them.',
    ],
    steps: [
      'Filter to Critical to see urgent items first.',
      'Open an item to go to the screen where you can fix it.',
      'Click Mark read, or Mark all read when you are done.',
    ],
  },
  billing: {
    benefits: [
      'A prepaid wallet means no surprise bills.',
      'See usage against your plan’s limits at any time.',
      'Limits are applied as you go, not on the invoice.',
    ],
    steps: [
      'Check the wallet balance and your plan’s usage.',
      'Click Top up wallet before large campaigns.',
      'See invoices under Invoices.',
    ],
  },
  'billing/invoices': {
    benefits: [
      'GST invoices in one place.',
      'Check Meta’s charges against what you were billed.',
      'Mismatches that nobody has confirmed are flagged separately.',
    ],
    steps: [
      'Click Generate invoice for the period you need.',
      'Use Check Meta’s invoice to compare the charges.',
      'Review any variance, then click Mark as checked.',
    ],
  },
  settings: {
    benefits: [
      'Single sign-on, so your team uses their company login.',
      'See and end active sessions to keep the workspace secure.',
      'Links to the other workspace settings screens.',
    ],
    steps: [
      'To set up single sign-on, enter the provider’s details and email domains.',
      'Choose the role new users get, then Save & enable (or Save without enabling to test first).',
      'Under sessions, use Sign out everywhere else if a device is lost.',
    ],
  },
  'settings/profile': {
    benefits: [
      'Keep your name and contact details current for your team.',
      'Change your password at any time.',
      'Nothing here is visible to other workspaces.',
    ],
    steps: [
      'Update your first name, last name, email and phone, then save.',
      'To change your password, enter the current one, then the new one twice.',
    ],
  },
  'settings/members': {
    benefits: [
      'Invite teammates in a few clicks.',
      'Deactivate leavers without losing their conversations.',
      'See who is active and who has not yet accepted.',
    ],
    steps: [
      'Click Invite someone and enter their email and role.',
      'Use Resend or Revoke for invites that have not been accepted.',
      'Click Deactivate when someone leaves. You will choose who inherits their open conversations.',
    ],
  },
  'settings/teams': {
    benefits: [
      'Agents who share a desk (a language, a product line) share its conversations.',
      'A WhatsApp call menu option rings one team.',
      'New chats are shared out in turn, to the least busy, or picked by hand.',
    ],
    steps: [
      'Click New team and give it a name, such as "Hindi desk".',
      'Tick the members, and optionally a lead and the WhatsApp numbers it handles.',
      'Choose it as the team an option rings under Calls → WhatsApp → Call menu.',
    ],
  },
  'settings/business-profile': {
    benefits: [
      'Quotations and invoices show who they are from: legal name, address and GSTIN.',
      'The GSTIN state decides CGST + SGST or IGST on each sale.',
      'Completing it ticks "Complete your business profile" on Get started.',
    ],
    steps: [
      'Enter the legal name exactly as on your GST registration.',
      'Type your GSTIN; the state and PAN fill themselves in.',
      'Add the registered address and click Save.',
    ],
  },
  'settings/branding': {
    benefits: [
      'MNI Assist looks like your own product to your team.',
      'Your logo and colours apply for everyone in the workspace.',
      'Return to the default look at any time.',
    ],
    steps: [
      'Click Upload logo.',
      'Pick two accent colours.',
      'Use Remove logo or Reset to default to undo.',
    ],
  },
  'settings/integrations': {
    benefits: [
      'Send MNI Assist events to your other systems automatically.',
      'Keep your CRM in step without retyping.',
      'A delivery log shows exactly what was sent and what failed.',
    ],
    steps: [
      'Click Add endpoint, enter the URL and choose which events to send.',
      'Click Send test to check the other system receives it.',
      'Set up CRM sync under Field mapping & currency.',
      'If an endpoint is disabled after repeated failures, fix it and click Re-enable.',
    ],
    tips: ['Use Rotate secret if a signing secret may have leaked.'],
  },
  'settings/ai-assistant': {
    benefits: [
      'Answer common questions instantly, day or night.',
      'Answers come from your own knowledge base.',
      'Hands over to a person whenever it is not sure.',
    ],
    steps: [
      'Click Add article for each topic customers ask about: products, service, delivery.',
      'Test it with Try a question until the answers are right.',
      'Choose the channels it should answer on, then switch it on.',
    ],
  },
  'settings/payments': {
    benefits: [
      'Collect payments from inside the conversation.',
      'Customers pay by UPI, card or net banking on BillDesk’s secure page.',
      'Money goes straight to your own BillDesk merchant account.',
    ],
    steps: [
      'Enter your BillDesk Merchant ID and Client ID, then turn on Let the team send payment requests.',
      'In the inbox, send a payment link from the customer’s conversation.',
      'A request shows as paid once BillDesk confirms the exact amount.',
    ],
  },
  'settings/shipping': {
    benefits: [
      'Customers hear on WhatsApp the moment their order is dispatched.',
      'Shiprocket gives courier rates by PIN code and tracks shipments by itself.',
      'Transporters you book directly work without any set-up.',
    ],
    steps: [
      'Choose whether to tell customers on dispatch, and the template to use outside the 24-hour window.',
      'Optionally enter your Shiprocket API user and pickup PIN code.',
      'Dispatch won orders from Re-orders or Sales; delivery status follows on its own.',
    ],
  },
  'settings/email-sending': {
    benefits: [
      'Marketing email goes out under your own sender name.',
      'Use MNI Assist’s relay, or your own mail server.',
      'Every email gets a one-click unsubscribe automatically.',
    ],
    steps: [
      'Set the sender name and address.',
      'Choose MNI Assist’s shared relay, or enter your own SMTP server.',
      'Use Pause, Resume or Disconnect when needed.',
    ],
  },
  'settings/support-access': {
    benefits: [
      'Let MNI Assist support see the problem without sharing your password.',
      'Access is temporary and every action is logged.',
      'You can end it at any moment.',
    ],
    steps: [
      'Click Grant access, choose how long it lasts and give a reason.',
      'Tell support the access is open.',
      'Click Revoke now as soon as the issue is solved.',
    ],
  },
  'settings/agency': {
    benefits: [
      'An agency can help manage your workspace without your passwords.',
      'Agencies switch between client workspaces easily.',
      'Access is read-only and can be revoked at any time.',
    ],
    steps: [
      'As a client: create an invite code and give it to your agency. Use Revoke to end access.',
      'As an agency: redeem the client’s code, then enter that client’s workspace.',
      'Click End session to return to your own workspace, or Leave to drop the client.',
    ],
  },
  compliance: {
    benefits: [
      'Handle data protection (DPDP) requests on time.',
      'Each request shows its 30-day deadline.',
      'Keep a record of retention settings and any breaches.',
    ],
    steps: [
      'Click Log a request and choose its type: Access, Correction, Erasure or Consent withdrawal.',
      'Work on it before the deadline, then click Fulfil, or Reject with a reason.',
      'Check retention settings and log any breach as soon as it is known.',
    ],
  },
  'compliance/dpdp': {
    benefits: [
      'See how ready you are for the DPDP Act, 2023.',
      'Most checks are filled in from what MNI Assist already records.',
      'Get a privacy notice draft, in English, Hindi and Marathi, to give your lawyer.',
    ],
    steps: [
      'Review each check and fix those not yet met.',
      'Fill in the business details: legal name, address, and grievance officer, email and phone.',
      'Describe what you use customer data for and who processes it for you.',
      'Have your lawyer review the notice, then publish it and add its link.',
    ],
    tips: ['This is a working checklist, not legal advice.'],
  },
  'admin/users': {
    benefits: [
      'Manage every login on this MNI Assist installation.',
      'Fix access problems for any workspace.',
    ],
    steps: [
      'Click New user, or Edit an existing one.',
      'Assign roles to control what they can do.',
      'To invite someone to a single workspace, use Members & invites instead.',
    ],
  },
  'admin/roles': {
    benefits: [
      'Give each person exactly the access their job needs.',
      'Changes apply immediately to everyone holding the role.',
    ],
    steps: [
      'Click New role, or Edit role on an existing one.',
      'Tick the permissions the role should have.',
      'Save, then assign the role to users.',
    ],
  },
  'settings/security-policy': {
    benefits: [
      'Stronger passwords and fewer guessed accounts across the workspace.',
      'Lock accounts after repeated wrong passwords, automatically.',
    ],
    steps: [
      'Set the minimum length and which kinds of characters a password needs.',
      'Choose how many wrong attempts lock an account, and for how long.',
      'Optionally ask for a new password every so many days.',
      'Turn on email confirmation once your team has confirmed their addresses.',
    ],
    tips: [
      'New rules apply to the next password set or sign-in; existing passwords keep working.',
      'An administrator can unlock someone early from Users → Security.',
    ],
  },
  'settings/email-templates': {
    benefits: [
      'Invitations, password resets and quotation emails in your own words.',
      'See exactly how each email will look before you save it.',
    ],
    steps: [
      'Pick an email on the left.',
      'Edit the subject and body. Click a variable to insert it where the cursor is.',
      'Watch the preview, which fills in sample values, then Save.',
      'Restore default puts the original wording back at any time.',
    ],
    tips: [
      'Keep | html.escape on names and anything else a person typed.',
      'The layout is the frame every email sits in; {{ content }} is where each email goes.',
    ],
  },
  'admin/audit-logs': {
    benefits: [
      'See who changed what, and when, across the workspace.',
      'Find the request behind an error a teammate reports.',
    ],
    steps: [
      'Pick a time window at the top.',
      'On Requests, filter by user, URL, method or status, or tick Errors only, then Apply.',
      'Click a row to see the call, its result, any error and what it changed.',
      'On Changes, open an entry and choose Full history to see every change to that record.',
    ],
    tips: [
      'Passwords, API keys and other credentials are masked.',
      'Field-level history is kept for users, roles and workspaces.',
    ],
  },
  'admin/tenants': {
    benefits: [
      'See and manage every customer workspace on this installation.',
      'Create a workspace for a customer who cannot sign up themselves.',
    ],
    steps: [
      'Click New workspace to create one. Most customers should sign up for their own.',
      'Use Rename or Delete to manage existing workspaces.',
    ],
  },
  platform: {
    benefits: [
      'Operational health across every workspace, in one place.',
      'Spot and resolve issues before customers notice.',
    ],
    steps: [
      'Review the metrics and alerts.',
      'Use Take it to own an issue, and Resolve when it is fixed.',
      'Export data when you need it elsewhere.',
    ],
  },
  'platform/phone-numbers': {
    summary:
      "Find and rent Exotel numbers for a workspace, on the workspace's own Exotel account. Renting charges that account Exotel's monthly rental.",
    benefits: [
      'Give a workspace another number without leaving the platform.',
      "The new number joins the workspace's phone line, ready for its menu or AI call flow.",
    ],
    steps: [
      'Choose the workspace and the type of number, optionally a circle (KA, MH…) and digits it should contain, and click Search.',
      'Click Rent… beside a number, read its monthly rental, type the number again, choose where its incoming calls go and click Rent this number.',
      "Choose the number's agent on the workspace's phone line page.",
    ],
    tips: [
      'Only platform administrators can rent numbers.',
      "The workspace's Exotel line must be set up first; its account needs enough balance for the rental.",
    ],
  },
  'platform/ai-providers': {
    summary:
      'Which AI model the platform uses for analysis, and which AI provider keys the server has. Keys live in secret storage and are never shown here.',
    benefits: [
      'Choose OpenAI or Anthropic for after-call analysis, AI drafting and agent review.',
      'See at a glance which provider keys are set before relying on them.',
    ],
    steps: [
      'Choose the analysis provider and click Save; In use now shows the model actually used.',
      'Check that every provider you rely on shows Set; store a missing key under the setting name shown.',
    ],
    tips: [
      'If the chosen provider has no key, the other one is used.',
      'Live AI calls use the realtime model chosen per agent in its voice agent window.',
    ],
  },
  'platform/payment-gateways': {
    summary:
      'The Razorpay and PayU accounts workspaces pay the platform through when they top up their wallet or pay an invoice. Key secrets and salts go to secret storage and are never shown again.',
    benefits: [
      'Change or rotate gateway keys without a server redeploy.',
      'Switch a gateway off at checkout without losing its keys.',
      'Check the keys work before a customer tries to pay.',
    ],
    steps: [
      'Enter the key id and key secret (Razorpay) or the merchant key and salt (PayU), then click Save.',
      'Click Test saved keys to ask the gateway whether it accepts them.',
      "For Razorpay, add the webhook URL shown on Razorpay's dashboard with the events payment.captured and order.paid and the same webhook secret.",
    ],
    tips: [
      'Leave a secret empty to keep the one already saved.',
      'A field left empty uses the server configuration (Payments settings), if it has a value.',
      'Use rzp_test_ keys or the PayU test environment to try checkout without real money.',
    ],
  },
  'platform/status': {
    summary:
      'What customers read at /status: open incidents, planned maintenance and the last 14 days. The database check is automatic; everything else is what you post here.',
    benefits: [
      'Customers see a problem is known before they raise a ticket about it.',
      'Planned maintenance is announced in advance, in IST.',
    ],
    steps: [
      'New incident: say what is affected and what to do meanwhile, choose the impact and the parts affected, Post.',
      'Update it at least every hour while it is open (Update → Post update).',
      'Resolve it with what happened and whether customers need to do anything.',
    ],
    tips: [
      'Write for the customer: "WhatsApp messages are delayed by up to 10 minutes", not "Service Bus backlog".',
      'Delete only something posted by mistake; a real incident is resolved, so it stays in the history.',
    ],
  },
  'platform/feature-flags': {
    benefits: [
      'Try a feature with a few workspaces before everyone.',
      'Switch a feature off quickly if something goes wrong.',
    ],
    steps: [
      'Click New rule and choose the feature and the workspaces it applies to.',
      'Watch how it behaves, then widen the rollout.',
      'Use Edit or Delete to change or remove a rule.',
    ],
  },
  field: {
    summary:
      'The field engineer app for tracking today’s jobs, recording site visit checklists, photos, customer sign-off codes and offline sync.',
    benefits: [
      'Works completely offline when you have no signal at a customer plant.',
      'Checklists and photo uploads keep service visit evidence organized.',
      'One-tap WhatsApp sign-off code sent directly to the customer.',
      'Automatic sync uploads visits as soon as your device reconnects.',
    ],
    steps: [
      'View your assigned jobs for today on the home screen.',
      'Tap Start visit when arriving on site to record arrival time.',
      'Fill in findings, checklist items, and take or attach site photos.',
      'Tap Request sign-off to send a WhatsApp confirmation code to the customer.',
      'Enter the customer’s code and tap Complete visit.',
      'When back online, tap Sync to push your offline updates to the office.',
    ],
    tips: [
      'Install this page to your phone’s home screen via browser menu for quick offline access.',
      'Site photos are automatically compressed before uploading to save mobile data.',
    ],
  },
  'contacts/360': CUSTOMER_360,
  'contacts/:id/360': CUSTOMER_360,
  'contacts/accounts/:accountId/360': CUSTOMER_360,
  'pipeline/ai-negotiator': {
    benefits: [
      'Answers price questions and counter-offers instantly, within limits you set.',
      'Never goes below your floor price or above your discount ceiling.',
      'You can step in on any conversation and take over.',
    ],
    steps: [
      'Set the discount limits and floor margin, then click Save Guardrails.',
      'Use Run AI Simulation to see how the agent would answer a counter-offer.',
      'Review the live negotiation sessions and step in where needed.',
      'When a deal is agreed, click Confirm & Apply to update the quotation.',
    ],
  },
  'pipeline/projection-plan': {
    benefits: [
      'One plan for the year, with targets set by period and product.',
      'Compares the plan with your actual pipeline and sales as they come in.',
      'Scenarios show the effect of a change before you commit to it.',
    ],
    steps: [
      'Create a plan for the fiscal year, or generate one from your pipeline and past sales.',
      'Adjust the targets by period, then activate the plan.',
      'Sync actuals to see how you are tracking, and run scenarios to test changes.',
    ],
  },
  'sales/orders': {
    benefits: [
      'Captures the customer PO, delivery terms and line items in one place.',
      'Delivery challans and tax invoices are created straight from the order.',
    ],
    steps: [
      'Click + New Sales order, choose the customer and add line items.',
      'Click Confirm Sales Order once the customer PO is in hand.',
      'Use Create Delivery Challan to ship, or Generate Sales Invoice to bill.',
    ],
  },
  'sales/challans': {
    benefits: [
      'Goods can move legally with the vehicle, LR/AWB and e-Way Bill details recorded.',
      'Turns into a tax invoice once the goods are delivered.',
    ],
    steps: [
      'Create a challan from a confirmed sales order.',
      'Click Dispatch and enter the vehicle and transport details.',
      'Click Mark as Delivered when the goods arrive, then bill it with Bill Delivery (Tax Invoice).',
    ],
  },
  'sales/invoices': {
    benefits: [
      'Works out CGST + SGST or IGST for you from the place of supply.',
      'Shows what each customer still owes.',
    ],
    steps: [
      'Create an invoice from a sales order or a delivery challan.',
      'Check the lines and taxes, then click Issue.',
      'Click Record Payment when the money arrives.',
    ],
  },
  'purchasing/grn': {
    benefits: [
      'Records exactly what arrived at the gate against the purchase order.',
      'Quality inspection decides what goes into stock and what is sent back.',
    ],
    steps: [
      'Click + Inward Gate Entry (GRN) and enter the items received.',
      'Click Save & Move to QC Inspection.',
      'Record accepted and rejected quantities, then Confirm & Approve Put-Away.',
    ],
    tips: ['Rejected quantities can become a vendor debit note.'],
  },
  'purchasing/bills': {
    benefits: [
      'Matches the bill with the purchase order and the GRN before you pay it.',
      'Flags differences in quantity or price before money goes out.',
    ],
    steps: [
      'Click + Record Vendor Bill and enter the vendor’s invoice details.',
      'Click Save & Perform 3-Way Match and review any differences.',
      'Approve the bill, then record the payment when it is made.',
    ],
  },
  'purchasing/debit-notes': {
    benefits: [
      'Claims back the value of rejected or short-supplied goods.',
      'Keeps the vendor’s balance correct for GST input credit.',
    ],
    steps: [
      'Click + Issue Debit Note, or start from a GRN with rejected items.',
      'Add the items and amounts, then click Issue Debit Note.',
      'Mark it settled once the vendor has adjusted or refunded it.',
    ],
  },
  'purchasing/vendor-360': VENDOR_360,
  'purchasing/vendor-360/:id': VENDOR_360,
  'manufacturing/bom': {
    benefits: [
      'Lists every component and quantity that goes into a product.',
      'Works out the material cost of the product for you.',
    ],
    steps: [
      'Click + Create New BOM and choose the finished product.',
      'Use + Add Component for each part and its quantity.',
      'Click Save & Compute Costing, then activate the BOM.',
    ],
  },
  'manufacturing/work-orders': {
    benefits: [
      'Tracks a production job from material issue to finished stock.',
      'Stock is updated automatically when the order is completed.',
    ],
    steps: [
      'Click + Create Work Order and choose the BOM and quantity.',
      'Release it, then use Issue to Shop Floor to issue the materials.',
      'Confirm each routing step as it is done.',
      'Click Complete Order & Update Inventory when the goods are ready.',
    ],
  },
  'field-service/amc': {
    benefits: [
      'Keeps every maintenance contract, its visits and its renewal date in one place.',
      'Shows which visits are due so none are missed.',
    ],
    steps: [
      'Click + Create AMC Contract and enter the customer, period and visits.',
      'After each visit, click Confirm & Close Visit.',
      'Use Renew Contract before it expires.',
    ],
  },
  'field-service/tickets': {
    benefits: [
      'Every breakdown call is logged, assigned and tracked to closure.',
      'Spare parts used are recorded against the ticket.',
    ],
    steps: [
      'Click + Raise Service Ticket and describe the problem.',
      'Use Dispatch Engineer to assign someone.',
      'Record any spares with Add Replaced Part, then Resolve & Close Ticket.',
    ],
  },
  'field-service/remote-maintenance': {
    benefits: [
      'Customers can often fix a problem over WhatsApp or a call, without a site visit.',
      'The AI suggests diagnostic steps based on the machine and the symptoms.',
      'Becomes a field ticket automatically when an engineer is needed.',
    ],
    steps: [
      'Start a session for the customer’s machine on WhatsApp or IVR.',
      'Work through the suggested steps with the customer.',
      'Resolve it remotely, or escalate it to a field ticket.',
    ],
  },
  'finance/chart-of-accounts': {
    benefits: [
      'The ledger accounts that every voucher and statement is built on.',
      'Starts from a standard Indian chart of accounts that you can extend.',
    ],
    steps: [
      'Load the standard chart of accounts if this workspace has none yet.',
      'Click Add Account for any ledger you need.',
      'Edit or deactivate accounts you no longer use.',
    ],
  },
  'finance/journal-entries': {
    benefits: [
      'Records adjustments, transfers and other entries that are not invoices or bills.',
      'Will not post unless debits equal credits.',
    ],
    steps: [
      'Click + New Journal Voucher and choose the voucher type.',
      'Use + Add Ledger Line for each debit and credit.',
      'Click Create & Record Voucher, then post it.',
    ],
  },
  'finance/statements': {
    benefits: [
      'Trial balance, profit and loss, and balance sheet from your posted entries.',
      'Pick any period to compare.',
    ],
    steps: [
      'Choose the statement and the date range.',
      'Review the figures, then use Print Statement to keep a copy.',
    ],
  },
  'finance/gst-compliance': {
    benefits: [
      'GSTR-1 and GSTR-3B summaries prepared from your invoices.',
      'Generates e-invoices and e-Way Bills from the same records.',
    ],
    steps: [
      'Choose the return period to see the summaries.',
      'Generate the e-invoice for each eligible invoice.',
      'Use Generate & Sign E-Way Bill for goods that need one.',
    ],
  },
  resellers: {
    benefits: [
      'Agencies and distributors sell AutoReach under their own brand and domain.',
      'Commission is worked out from each client invoice and paid out on request.',
      'The platform team approves every partner, tier and payout.',
    ],
    steps: [
      'Register as a partner; the platform team approves you.',
      'Set your branding, then set up a custom domain and add the two DNS records shown.',
      'Add your client workspaces with their plan and wholesale rate.',
      'Request a payout from Payouts when commission has built up.',
    ],
    tips: ['The platform team sees every partner here and approves tiers, domains and payouts.'],
  },
  'channels/telecom': {
    benefits: [
      'Manages the phone numbers you hold and resell, with their KYC status.',
      'The compliance audit checks that every number meets the rules.',
    ],
    steps: [
      'Set up your telecom entity details first.',
      'Add numbers to the pool, then allocate them to workspaces.',
      'Keep each number’s KYC up to date, and run the compliance audit regularly.',
    ],
  },
};

/** The topic for a route path as `app.routes.ts` declares it, or null. */
export function helpTopicFor(routePath: string | null | undefined): HelpTopic | null {
  if (!routePath) return null;
  return HELP_TOPICS[routePath] ?? null;
}
