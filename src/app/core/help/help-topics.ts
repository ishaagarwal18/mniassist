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
    'A contact (one person) shows their conversations and timeline, enquiries and quotations. Orders, challans, invoices, payments, credit, machines and service are on their account: use Open account 360, or link the contact to an account first.',
    'Message customer sends from your workspace (WhatsApp, email or SMS) and is logged; Open in inbox shows the WhatsApp conversation.',
    'On an account, use + New Order, Create delivery challan, Create invoice or Record payment; Send on any order, challan or invoice messages it to its buyer.',
  ],
};

const VENDOR_360: HelpTopic = {
  benefits: [
    'Purchase orders, receipts, bills and debit notes for one vendor, on one screen.',
    'Shows overdue bills and how reliably the vendor delivers.',
  ],
  steps: [
    'Type part of a vendor’s name, GSTIN, phone or contact person in the search box at the top, then pick them from the list (arrow keys and Enter work too).',
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
      'It leaves the menu by itself once every step is done.',
    ],
    steps: [
      'The rail at the top shows every step; ticked ones are done. It opens on the next one to do.',
      'Start with your business profile. Go and do it opens each step right here, under its card, so you never leave this page; verify your email and number here too.',
      'Click I’ve done this for steps you finished outside MNI Assist; it moves on to the next one.',
      'Use Back, Skip for now or the rail to move between steps.',
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
      'Click New quotation, pick the enquiry (or the customer, for a manual quotation), add the line items, then Save and issue.',
      'Click Edit to change the lines or issue it again, then send the PDF or request a Signature.',
      'Follow up on quotes due today.',
      'Mark each one Won or Lost. Lost needs a reason.',
    ],
  },
  'quotations/new': {
    benefits: [
      'Quote against an open enquiry, or by hand for any customer with a manual quotation.',
      'Parts are priced from the price list that fits the customer; anything can also be typed in.',
      'Save a draft, or save and issue it in one step, on WhatsApp and/or by email with the PDF attached.',
    ],
    steps: [
      'Choose Against an enquiry and pick it, or Manual quotation and pick a contact, or an account and who there it is addressed to.',
      'Search the catalogue to add parts, or click Add a line by hand.',
      'Check quantities, prices, discounts and GST, then the totals.',
      'To issue: set Valid for, tick WhatsApp and/or Email, tick who at the account gets it (add other addresses if needed), then click Save and issue.',
    ],
    tips: [
      'A manual quotation opens an enquiry for the customer, so follow-ups and won/lost still work.',
    ],
  },
  'quotations/import': {
    benefits: [
      'Turn a customer’s BOQ, RFQ or parts list into a draft quotation without typing every line.',
      'AI reads Excel, CSV, PDF and photos, and each line is matched to your catalogue and priced for the customer.',
      'Nothing goes to the customer: you check every line before the draft is made.',
    ],
    steps: [
      'Pick the customer.',
      'Drop in the customer’s files (up to 12).',
      'Click Read files. You move to the review page while the files are read.',
    ],
    tips: [
      'Excel or CSV sheets read most accurately. A clear PDF works well; a photo is read too, but check it closely.',
      'Started from an enquiry, the quotation goes on that enquiry; otherwise one is opened for the customer.',
    ],
  },
  'quotations/import/:id': {
    benefits: [
      'Every line of the customer’s file beside the item it matched, with the price for this customer.',
      'Exact part-number matches are accepted already, so you only check the rest.',
    ],
    steps: [
      'For a spreadsheet with a new layout, say which column is the part number, description and quantity, then click Read the lines. The same layout is remembered next time.',
      'Wait while the files are read; the page updates by itself.',
      'Under Needs checking, Accept a suggestion, Change it to another item, Price it by hand, or Skip it.',
      'Correct any quantity in the Qty column.',
      'When nothing is left to decide, click Create draft quotation and finish it in the quote editor.',
    ],
    tips: [
      'Accept every suggestion accepts all suggested items at once; check the list first.',
      'Hover a match chip to see why it matched. By rating means a product of the same kind meets every rating the line states; always check it.',
      'Export exceptions gives an Excel file of the lines not found, to ask the OEM.',
    ],
  },
  'quotations/imports': {
    benefits: [
      'Every file import in one place, with the ones still waiting for review.',
      'See which imports became quotations, and which customer each was for.',
    ],
    steps: [
      'Open an import to carry on reviewing it, or open the quotation made from it.',
      'Click Quote from a file to read a new customer file.',
    ],
  },
  obsolescence: {
    benefits: [
      'See every customer machine holding a part its maker is phasing out, by account and site, before it breaks down.',
      'The riskiest come first: the stage, the machine’s age and criticality, your stock of the old part and your AMC all count.',
    ],
    steps: [
      'Record the components inside machines (each machine’s page) and the makers’ notices (Lifecycle rules).',
      'Filter by make, series, stage, risk, city or owner; tick rows to assign them to a colleague.',
      'Dismiss rows that need no work, with a reason; they come back only if the stage gets worse.',
    ],
    tips: [
      'Announced shows phase-outs dated ahead: they count from their date.',
      'The radar is re-scored on every save and each night at 2 am, so passing dates take effect on their own.',
    ],
  },
  projects: {
    benefits: [
      'Work a deal where it is really decided: with the consultant writing the spec, months before an enquiry arrives.',
      'Every company with a say in it in one place: end-user, consultant, EPC contractor, panel builders, OEM.',
    ],
    steps: [
      'Create the project with its end-user, site, value and key dates.',
      'Add the consultant, the EPC contractor and the panel builders under Parties, and the people at each.',
      'Drag the card along the board as the project moves; Awarded asks who won, Closed asks how it ended.',
    ],
    tips: [
      'A card that says "Who is writing the spec?" is past Identified with no consultant or EPC contractor recorded.',
      'Mark a decision maker who is against us as a Blocker: the project shows them in red.',
    ],
  },
  'billing/due': {
    benefits: [
      'Every billing milestone ready to invoice, across all project orders, in one list.',
      'A milestone left ready for two days shows amber, so no stage bill is forgotten.',
    ],
    steps: [
      'Set a billing plan on the sales order: its milestones become ready as the order is confirmed, dispatched or reaches a date.',
      'Click Prepare invoice: a draft opens with the milestone’s share of each line and the retention; check it and issue it.',
    ],
    tips: ['Retention comes off what is payable now, not the taxable value or the GST.'],
  },
  'billing/tests/:id': {
    benefits: [
      'The FAT, SAT or commissioning checklist, its results and punch list, in one record the customer signs.',
      'Signing makes the milestone billed on the test ready to invoice, with the certificate kept on the order.',
    ],
    steps: [
      'Record each check as Pass, Fail or N/A; a failed check becomes a punch item with a due date.',
      'Send the link to the customer’s representative: they sign on their phone, and the certificate PDF is made.',
    ],
    tips: [
      'A test with open punch items can be signed only if every one is non-critical.',
      'A signed test isn’t changed: re-issue it to correct it, and both versions are kept.',
    ],
  },
  'billing/reports': {
    benefits: [
      'Every project order’s billing at a glance: billed, received, unbilled and retention held.',
      'Retention coming due and bank guarantees ending soon, so neither is missed.',
    ],
    steps: [
      'Pick how far ahead to look: 30 to 180 days.',
      'Open an order from its row to bill a ready milestone or chase retention.',
    ],
  },
  'billing/retention': {
    benefits: [
      'Every rupee customers hold back as retention, with the date it is due back.',
      'Due retention is flagged, and after 30 days unreleased it goes to collections.',
    ],
    steps: [
      'When retention falls due, send the release request: download the letter, or email it with the invoice.',
      'When the customer pays, record the release: it is paid on the invoices, oldest first.',
    ],
    tips: [
      'Set when retention is due back on the order’s billing plan: a date, or months after a milestone.',
    ],
  },
  'oem/registrations': {
    benefits: [
      'Every deal registered with an OEM in one list, with its OEM reference and end date.',
      'You are reminded 30 and 7 days before a registration ends while the deal is still open.',
    ],
    steps: [
      'Click Register a deal, or Register deal on an enquiry.',
      'Record the OEM’s registration number when it approves, and Won or Lost when the deal ends.',
    ],
    tips: ['Request special prices from a registration: they carry its OEM and customer.'],
  },
  'oem/registrations/new': {
    benefits: [
      'The registration is kept with the enquiry, the customer and the products.',
      'From an enquiry, the customer, project and value are filled in.',
    ],
    steps: [
      'Choose the OEM and the customer, and describe the products.',
      'Save, send it to the OEM, and record its registration number when it approves.',
    ],
  },
  'oem/registrations/:id': {
    benefits: [
      'See whether the OEM approved the deal, and when the registration ends.',
      'Special prices made under it are counted here.',
    ],
    steps: [
      'Type the OEM’s registration number and click OEM approved, or OEM rejected.',
      'Mark Deal won or Deal lost when it ends.',
    ],
  },
  'oem/spa': {
    benefits: [
      'Every special price from your OEMs, with the support approved and the quantity left.',
      'Agreements ending in the next 30 days stand out, so none expires unused.',
    ],
    steps: [
      'Click Request special price, or Special price on an enquiry.',
      'Open one to download the request, record the OEM’s decision, extend or cancel it.',
    ],
    tips: ['Search by part number to find every agreement that covers a part.'],
  },
  'oem/spa/new': {
    benefits: [
      'From an enquiry, the parts on its latest quotation are filled in with your buy prices.',
      'The request goes to the OEM as an Excel or PDF made from these lines.',
    ],
    steps: [
      'Choose the OEM, how it pays (claim back or billed at the special price) and the customer.',
      'Check the parts, quantities and normal buy prices, and save the request.',
    ],
  },
  'oem/spa/:id': {
    benefits: [
      'The OEM’s decision is kept per part: approved quantity, special price and resale rule.',
      'Support per unit is worked out for you, ready for the claim after invoicing.',
    ],
    steps: [
      'Download the request and email it to the OEM.',
      'When it answers, paste its rows or type them, give its reference and the end date, and record the decision.',
    ],
    tips: [
      'A quantity of 0 refuses a part; approving less than asked makes it partly approved.',
      'Extend an agreement when the OEM extends it; an expired one comes back.',
    ],
  },
  'oem/claims': {
    benefits: [
      'Every claim to an OEM with what was claimed, settled and is still outstanding.',
      'Claims are aged by band, and lines not submitted after 7 days stand out in red.',
    ],
    steps: [
      'Issue invoices with claim-back special prices: their lines go on the OEM’s draft claim the same day.',
      'Open a claim to export it, submit it and record the OEM’s credit notes.',
    ],
    tips: ['Filter by age band to chase the claims over 90 days first.'],
  },
  'oem/claims/:id': {
    benefits: [
      'One row per invoice line, with the customer, part, quantity and support, ready for the OEM.',
      'A part payment leaves the rest outstanding and aged.',
    ],
    steps: [
      'Export it for the OEM (Excel and the invoice PDFs), send it, and mark it submitted.',
      'When the OEM pays, record its credit note; mark refused lines rejected, or write off what it won’t pay.',
    ],
    tips: ['Leave the line amounts blank to spread a credit note over the oldest invoices first.'],
  },
  'oem/reports': {
    benefits: [
      'Claim ageing by OEM, so the oldest money is chased first.',
      'Margin recovered: what was claimed and what the OEM actually paid.',
      'Special prices ending in 30 days with units still left, and usage against every approval.',
    ],
    steps: [
      'Pick the period for margin recovered; the ageing and expiry are as of today.',
      'Open a special price or a claim from its row to act on it.',
    ],
  },
  'oem/settings': {
    benefits: [
      'Only suppliers marked as OEMs are offered for deal registrations and special prices.',
      'Each OEM’s claim period and deadline are kept for the claims.',
    ],
    steps: [
      'Tick OEM against the brands you get special prices from.',
      'Choose monthly or quarterly claims, and how many days after the invoice the OEM accepts them.',
    ],
  },
  'projects/tender-feed': {
    benefits: [
      'Tender alerts you already receive become suggested projects, read and matched for you.',
      'The same tender from two alert services shows once.',
      'Nothing becomes a project until someone chooses Create project.',
    ],
    steps: [
      'Switch the feed on and list the words to look for, such as VFD, PLC or MCC panel.',
      'List the addresses your alerts come from, or make an inbound address and forward alerts to it.',
      'Choose Create project or Not relevant on each suggestion on the projects board.',
    ],
    tips: [
      'Not relevant lowers the words it matched; Create project raises them.',
      'You can paste an alert here to try the feed before connecting anything.',
    ],
  },
  'projects/report': {
    benefits: [
      'See the open projects by stage, and what our scope in each stage is worth.',
      'Compare the win rate when the specification names our brand with the rate when it doesn’t.',
      'Find the brands and the product categories you lose to most.',
    ],
    steps: [
      'Pick the period: projects closed in it are counted for wins and losses.',
      'Read the funnel for today, then the win rates and the losses below it.',
    ],
    tips: [
      'A project counts as specified-in when at least half its specification, by value, names our brand.',
      'Losses by brand include lost enquiries where a competitor was given as the winner.',
    ],
  },
  'projects/competitors': {
    benefits: [
      'One list of the brands you compete with, used in specifications, lost enquiries and reports.',
      'Our brands and the specification categories are set once for every project.',
    ],
    steps: [
      'Click Add common brands, then remove or rename any you don’t meet.',
      'List the makes we sell under Our brands, and the product categories a specification is read by.',
    ],
    tips: ['Our own brands are left out when common brands are added.'],
  },
  'projects/new': {
    benefits: [
      'A project record takes a few minutes and saves retyping on every enquiry it produces.',
      'The end-user, site, value and key dates are kept once, for everyone on the team.',
    ],
    steps: [
      'Name the project and find the end-user’s account.',
      'Add the site, sector, our scope and the key dates, then save and add the parties.',
    ],
    tips: ['Type values as 45,00,000 or 4.5 Cr.'],
  },
  'projects/:id': {
    benefits: [
      'See who decides, who supports us and who blocks us, on one page.',
      'Everything that happened to the project, newest first.',
    ],
    steps: [
      'Overview: the stage, dates, value and next step.',
      'Parties: tick each company’s roles, then add its people with their influence and attitude.',
      'Timeline: every stage move and change, and your notes.',
    ],
    tips: ['A person is added through their company: link the contact to the account first.'],
  },
  'projects/:id/edit': {
    benefits: [
      'Keep the dates and next step current so the board stays right.',
      'Hand a project to another owner, or add people to its team.',
    ],
    steps: [
      'Change the details and save.',
      'Changing the end-user moves the End-user role to the new account.',
    ],
    tips: ['The owner and team see the project; managers with "see all projects" see every one.'],
  },
  'documents/fault-codes': {
    benefits: [
      'A customer with an alarm on the screen gets your approved answer, not a guess: causes, safe first checks, and when to call.',
      'What your engineers learn on site stays with the company: repeated fixes become library entries.',
    ],
    steps: [
      'Import a fault table (download the template), read the fault chapter of an OEM manual from the Library, or add codes by hand.',
      'Check each draft against its source page, add a safety note to codes that stop the machine, and approve it.',
      'Review what closed tickets have learned under Learned from tickets.',
    ],
    tips: [
      'Only checks marked Operator are ever sent to a customer; electrician and engineer checks stay with your team.',
      'Changing an approved entry makes a new version, so any advice given can be traced to what it said then.',
    ],
  },
  'helpdesk/escalation': {
    benefits: [
      'A breakdown nobody acts on reaches the right people by itself: the coordinator, then the manager, then the admins.',
      'Every step is written on the ticket, so a breach report shows who was told and when.',
    ],
    steps: [
      'Pick the coordinator and manager for each policy (blank sends to the whole helpdesk).',
      'Set the hours the clock runs: round the clock for AMC customers, office hours for the rest.',
      'Adjust the steps: after how long, if what is still true, do what.',
    ],
    tips: [
      'The clock starts when the customer reports the breakdown and stops while the ticket waits for the customer.',
      'Assign by rotation uses the lead rotation of your default pipeline, counting open tickets as each person’s load.',
    ],
  },
  'obsolescence/settings': {
    benefits: [
      'Tune how risk is scored to how your customers work: the stage, the machine’s age and criticality, stock and AMC.',
      'Customers hear about a phase-out on WhatsApp, with Send me a quote and Call me buttons, before a breakdown.',
    ],
    steps: [
      'Change the points or the band limits and save: the whole radar is re-scored.',
      'Choose the approved WhatsApp template for the notice (body values: name, parts, machines, site, last-buy date).',
      'Set the follow-up, and switch automatic sending on only if notices should go without anyone pressing Send.',
    ],
    tips: [
      'A contact gets at most one notice in 30 days, and none after opting out.',
      'Send me a quote opens the migration enquiry with a draft quotation; Call me gives the owner a call task.',
    ],
  },
  'documents/lifecycle': {
    benefits: [
      'One notice from a maker (S7-300 phased out) flags every installed component in that series at once.',
      'The preview shows how many components and sites a maker’s list touches before anything is saved.',
    ],
    steps: [
      'Download the CSV template and fill it from the maker’s phase-out list, or add a rule by hand.',
      'Import it, check the preview, then save.',
      'Give each rule its replacement: a part from your catalogue, or a successor series.',
    ],
    tips: [
      'A rule on a part number beats the rule on its series: mark a part Active to keep it off the radar.',
      'Rules marked "No current replacement" point at a part that is itself phased out, or loop: fix them here.',
    ],
  },
  'installed-base/:id': {
    benefits: [
      'See what is inside a machine: PLC, I/O cards, drives, HMI, with their make, series and firmware.',
      'When a maker phases a part out, every machine that holds it can be found, and its customer told before a breakdown.',
    ],
    steps: [
      'Set how critical the machine is to the customer.',
      'Add components by hand, read a nameplate photo, import a CSV (download the template), or copy a bill of materials.',
      'After a site visit, click Mark list checked.',
      'Under QR sticker, click Print sticker and fix it on the machine panel. A scan opens a page where the operator reports a breakdown with this machine already filled in.',
    ],
    tips: [
      'A part from your catalogue takes its name, make and series from it; leave those fields blank.',
      'A list not checked for a year is marked as possibly out of date.',
    ],
  },
  'quotations/cross-references': {
    benefits: [
      'Another make’s part number in a tender finds your item, priced, without a search.',
      'Corrections made on the review page are learned, so the same line is matched next time.',
    ],
    steps: [
      'Download the CSV template, fill in other makes’ numbers beside yours, and click Import CSV; or add one at a time above the list.',
      'Under Awaiting approval, check what engineers’ corrections taught and Approve the right ones.',
    ],
    tips: [
      'Until approved, a learned cross-reference is offered as a suggestion, not accepted.',
      'Mark a near match Functional or Upgrade: those lines are always left for a person to check.',
    ],
  },
  'quotations/:id/edit': {
    benefits: [
      'Every issue is kept as a revision with its PDF; compare any two and copy the changes for the customer.',
      'Change the lines of a draft or an issued quotation.',
      'Issuing again sends the customer a new revision and restarts the follow-ups.',
    ],
    steps: [
      'Change the parts, quantities, prices or GST.',
      'Use Check prices to bring list-priced lines up to today.',
      'Click Save changes, or Save and issue to send the new revision.',
    ],
    tips: ['Won, lost and expired quotations open read-only, as a record of what was offered.'],
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
  'reorders/send': {
    benefits: [
      'Gives one customer their personal re-order page on WhatsApp.',
      'The link also shows here, to copy into an email or another chat.',
    ],
    steps: [
      'Choose the customer, then Continue: the link goes on WhatsApp.',
      'Copy the link if it could not be sent, then Done to return to Re-orders.',
    ],
  },
  'reorders/settings': {
    benefits: [
      'Decide what a customer request becomes: a draft quotation, or an order paid by link.',
      'Set the page heading, link lifetime, minimum order, stock display and sign-in.',
    ],
    steps: [
      'Switch the portal on and choose what happens when a customer sends a request.',
      'Set the heading, link days, minimum order and the WhatsApp templates, then Save.',
    ],
  },
  'reorders/dispatch/:quotationId': {
    benefits: [
      'Records how a won re-order was sent, with the docket to track it.',
      'The customer can be told on WhatsApp, with the tracking link.',
    ],
    steps: [
      'Enter the transporter and docket, LR or AWB number, or get Shiprocket rates and pick a courier.',
      'Add the tracking link, expected date, packages and freight if known, then Dispatch.',
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
      'In Suppliers, search by any words of the name, GSTIN, phone, email or contact person; filter by status or Only suppliers we owe money; sort by name, most owed or newest; and page through 50 at a time.',
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
  'collections/settings': {
    benefits: [
      'Choose the approved WhatsApp template your reminders use.',
      'Set the credit days used when the ERP gives no due date, and add a pay link.',
    ],
    steps: [
      'Pick the approved template and check the credit days.',
      'Tick Send reminders automatically (and the pay link if wanted), then Save.',
      'The pay link can be ticked once a payment gateway is connected in Settings › Payments.',
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
      'Click New task, add what needs doing and a due date, and link it to contacts, accounts, leads, quotations, sales documents, campaigns or tickets.',
      'Choose how the reminder reaches the assignee: the bell, plus email, WhatsApp or SMS.',
      'Use Share to send a task to colleagues on WhatsApp.',
      'Switch between Mine and Everyone. Tick a task when it is done.',
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
      'Link it to the contacts, leads, quotations and other records it is about, and choose email, WhatsApp or SMS reminders (for the customer too, if you like).',
      'Open a meeting to Accept, Decline, Edit, Share with colleagues or Add to calendar.',
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
  'settings/pick-lists': {
    benefits: [
      'The drop-down lists on your forms (units, reasons, GST rates, payment terms, project sectors) are your own.',
      'Fixed options such as ticket statuses and lead sources can be called what your team calls them.',
      'Records that already use an option keep it when you hide or remove it.',
    ],
    steps: [
      'Pick a list on the left.',
      'Rename, reorder, add or hide options; for statuses and other fixed options, change the names only.',
      'Click Save. Reset to defaults brings back the standard list.',
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
  'settings/tasks-meetings': {
    benefits: [
      'Task and meeting reminders, and shared tasks and meetings, reach people on WhatsApp and SMS as well as email.',
      'One place to see whether the WhatsApp templates are approved.',
    ],
    steps: [
      'Add task_reminder and meeting_reminder from Templates › Industrial library and submit them to Meta.',
      'Put each colleague’s mobile number on their user profile.',
      'For SMS, register a reminder template with DLT and MSG91, then choose it here and click Save.',
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
      'Customers have a legal right to see, correct or delete their data, or to stop your messages. This is where you answer them, within 30 days.',
      'Keeps the proof of when each request came in and how it was handled, in case a customer complains or a regulator asks.',
      'Old chats, recordings and exports are cleared on a schedule, so there is less data that could leak.',
      'Messaging only people who agreed protects your WhatsApp number’s quality rating.',
    ],
    steps: [
      'When a customer asks about their data by email, phone or in person, click Log a request straight away. The 30-day clock starts then. Opt-outs sent on WhatsApp are logged for you.',
      'Fulfil or Reject each request before its deadline. If it shows No match, check the phone or email for a typo; if you hold no data on them, reject it as no data held.',
      'Under Retention policies, set how many days each kind of data is kept and switch Enforced on. Consent records are never deleted, because they are your proof.',
      'If personal data gets out, click Log an incident at once. Then mark it Contained, record when the Board and the people affected were told, and Close it with what was done.',
    ],
    tips: [
      'Check Open requests every week. Amber means one is due within 7 days, red means one is past its deadline.',
      'Before a big campaign or a contact import, look at Suppressed and Consent records.',
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
  'contacts/accounts/credit': {
    benefits: [
      'Set who at a customer company may order on the re-order portal, and who approves.',
      'Keep its credit limit, payment terms and any hold in one place.',
    ],
    steps: [
      'Choose the customer company.',
      'Add buyers and approvers, and set the credit limit, terms or a hold.',
      'Choose Done to go back to where you came from.',
    ],
  },
  'contacts/accounts/:accountId/rollup': {
    benefits: [
      "See an account's contacts, open and won enquiries and pipeline value together.",
      'Include every company and plant beneath it with one tick.',
    ],
    steps: [
      'Open Rollup on an account in Accounts.',
      'Tick Include subsidiaries to add the accounts beneath it.',
      'Open a key contact, the account 360 or its ERP ledger for the detail.',
    ],
  },
  'sales/orders/new': {
    benefits: [
      'Raise a sales order for an account and its contact person, with their PO, terms and items.',
      'Addresses come from the account and items from your catalogue, so nothing is retyped.',
    ],
    steps: [
      'Choose the account, then the contact person who placed the order (or switch to Contact for a person with no account).',
      'The billing and site addresses fill in from the account; pick another shipping address if the goods go elsewhere.',
      'Type an item name and pick it from the catalogue: the item number, description and price fill in. Then Create Sales Order.',
    ],
  },
  'sales/challans/new': {
    benefits: [
      'Record goods sent to a customer, with the vehicle and ship-to address.',
      'From an account, the customer is filled in and you return to its Customer 360.',
    ],
    steps: [
      'Choose the account, then the contact person the goods go to (or switch to Contact for a person with no account).',
      'The site address fills in from the account; pick another shipping address if the goods go elsewhere, and set the challan type.',
      'Type an item name and pick it from the catalogue: the item number, description, HSN and unit fill in. Then save the draft; its page opens, ready to dispatch.',
    ],
  },
  'sales/invoices/new': {
    benefits: [
      "Raise a GST invoice with the customer's GSTIN, terms and items.",
      'From an account, the customer is filled in and you return to its Customer 360.',
    ],
    steps: [
      'Check the customer and their GSTIN, the dates and the items.',
      'Save it as a draft; its page opens, where you issue it once it is checked.',
    ],
  },
  'installed-base/new': {
    benefits: [
      'Add a machine to the installed base so its AMC, service and spares follow it.',
      'From an account, the owner is filled in and the machine counts on that account.',
    ],
    steps: [
      'Choose the owner contact (from an account it is already set), and describe the machine.',
      'Add its serial number, AMC end date and value, make, model and site, then Register.',
    ],
  },
  'contacts/:id/message': {
    benefits: [
      'Message one customer on WhatsApp, email or SMS from your workspace, logged in the inbox and on their timeline.',
      'Attach one of their orders, challans, invoices or receipts as a secure link.',
    ],
    steps: [
      'Choose how to send it, and for WhatsApp which of your numbers.',
      'Pick an approved template and fill its variables, or write free text inside an open WhatsApp conversation.',
      'Optionally attach an order, challan, invoice or payment receipt of the company (not on SMS): search by number, preview it, then Send message. You return to Customer 360.',
    ],
  },
  'contacts/accounts/:accountId/360': CUSTOMER_360,
  'pipeline/ai-negotiator': {
    benefits: [
      'Answers price push-back on a quotation within limits you set.',
      'Never goes below your lowest margin or above your largest discount, and passes anything else to you.',
      'Keeps every round of the negotiation, with the reason for each answer.',
    ],
    steps: [
      'Set the target margin, the lowest margin you accept and the largest discount under Rules, then click Save rules.',
      'Click Start a negotiation, pick the issued quotation and type what the customer asked for.',
      'Copy the reply into the customer’s chat. When they answer, type it under What the customer said next.',
      'Use Take over to decide yourself. Once agreed, click Apply to quotation to issue the revised price.',
      'Try your rules first under Practice; nothing is saved there.',
    ],
  },
  'pipeline/projection-plan': {
    benefits: [
      'One plan for the year, with revenue and margin targets by quarter and business line.',
      'Compares the plan with your issued sales invoices as they come in.',
      'Scenarios show the year 15% worse and 15% better than plan.',
    ],
    steps: [
      'Click Generate plan to start from the last 12 months of invoices and the open pipeline, or New plan to type a yearly target.',
      'Check the figures under Lines (Edit targets to change any), then click Activate.',
      'Click Sync actuals to read the invoices into each quarter; the result is shown at the top of the page.',
      'Click Scenarios to see the conservative and optimistic cases.',
    ],
  },
  'sales/orders': {
    benefits: [
      'Captures the customer PO, delivery terms and line items in one place.',
      'Delivery challans and tax invoices are created straight from the order.',
    ],
    steps: [
      'Click + New Sales order, choose the customer and add line items.',
      'Click an order to open its page; Confirm sales order once the customer PO is in hand.',
      'Use Create delivery challan to ship, or Generate sales invoice to bill.',
      'Export PDF or Export Excel saves every order the search, status and customer show (not only the rows loaded); Excel adds a sheet of their lines.',
    ],
  },
  'sales/orders/:id': {
    benefits: [
      'Everything about one order on one page: PO, terms, site address, items and totals.',
      'Shows how much of each item has been dispatched and invoiced.',
    ],
    steps: [
      'Check the customer PO and the items.',
      'Confirm a draft order; from a confirmed one, Create delivery challan or Generate sales invoice (each opens on its own page).',
      'Back returns to the list, or to the Customer 360 you came from.',
      'PDF downloads the printed sales order; Excel saves it with its lines.',
    ],
  },
  'sales/challans': {
    benefits: [
      'Goods can move legally with the vehicle, LR/AWB and e-Way Bill details recorded.',
      'Turns into a tax invoice once the goods are delivered.',
    ],
    steps: [
      'Create a challan from a confirmed sales order, or with New challan.',
      'Click Dispatch: the challan opens with the transport form, for the vehicle, LR and e-Way Bill.',
      'Mark it delivered when the goods arrive, then bill it with Bill delivery (tax invoice).',
      'Export PDF or Export Excel saves every challan the search, status and customer show; Excel adds a sheet of their items.',
    ],
  },
  'sales/challans/:id': {
    benefits: [
      'One challan on one page: Rule 55 purpose, transport, site address and the goods.',
      'Dispatch, delivery and billing are done from the same page.',
    ],
    steps: [
      'Click Dispatch consignment and enter the transporter, vehicle number, LR and 12-digit e-Way Bill, then Confirm dispatch.',
      'Click Mark as delivered when the goods arrive.',
      'Click Bill delivery (tax invoice) to raise the invoice; its page opens.',
      'PDF downloads the printed delivery challan; Excel saves it with its items.',
    ],
  },
  'sales/invoices': {
    benefits: [
      'Works out CGST + SGST or IGST for you from the place of supply.',
      'Shows what each customer still owes.',
    ],
    steps: [
      'Create an invoice from a sales order or a delivery challan, or with New sales invoice.',
      'Check the lines and taxes, then click Issue.',
      'Click Pay when the money arrives: the invoice opens with the payment form.',
      'Export PDF or Export Excel saves every invoice the search, status and customer show; Excel adds sheets of their lines and payments.',
    ],
  },
  'sales/invoices/:id': {
    benefits: [
      'One tax invoice on one page: GSTIN, lines with CGST + SGST or IGST, totals and payments.',
      'Shows the balance due and whether it is overdue.',
    ],
    steps: [
      'Check the lines and taxes, then Issue tax invoice.',
      'Click Record payment, enter the amount, mode and UTR, then Confirm payment.',
      'Back returns to the list, or to the Customer 360 you came from.',
      'PDF downloads the printed invoice with its GST split; Excel saves it with its lines and payments.',
    ],
  },
  'purchasing/grn': {
    benefits: [
      'Records exactly what arrived at the gate against the purchase order.',
      'Quality inspection decides what goes into stock and what is sent back.',
    ],
    steps: [
      'Click Inward gate entry (GRN) and enter the items received.',
      'Click Save & send to QC.',
      'Record accepted and rejected quantities, then Confirm & Approve Put-Away.',
    ],
    tips: ['Rejected quantities can become a vendor debit note.'],
  },
  'purchasing/suppliers/new': {
    benefits: [
      'Keep each supplier’s contact, addresses and bank account in one place.',
      'A blacklisted supplier can no longer be ordered from.',
    ],
    steps: [
      'Enter the name, GSTIN and lead time.',
      'Add the primary contact, billing and shipping addresses and bank details.',
      'Click Add supplier.',
    ],
  },
  'purchasing/suppliers/:id/edit': {
    benefits: [
      'Update a supplier’s contact, addresses, bank account and remarks.',
      'Blacklist a supplier to stop new purchase orders while keeping their history.',
    ],
    steps: [
      'Change the contact, addresses, bank details or remarks as needed.',
      'To stop buying from them, tick Blacklist and give the reason, then click Save changes.',
    ],
    tips: ['Blacklisting keeps their history but stops new purchase orders.'],
  },
  'purchasing/orders/new': {
    benefits: [
      'Order parts from a supplier at the agreed price.',
      'From Vendor 360, the supplier is filled in and you return to their Vendor 360.',
    ],
    steps: [
      'Check the supplier, the store it is delivered to and the expected date.',
      'Search the catalogue to add parts, or add the parts below minimum stock in one click.',
      'Click Save draft order, then mark it sent from Purchasing once it has gone out.',
    ],
  },
  'purchasing/orders/:id/edit': {
    benefits: [
      'Change a draft order before it goes to the supplier.',
      'Parts, quantities, prices, delivery store and date stay editable until it is sent.',
    ],
    steps: [
      'Change the supplier, delivery details or parts as needed.',
      'Click Save changes, then mark it sent from Purchasing once it has gone out.',
    ],
  },
  'purchasing/bills/new': {
    benefits: [
      "Record a supplier's tax invoice with GST and TDS worked out for you.",
      'Linked to the goods receipt, it is matched against what was ordered and accepted.',
    ],
    steps: [
      "Upload the supplier's invoice (PDF or photo) to fill the form, or pick the supplier and enter the invoice details.",
      'Pick the goods receipt; its accepted items and order rates fill in.',
      'Check the rates and GST, then click Save bill and approve it from Vendor bills.',
    ],
    tips: ['MSME suppliers must be paid within 45 days of acceptance.'],
  },
  'purchasing/bills/:id': {
    benefits: [
      'Everything about one supplier bill: invoice, PO and GRN links, tax, lines and payments.',
      'Approve, pay or cancel it here, each with a confirmation first.',
    ],
    steps: [
      'Check the 3-way match and the lines.',
      'Click Approve, then Pay to record the bank transfer against it.',
    ],
    tips: ['A bill with payments recorded can no longer be cancelled.'],
  },
  'purchasing/debit-notes/:id': {
    benefits: [
      'Everything about one debit note: reason, bill and GRN, items and GST.',
      'Issue it, mark it settled or cancel it here, each with a confirmation first.',
    ],
    steps: [
      'Check the reason, items and total.',
      'Click Issue to supplier; once they adjust or refund it, click Mark settled.',
    ],
  },
  'purchasing/debit-notes/new': {
    benefits: [
      'Claim back rejected, short or over-charged goods from a supplier.',
      'From a goods receipt, the rejected items fill in, priced from the bill.',
    ],
    steps: [
      'Check the supplier and pick the bill or goods receipt it is against.',
      'Choose a reason and check the items and rates.',
      'Click Save debit note, then issue it from Debit notes.',
    ],
  },
  'purchasing/grn/:id': {
    benefits: [
      'Everything about one goods receipt: gate entry, QC result, bins and rejections.',
      'The next step, inspection, bill or debit note, is one click away.',
    ],
    steps: [
      'Check the received items and their QC result.',
      'Click Record QC inspection, Create vendor bill or Debit note for rejections.',
    ],
  },
  'purchasing/grn/:id/inspect': {
    benefits: [
      'Record what passed QC and what was rejected, line by line.',
      'Accepted quantities are received on the purchase order automatically.',
    ],
    steps: [
      'Enter who inspected, then the accepted or rejected quantity and bin for each line.',
      'Give a reason for anything rejected, then click Confirm inspection.',
    ],
    tips: ['Rejected quantities can then become a vendor debit note.'],
  },
  'purchasing/grn/new': {
    benefits: [
      "Record goods at the gate against the supplier's challan and purchase order.",
      'From Vendor 360, the supplier is filled in and you return to their Vendor 360.',
    ],
    steps: [
      'Check the supplier and pick the purchase order; its open items fill in.',
      'Enter the challan number, then the quantity actually received on each line.',
      'Click Save & send to QC. Stock is posted once QC accepts the goods.',
    ],
    tips: [
      'A line received short of the challan is flagged so you can raise it with the supplier.',
    ],
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
/**
 * The help for a screen: its own topic, else the nearest screen above it that has one. A form page such as
 * `settings/teams/new` or `field-service/tickets/:id/assign` is part of its list's job, so it shares that help.
 */
export function helpTopicFor(routePath: string | null | undefined): HelpTopic | null {
  if (!routePath) return null;
  const parts = routePath.split('/');
  while (parts.length) {
    const topic = HELP_TOPICS[parts.join('/')];
    if (topic) return topic;
    parts.pop();
  }
  return null;
}
