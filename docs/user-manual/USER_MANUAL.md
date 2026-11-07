# MNI Assist — Complete User Manual

**Edition:** 1.2 · **Reviewed:** 6 November 2026 · **Format:** end-user guide

**New in 1.2:** the menu is regrouped into plain groups, with a breadcrumb back to [Customer 360](#page-contacts-360), [Vendor 360](#page-purchasing-vendor-360) or a campaign, and a right-hand rail for Inbox, Notifications, help, What’s new, language, theme and sign-out. Most windows for creating and opening records are now their own pages: sales orders, challans and invoices (with PDF and Excel), [quotations](#page-quotations-new) (manual quotations, email with the PDF), purchasing (suppliers, orders, receipts, bills, debit notes), manufacturing, field service, helpdesk, finance and re-orders. Accounts carry a GSTIN with billing and shipping addresses; tasks and meetings link to records and remind on WhatsApp and SMS. Voice agents gain [playbooks, custom functions and account, helpdesk and shop tools](#page-calls-ai-agents-new), a [website call button](#page-calls-web-widget), an [AI impact report](#page-calls-ai-impact) and [call compliance](#page-compliance). New public pages: [ROI calculator](#page-roi) and [industries](#page-industries). Host operators set [payment gateways](#page-platform-payment-gateways) on screen.

**New in 1.1:** AI voice agents can take actions during calls, search your knowledge base and catalogue, remember returning callers, place outbound WhatsApp calls and call whole lists ([AI call batches](#page-calls-ai-batches)); calls are analysed afterwards and can be reviewed, corrected and exported ([AI conversations](#window-011)); agents can be tested from the browser ([test call](#panel-ar-voice-agent-test)). Agents can also hand a call to a person in a chosen team, with the reason and a summary; can follow a conversation flow of stages; can be drafted from a description, saved as workspace templates in folders, exported and imported as files, reviewed before publishing and compared version by version. One agent can serve several numbers ([AI voice agents](#page-calls-ai-agents)). See the [voice agent window](#dialog-ar-voice-agent-dialog-1).

This manual explains the pages and workflows present in this application’s current codebase. Use it with your organisation’s approved business processes. Features, buttons and pages depend on your role, workspace subscription, provider connections and administrator settings. A page being documented does not mean it is enabled for every workspace.

Instructions use the English interface labels. Use the combined language/theme menu to choose another available language; the position and purpose of the controls remain the same. Screenshot descriptions are production capture briefs, not evidence that every provider-connected action has been tested in your workspace.

## Contents

- [How to use MNI Assist](#how-to-use)
- [First successful setup](#first-setup)
- [Page-by-page instructions](#pages)

- [Start here](#start-here)
- [Customer-facing links](#customer-facing-links)
- [Daily workspace and customers](#daily-workspace-and-customers)
- [Campaigns, templates and automated journeys](#campaigns-templates-and-automated-journeys)
- [Sales, planning and customer orders](#sales-planning-and-customer-orders)
- [Inventory and purchasing](#inventory-and-purchasing)
- [Manufacturing](#manufacturing)
- [Service, calls and activities](#service-calls-and-activities)
- [Finance](#finance)
- [Documents and reporting](#documents-and-reporting)
- [Channels and subscriptions](#channels-and-subscriptions)
- [Settings and administration](#settings-and-administration)
- [Platform host operations](#platform-host-operations)
- [Dialog and drawer guide](#dialogs)
- [Confirmation and question windows](#confirmations)
- [Additional detail windows](#additional-windows)
- [Shared panels and embedded views](#shared-views)
- [Common troubleshooting](#troubleshooting)
- [Experimental local voice lab](#local-voice-lab)
- [Glossary](#glossary)

<a id="how-to-use"></a>

## How to use MNI Assist

### Workspace and access

Your **workspace** is your company’s working area. Use its sign-in name when logging in. The platform **host** is a separate administrative area; leaving the workspace field blank is for authorised host accounts, not a way to open a normal workspace.

| User type | Typical work | Access rule |
| --- | --- | --- |
| Visitor or customer | Public forms, payment links, quotation signing, customer reorder portal | A public link or its verification step; no staff account unless requested |
| Workspace team member | Assigned conversations, customers, tasks, meetings and operational records | The permissions and plan features granted to the account |
| Workspace manager/administrator | Team setup, approved settings, billing and user access | Specific management rights; an administrator title alone does not describe every permitted action |
| Field worker | Assigned site visits and service records | Assigned work and the required service permissions |
| Host operator | Platform metrics, workspaces, feature rules and platform administration | Authorised host account and corresponding permissions |
| Agency or reseller | Explicitly connected client workspace or partner functions | The relevant programme, relationship and permitted session scope |

A visible page may still have read-only access. Create, update, delete, send, payment, export and administration actions can require extra permission. If a menu item is absent or you see **Not allowed**, ask your administrator for the appropriate access; typing the URL does not grant it.

### Navigation, language, theme and sign-out

1. Use the left-hand menu to open a page. Items sit in groups named for the job: Customers, Marketing, Purchasing & stock, Sales, Orders & invoices, Calls, Service, Manufacturing, Finance, Products & documents, Partners, Reports, Channels, Administration, Settings, Billing and (for host operators) Platform. Click a group heading to fold or unfold it, and use **Search menu** to find an item by name.
2. On a narrow screen tap the header menu button to open the navigation drawer; choose a page and close the drawer if it remains open.
3. Use the right-hand rail for **Inbox** and **Notifications** (with counts of new items), **Help & Guide**, **What’s new**, **Language**, **Theme** and **Sign out**. On a narrow screen open it with **Open utilities menu** in the header.
4. Under **Language** choose English, Hindi, Marathi or Gujarati where offered; under **Theme** choose the light or dark appearance.
5. Click **Your profile** in the profile menu to update your account.
6. Click **Sign out** when finished. A **Signed out** session notice means you must sign in again before continuing; if your role was changed, the notice says so.
7. Open **Help & Guide** for the screen you are on: **What it does**, **Benefits** and **How to use it**.
8. The breadcrumb at the top shows where you are. A screen opened from Customer 360, Vendor 360 or a campaign shows that record in the breadcrumb (for example **Customers › Customer 360 · *name* › Sales invoices**); click it to go back.

[Screenshot S001: Desktop header and expanded left profile menu; arrows point to the combined language/theme dropdown, Your profile and top-bar Sign out. Use a sample user and no live account details.]

[Screenshot S002: Mobile header with the menu button highlighted and the navigation drawer open; show Search menu and the selected page.]

### Lists, forms and messages

1. Search and filter before creating a record that may already exist. Use **Clear filters** where offered to return to a broader list.
2. Click the record’s **View**, name, reference or card to inspect it; these controls vary by page.
3. Complete fields marked required. Use the unit shown: rupees, percentage, quantity, days and seconds are not interchangeable.
4. Review the selected customer, workspace, channel, totals and dates before saving or sending.
5. Click the primary action once and wait for the result. A busy label such as **Saving…** means the request is still being processed.
6. Resolve the displayed validation message before trying again. Closing a window is not a save, and **Cancel** normally abandons the proposed change.
7. Review any confirmation. Delete, release, merge, fulfil, post, issue and send actions can have different consequences from saving a draft.

Creating or opening a record usually opens its own page; **Back** returns you to the list, or to the 360 screen you came from. Some tables offer column sorting, filters, paging, resizing or exports. Use only the controls present on that table. Exports can contain customer information; share them through your organisation’s approved process. A queued export is downloaded from **My exports** once ready.

### Common business distinctions

| Term/action | Meaning |
| --- | --- |
| Draft / Save | Records work for later; does not necessarily send, publish or approve it |
| Send / Issue / Publish | Performs the stated external or formal action; review its recipient and status |
| Record payment / Mark paid | Records the result of a verified payment; does not itself transfer money |
| Pay / gateway checkout | Starts an actual payment flow; verify the final result |
| Product master | Your internal product names, part numbers and base list prices |
| WhatsApp Catalogue | Product entries for a particular WhatsApp channel, subject to provider publication/sync |
| Platform invoice | MNI Assist subscription/usage billing; separate from customer Sales invoices and supplier Vendor bills |
| Feature enabled | The business feature is allowed; provider credentials, data and user permissions may still be needed |

<a id="first-setup"></a>

## First successful setup

1. Create your workspace or accept your approved invitation, and sign in with the correct workspace name.
2. Confirm email and mobile ownership in **Get started**. Return to the checklist after using an email link.
3. Complete **Business profile**, then review member roles and teams.
4. Connect the intended WhatsApp or other channel and check its status.
5. Add a small set of approved test contacts and confirm their communication permissions.
6. Add your real product names, part numbers and approved prices in **Products & documents → Products**; publish eligible WhatsApp catalogue entries separately when used.
7. Copy or write templates, submit them for the intended WhatsApp account and wait for approval before relying on them outside the reply window.
8. Test one permitted conversation, enquiry and quotation before a bulk campaign or automation.
9. Review Billing, integrations, recording/consent and AI settings with the responsible administrator.
10. Activate customer-facing automations or voice answering only after the relevant connection and test results have been verified.

<a id="pages"></a>

## Page-by-page instructions

The routes below identify the screen if you need help finding it. Entries containing `:id`, `:code` or `:token` are patterns: open the record or use the genuine link you received; do not type those placeholder words as an address. Temporary authorisation-return pages are entered by their sign-in/connection flow.

<a id="start-here"></a>

## Start here

| Page | Open here |
| --- | --- |
| [MNI Assist](#page-overview) | `/` |
| [Sign in](#page-login) | `/login` |
| [System status](#page-status) | `/status` |
| [Signing in](#page-login-external) | `/login/external` |
| [Create a workspace](#page-signup) | `/signup` |
| [Reset your password](#page-forgot-password) | `/forgot-password` |
| [Choose a new password](#page-reset-password) | `/reset-password` |
| [Confirm your email](#page-confirm-email) | `/confirm-email` |
| [Privacy Policy](#page-privacy) | `/privacy` |

<a id="page-overview"></a>

### MNI Assist

**Open:** `/`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Learn what MNI Assist offers and choose how to get started.

**Prerequisites:** None. This is the public website.

**Views and sections:** Product overview; industries; AI features; plans; FAQs; website chat.

**Step-by-step**

1. Open the MNI Assist website.
2. Read the product sections and frequently asked questions.
3. Click **See plans & pricing** or **Compare plans** to compare included features.
4. Click **Create a workspace** to register, or **Sign in** to use an existing workspace.

[Screenshot P001: MNI Assist page showing its principal sections and a suitable sample record; highlight “See plans & pricing” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A plan selection does not mean payment is complete. Review the billing screen before activating a paid plan.

<a id="page-login"></a>

### Sign in

**Open:** `/login`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Sign in to your own workspace or, if authorised, the platform host.

**Prerequisites:** Your workspace sign-in name and a valid account.

**Views and sections:** Password sign-in; two-step verification and recovery; required password change; email-confirmation notice; external sign-in.

**Step-by-step**

1. Enter **Workspace** exactly as supplied by your administrator. Leave it blank only for host access.
2. Enter your **Username, email or phone number** and **Password**.
3. Select **Keep me signed in** only on a device you trust, then click **Sign in**.
4. If asked for an authentication code, enter the current code from your authenticator and click **Verify**; use a recovery code if you cannot access the app.
5. If asked to replace your password, complete both new-password fields and click **Save and sign in**.
6. If your organisation uses a displayed external sign-in option, choose it and finish the provider’s sign-in steps.

[Screenshot P002: Sign in page showing its principal sections and a suitable sample record; highlight “Workspace” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A correct password in the wrong workspace will not sign you in. If email confirmation is required, request the confirmation link. Repeated failures can lock the account temporarily.

<a id="page-status"></a>

### System status

**Open:** `/status`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Check published service availability without signing in.

**Prerequisites:** None.

**Views and sections:** System status; Planned maintenance; Last 14 days.

**Step-by-step**

1. Open **System status**.
2. Check the current service status and any active incident or maintenance notice.
3. Open the relevant update and note the latest information before trying the affected feature again.

[Screenshot P003: System status page showing its principal sections and a suitable sample record; highlight “System status” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A healthy status page does not verify your account, browser connection or permission to use a feature.

<a id="page-login-external"></a>

### Signing in

**Open:** `/login/external`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Complete sign-in after returning from an external identity provider.

**Prerequisites:** Start external sign-in from the sign-in page; use the same browser.

**Views and sections:** That did not work; Two-step verification; Signing you in….

**Step-by-step**

1. Complete sign-in with the provider and allow the browser to return to MNI Assist.
2. Wait for the sign-in check to finish.
3. If an additional verification challenge appears, complete it and click **Verify**.
4. If the callback shows an error, return to **Sign in** and start a fresh attempt.

[Screenshot P004: Signing in page showing its principal sections and a suitable sample record; highlight “Verify” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not bookmark this temporary return address or copy it to another person.

<a id="page-signup"></a>

### Create a workspace

**Open:** `/signup`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Create a workspace and its first administrator account.

**Prerequisites:** A unique workspace name, accessible email and mobile number, and a suitable password.

**Views and sections:** Workspace created; Create your workspace.

**Step-by-step**

1. From the public website click **Create a workspace**.
2. Enter **Workspace name** and check the sign-in name shown below it.
3. Enter your name if desired, your **Email**, and your **Mobile number** with the requested country code.
4. Where mobile verification is shown, click **Send code**, enter the received code, then click **Verify**.
5. Enter a password that satisfies the displayed requirements and complete the verification check if shown.
6. Click **Create workspace** once and wait for sign-in.
7. Complete **Get started**; if you selected a paid plan, review its activation in **Billing**.

[Screenshot P005: Create a workspace page showing its principal sections and a suitable sample record; highlight “Create a workspace” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Keep the workspace sign-in name: it is needed at sign-in. Use **Resend** only after the displayed waiting period. An existing workspace name must be changed.

<a id="page-forgot-password"></a>

### Reset your password

**Open:** `/forgot-password`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Request a password-reset link or recover your workspace name.

**Prerequisites:** Access to your account’s email inbox.

**Views and sections:** password / Reset your password / Find your workspace.

**Step-by-step**

1. Click **Forgot password** on sign-in.
2. Enter **Workspace** and **Email**; leave Workspace blank only for a host account.
3. Click **Send reset link** and check your inbox and spam folder.
4. Open the latest email link to choose a new password.
5. If you forgot the workspace, choose **Forgot your workspace?**, enter your email and request the workspace email.

[Screenshot P006: Reset your password page showing its principal sections and a suitable sample record; highlight “Forgot password” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** For privacy, a confirmation message may not reveal whether the account exists. Use the most recent reset email.

<a id="page-reset-password"></a>

### Choose a new password

**Open:** `/reset-password`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Choose a new account password from a reset email.

**Prerequisites:** A valid, unexpired password-reset link.

**Views and sections:** Choose a new password.

**Step-by-step**

1. Open the reset link from your email.
2. Enter **New password** and repeat it in **Confirm new password**.
3. Click **Change password**.
4. Return to **Sign in** and use the new password with the correct workspace.

[Screenshot P007: Choose a new password page showing its principal sections and a suitable sample record; highlight “New password” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the link has expired or was already used, request another link. Both entries must match the workspace’s password rules.

<a id="page-confirm-email"></a>

### Confirm your email

**Open:** `/confirm-email`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Confirm ownership of your email address.

**Prerequisites:** The confirmation email sent to your account.

**Views and sections:** Confirm your email address.

**Step-by-step**

1. Open the newest confirmation link from your email.
2. Wait for the confirmation result.
3. Return to MNI Assist and sign in if prompted.
4. On **Get started**, click **I’ve opened the link** to refresh your checklist.

[Screenshot P008: Confirm your email page showing its principal sections and a suitable sample record; highlight “Get started” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Opening the checklist alone does not verify email. Request a new email if the link is invalid or expired.

<a id="page-privacy"></a>

### Privacy Policy

**Open:** `/privacy`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Read the application’s published privacy policy.

**Prerequisites:** None.

**Views and sections:** Privacy Policy; 1. What we collect; 2. Why we process it; 3. Who we share it with; 4. How long we keep it; 5. Your rights; 6. Security; 7. Who is responsible for your data; 8. Grievance officer & complaints; 9. Children; 10. Changes to this policy; 11. Contact us.

**Step-by-step**

1. Open **Privacy Policy** from the public website.
2. Read the sections about information use, retention and contact rights.
3. Use the contact details in the policy for a privacy question.

[Screenshot P009: Privacy Policy page showing its principal sections and a suitable sample record; highlight “Privacy Policy” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A workspace may publish additional notices for its own forms, customer messages or recordings.

<a id="customer-facing-links"></a>

## Customer-facing links

| Page | Open here |
| --- | --- |
| [Review and sign](#page-sign-token) | `/sign/:token` |
| [Enquiry form](#page-f-code) | `/f/:code` |
| [Pay securely](#page-pay-token) | `/pay/:token` |
| [Raise a ticket](#page-t-code) | `/t/:code` |
| [Re-order spares](#page-r-token) | `/r/:token` |
| [Sign in](#page-reorder-code) | `/reorder/:code` |
| [Spares catalogue](#page-catalogue-code) | `/catalogue/:code` |
| [ROI calculator](#page-roi) | `/roi` |
| [Industries](#page-industries) | `/industries`, `/industries/:segment` |

<a id="page-sign-token"></a>

### Review and sign

**Open:** `/sign/:token`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Review and accept or decline a quotation shared with you.

**Prerequisites:** A private quotation link and access to the verification destination shown on the page.

**Views and sections:** Quotation review; verification code; signature pad; acceptance; decline.

**Step-by-step**

1. Open the quotation link sent by the supplier.
2. Review the items, quantities, prices, taxes, validity and terms.
3. Click **Send me a code**, enter the received code and complete the check.
4. Enter **Your full name** and draw your signature in the signature area.
5. Click **Sign and accept** only if you agree.
6. To refuse, choose **Decline this quotation**, enter an optional reason and click **Decline**.

[Screenshot P010: Review and sign page showing its principal sections and a suitable sample record; highlight “Send me a code” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A signature is a business commitment. Do not forward the private link. Request a new code if necessary; ask the sender about an expired quotation.

<a id="page-f-code"></a>

### Enquiry form

**Open:** `/f/:code`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Send an enquiry through a company’s published web form.

**Prerequisites:** A working public form link.

**Views and sections:** Thank you.

**Step-by-step**

1. Open the form and read its heading and introduction.
2. Complete each displayed question, including required contact details.
3. Select the required contact-consent box; select an optional marketing box only if you agree.
4. Click the form’s submit button once.
5. Wait for the thank-you message or the company’s thank-you page.

[Screenshot P011: Enquiry form page showing its principal sections and a suitable sample record; highlight “Enquiry form” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Required questions vary by company. Leave the invisible anti-spam field alone. A disabled form needs a new link from the company.

<a id="page-pay-token"></a>

### Pay securely

**Open:** `/pay/:token`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Pay a payment request using its secure payment page.

**Prerequisites:** A valid private payment link and access to a supported payment method.

**Step-by-step**

1. Open the payment link and verify the business, purpose and amount.
2. Click **Pay** to open BillDesk.
3. Complete the payment using the gateway’s instructions.
4. Return to the result page and check the final status before attempting another payment.

[Screenshot P012: Pay securely page showing its principal sections and a suitable sample record; highlight “Pay” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Closing the gateway is not proof of failure. If money was deducted but the status is pending, retain the payment reference and ask the business to check it.

<a id="page-t-code"></a>

### Raise a ticket

**Open:** `/t/:code`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Raise a support ticket without an application account.

**Prerequisites:** The company’s active support-portal link.

**Views and sections:** Thank you; Raise a ticket.

**Step-by-step**

1. Enter **Your name**, **Phone**, and optional **Email**.
2. Describe the issue in **What’s wrong** and add useful **Details**.
3. Select **I agree to be contacted about this**.
4. Click **Raise ticket**.
5. Keep the reference shown after submission for follow-up.

[Screenshot P013: Raise a ticket page showing its principal sections and a suitable sample record; highlight “Your name” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Use a reachable phone number. A duplicate or unclear request can slow support; include the equipment reference and symptoms.

<a id="page-r-token"></a>

### Re-order spares

**Open:** `/r/:token`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Request spare parts or reorder items from your personal customer portal.

**Prerequisites:** A personal link and access to its registered WhatsApp number.

**Views and sections:** Verification; machines/due parts; search; order summary; company approval; payment; password setup; recent requests.

**Step-by-step**

1. Open your re-order link and click **Send me the code**.
2. Enter the **Code from WhatsApp** and click **Open**.
3. Review your machines and due parts, or search for another part and click **Add**.
4. Enter quantities, optional **Your PO number**, **Deliver to**, and **Note**.
5. Review all prices and totals, then click **Send for quotation** or **Place order and pay**, as offered by the supplier.
6. Complete approval or payment if required and keep the reference.
7. Review **Recent requests** to track an existing request; use **Order something else** for a new one.

[Screenshot P014: Re-order spares page showing its principal sections and a suitable sample record; highlight “Send me the code” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Unpriced items need the supplier’s quotation. Company approval and payment options depend on the supplier’s portal settings. Do not share your private link.

<a id="page-reorder-code"></a>

### Sign in

**Open:** `/reorder/:code`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Sign in to a supplier’s reorder portal using your WhatsApp number and portal password.

**Prerequisites:** The supplier’s reorder sign-in link and a registered buyer number.

**Views and sections:** This page isn't available; Sign in to re-order spares; Set your password.

**Step-by-step**

1. Enter **WhatsApp number** and **Password**, then click **Sign in**.
2. For first use or a forgotten password, click **Get a code on WhatsApp**.
3. Click **Send code**, enter the received code and choose a new password that meets the displayed rules.
4. Click **Set password and continue**, then follow the re-order steps.

[Screenshot P015: Sign in page showing its principal sections and a suitable sample record; highlight “WhatsApp number” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** This portal password is separate from a MNI Assist staff-account password.

<a id="page-catalogue-code"></a>

### Spares catalogue

**Open:** `/catalogue/:code`. **Who can use it:** Visitors or recipients of the relevant link; any verification shown still applies.

**Purpose:** Browse a supplier’s public spare-parts catalogue and request a quotation.

**Prerequisites:** An active public catalogue link.

**Views and sections:** This catalogue isn't available; Enquiry sent; Spares catalogue; Your enquiry.

**Step-by-step**

1. Search for a part and use **Show more** if further results are available.
2. Enter quantities for the parts you need.
3. Complete **Your name**, **WhatsApp number**, **City**, and any additional company, email, PIN or machine details.
4. Review the contact-consent wording and select it if you agree.
5. Click **Send enquiry** and keep the confirmation.

[Screenshot P016: Spares catalogue page showing its principal sections and a suitable sample record; highlight “Show more” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A price may be hidden or shown as price on request. A catalogue enquiry is not a confirmed order or payment.

<a id="page-roi"></a>

### ROI calculator

**Open:** `/roi`. **Who can use it:** Anyone; no sign-in is needed.

**Purpose:** Estimate what AI voice agents would save a business before it signs up.

**Prerequisites:** None. You need the AI call rate (rupees a minute) agreed with the MNI Assist team, because no rate is published on the page.

**Views and sections:** What would AI voice agents save you?; your call figures; the estimate (calls the AI handles to the end, staff time freed, staff cost freed, AI minutes, AI call cost, plan).

**Step-by-step**

1. Open the ROI calculator from the website, or go to `/roi`.
2. Enter **Calls a month**, **Average call length (minutes)** and **A person's time per call, with notes (minutes)**.
3. Enter **Cost of an hour of their time (₹)** and **Calls the AI handles to the end (%)**.
4. Enter the **AI call rate (₹ a minute)**. If you do not have it, the field reads **Ask our team**, and no estimate is shown until you enter it.
5. Choose the plan. AI voice agents come with Pro and Enterprise, so only those two are offered, and the plan fee is included in the estimate.
6. Read the estimate. It changes as you edit any figure.

[Screenshot P120: ROI calculator with sample figures (2,000 calls a month, 4-minute calls) and the estimate panel filled in; highlight “AI call rate (₹ a minute)” and the staff cost freed figure. Use made-up figures only.]

**Tips and common errors:** The estimate is only as good as the figures entered. It is not a quotation, and the AI call rate is the one agreed with the MNI Assist team, not a published price.

<a id="page-industries"></a>

### Industries

**Open:** `/industries` lists the industries; `/industries/system-integrators`, `/industries/oems` and `/industries/distributors` open one. **Who can use it:** Anyone; no sign-in is needed.

**Purpose:** See how MNI Assist is used in your kind of business.

**Prerequisites:** None.

**Views and sections:** Industries; for each industry: Sound familiar? (the usual problems), What MNI Assist does for you, Ready AI agents for you.

**Step-by-step**

1. Open **Industries** from the website header or footer.
2. Choose system integrators, OEMs or distributors.
3. Read the problems, what MNI Assist does about each, and the ready-made AI agents for that industry.
4. Use the page's sign-up or ROI calculator link to go further.

[Screenshot P121: Industries page for OEMs showing “Sound familiar?” and “Ready AI agents for you”; highlight the sign-up link.]

**Tips and common errors:** The pages describe typical use. What a workspace can use depends on its plan.

<a id="daily-workspace-and-customers"></a>

## Daily workspace and customers

| Page | Open here |
| --- | --- |
| [Home](#page-home) | `/home` |
| [Get started](#page-getting-started) | `/getting-started` |
| [Inbox](#page-inbox) | `/inbox` |
| [Contacts](#page-contacts) | `/contacts` |
| [Audience builder](#page-contacts-segments) | `/contacts/segments` |
| [Accounts](#page-contacts-accounts) | `/contacts/accounts` |
| [Customer 360](#page-contacts-360) | `/contacts/360` |
| [Duplicates](#page-contacts-duplicates) | `/contacts/duplicates` |
| [Account health](#page-account-health) | `/account-health` |
| [Notifications](#page-notifications) | `/notifications` |
| [What's new](#page-whats-new) | `/whats-new` |
| [New contact / Edit contact](#page-contacts-new) | `/contacts/new`, `/contacts/:id/edit` |
| [New account / Edit account](#page-contacts-accounts-new) | `/contacts/accounts/new`, `/contacts/accounts/:accountId/edit` |
| [Buyers & credit](#page-contacts-accounts-credit) | `/contacts/accounts/credit` |
| [Account roll-up](#page-contacts-accounts-rollup) | `/contacts/accounts/:accountId/rollup` |
| [Message customer](#page-contacts-message) | `/contacts/:id/message` |

<a id="page-home"></a>

### Home

**Open:** `/home`. **Who can use it:** Signed-in users with access to this page.

**Purpose:** See the work and channel conditions needing attention today.

**Prerequisites:** Sign in; displayed totals depend on your workspace and access.

**Views and sections:** Needs you today; Recent campaigns; Channel health; Message mix.

**Step-by-step**

1. Open **Home**.
2. Review open enquiries, quotations awaiting reply, recent sends and open conversations.
3. In **Needs you today**, click **Open** beside the item you want to handle.
4. Review **Channel health** and the message mix before sending a campaign.
5. Use **New campaign** or **View all** in recent campaigns to continue the relevant workflow.

[Screenshot P017: Home page showing its principal sections and a suitable sample record; highlight “Home” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** An empty workspace can correctly show zero totals or No channel. Add data and connect a channel before expecting activity.

<a id="page-getting-started"></a>

### Get started

**Open:** `/getting-started`. **Who can use it:** Signed-in users with access to this page, until the checklist is complete.

**Purpose:** Complete the workspace setup checklist in a guided order.

**Prerequisites:** Sign in as a workspace member with permission for the relevant setup task.

**Views and sections:** The setup steps; You’re set up.

**Step-by-step**

1. Open **Get started**; the checklist selects the first unfinished step.
2. For email verification click **Send confirmation link**, open the email, then return and click **I’ve opened the link**.
3. For mobile verification request the code, enter it and click **Confirm**. If it has not arrived, wait for the countdown, then click **Resend code**.
4. For each remaining setup task click **Go and do it**, complete that page, then return to the checklist.
5. Use **Back**, **Next** or **Skip for now** to navigate; select a step on the rail to revisit it.
6. Click **Finish** when ready, or **Dismiss** to hide the checklist.

[Screenshot P018: Get started page with the mobile-verification step open and the Resend code countdown visible. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Email and mobile verification need the real verification flow; ticking I’ve done this does not complete them, and skipping does not complete a task. Once every step is complete, **Get started** leaves the menu, and opening `/getting-started` takes you to **Home**.

<a id="page-whats-new"></a>

### What's new

**Open:** `/whats-new`, or **What’s new** on the right-hand rail. **Who can use it:** Signed-in users.

**Purpose:** See the latest features, newest first.

**Prerequisites:** None.

**Views and sections:** One card for each release, with its changes.

**Step-by-step**

1. Open **What’s new**.
2. Read the latest release at the top.
3. Click **Open** beside a change to go straight to that screen.

[Screenshot P122: What's new page showing the newest release card; highlight an Open link.]

**Tips and common errors:** A change listed here may still depend on your plan, your permissions or a provider connection.

<a id="page-inbox"></a>

### Inbox

**Open:** `/inbox`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Read and manage customer conversations and send permitted replies.

**Prerequisites:** A connected, usable channel; Inbox access; additional permissions for payments, calling or quotations.

**Views and sections:** Conversation list and filters; message thread; customer panel; attachments/document picker; templates; reply buttons; payments; call permission; quotes from files; location; assignment and resolution.

**Step-by-step**

1. Open **Inbox** and choose **All**, **Open**, **Snoozed** or **Closed**.
2. Use search or **Filters** to narrow by owner, unread messages or a closing reply window.
3. Select a conversation and read the history and customer details.
4. Type **Message** and send it, or choose an attachment or an approved template when needed.
5. Use **Assign** to route work, **Summarise** to review an AI summary, and **Resolve** when the issue is finished.
6. For a customer call choose the available calling action; request permission first if required.
7. To have the AI voice agent call the customer instead, click **Call with AI agent**, choose **Call on**: **WhatsApp** or **Phone line (Exotel)**, optionally enter the reason for the call, and click **Place AI call** ([Call with AI agent](#panel-ar-inbox-ai-call)). A phone-line call rings the customer's number from your Exotel number into the voice line's **AI call flow** (set up under **Channels › Voice › AI call flow**); it follows the line's consent rules and the 09:00–21:00 India-time window, the agent speaks with speech to speech and can take its in-call actions (booking, tickets, CRM updates, follow-ups, lookups) but not hand the call to a person, and its transcript (with the agent's after-call analysis) appears on the call in the **Calls** log (**Show the transcript**).
8. Use the payment, re-order link, location or quote-from-file actions only after reviewing the corresponding window.

**Related windows:** [Call](#dialog-ar-call-dialog-1); [Call with AI agent](#panel-ar-inbox-ai-call); [Request a payment](#dialog-ar-inbox-1); [Draft a quote from this file](#dialog-ar-inbox-2); [Reply buttons](#dialog-ar-inbox-3); [Share a location](#dialog-ar-share-location-dialog-1); [Re-order link for](#dialog-ar-send-reorder-link-1).

[Screenshot P019: Inbox page showing its principal sections and a suitable sample record; highlight “Inbox” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Outside WhatsApp’s customer reply window, a normal message may need an approved template. Review AI-generated text and quote lines before sending. A disabled action may require permission, consent or a working channel.

<a id="page-contacts"></a>

### Contacts

**Open:** `/contacts`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Keep customer and prospect contact details together.

**Prerequisites:** Contacts access; a correct phone number and consent for the communication you intend.

**Step-by-step**

1. Open **Contacts** and search or filter for an existing person first.
2. Click **New contact**, enter **WhatsApp number** with country code and the available name, company, account, designation, email, role and location details.
3. Click **Add contact** and check that the row appears.
4. Select **Edit** to correct an existing record and click **Save changes**.
5. To add many contacts choose **Import**, use the import guide and review its results.
6. Use the contact’s re-order or customer-view actions where offered.

**Related windows:** [Import contacts: upload, mapping, consent and results](#dialog-ar-contact-import-1); [Edit contact / New contact](#dialog-ar-contacts-1); [Re-order link for](#dialog-ar-send-reorder-link-1).

[Screenshot P020: Contacts page showing its principal sections and a suitable sample record; highlight “Contacts” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A visiting-card photo or vCard import still needs review. Keep phone numbers consistent to avoid duplicates; deleting is different from merging duplicates.

<a id="page-contacts-segments"></a>

### Audience builder

**Open:** `/contacts/segments`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Build reusable customer audiences using saved conditions.

**Prerequisites:** Contacts and Audience-builder access; meaningful contact data to filter.

**Views and sections:** People; Rule; Saved segments; Preview; One send would cost; Sample.

**Step-by-step**

1. Open **Audiences**.
2. Add conditions under **Match all of**, **Match any of**, and **Exclude anyone matching** as needed.
3. Select the relevant contact fields and comparison values; add another condition or any-group to refine the rules.
4. Review the matching contacts before use.
5. Click **Save segment**, enter **Name** and optional **Description**, then save.
6. Use **Edit** to change a saved audience or **Import contacts** to add source data.

**Related windows:** [Import contacts: upload, mapping, consent and results](#dialog-ar-contact-import-1); [Edit segment / Save segment](#dialog-ar-segments-1).

[Screenshot P021: Audience builder page showing its principal sections and a suitable sample record; highlight “Audiences” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Match all narrows the audience; match any can broaden it. Exclusions remove matching people. Recheck audience size before a campaign.

<a id="page-contacts-accounts"></a>

### Accounts

**Open:** `/contacts/accounts`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Keep the companies you sell to, with their GST number, billing and shipping addresses, and the people who work there.

**Prerequisites:** Accounts access. Buyers and credit need the re-order portal settings permission.

**Views and sections:** Account list; account form; roll-up; Customer 360; buyers and credit.

**Step-by-step**

1. Search for the company before adding it.
2. Click **New account**. The account opens as its own page (see [New account / Edit account](#page-contacts-accounts-new)).
3. Open an account's **Customer 360** to see its orders, challans, invoices, payments, machines and service.
4. Click **Rollup** to add up its contacts, enquiries and pipeline, with or without its subsidiaries.
5. Click **Credit** on a row, or **Buyers & credit** in the toolbar, to set who may order on the re-order portal and the account's credit limit, terms and hold.

[Screenshot P024: Accounts page with a sample company row; highlight New account, Rollup, Credit and the Customer 360 link. Use approved sample data.]

**Tips and common errors:** Industry, state and city come from shared pick-lists; cities are filtered by the state chosen. A contact's orders and invoices show on its account's Customer 360, so link each buyer to their account.

<a id="page-contacts-accounts-new"></a>

### New account / Edit account

**Open:** `/contacts/accounts/new`. **Other entry paths:** `/contacts/accounts/:accountId/edit`. **Who can use it:** Users who may create or edit accounts.

**Purpose:** Record a company with its GST number, billing address and one or more shipping addresses.

**Prerequisites:** Accounts access.

**Views and sections:** Company details; GSTIN; billing address and PIN; shipping addresses; parent account.

**Step-by-step**

1. Enter the account name and choose its **Industry Sector**.
2. Enter the **GST No. (GSTIN)** where the company is GST-registered.
3. Choose **State / Territory**, then **City / Industrial Hub** (the cities shown follow the state), and enter the **Billing Address** and PIN.
4. Under **Shipping Addresses**, click **Add address** for each one: label, address, city, state, PIN and, for a site registered separately, its own GSTIN. Mark one as the default.
5. Select a parent account if the company belongs to a group.
6. Click **Create Account** (or **Save Changes** when editing).

[Screenshot P123: New account page with GSTIN, billing address and two shipping addresses, one marked default; highlight Create Account.]

**Tips and common errors:** If an industry is missing, choose **+ Add new industry sector...**; the new value is kept for your workspace. Sales orders, challans and invoices take the billing address and the default shipping address from here, so keep them current.

<a id="page-contacts-accounts-credit"></a>

### Buyers & credit

**Open:** `/contacts/accounts/credit`, or **Credit** on an account row. **Who can use it:** Users with the re-order portal settings permission.

**Purpose:** Choose a customer company and set who may order for it on the re-order portal, and its credit limit, payment terms and hold.

**Prerequisites:** The customer company must exist in Accounts, with its people as contacts.

**Views and sections:** Customer company; buyers and approvers; credit limit; payment terms; hold.

**Step-by-step**

1. Choose the customer company (from an account row it is already chosen).
2. Add the buyers who may order and the approvers who must approve.
3. Set the credit limit and payment terms, or put the company on hold.
4. Click **Done** to go back to where you came from.

[Screenshot P124: Buyers & credit page for a sample company with one buyer, one approver and a credit limit.]

**Tips and common errors:** This used to be a window on the Re-orders page and is now reached from Accounts.

<a id="page-contacts-accounts-rollup"></a>

### Account roll-up

**Open:** `/contacts/accounts/:accountId/rollup`, from **Rollup** on an account. **Who can use it:** Users with access to Accounts.

**Purpose:** See everything an account adds up to: contacts, open and won enquiries, pipeline value, deal stages and its ERP ledger.

**Prerequisites:** An existing account.

**Views and sections:** Totals; stages; key contacts; ERP ledger.

**Step-by-step**

1. Click **Rollup** on an account.
2. Tick **Include subsidiaries** to add every company and plant beneath it.
3. Open a key contact, the account's Customer 360 or its ERP ledger for the detail.

[Screenshot P125: Account roll-up with Include subsidiaries ticked.]

**Tips and common errors:** The ERP ledger shows only when an ERP connection is synced.

<a id="page-contacts-360"></a>

### Customer 360

**Open:** `/contacts/360`. **Who can use it:** Signed-in users with Customer 360 access; selling actions need sales permissions.

**Other entry paths:** `/contacts/accounts/:accountId/360` (a company), `/contacts/:id/360` (one person).

**Purpose:** Review a complete customer or company relationship in one place, and open every related screen for just that customer.

**Prerequisites:** Customer 360 access and an existing contact or account.

**Views and sections:** Picker with Accounts and Contacts tabs; customer summary and credit; timeline; sales orders; challans; invoices and payments; tickets; installed machinery; Everything about this customer.

**Step-by-step**

1. Open **Customer 360**. Choose the **Accounts** or **Contacts** tab, type in the search box and pick the customer; the lists are searched on the server and shown ten to a page.
2. Confirm the selected person or company before acting.
3. On an account, choose whether to **Include subsidiaries**, then review **Sales Orders**, **Delivery Challans**, **Invoices & Payments**, **Open Tickets** and **Installed Machinery**.
4. On an account, use **+ New Order**, **Create delivery challan**, **Create invoice** or **Record payment**; **Send** on an order, challan or invoice messages it to its buyer.
5. On a person, use **Message customer** (see [Message customer](#page-contacts-message)). A person's orders and invoices are on their account: use **Orders & invoices** to open the account's 360, or **Link to an account** / **Create an account** if they have none.
6. Use **Everything about this customer** to open any related list (orders, challans, invoices, collections, quotations, tickets, machines, inbox) already narrowed to this customer.
7. On the screen you opened, the breadcrumb **Customers › Customer 360 · *name*** brings you back. A list narrowed to one customer shows a bar with **Show all** to see everyone again.

**Related windows:** [Record payment / Create delivery challan / Create invoice](#dialog-ar-customer-actions-1).

[Screenshot P023: Customer 360 for a sample account showing the summary, the Everything about this customer panel and the breadcrumb; use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Company totals include subsidiaries only when ticked. A person's view does not sell: orders, challans and invoices belong to the account. Recording a payment does not itself prove the bank received money; use a verified reference.

<a id="page-contacts-new"></a>

### New contact / Edit contact

**Open:** `/contacts/new`. **Other entry paths:** `/contacts/:id/edit`. **Who can use it:** Users who may create or edit contacts.

**Purpose:** Add or update one person, with their WhatsApp number, role and company.

**Prerequisites:** Contacts access.

**Views and sections:** Phone and name; designation and decision role; account; state and cluster; visiting card scan.

**Step-by-step**

1. Enter the WhatsApp number in international format, for example 919821012345.
2. Enter the name and designation, and link the contact to their account.
3. Choose their role in buying decisions (for example Purchase, Maintenance or Plant Head).
4. Choose the state and industrial cluster.
5. Save. To fill the form faster, scan a visiting card photo first.

**Fields:** see [Edit contact / New contact](#dialog-ar-contacts-1).

[Screenshot P126: New contact page with a sample number, name and account; highlight the visiting card scan and Save.]

**Tips and common errors:** Linking a contact to an account rolls their enquiries and activity up to the company and puts their orders on its Customer 360.

<a id="page-contacts-message"></a>

### Message customer

**Open:** `/contacts/:id/message`, from **Message customer** on Customer 360. **Who can use it:** Users who may message customers.

**Purpose:** Message one customer on WhatsApp, email or SMS from your workspace, logged in the inbox and on their timeline.

**Prerequisites:** A connected channel; for WhatsApp outside the 24-hour window, an approved template.

**Views and sections:** Channel and number; template and variables or free text; attachment; preview.

**Step-by-step**

1. Choose how to send it and, for WhatsApp, which of your numbers.
2. Pick an approved template and fill its variables, or write free text inside an open WhatsApp conversation.
3. Optionally attach an order, challan, invoice or payment receipt of the company (not on SMS): search by number and preview it.
4. Click **Send message**. You return to Customer 360.

[Screenshot P127: Message customer page with WhatsApp chosen, a template filled in and an invoice attached.]

**Tips and common errors:** The attachment goes as a secure link. Outside WhatsApp's 24-hour window only an approved template can be sent.

<a id="page-contacts-duplicates"></a>

### Duplicates

**Open:** `/contacts/duplicates`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Review likely duplicate contacts and combine the correct records.

**Prerequisites:** Contact-merge access; ability to recognise the correct customer details.

**Views and sections:** Keep which record?; Where they disagree; What the merged contact gains; What moves; CRM; Consent after the merge.

**Step-by-step**

1. Open **Duplicates**.
2. Use **Near-certain matches only** if you want to start with the strongest candidates.
3. Compare the two records and choose **Not duplicates** for a false match.
4. For a true match click **Review & merge** and select the record to keep.
5. Check the surviving details, then click **Merge contacts** and review the result.

**Related windows:** [Merge contacts](#dialog-ar-duplicates-1).

[Screenshot P024: Duplicates page showing its principal sections and a suitable sample record; highlight “Duplicates” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not merge two different people who share a company number. The merge is a data-changing action; review the retained identity carefully.

<a id="page-account-health"></a>

### Account health

**Open:** `/account-health`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Review customer relationship scores and their contributing signals.

**Prerequisites:** Account-health access and relevant customer history; tuning access to change scoring.

**Views and sections:** AMC renewals, next months.

**Step-by-step**

1. Open **Account health** and review the ranked accounts and their score explanations.
2. Click **Rescore now** to refresh the current data when appropriate.
3. Choose **Tune scoring** to inspect weights/thresholds.
4. Adjust only approved scoring assumptions, then click **Save and rescore**.
5. Use **Restore defaults** if you intend to replace the custom scoring setup.

**Related windows:** [Tune the health score](#dialog-ar-account-health-1).

[Screenshot P025: Account health page showing its principal sections and a suitable sample record; highlight “Account health” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A low score is a prompt to investigate, not proof that a customer is lost or cannot pay.

<a id="page-notifications"></a>

### Notifications

**Open:** `/notifications`. **Who can use it:** Signed-in users with access to this page.

**Purpose:** Read workspace alerts and open the related work.

**Prerequisites:** Sign in; notifications assigned or available to your account.

**Step-by-step**

1. Click the notification bell in the top bar or open **Notifications**.
2. Choose **All**, **Unread** or **Critical**.
3. Open the notification’s available destination link to inspect the related record.
4. Click **Mark read** for one notice or **Mark all read** after reviewing them.

[Screenshot P026: Notifications page showing its principal sections and a suitable sample record; highlight “Notifications” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Marking a notice read does not resolve the business issue that created it.

<a id="campaigns-templates-and-automated-journeys"></a>

## Campaigns, templates and automated journeys

| Page | Open here |
| --- | --- |
| [Campaigns](#page-campaigns) | `/campaigns` |
| [Templates](#page-templates) | `/templates` |
| [New template](#page-templates-new) | `/templates/new` |
| [Automations](#page-automations) | `/automations` |
| [Auto-replies](#page-auto-replies) | `/auto-replies` |
| [Automation builder](#page-automations-id) | `/automations/:id` |
| [Flows](#page-flows) | `/flows` |
| [Flow designer](#page-flows-id) | `/flows/:id` |
| [Web forms](#page-forms) | `/forms` |

<a id="page-campaigns"></a>

### Campaigns

**New in 1.2:** **New campaign** now opens its own page, `/campaigns/new` (name, number, approved template, then **Create Draft**). An opened campaign shows links to its template, its audience, results, the wallet and a follow-up, and writes `?open=` to the address so the link can be shared. Pages opened from it show the breadcrumb **Marketing › Campaign · *name***.

**Open:** `/campaigns`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Create, prepare and control bulk customer messages.

**Prerequisites:** Campaign access; a ready channel, eligible contacts and an approved template for WhatsApp sends.

**Views and sections:** Campaign list; new-campaign window; setup; audience; message variables; timing/spread; preview; send; pause/resume; delete.

**Step-by-step**

1. Click **New campaign**, enter **Name**, choose **Channel** and its **Approved template**, then click **Create draft**.
2. Open the draft and complete its setup, including audience and template values.
3. Review recipient eligibility, exclusions, timing and the message preview.
4. Select **Send at each recipient’s best time** only if you want the available best-time behaviour.
5. Click **Send now** or the displayed spread-send action only after checking the final summary.
6. Use **Pause** or **Resume** on an eligible running campaign and review results in **Campaign results**.

**Related windows:** [New campaign](#dialog-ar-campaign-builder-1).

[Screenshot P027: Campaigns page showing its principal sections and a suitable sample record; highlight “New campaign” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Creating a draft does not send it. A template approved for a different number is not automatically eligible. Best-time delivery can hold messages; it is not an immediate send.

<a id="page-templates"></a>

### Templates

**Open:** `/templates`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Manage WhatsApp message templates and reusable drafts.

**Prerequisites:** Template access and a selected WhatsApp number; submission also needs channel and Meta eligibility.

**Views and sections:** Number selection; search/status list; host-template browser and pagination; industrial library; draft editing; submission; resubmission.

**Step-by-step**

1. Open **Templates** and choose **WhatsApp number**.
2. Click **Sync from Meta** to refresh the number’s template statuses.
3. Click **New template** to compose a draft, or **Browse host templates**, search and click **Copy as draft**.
4. Use **Add library templates** for available starter wording.
5. Open a draft with **Edit**, review every variable and submit it when ready.
6. Check approval or rejection before using it in campaigns; use **Resubmit to Meta** after correcting a rejected template.

[Screenshot P028: Templates page showing its principal sections and a suitable sample record; highlight “Templates” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Host-approved templates are examples you may copy. A copied draft must be submitted for your own WhatsApp account; it does not inherit approval.

<a id="page-templates-new"></a>

### New template

**Open:** `/templates/new`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Other entry paths:** `/templates/:id/edit`. The same screen/procedure is used; a callback is entered automatically after provider authorisation.

**Purpose:** Write or update a WhatsApp template and request approval.

**Prerequisites:** Template-create or update access; a suitable number and an intended template purpose.

**Views and sections:** Basics; Header optional; Body; Footer optional; Buttons optional.

**Step-by-step**

1. Enter **Name** using lowercase letters, digits and underscores.
2. Select **Language**, **Category** and **Type**.
3. Write the body under **What should this message say?** and add the appropriate header and footer.
4. Use **Add variable** and provide the sample values required by the form.
5. Add quick replies, website or phone buttons only as needed and review the preview.
6. Optionally use **Draft with AI**, review its wording, then click **Check**.
7. Click **Save draft** to continue later or **Save & submit** to request Meta review.

[Screenshot P029: New template page showing its principal sections and a suitable sample record; highlight “Name” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not use a utility category for promotional content. Broken URLs, missing samples or unsupported button combinations can fail validation or approval.

<a id="page-automations"></a>

### Automations

**Open:** `/automations`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Create and manage automated customer journeys.

**Prerequisites:** Automation access/plan feature; channel, trigger data and any required approved templates.

**Step-by-step**

1. Click **New automation**, enter **Name**, choose **Channel** and **Trigger**, then complete keyword or pipeline/stage options if shown. For **AI voice call completed** choose **Which calls** and **With this result**; for **AI voice call not answered** choose **Which calls**.
2. Click **Create draft** and open the builder.
3. Add and review the journey steps, then **Save**.
4. Return to the list, select **Dry-run**, choose a test contact and click **Run dry-run**.
5. Review the dry-run result before choosing **Activate**.
6. Use **Pause** to stop future automated processing when needed.

**Related windows:** [New automation](#dialog-ar-automations-1); [Dry-run](#dialog-ar-automations-2).

[Screenshot P030: Automations page showing its principal sections and a suitable sample record; highlight “New automation” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Saving a draft does not activate it. Review trigger scope and sending permissions before activation; a dry-run is not evidence of a delivered customer message. The two AI voice call triggers run after a call the voice agent handled ends, after its analysis if the agent has one. Calls placed by an automation's own **AI voice call** step never start them, so automations cannot call a customer in a loop.

**New in 1.1:** AI voice call triggers and the **AI voice call** step (27 Oct 2026).

<a id="page-auto-replies"></a>

### Auto-replies

**Open:** `/auto-replies`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Configure welcome, out-of-hours and feedback messages.

**Prerequisites:** Automation access; a suitable channel and approved wording.

**Views and sections:** Welcome message; Away message; Instant acknowledgement (24x7); Business hours; Holidays; Out of office; Satisfaction survey.

**Step-by-step**

1. Open **Auto-replies** and choose the relevant channel if offered.
2. Set the welcome and outside-business-hours reply options and wording.
3. Enter business hours, time zone, holidays and any shutdown date range.
4. Set the repeat-reply waiting period and decide whether every message needs an acknowledgement.
5. Configure the customer feedback question, thank-you message and repeat interval if used.
6. Click **Save** and review the enabled settings.

[Screenshot P031: Auto-replies page showing its principal sections and a suitable sample record; highlight “Auto-replies” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Use the correct time zone and holiday dates. Overlapping automatic replies can confuse customers; test with an approved test contact.

<a id="page-automations-id"></a>

### Automation builder

**Open:** `/automations/:id`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Build the individual steps and branches in an automation.

**Prerequisites:** An existing automation draft and permission to edit it.

**Views and sections:** List; Canvas; step editor; message/template; waits and timeouts; reply capture/buttons; condition branches; assignment; contact attributes; enquiry creation; configured endpoint notification; AI voice call.

**Step-by-step**

1. Open the automation and choose **List** or **Canvas**.
2. Click **Add step** and choose the required message, template, wait, question, condition, assignment, attribute, enquiry, endpoint or **AI voice call** action.
3. Complete the fields displayed for that step, including reply choices, timeouts or destination where relevant.
4. Arrange steps with the available move controls and connect the intended condition branches in the canvas.
5. Decide whether both branches rejoin when that option is shown.
6. Click **Save**, return to the list and run a dry-run before activating.

**AI voice call step:** choose **Call on**: **WhatsApp** (contacts who allowed calls) or **Phone line (Exotel)** (through the voice line's AI call flow; voicemail and operator announcements count as not answered), then enter an optional **Reason for the call**, optional **Variables** (one `name=value` per line; a value may name a contact field such as `attr.plan`), **Wait for the result (hours)** (1–168) and an optional prefix under **Save extracted fields with prefix**. The voice agent published on the automation's number calls only contacts who gave call permission and have not opted out, between 09:00 and 21:00 India time; outside those hours the step waits for the window. The steps directly below run when the call is answered and meets its goal. **Otherwise** runs when the call is not answered, the goal is not met, the call cannot be placed, or no result arrives in time. In a later **If…** step, pick the **AI call:** fields (answered, goal met, sentiment, summary, end reason, length) or **AI call: extracted field…** with the field key. A dry-run never places a call and follows the goal-met path.

[Screenshot P032: Automation builder page showing its principal sections and a suitable sample record; highlight “List” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check what happens when a customer does not reply. A journey that ends at a branch may not continue to later steps unless configured to rejoin.

<a id="page-flows"></a>

### Flows

**Open:** `/flows`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Manage interactive WhatsApp flows and inspect their completion funnel.

**Prerequisites:** Flows access/plan feature; a connected WhatsApp channel.

**Step-by-step**

1. Click **New flow**, enter **Name**, choose **Channel** and click **Create draft**.
2. Select **Design** and complete the flow screens and questions.
3. Return and choose **Publish to Meta** after review.
4. Use **Funnel** to inspect available completion statistics.
5. Use **Deprecate** for a flow that should no longer be offered, or **Re-publish** where that action is available.

**Related windows:** [New flow](#dialog-ar-flows-1); [— funnel](#dialog-ar-flows-2).

[Screenshot P033: Flows page showing its principal sections and a suitable sample record; highlight “New flow” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A saved local design is not a published Meta flow. Check publication status before using it with customers.

<a id="page-flows-id"></a>

### Flow designer

**Open:** `/flows/:id`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Design the screens and fields of a WhatsApp flow.

**Prerequisites:** An existing flow and edit permission; an approved endpoint if a screen webhook is needed.

**Step-by-step**

1. Open **Design** for the flow.
2. Enter **Flow name** and **Screen title**.
3. Click **Add field**, choose its type and enter its label/options; select **Required** only when necessary.
4. Click **Add screen** for another page in the flow.
5. Set a screen webhook only when your administrator has supplied the approved configuration.
6. Click **Save**, review the full flow, then return to the flow list for publication.

[Screenshot P034: Flow designer page showing its principal sections and a suitable sample record; highlight “Design” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not collect more information than the process requires. A screen webhook must be correctly configured before customers rely on it.

<a id="page-forms"></a>

### Web forms

**Open:** `/forms`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Build public enquiry forms and review their submissions.

**Prerequisites:** Channel/form access; approved consent wording and any desired contact-field mapping.

**Views and sections:** Form list; editor; question mapping; consent; enquiry creation; thank-you/redirect; submissions; website embed.

**Step-by-step**

1. Click **New form**, enter the internal name, public **Heading** and optional introduction.
2. Click **Add a question**, enter the question, answer type, destination field and options, and select **Required** as needed.
3. Arrange questions with the arrows and remove unwanted questions.
4. Enter the required contact-consent wording and optional separate marketing-consent wording.
5. Choose whether each submission creates an enquiry, set the button and thank-you message/redirect, then click **Save form**.
6. Use **Copy link** or **Embed on a website** to publish the form.
7. Open **Submissions** to review responses; use **Turn off** to stop new submissions.

[Screenshot P035: Web forms page showing its principal sections and a suitable sample record; highlight “New form” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A public form should not collect secrets. Review required fields and consent before sharing its link.

<a id="sales-planning-and-customer-orders"></a>

## Sales, planning and customer orders

| Page | Open here |
| --- | --- |
| [Enquiries](#page-enquiries) | `/enquiries` |
| [Pipelines](#page-enquiries-pipelines) | `/enquiries/pipelines` |
| [Forecast](#page-forecast) | `/forecast` |
| [Quotations](#page-quotations) | `/quotations` |
| [Autonomous AI Negotiator](#page-pipeline-ai-negotiator) | `/pipeline/ai-negotiator` |
| [Projection Plan](#page-pipeline-projection-plan) | `/pipeline/projection-plan` |
| [Sales orders](#page-sales-orders) | `/sales/orders` |
| [Delivery challans](#page-sales-challans) | `/sales/challans` |
| [Sales invoices](#page-sales-invoices) | `/sales/invoices` |
| [AMC renewals](#page-renewals) | `/renewals` |
| [Spares due](#page-spares) | `/spares` |
| [Collections](#page-collections) | `/collections` |
| [Re-orders](#page-reorders) | `/reorders` |
| [Dealer network](#page-network) | `/network` |
| [Leads for us](#page-network-incoming) | `/network/incoming` |
| [Installed base](#page-installed-base) | `/installed-base` |
| [New enquiry](#page-enquiries-new) | `/enquiries/new` |
| [Quotation page](#page-quotations-new) | `/quotations/new`, `/quotations/:id/edit` |
| [New sales order](#page-sales-orders-new) | `/sales/orders/new` |
| [Sales order](#page-sales-orders-id) | `/sales/orders/:id` |
| [New delivery challan](#page-sales-challans-new) | `/sales/challans/new` |
| [Delivery challan](#page-sales-challans-id) | `/sales/challans/:id` |
| [New invoice](#page-sales-invoices-new) | `/sales/invoices/new` |
| [Sales invoice](#page-sales-invoices-id) | `/sales/invoices/:id` |
| [Spare part rules](#page-spares-rules) | `/spares/rules` |
| [Collection reminders](#page-collections-settings) | `/collections/settings` |
| [Send a re-order link](#page-reorders-send) | `/reorders/send` |
| [Re-order portal settings](#page-reorders-settings) | `/reorders/settings` |
| [Dispatch an order](#page-reorders-dispatch) | `/reorders/dispatch/:quotationId` |
| [Register a machine](#page-installed-base-new) | `/installed-base/new` |

<a id="page-enquiries"></a>

### Enquiries

**Open:** `/enquiries`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Track potential business through your sales stages.

**Prerequisites:** Pipeline access and an existing customer contact.

**Views and sections:** Pipeline board; new enquiry; detail drawer; notes/activity; owner/stage; linked quotation; dealer routing.

**Step-by-step**

1. Open **Enquiries** and select the relevant pipeline.
2. Click **New enquiry**, choose the contact and enter **Title**, optional **Requirement**, **Est. value** and **Source**.
3. Click **Create enquiry**.
4. Open a card to review its customer, notes and linked work in the enquiry drawer.
5. Use **Advance** or the available stage control as the deal progresses.
6. Create or review related tasks, meetings and quotations from the detail actions.

**Related windows:** [Schedule or edit a meeting](#dialog-ar-meeting-dialog-1); [Create or edit a task](#dialog-ar-task-dialog-1); [Call](#dialog-ar-call-dialog-1); [How did the call go?](#dialog-ar-call-outcome-dialog-1); [Log a call with](#dialog-ar-log-call-dialog-1); [Ticket](#dialog-ar-ticket-detail-dialog-1); [Raise a ticket for](#dialog-ar-ticket-dialog-1); [Route to a dealer](#dialog-ar-route-lead-dialog-1); [New enquiry](#dialog-ar-enquiries-1); [Edit enquiry](#dialog-ar-enquiry-drawer-1).

[Screenshot P036: Enquiries page showing its principal sections and a suitable sample record; highlight “Enquiries” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Choose the correct pipeline before adding a deal. Marking a stage is different from issuing a quotation or receiving payment.

<a id="page-enquiries-new"></a>

### New enquiry

**Open:** `/enquiries/new`, from **New enquiry** on Enquiries. **Who can use it:** Users who may create enquiries.

**Purpose:** Put a new sales opportunity into the first stage of a pipeline.

**Prerequisites:** Enquiry access; the customer as a contact, or their details to add one.

**Views and sections:** Customer; pipeline; title; requirements; estimated value; lead source.

**Step-by-step**

1. Pick the customer contact, or add a new contact on the page.
2. Choose the pipeline.
3. Enter a title that names the equipment or project.
4. Add the technical requirements, the estimated value in rupees and the lead source.
5. Click **Create Enquiry**.

**Fields:** see [New enquiry](#dialog-ar-enquiries-1).

[Screenshot P128: New enquiry page with a sample customer, pipeline and value.]

**Tips and common errors:** The estimated value feeds the forecast and funnel figures; leave it blank rather than guess.

<a id="page-enquiries-pipelines"></a>

### Pipelines

**Open:** `/enquiries/pipelines`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Set up sales pipelines and their ordered stages.

**Prerequisites:** Permission to manage pipelines; understand where existing enquiries should move.

**Step-by-step**

1. Open **Enquiries** and click **Pipelines**.
2. Click **New pipeline**, enter **Name**, and optionally start from a standard or copied pipeline.
3. Add stages with **Add stage**, choose their meaning under **Counts as**, and save.
4. Use the arrow controls to arrange stages.
5. Choose **Make default** only for the pipeline you want new default work to use.
6. Before deleting a used pipeline or stage, choose **Move enquiries to** and review the destination, then confirm the deletion.

**Related windows:** [Pipeline and stage management window](#dialog-ar-pipeline-stages-1).

[Screenshot P037: Pipelines page showing its principal sections and a suitable sample record; highlight “Enquiries” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Changing whether a stage counts as won or lost affects reporting. Never delete a populated stage without reviewing where its enquiries will move.

<a id="page-forecast"></a>

### Forecast

**Open:** `/forecast`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Plan sales targets and compare expected revenue with quotas.

**Prerequisites:** Pipeline data and forecast access; management permission to change quotas or assumptions.

**Views and sections:** How earlier forecasts turned out; By person; Deals due this period; How likely each stage is to win; How this forecast has moved.

**Step-by-step**

1. Open **Forecast** and select **Month** or **Quarter** and the period.
2. Review the forecast, quota and conversion assumptions.
3. Click **Set quotas**, enter the intended amounts and click **Save quotas**.
4. Open **Assumptions** to set the financial-year start, stage chances and learning option for the selected pipeline.
5. Click **Save** or **Use the default chances for this pipeline**, as appropriate.
6. Click **Save today’s forecast** to retain a snapshot.

**Related windows:** [Quotas](#dialog-ar-forecast-1); [Forecast assumptions](#dialog-ar-forecast-2).

[Screenshot P038: Forecast page showing its principal sections and a suitable sample record; highlight “Forecast” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Forecast amounts depend on the selected period, stage probabilities and data quality; they are not booked revenue.

<a id="page-quotations"></a>

### Quotations

**Open:** `/quotations`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Prepare, issue and track customer quotations.

**Prerequisites:** Quotation access; products or line details; an eligible channel for customer delivery.

**Views and sections:** Quotation list; Edit and View links; PDF; signature; won/lost; deletion.

**Step-by-step**

1. Click **New quotation**. The quotation opens as its own page (see [Quotation page](#page-quotations-new)).
2. Click **Edit** on a draft or issued quotation to change its lines or issue a revision; **View** opens a won, lost or expired one read-only.
3. Use **PDF** to download the document and **Signature** to manage signing.
4. Mark **Won** or **Lost** only when the outcome is known; give the reason when marking it lost.

**Related windows:** [Create, send or withdraw a quotation-signing link](#dialog-ar-quote-signature-dialog-1).

[Screenshot P039: Quotations list with sample rows; highlight New quotation, Edit and PDF. Use approved sample data.]

**Tips and common errors:** A draft is not an issued quotation. Check tax, totals, validity and recipients before issuing.

<a id="page-quotations-new"></a>

### Quotation page

**Open:** `/quotations/new`. **Other entry paths:** `/quotations/:id/edit`; `?enquiry=` starts from an enquiry, `?contact=` or `?account=` from a customer. **Who can use it:** Users who may create and issue quotations.

**Purpose:** Write a quotation against an open enquiry, or by hand for any customer, and issue it on WhatsApp and/or by email with the PDF attached.

**Prerequisites:** Quotation access. The catalogue and price lists price parts automatically; anything can also be typed. Email needs an email channel or the platform relay.

**Views and sections:** Against an enquiry / Manual quotation; customer and Addressed to; lines; totals; issue options (Valid for, WhatsApp, Email, recipients).

**Step-by-step**

1. Choose **Against an enquiry** and pick it, or **Manual quotation** and pick a contact, or an account and the person there it is **Addressed to**.
2. Search the catalogue to add parts, or click **Add a line by hand**.
3. Check quantities, prices, discounts and GST, then the totals. On an existing quotation, **Check prices** brings list-priced lines up to today.
4. Click **Save draft** (or **Save changes**) to keep it without sending.
5. To issue: set **Valid for**, tick **WhatsApp** and/or **Email**, tick who at the account gets it and add other email addresses if needed, then click **Save and issue**.
6. Click **PDF** to download it. A draft is rendered fresh; an issued quotation downloads exactly as sent.

**Fields:** the line fields are described in [Quotation line editor](#window-004).

[Screenshot P129: Quotation page for a manual quotation to an account, with two catalogue lines, totals and the issue options; highlight Save and issue.]

**Tips and common errors:** A manual quotation opens an enquiry for the customer, so follow-ups and won/lost still work. Recipients must belong to the same account. Every send carries the PDF; outside WhatsApp's 24-hour window the PDF goes only with a template that has a document header, and the template picker says whether it attaches the PDF or sends text only. Issuing again sends a new revision and restarts the follow-ups. Won, lost and expired quotations open read-only.

<a id="page-pipeline-ai-negotiator"></a>

### AI negotiator

**Open:** `/pipeline/ai-negotiator`. **Who can use it:** Signed-in users with access to this page; the workspace must include the plan feature.

**Purpose:** Work out a reply to a customer who is bargaining over an issued quotation, within your discount rules.

**Prerequisites:** An issued or revised quotation, and the negotiation rules set by a manager.

**Views and sections:** Negotiations; outcome panel; Rules; Practice.

**Step-by-step**

1. Click **Start a negotiation**, pick the issued quotation and enter what the customer said.
2. Click **Work out a reply**. The outcome panel at the top shows the suggested reply and price.
3. Click **Copy reply** and send it to the customer yourself.
4. Click **Apply to quotation** to put an agreed price on the quotation, or **Take over** to handle it without suggestions.
5. Use **Rules** to set the limits, and **Practice** to try it on sample messages.

[Screenshot P130: AI negotiator with a negotiation open and the outcome panel showing a suggested reply; highlight Copy reply.]

**Tips and common errors:** It never messages the customer: you copy the reply and send it. Suggestions follow your rules; they are worked out by fixed rules, not by an AI model.

<a id="page-pipeline-projection-plan"></a>

### Projection plan

**Open:** `/pipeline/projection-plan`. **Who can use it:** Signed-in users with access to this page; updating needs the update permission.

**Purpose:** Plan the year's sales targets from your real invoiced revenue and open pipeline, and track actuals against them.

**Prerequisites:** Issued sales invoices and enquiries give the plan its starting figures.

**Views and sections:** Executive dashboard; plans; Lines; outcome panel.

**Step-by-step**

1. Click **New plan**, enter the annual target, growth and gross margin, then click **Generate plan**. The plan starts from your net invoiced revenue of the last 12 months, plus open pipeline weighted by stage, and is saved as a draft.
2. Check the steps shown in the outcome panel.
3. On **Lines**, use **Edit targets** where needed, then sync the actuals: the outcome panel shows how many invoices and how much revenue were counted.
4. **Activate** the plan you will work to; any other active plan becomes inactive.

[Screenshot P131: Projection plan dashboard with an active plan and the outcome panel after a sync.]

**Tips and common errors:** If the workspace has no invoices or pipeline yet, the plan starts from a ₹10 Cr placeholder and says so; replace it with real targets. Opening the dashboard never creates a plan.

<a id="page-sales-orders"></a>

### Sales orders

**Open:** `/sales/orders`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** List customer orders and open each one on its own page.

**Prerequisites:** Sales order access.

**Views and sections:** Order list; customer filter; PDF and Excel registers.

**Step-by-step**

1. Click **New sales order** to raise one (see [New sales order](#page-sales-orders-new)).
2. Click an order to open its page (see [Sales order](#page-sales-orders-id)).
3. Download the list as PDF or Excel where offered.

[Screenshot P040: Sales orders list with sample rows; highlight New sales order. Use approved sample data.]

**Tips and common errors:** Opened from Customer 360, the list shows only that customer, with **Show all** to clear it.

<a id="page-sales-orders-new"></a>

### New sales order

**Open:** `/sales/orders/new`. **Who can use it:** Users who may create sales orders.

**Purpose:** Raise a sales order for an account and its contact person, with their PO, terms and items.

**Prerequisites:** The customer as an account (or a contact); products in the catalogue to pick items, which needs Products access (without it, type the lines by hand).

**Views and sections:** Customer (Account or Contact); billing and site address; PO and terms; items.

**Step-by-step**

1. Choose the account, then the contact person who placed the order, or switch to **Contact** for a person with no account.
2. The billing and site addresses fill in from the account; pick another shipping address if the goods go elsewhere.
3. Enter the customer's PO and the terms.
4. Type an item name and pick it from the catalogue: the item number, description, HSN, price and GST fill in.
5. Click **Create Sales Order**. Its page opens.

**Fields:** see [Create New Sales Order](#dialog-ar-sales-orders-2).

[Screenshot P132: New sales order with an account, contact person, default shipping address and two catalogue items.]

**Tips and common errors:** Opened from a customer's 360, the account and person are already chosen and you return there.

<a id="page-sales-orders-id"></a>

### Sales order

**Open:** `/sales/orders/:id`, by opening an order. **Who can use it:** Users with access to Sales orders.

**Purpose:** See one order on one page (PO, terms, site address, items, totals) and move it on.

**Prerequisites:** An existing order.

**Views and sections:** Order header; items with dispatched and invoiced quantities; totals; actions.

**Step-by-step**

1. Check the customer PO and the items.
2. **Confirm** a draft order.
3. From a confirmed order, click **Create delivery challan** or **Generate sales invoice**; each opens on its own page.
4. **PDF** downloads the printed sales order; **Excel** saves it with its lines.
5. **Back** returns to the list, or to the Customer 360 you came from.

[Screenshot P133: Sales order page for a confirmed order with dispatched quantities; highlight Create delivery challan.]

**Tips and common errors:** Each item shows how much has been dispatched and invoiced, so check it before raising another challan.

<a id="page-sales-challans"></a>

### Delivery challans

**Open:** `/sales/challans`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** List goods sent to customers and open each challan on its own page.

**Prerequisites:** Challan access.

**Views and sections:** Challan list; customer filter; PDF and Excel registers.

**Step-by-step**

1. Click **New challan** to record goods sent (see [New delivery challan](#page-sales-challans-new)).
2. Click a challan to open its page, where it is dispatched, delivered and billed (see [Delivery challan](#page-sales-challans-id)).

[Screenshot P041: Delivery challans list with sample rows; highlight New challan.]

**Tips and common errors:** Opened from Customer 360, the list shows only that account's challans, with **Show all** to clear it.

<a id="page-sales-challans-new"></a>

### New delivery challan

**Open:** `/sales/challans/new`. **Who can use it:** Users who may create challans.

**Purpose:** Record goods sent to a customer, with the ship-to address and items.

**Prerequisites:** The customer as an account or contact; catalogue products to pick items.

**Views and sections:** Customer (Account or Contact); site address; challan type; items.

**Step-by-step**

1. Choose the account, then the contact person the goods go to, or switch to **Contact**.
2. The site address fills in from the account's default shipping address; pick another if the goods go elsewhere.
3. Set the challan type.
4. Type an item name and pick it from the catalogue: item number, description, HSN and unit fill in.
5. Save the draft. Its page opens, ready to dispatch.

[Screenshot P134: New delivery challan with an account, site address and items.]

**Tips and common errors:** From an account's Customer 360 the customer is filled in and you return there.

<a id="page-sales-challans-id"></a>

### Delivery challan

**Open:** `/sales/challans/:id`; `?dispatch=1` opens the transport form. **Who can use it:** Users with access to Delivery challans.

**Purpose:** Dispatch, deliver and bill one challan from one page.

**Prerequisites:** An existing challan.

**Views and sections:** Rule 55 purpose; transport; site address; goods; actions.

**Step-by-step**

1. Click **Dispatch consignment**, enter the transporter, vehicle number, LR and 12-digit e-Way Bill number, then **Confirm dispatch**.
2. Click **Mark as delivered** when the goods arrive.
3. Click **Bill delivery (tax invoice)** to raise the invoice; its page opens.
4. **PDF** downloads the printed challan; **Excel** saves it with its items.

**Fields:** see [Dispatch Challan](#dialog-ar-delivery-challans-2).

[Screenshot P135: Delivery challan page after dispatch, showing transport details; highlight Mark as delivered.]

**Tips and common errors:** Check the e-Way Bill number has 12 digits before confirming.

<a id="page-sales-invoices"></a>

### Sales invoices

**Open:** `/sales/invoices`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** List GST invoices to customers, their balances and payments.

**Prerequisites:** Sales invoice access.

**Views and sections:** Invoice list; customer filter; PDF and Excel registers.

**Step-by-step**

1. Click **New sales invoice** to raise one (see [New invoice](#page-sales-invoices-new)).
2. Click an invoice to open its page, where it is issued and paid (see [Sales invoice](#page-sales-invoices-id)).

[Screenshot P042: Sales invoices list with sample rows; highlight New sales invoice.]

**Tips and common errors:** Opened from Customer 360, the list shows only that account's invoices, with **Show all** to clear it.

<a id="page-sales-invoices-new"></a>

### New invoice

**Open:** `/sales/invoices/new`. **Who can use it:** Users who may create invoices.

**Purpose:** Raise a GST invoice with the customer's GSTIN, terms and items.

**Prerequisites:** The customer; their GSTIN and addresses fill in from their account.

**Views and sections:** Customer and GSTIN; dates; items.

**Step-by-step**

1. Check the customer and their GSTIN, the dates and the items.
2. Save it as a draft. Its page opens, where you issue it once it is checked.

[Screenshot P136: New invoice page with customer GSTIN and items.]

**Tips and common errors:** From an account, the customer is filled in and you return to its Customer 360.

<a id="page-sales-invoices-id"></a>

### Sales invoice

**Open:** `/sales/invoices/:id`; `?pay=1` opens the payment form. **Who can use it:** Users with access to Sales invoices; recording payments needs its own permission.

**Purpose:** Issue one tax invoice and record its payments.

**Prerequisites:** An existing invoice.

**Views and sections:** GSTIN; lines with CGST and SGST or IGST; totals; balance due; payments.

**Step-by-step**

1. Check the lines and taxes, then click **Issue tax invoice**. Issuing also enters it in the GST register.
2. Click **Record payment**, enter the amount, mode and UTR, then **Confirm payment**.
3. **PDF** downloads the printed invoice with its GST split; **Excel** saves it with its lines and payments.
4. **Back** returns to the list, or to the Customer 360 you came from.

**Fields:** see [Record Payment for](#dialog-ar-sales-invoices-2).

[Screenshot P137: Sales invoice page with GST split and balance due; highlight Record payment.]

**Tips and common errors:** Recording a payment does not move money; enter the bank's UTR so it can be reconciled. The balance and overdue mark update once the payment is confirmed.

<a id="page-renewals"></a>

### AMC renewals

**Open:** `/renewals`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Identify annual maintenance contracts approaching renewal and draft their quotations.

**Prerequisites:** Renewal access; installed machines with AMC end dates and values; suitable products/settings.

**Step-by-step**

1. Open **AMC renewals**, search the required contract and click **Refresh** if needed.
2. Open **Settings**, review yearly uplift, the AMC item code and destination pipeline, then save.
3. Select a renewal and click **Draft renewal quote**.
4. Open the draft quotation, verify dates, price and terms, then follow the quotation issue procedure.
5. If renewal business is lost, click **Mark lost**, enter a reason and save.

**Related windows:** [Mark lost](#dialog-ar-renewals-1); [Renewal settings](#dialog-ar-renewals-2).

[Screenshot P045: AMC renewals page showing its principal sections and a suitable sample record; highlight “AMC renewals” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A draft renewal quote is not a renewed contract. Missing AMC values or the wrong item code can prevent a useful draft.

<a id="page-spares"></a>

### Spares due

**New in 1.2:** spare part rules are kept on their own page, [Spare part rules](#page-spares-rules) (`/spares/rules`).

**Open:** `/spares`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Review replacement parts due on installed equipment and manage reminders.

**Prerequisites:** Spares access; installed equipment and spare-part rules; approved templates for WhatsApp reminders.

**Step-by-step**

1. Open **Spares due** and click **Check now**.
2. Use **Rules** to enter machine identification, spare part number, description, quantity, interval and how early to show it, then **Add rule**.
3. Review due parts and use **Quote** or **Re-order link** for the customer.
4. Mark **Changed today** only when the part was replaced, or **Dismiss** an irrelevant due item.
5. Open **Customer reminders**, choose approved reminder/follow-up templates and timing, then **Save**.
6. Use **Send due reminders now** only when the recipients and reminder configuration have been checked.

**Related windows:** [Remind customers on WhatsApp](#dialog-ar-spares-1); [Spare part rules](#dialog-ar-spares-2); [Re-order link for](#dialog-ar-send-reorder-link-1).

[Screenshot P046: Spares due page showing its principal sections and a suitable sample record; highlight “Spares due” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Replacing a rule does not physically replace a part. Repeated reminders contact customers; check follow-up count and consent first.

<a id="page-spares-rules"></a>

### Spare part rules

**Open:** `/spares/rules`, from Spares due. **Who can use it:** Users who may manage spares rules.

**Purpose:** Say which spare parts each machine model needs and how often, so spares fall due on their own.

**Prerequisites:** Machines registered in the installed base, with their model.

**Views and sections:** Rule list (machine model, part number, description, default quantity, interval, lead time); rule form.

**Step-by-step**

1. Enter the **Machine Make (optional)** and **Machine Model**.
2. Enter the **Spare Part Number**, **Part Description** and **Default Quantity**.
3. Enter the **Replacement Interval (Days)** and, if known, the **Procurement Lead Time (Days)**.
4. Save the rule. Use **Edit** or **Delete** on a row to change it, and **Cancel Edit** to stop editing.
5. Click **Back to Spares Due** when finished.

**Fields:** see [Spare part rules](#dialog-ar-spares-2).

[Screenshot P138: Spare part rules page with two sample rules and the rule form.]

**Tips and common errors:** The model must match the model on the machine records, or the rule will not apply to them.

<a id="page-collections"></a>

### Collections

**Open:** `/collections`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Follow up outstanding customer balances.

**Prerequisites:** Collections access; current receivable data; approved reminder templates; payment setup if links are included.

**Step-by-step**

1. Open **Collections** and review the customer and due balance.
2. Open **Settings**, choose whether reminders are automatic and select an approved WhatsApp template.
3. Set **Credit days** for cases where the source has no due date, and choose whether to include a BillDesk link.
4. Click **Save**.
5. Use **Remind now** for one eligible balance or **Send due reminders now** for the due set after reviewing it.

**Related windows:** [Collection reminders](#dialog-ar-collections-1).

[Screenshot P047: Collections page showing its principal sections and a suitable sample record; highlight “Collections” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check that a payment is not already received before reminding a customer. A reminder being sent does not mean the balance was paid.

<a id="page-collections-settings"></a>

### Collection reminders

**Open:** `/collections/settings`, from Collections. **Who can use it:** Users who may manage collections settings.

**Purpose:** Choose the WhatsApp template payment reminders use, the credit days and the pay link.

**Prerequisites:** An approved reminder template; for the pay link, a payment gateway connected in **Settings › Payments**.

**Views and sections:** Template; credit days; Send reminders automatically; pay link.

**Step-by-step**

1. Pick the approved template and check the credit days used when the ERP gives no due date.
2. Tick **Send reminders automatically**, and the pay link if wanted.
3. Click **Save**.

**Fields:** see [Collection reminders](#dialog-ar-collections-1).

[Screenshot P139: Collection reminders page with a template chosen and automatic reminders ticked.]

**Tips and common errors:** The pay link can be ticked only once a payment gateway is connected.

<a id="page-reorders"></a>

### Re-orders

**Open:** `/reorders`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** See what customers have sent from their re-order portal, and dispatch won orders.

**Prerequisites:** Re-order portal access; products and prices and, for immediate checkout, enabled payment links.

**Views and sections:** Waiting for the customer's approver; incoming requests; won orders to dispatch; delivery status.

**Step-by-step**

1. Open **Re-orders** and review incoming requests. Each arrives as a draft quotation to check and issue.
2. Click **Portal settings** to set how the portal works (see [Re-order portal settings](#page-reorders-settings)).
3. Click **Send a re-order link** to give a customer their personal page (see [Send a re-order link](#page-reorders-send)).
4. On a won order, click **Dispatch** to record how it was sent (see [Dispatch an order](#page-reorders-dispatch)).
5. Update **In transit**, **Delivered** or **Problem** only when the status is known.

[Screenshot P048: Re-orders page with sample incoming requests; highlight Portal settings and Send a re-order link. Use approved sample data.]

**Tips and common errors:** Buyers and credit are now set from **Accounts** ([Buyers & credit](#page-contacts-accounts-credit)), and shipping settings from **Settings › Shipping** ([Shipping](#page-settings-shipping)). If the portal is off, a banner says so; switch it on in Portal settings before sending links.

<a id="page-reorders-send"></a>

### Send a re-order link

**Open:** `/reorders/send`; `?contact=` skips the customer picker. **Who can use it:** Users who may send re-order links.

**Purpose:** Give one customer their personal re-order page on WhatsApp.

**Prerequisites:** The portal switched on; the customer as a contact with a WhatsApp number.

**Views and sections:** Customer; the link.

**Step-by-step**

1. Choose the customer, then click **Continue**. The link goes on WhatsApp.
2. If it could not be sent, copy the link shown into an email or another chat.
3. Click **Done** to return to Re-orders.

[Screenshot P140: Send a re-order link page showing the link after sending.]

**Tips and common errors:** The link is personal to that customer; do not forward it to someone else.

<a id="page-reorders-settings"></a>

### Re-order portal settings

**Open:** `/reorders/settings`. **Who can use it:** Users with the re-order portal settings permission.

**Purpose:** Decide what a customer request becomes, and how the portal looks and signs customers in.

**Prerequisites:** The re-order portal add-on for the workspace.

**Views and sections:** On/off; request becomes a draft quotation or an order paid by link; heading and introduction; link lifetime; minimum order; stock display; sign-in and public catalogue; WhatsApp templates.

**Step-by-step**

1. Switch the portal on and choose what happens when a customer sends a request.
2. Set the heading, link days, minimum order and stock display.
3. Choose whether password sign-in and the public catalogue are on, and whether list prices are public.
4. Choose the WhatsApp templates, then click **Save**.

**Fields:** see [Re-order portal settings](#dialog-ar-reorders-2).

[Screenshot P141: Re-order portal settings with the portal on and quotation mode chosen.]

**Tips and common errors:** Order-and-pay needs payments configured. Public price visibility is a separate choice from turning the catalogue on.

<a id="page-reorders-dispatch"></a>

### Dispatch an order

**Open:** `/reorders/dispatch/:quotationId`, from **Dispatch** on a won re-order. **Who can use it:** Users who may dispatch orders.

**Purpose:** Record how a won re-order was sent, and tell the customer on WhatsApp with the tracking link.

**Prerequisites:** A won re-order. Shiprocket rates need Shiprocket set up in **Settings › Shipping**.

**Views and sections:** Transporter and docket; Shiprocket rates; tracking link; expected date; packages; freight.

**Step-by-step**

1. Enter the transporter and the docket, LR or AWB number, or get Shiprocket rates and pick a courier.
2. Add the tracking link, expected date, packages and freight if known.
3. Click **Dispatch**.

**Fields:** see [Dispatch](#dialog-ar-reorder-dispatch-1).

[Screenshot P142: Dispatch an order page with transporter and docket filled in.]

**Tips and common errors:** Transporters you book directly work without Shiprocket.

<a id="page-network"></a>

### Dealer network

**Open:** `/network`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Manage dealer relationships and route customer leads.

**Prerequisites:** Dealer-network access, an eligible plan and appropriate customer permission before sharing data.

**Views and sections:** OEM dealers/territories; dealer memberships; routed leads; incoming leads; read-only shared conversation; network settings.

**Step-by-step**

1. As an OEM, choose **Invite a dealer**, enter dealer name and territory/product-line coverage, then **Create invite** and share the code through your approved process.
2. As a dealer, enter the OEM’s invite code and click **Join**.
3. Review dealer territory with **Edit territory**; pause/resume new leads when appropriate.
4. Use the enquiry’s **Route to a dealer** action to choose an eligible dealer and confirm customer consent.
5. Review lead progress and use **Take back**, **Route again** or **Close without a dealer** only for the correct case.
6. In **Settings**, configure response time, fallback routing and any permitted conversation sharing, then **Save**.

**Related windows:** [Territory · / Invite a dealer](#dialog-ar-network-1); [Conversation with](#dialog-ar-network-2); [Network settings](#dialog-ar-network-3); [Details — Dealer network](#dialog-ar-network-4); [Route to a dealer](#dialog-ar-route-lead-dialog-1).

[Screenshot P049: Dealer network page showing its principal sections and a suitable sample record; highlight “Invite a dealer” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Sharing a conversation requires the customer-consent wording to cover that sharing. An invite code should be sent only to the intended dealer.

<a id="page-network-incoming"></a>

### Leads for us

**Open:** `/network/incoming`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Accept or return customer leads offered by another company.

**Prerequisites:** A linked dealer account and permission to receive the relevant leads.

**Views and sections:** sent.

**Step-by-step**

1. Open **Leads for us**.
2. Select the incoming lead and read its requirement, territory and sharing information.
3. Click **Accept lead** if your team can handle it; otherwise click **Decline** and give the requested reason.
4. Review **Conversation** when shared and contact the customer only within the recorded consent.
5. Use **Hand back** with a reason if the accepted lead must return to the OEM.

**Related windows:** [Territory · / Invite a dealer](#dialog-ar-network-1); [Conversation with](#dialog-ar-network-2); [Network settings](#dialog-ar-network-3); [Details — Leads for us](#dialog-ar-network-4); [Route to a dealer](#dialog-ar-route-lead-dialog-1).

[Screenshot P050: Leads for us page showing its principal sections and a suitable sample record; highlight “Leads for us” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A lead offer can have a response deadline. Do not copy shared customer history outside your approved working process.

<a id="page-installed-base"></a>

### Installed base

**Open:** `/installed-base`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Register customer equipment and maintain service and AMC information.

**Prerequisites:** Installed-base access; a customer and reliable equipment identity.

**Step-by-step**

1. Click **Register machine** and select the customer.
2. Enter description, serial number, make/model and site information, plus AMC date/value/term where applicable.
3. Click **Register** and check the record.
4. Use **Edit** to correct details, **Log service** for completed work, or **Retire** for equipment no longer in service.
5. Use **Import AMC values**, upload/paste the required rows, click **Check**, review the proposed changes, then **Apply**.
6. Enable **Show retired** when you need historical equipment.

**Related windows:** [Import AMC values](#dialog-ar-installed-base-1); [Edit machine / Register a machine](#dialog-ar-installed-base-2).

[Screenshot P051: Installed base page showing its principal sections and a suitable sample record; highlight “Register machine” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Serial numbers help distinguish identical machines. Review import matches before applying values; retiring preserves a different business meaning from deleting.

<a id="page-installed-base-new"></a>

### Register a machine

**Open:** `/installed-base/new`. **Who can use it:** Users who may manage the installed base.

**Purpose:** Add a machine so its AMC, service and spares follow it.

**Prerequisites:** The owner as a contact. From an account, the owner is filled in.

**Views and sections:** Owner; description; serial number; AMC end date, value and term; make; model; site.

**Step-by-step**

1. Choose the owner contact and describe the machine.
2. Add its serial number, AMC end date, AMC value (before GST) and term in months (12 if left blank).
3. Add the make, model, site name and site city.
4. Click **Register**.

**Fields:** see [Edit machine / Register a machine](#dialog-ar-installed-base-2).

[Screenshot P143: Register a machine page with sample machine details.]

**Tips and common errors:** Enter the model exactly as your spare part rules use it.

<a id="inventory-and-purchasing"></a>

## Inventory and purchasing

| Page | Open here |
| --- | --- |
| [Stock](#page-stock) | `/stock` |
| [Stock planning](#page-stock-planning) | `/stock/planning` |
| [Purchasing](#page-purchasing) | `/purchasing` |
| [Goods receipt (GRN)](#page-purchasing-grn) | `/purchasing/grn` |
| [Vendor bills](#page-purchasing-bills) | `/purchasing/bills` |
| [Vendor debit notes](#page-purchasing-debit-notes) | `/purchasing/debit-notes` |
| [Vendor 360](#page-purchasing-vendor-360) | `/purchasing/vendor-360` |
| [New supplier / Edit supplier](#page-purchasing-suppliers-new) | `/purchasing/suppliers/new`, `/purchasing/suppliers/:id/edit` |
| [New purchase order / Edit purchase order](#page-purchasing-orders-new) | `/purchasing/orders/new`, `/purchasing/orders/:id/edit` |
| [Inward goods receipt](#page-purchasing-grn-new) | `/purchasing/grn/new` |
| [Goods receipt](#page-purchasing-grn-id) | `/purchasing/grn/:id` |
| [QC inspection](#page-purchasing-grn-inspect) | `/purchasing/grn/:id/inspect` |
| [Record vendor bill](#page-purchasing-bills-new) | `/purchasing/bills/new` |
| [Vendor bill](#page-purchasing-bills-id) | `/purchasing/bills/:id` |
| [Issue debit note](#page-purchasing-debit-notes-new) | `/purchasing/debit-notes/new` |
| [Debit note](#page-purchasing-debit-notes-id) | `/purchasing/debit-notes/:id` |

<a id="page-stock"></a>

### Stock

**Open:** `/stock`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** View stock balances and record authorised stock movements.

**Prerequisites:** Inventory access; products and locations; a clear decision about whether stock is maintained here or in the ERP.

**Views and sections:** Balances; ERP read; setup/settings; receive; issue; adjust; count; minimum; tracking; serials/batches; history; trace; import; locations.

**Step-by-step**

1. Open **Stock** and select a part/location; use **Below minimum only** when needed.
2. If not configured, open **Settings**, select the stock source, default location and quotation issue option, then save.
3. Use **Receive** for incoming units or **Issue** for outgoing units and enter quantity, location and any required serial/batch details.
4. Use **Adjust** with a reason for a correction, or **Count** to set the counted quantity.
5. Use **Minimum** and **Tracking** to maintain reorder limits and serial/batch controls.
6. Open **History** or **Trace a number** to investigate movements.
7. Use **Import** only after choosing whether the file is a stocktake or an added delivery and reviewing the rows.

**Related windows:** [Receive, issue, adjust, count or set minimum stock](#dialog-ar-stock-1); [Tracking](#dialog-ar-stock-2); [Serial / Serials · / Batches](#dialog-ar-stock-3); [Trace a batch or serial number](#dialog-ar-stock-4); [History](#dialog-ar-stock-5); [Import stock](#dialog-ar-stock-6); [Stock settings](#dialog-ar-stock-7).

[Screenshot P052: Stock page showing its principal sections and a suitable sample record; highlight “Stock” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A count replaces the balance; a receipt adds to it. Do not maintain conflicting stock in two systems. Required serial counts must match the movement quantity.

<a id="page-stock-planning"></a>

### Stock planning

**Open:** `/stock/planning`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Estimate future shortages and purchasing needs from usage.

**Prerequisites:** Inventory access and enough stock/usage history to calculate a useful recommendation.

**Step-by-step**

1. Open **Stock planning**.
2. Set **Usage measured over**, **Project ahead**, **Safety buffer**, **Each order covers** and fallback lead time.
3. Review projected requirements and shortage recommendations.
4. Open the relevant stock or purchasing link to review the part and create an appropriate order.

[Screenshot P053: Stock planning page showing its principal sections and a suitable sample record; highlight “Stock planning” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Recommendations depend on past usage and the assumptions selected. They are not automatically approved purchase orders.

<a id="page-purchasing"></a>

### Purchasing (suppliers and purchase orders)

**Open:** `/purchasing`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Find suppliers and prepare stock purchase orders.

**Prerequisites:** Purchasing/inventory access; products and a receiving location.

**Views and sections:** Supplier directory; draft purchase orders; expected replenishment; mark sent; receive.

**Step-by-step**

1. In the supplier directory, type any word of a supplier's name, GSTIN, phone, email or contact person. Use the status chips, **Only suppliers we owe money** and the sort (name, most owed, newest) to narrow the list; 50 suppliers show per page.
2. Click **New supplier**, or **Edit** on a supplier; each opens its own page (see [New supplier / Edit supplier](#page-purchasing-suppliers-new)).
3. Click **New order** to raise a purchase order on its own page (see [New purchase order](#page-purchasing-orders-new)).
4. Click **Mark sent** only when the order has gone to the supplier.
5. When goods arrive choose **Receive**, enter the quantities that actually arrived, serial, batch or expiry details and the supplier reference, then **Receive**.

**Related windows:** [Receive](#dialog-ar-purchasing-2).

[Screenshot P054: Purchasing supplier directory with search, status chips and the We owe column; highlight New supplier. Use approved sample data.]

**Tips and common errors:** The **We owe** column shows only to users who can see vendor bills. The search, chips and sort stay in the page address, so a link shares the same view. A blacklisted supplier cannot be ordered from.

<a id="page-purchasing-suppliers-new"></a>

### New supplier / Edit supplier

**Open:** `/purchasing/suppliers/new`. **Other entry paths:** `/purchasing/suppliers/:id/edit`. **Who can use it:** Users who may manage suppliers.

**Purpose:** Keep each supplier's contact, addresses and bank account in one place, and blacklist one you no longer buy from.

**Prerequisites:** Purchasing access.

**Views and sections:** Name, GSTIN and lead time; primary contact and designation; billing and shipping addresses; bank (account name, bank, account number, IFSC, branch); remarks; blacklist.

**Step-by-step**

1. Enter the name, GSTIN and lead time.
2. Add the primary contact, billing and shipping addresses and bank details.
3. To stop buying from the supplier, tick **Blacklist this supplier** and give the reason.
4. Click **Add supplier** (or **Save changes**).

[Screenshot P144: New supplier page with contact, addresses and bank details; obscure the account number.]

**Tips and common errors:** Blacklisting keeps the supplier's history but stops new purchase orders. Check bank details against the supplier's cancelled cheque or letter before saving.

<a id="page-purchasing-orders-new"></a>

### New purchase order / Edit purchase order

**Open:** `/purchasing/orders/new`. **Other entry paths:** `/purchasing/orders/:id/edit` (drafts); `?supplier=` from Vendor 360 fixes the supplier. **Who can use it:** Users who may manage inventory orders.

**Purpose:** Order parts from a supplier at the agreed price.

**Prerequisites:** The supplier (not blacklisted); catalogue parts; a store to receive into.

**Views and sections:** Supplier; delivery store; expected date; parts.

**Step-by-step**

1. Check the supplier, the store it is delivered to and the expected date.
2. Search the catalogue to add parts, or add the parts below minimum stock in one click.
3. Click **Save draft order** (or **Save changes**).
4. Mark it sent from Purchasing once it has gone out.

**Fields:** see [Edit / New purchase order](#dialog-ar-purchasing-1).

[Screenshot P145: New purchase order page with a supplier and three parts.]

**Tips and common errors:** From Vendor 360 the supplier is filled in and you return to their Vendor 360. A sent order can no longer be edited.

<a id="page-purchasing-grn"></a>

### Goods receipt (GRN)

**Open:** `/purchasing/grn`. **Who can use it:** Signed-in users with goods receipt access; the workspace must also include the relevant plan feature.

**Purpose:** List goods received at the gate, their QC result and what follows.

**Prerequisites:** Purchase orders for the goods.

**Views and sections:** Receipt list; supplier filter; bill and debit-note actions.

**Step-by-step**

1. Click **Inward GRN** to record goods at the gate (see [Inward goods receipt](#page-purchasing-grn-new)).
2. Click a receipt to open it (see [Goods receipt](#page-purchasing-grn-id)).
3. Use a receipt's bill or debit-note action to start the bill or claim from it; its accepted or rejected items fill in.

[Screenshot P055: Goods receipt list with sample receipts; highlight Inward GRN.]

**Tips and common errors:** From Vendor 360, the list shows only that supplier, with a bar to show all.

<a id="page-purchasing-grn-new"></a>

### Inward goods receipt

**Open:** `/purchasing/grn/new`. **Who can use it:** Users who may create goods receipts.

**Purpose:** Record goods at the gate against the supplier's challan and purchase order.

**Prerequisites:** A sent purchase order.

**Views and sections:** Supplier; purchase order; challan number; received quantities.

**Step-by-step**

1. Check the supplier and pick the purchase order; its open items fill in.
2. Enter the challan number, then the quantity actually received on each line.
3. Click **Save & send to QC**. Stock is posted once QC accepts the goods.

**Fields:** see [Record Inward Gate Entry (GRN)](#dialog-ar-goods-receipt-notes-3).

[Screenshot P146: Inward goods receipt with one line received short and flagged.]

**Tips and common errors:** A line received short of the challan is flagged so you can raise it with the supplier.

<a id="page-purchasing-grn-id"></a>

### Goods receipt

**Open:** `/purchasing/grn/:id`. **Who can use it:** Users with goods receipt access.

**Purpose:** See one goods receipt: gate entry, QC result, bins and rejections, with the next step one click away.

**Prerequisites:** An existing receipt.

**Step-by-step**

1. Check the received items and their QC result.
2. Click **Record QC inspection**, **Record a bill** or **Debit note for rejections**.

**Fields:** see [GRN Dossier](#dialog-ar-goods-receipt-notes-1).

[Screenshot P147: Goods receipt page after QC with one rejected line.]

**Tips and common errors:** Stock is posted only for the quantity QC accepted.

<a id="page-purchasing-grn-inspect"></a>

### QC inspection

**Open:** `/purchasing/grn/:id/inspect`. **Who can use it:** Users with the goods receipt inspect permission.

**Purpose:** Record what passed QC and what was rejected, line by line.

**Prerequisites:** A goods receipt sent to QC.

**Step-by-step**

1. Enter who inspected.
2. Enter the accepted or rejected quantity and the bin for each line, with a reason for anything rejected.
3. Click **Confirm inspection**. Accepted quantities are received on the purchase order automatically.

**Fields:** see [Complete Material QC Inspection](#dialog-ar-goods-receipt-notes-2).

[Screenshot P148: QC inspection page with accepted and rejected quantities.]

**Tips and common errors:** Rejected quantities can then become a vendor debit note.

<a id="page-purchasing-bills"></a>

### Vendor bills

**Open:** `/purchasing/bills`. **Who can use it:** Signed-in users with vendor bill access; approving and paying need their own permissions.

**Purpose:** List supplier tax invoices, their approval and payment.

**Prerequisites:** Suppliers and, for matching, goods receipts.

**Views and sections:** Bill list; supplier filter; overdue bills.

**Step-by-step**

1. Click **Record a bill** to enter a supplier's invoice (see [Record vendor bill](#page-purchasing-bills-new)).
2. Click a bill to open it, then approve, pay or cancel it there (see [Vendor bill](#page-purchasing-bills-id)).

[Screenshot P056: Vendor bills list with an overdue bill; highlight Record a bill.]

**Tips and common errors:** Draft bills can be approved from their page. MSME suppliers must be paid within 45 days of acceptance.

<a id="page-purchasing-bills-new"></a>

### Record vendor bill

**Open:** `/purchasing/bills/new`; `?grn=` starts from a goods receipt. **Who can use it:** Users who may create vendor bills.

**Purpose:** Record a supplier's tax invoice with GST and TDS worked out, matched against the order and the goods accepted.

**Prerequisites:** The supplier; ideally the goods receipt.

**Views and sections:** Invoice upload; supplier; invoice details; goods receipt; lines; GST (CGST and SGST, or IGST); TDS.

**Step-by-step**

1. Upload the supplier's invoice (PDF or photo) to fill the form, or pick the supplier and enter the invoice details.
2. Pick the goods receipt; its accepted items and order rates fill in.
3. Choose the supply type (CGST and SGST within the state, IGST between states).
4. Check the rates and GST, then click **Save bill**. Approve it from its page.

**Fields:** see [Record Vendor Bill (Purchase Invoice)](#dialog-ar-vendor-bills-3).

[Screenshot P149: Record vendor bill page filled from an uploaded invoice; highlight the goods receipt.]

**Tips and common errors:** The supply type is chosen by hand, because the workspace's own GSTIN is not used to work it out. Check the figures read from an uploaded invoice before saving.

<a id="page-purchasing-bills-id"></a>

### Vendor bill

**Open:** `/purchasing/bills/:id`. **Who can use it:** Users with vendor bill access; approving and paying need their own permissions.

**Purpose:** Everything about one supplier bill: invoice, PO and GRN links, tax, lines and payments.

**Step-by-step**

1. Check the 3-way match and the lines.
2. Click **Approve**, then **Pay** to record the bank transfer against it. Each asks for confirmation first.
3. Cancel a bill only if it was entered in error.

**Fields:** see [Vendor Bill](#dialog-ar-vendor-bills-1) and [Disburse Vendor Payment](#dialog-ar-vendor-bills-2).

[Screenshot P150: Vendor bill page with the 3-way match and a payment recorded.]

**Tips and common errors:** A bill with payments recorded can no longer be cancelled. Recording a payment does not move money.

<a id="page-purchasing-debit-notes"></a>

### Debit notes

**Open:** `/purchasing/debit-notes`. **Who can use it:** Signed-in users with debit note access; issuing needs its own permission.

**Purpose:** List claims against suppliers for rejected, short or over-charged goods.

**Step-by-step**

1. Click **New debit note** to raise a claim (see [Issue debit note](#page-purchasing-debit-notes-new)).
2. Click a debit note to issue, settle or cancel it (see [Debit note](#page-purchasing-debit-notes-id)).

[Screenshot P057: Debit notes list with sample rows.]

**Tips and common errors:** Draft debit notes are issued from their page.

<a id="page-purchasing-debit-notes-new"></a>

### Issue debit note

**Open:** `/purchasing/debit-notes/new`; `?grn=` starts from a goods receipt. **Who can use it:** Users who may create debit notes.

**Purpose:** Claim back rejected, short or over-charged goods from a supplier.

**Step-by-step**

1. Check the supplier and pick the bill or goods receipt it is against. From a receipt, the rejected items fill in, priced from the bill.
2. Choose a reason and check the items, rates and supply type.
3. Click **Save debit note**, then issue it from its page.

**Fields:** see [Create Vendor Debit Note](#dialog-ar-vendor-debit-notes-2).

[Screenshot P151: Issue debit note page started from a receipt with rejected items.]

**Tips and common errors:** Saving keeps a draft; the supplier is not told until you issue it.

<a id="page-purchasing-debit-notes-id"></a>

### Debit note

**Open:** `/purchasing/debit-notes/:id`. **Who can use it:** Users with debit note access.

**Purpose:** Everything about one debit note: reason, bill and GRN, items and GST.

**Step-by-step**

1. Check the reason, items and total.
2. Click **Issue to supplier**.
3. Once the supplier adjusts or refunds it, click **Mark settled**. Each action asks for confirmation first.

**Fields:** see [Vendor Debit Note](#dialog-ar-vendor-debit-notes-1).

[Screenshot P152: Debit note page for an issued note; highlight Mark settled.]

**Tips and common errors:** Cancel only a note raised in error.

<a id="page-purchasing-vendor-360"></a>

### Vendor 360

**Open:** `/purchasing/vendor-360`. **Other entry paths:** `/purchasing/vendor-360/:id`. **Who can use it:** Signed-in users with Vendor 360 access; the workspace must also include the relevant plan feature.

**Purpose:** Review a supplier's orders, receipts, bills, debit notes and payables on one screen, and open every related screen for just that supplier.

**Prerequisites:** Vendor 360 access and an existing supplier.

**Views and sections:** Supplier search; summary (totals, overdue bills, delivery reliability, contact, bank, blacklist); Vendor Bills; Inward GRNs; Purchase Orders; Debit Notes; Everything about this supplier.

**Step-by-step**

1. Type part of a supplier's name, GSTIN, phone or contact person in the search box at the top, then pick them (arrow keys and Enter work too). Opening the page with no supplier shows the first match.
2. Review **Vendor Bills**, **Inward GRNs**, **Purchase Orders** and **Debit Notes**. Totals cover all the supplier's bills.
3. Use **Everything about this supplier** to open orders, receipts, bills, debit notes, stock or finance already narrowed to this supplier, or to start a new one with the supplier filled in.
4. Use **+ Inward GRN** to receive goods, or **Open bill** / **Open GRN** to work one record.
5. On the screen you opened, the breadcrumb **Purchasing & stock › Vendor 360 · *supplier*** brings you back.

[Screenshot P058: Vendor 360 for a sample supplier with the links panel and breadcrumb. Use approved sample data; obscure bank details.]

**Tips and common errors:** Links show only for screens your role can open. City, bank or MSME details show only where they were entered on the supplier; nothing is made up.

<a id="manufacturing"></a>

## Manufacturing

| Page | Open here |
| --- | --- |
| [Bill of materials](#page-manufacturing-bom) | `/manufacturing/bom` |
| [Work orders](#page-manufacturing-work-orders) | `/manufacturing/work-orders` |
| [Create bill of materials](#page-manufacturing-bom-new) | `/manufacturing/bom/new` |
| [BOM details](#page-manufacturing-bom-id) | `/manufacturing/bom/:id` |
| [New work order](#page-manufacturing-work-orders-new) | `/manufacturing/work-orders/new` |

<a id="page-manufacturing-bom"></a>

### Bill of materials

**Open:** `/manufacturing/bom`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Define the components and quantities needed for a finished product.

**Prerequisites:** Manufacturing/BOM access; finished-product and component details, units and a revision code.

**Views and sections:** ₹1.2-2; parts.

**Step-by-step**

1. Click **Create New BOM**.
2. Enter **Finished Good Part #**, **Revision Code**, **Product Description**, **BOM Type** and **Base Quantity & UOM**.
3. Click **Add Component** and enter each required component and quantity.
4. Click **Save & Compute Costing** and inspect the resulting structure and cost.
5. Use **Activate** or **Release to Production** only after review.
6. Choose **Create WO** or **Generate Production Work Order** for an approved production requirement.

**Related windows:** [BOM Structure: / ( / )](#dialog-ar-bill-of-materials-1); [Create Bill of Materials (BOM)](#dialog-ar-bill-of-materials-2).

[Screenshot P059: Bill of materials page showing its principal sections and a suitable sample record; highlight “Create New BOM” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Base quantity and component units must agree. Keep revisions meaningful so production does not use an obsolete structure.

<a id="page-manufacturing-work-orders"></a>

### Work orders

**Open:** `/manufacturing/work-orders`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Schedule production, issue materials and record output and quality results.

**Prerequisites:** Work-order access; finished-product/BOM information, material availability and authorised production quantities.

**Views and sections:** All; In Progress; Scheduled; Completed; routing steps; material/BOM view; material issue; QC step; finished-goods completion.

**Step-by-step**

1. Click **Create Work Order** and enter the number, batch, finished part, planned quantity, supervisor, dates and instructions.
2. Click **Generate Work Order** and review the result.
3. Use **Release to Floor** when production can start.
4. Under **Material Issues & BOM**, click **Issue Material**, complete the required/issued/scrap quantities and warehouse, then **Issue to Shop Floor**.
5. Under **Shop Floor Routing Steps**, choose **Complete Step**, enter actual hours, inspector and QC result, then confirm.
6. Use **Inward Finished Goods**, enter good output and scrap quantities and click **Complete Order & Update Inventory**.

**Related windows:** [Create Production Work Order](#dialog-app-work-orders-1); [Issue Material to Work Order](#dialog-app-work-orders-2); [Complete Routing Step & QC Inspection](#dialog-app-work-orders-3); [Complete Work Order & Inward FG](#dialog-app-work-orders-4).

[Screenshot P060: Work orders page showing its principal sections and a suitable sample record; highlight “Create Work Order” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not record planned quantities as actual output. Material issues and completed output affect stock and production records.

<a id="page-manufacturing-bom-new"></a>

### Create bill of materials

**Open:** `/manufacturing/bom/new`. **Who can use it:** Users who may manage bills of materials.

**Purpose:** Define a finished good's components, quantities, scrap and routing stage, and cost it.

**Prerequisites:** Part numbers for the finished good and its components.

**Views and sections:** BOM number and revision; finished good part number, description, unit and base quantity; classification (manufacturing, engineering/design, kit/assemblies); engineering notes; component lines.

**Step-by-step**

1. Enter the **BOM Number**, **Revision Code**, **Finished Good Part Number** and **Finished Good Description**.
2. Set the unit, base quantity and **BOM Classification**, and add assembly notes.
3. For each component click **+ Add Component Line** and enter part number, description, quantity per unit, unit, scrap %, routing stage and unit rate; tick **Sub-Assy** for a sub-assembly.
4. Save. Click **Back to BOM Registry** to return.

**Fields:** see [Create Bill of Materials (BOM)](#dialog-ar-bill-of-materials-2).

[Screenshot P153: Create bill of materials page with three component lines.]

**Tips and common errors:** Remove a line with ✕. Keep revision codes consistent so work orders pick the right revision.

<a id="page-manufacturing-bom-id"></a>

### BOM details

**Open:** `/manufacturing/bom/:id`. **Who can use it:** Users with access to Bill of materials.

**Purpose:** See a BOM's component explosion and cost, and move it on.

**Step-by-step**

1. Review the **Component Explosion Table** and the total cost.
2. Click **Release to Production** when the BOM is approved.
3. Click **Generate Work Order** to start production from it.

**Fields:** see [BOM Structure](#dialog-ar-bill-of-materials-1).

[Screenshot P154: BOM details page with the component explosion table.]

**Tips and common errors:** Release a BOM only after engineering has checked it.

<a id="page-manufacturing-work-orders-new"></a>

### New work order

**Open:** `/manufacturing/work-orders/new`. **Who can use it:** Users who may manage work orders.

**Purpose:** Start production of a batch, from a BOM or by hand.

**Views and sections:** Link to existing BOM; part number; batch/lot; description; quantity; supervisor; linked sales order; planned start and finish; shop floor instructions.

**Step-by-step**

1. Choose **Link to Existing BOM (Optional)**, or enter the part by hand.
2. Enter the **Batch / Lot Number**, **Assembly Description** and **Quantity to Produce**.
3. Add the supervisor, the linked sales order, the planned dates and the shop floor instructions.
4. Save. The work order number is assigned automatically.

**Fields:** see [Create Production Work Order](#dialog-app-work-orders-1).

[Screenshot P155: New work order page linked to a BOM.]

**Tips and common errors:** Use **Change / Unlink** to choose another BOM before saving.

<a id="service-calls-and-activities"></a>

## Service, calls and activities

| Page | Open here |
| --- | --- |
| [Field](#page-field) | `/field` |
| [AMC contracts](#page-field-service-amc) | `/field-service/amc` |
| [Field tickets](#page-field-service-tickets) | `/field-service/tickets` |
| [AI Remote Maintenance & Diagnostics](#page-field-service-remote-maintenance) | `/field-service/remote-maintenance` |
| [Tasks](#page-tasks) | `/tasks` |
| [Calls](#page-calls) | `/calls` |
| [WhatsApp calls](#page-calls-whatsapp) | `/calls/whatsapp` |
| [AI voice agents](#page-calls-ai-agents) | `/calls/ai-agents` |
| [AI call batches](#page-calls-ai-batches) | `/calls/ai-batches` |
| [Helpdesk](#page-helpdesk) | `/helpdesk` |
| [Meetings](#page-meetings) | `/meetings` |
| [New AMC contract](#page-field-service-amc-new) | `/field-service/amc/new` |
| [Renew AMC contract](#page-field-service-amc-renew) | `/field-service/amc/renew/:id` |
| [Record preventive visit](#page-field-service-amc-visit) | `/field-service/amc/record-visit/:contractId/:visitId` |
| [New field service ticket](#page-field-service-tickets-new) | `/field-service/tickets/new` |
| [Assign field engineer](#page-field-service-tickets-assign) | `/field-service/tickets/:id/assign` |
| [Add spare parts](#page-field-service-tickets-spares) | `/field-service/tickets/:id/spares` |
| [New diagnostic session](#page-field-service-remote-maintenance-new) | `/field-service/remote-maintenance/new` |
| [New AI voice agent / Voice Agent Studio](#page-calls-ai-agents-new) | `/calls/ai-agents/new`, `/calls/ai-agents/:id` |
| [New AI call batch](#page-calls-ai-batches-new) | `/calls/ai-batches/new` |
| [AI voice conversations](#page-calls-whatsapp-conversations) | `/calls/whatsapp/conversations` |
| [WhatsApp call menu (IVR)](#page-calls-whatsapp-ivr) | `/calls/whatsapp/ivr` |
| [Website call button](#page-calls-web-widget) | `/calls/web-widget` |
| [AI impact report](#page-calls-ai-impact) | `/calls/ai-impact` |
| [New ticket / Ticket details / Helpdesk settings](#page-helpdesk-new) | `/helpdesk/new`, `/helpdesk/:id`, `/helpdesk/settings` |

<a id="page-field"></a>

### Field

**Open:** `/field`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Carry out assigned field visits on a phone, including offline visit notes and customer sign-off.

**Prerequisites:** An authorised field-worker account; load the app online before travelling; location or device permissions when requested.

**Views and sections:** Job list; job detail; visit start; work log; customer sign-off; sync; field help.

**Step-by-step**

1. Open the **Field app** on your phone and sign in.
2. Select a job from **All jobs** or **Due** and review the customer, site and issue.
3. On arrival tap **I’ve arrived — start the visit**.
4. Record **Work done** and add the visit details or attachments offered.
5. Request the customer’s sign-off code with **Send sign-off code** and enter **Code** and **Signed by**.
6. Tap **Confirm sign-off**, then **Sync** when connected and check that the visit is no longer awaiting synchronisation.

**Related windows:** [Help · Field Service](#dialog-ar-field-1).

[Screenshot P061: Field page showing its principal sections and a suitable sample record; highlight “Field app” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Offline notes are not safely delivered until sync succeeds. Do not clear browser storage with unsynced work. Customer sign-off needs the correct customer number.

<a id="page-field-service-amc"></a>

### AMC contracts

**Open:** `/field-service/amc`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Maintain equipment service contracts and preventive visits.

**Prerequisites:** AMC-contract access; customer/equipment identity, contract dates, pricing and service terms.

**Views and sections:** Preventive Maintenance (PM) Visits Calendar.

**Step-by-step**

1. Click **Create AMC Contract**.
2. Enter contract/customer/site/equipment details, type, SLA response hours, annual value, visit frequency and dates.
3. Choose whether replacement spares are included and record the contract terms.
4. Click **Create AMC Contract**.
5. Use **Record Visit** after a completed visit, enter the engineer and maintenance notes, then **Confirm & Close Visit**.
6. Use **Renew Contract** to review and enter the new dates and value before confirming.

**Related windows:** [Create Equipment AMC Contract](#dialog-app-amc-contracts-1); [Record Completed PM Visit](#dialog-app-amc-contracts-2); [Renew Equipment AMC Contract](#dialog-app-amc-contracts-3).

[Screenshot P062: AMC contracts page showing its principal sections and a suitable sample record; highlight “Create AMC Contract” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A recorded preventive visit should describe work actually performed. Verify start/end dates before renewing an existing contract.

<a id="page-field-service-amc-new"></a>

### New AMC contract

**Open:** `/field-service/amc/new`. **Who can use it:** Users who may manage AMC contracts.

**Purpose:** Record an annual maintenance contract for one machine.

**Views and sections:** Site; equipment model; serial number; annual value; response time; start and end dates; planned visits a year; spares included; scope and special terms; contract number.

**Step-by-step**

1. Enter the site, **Equipment model** and **Serial number**.
2. Enter the **Annual value (₹)**, **Response time (hours)**, **Start date** and **End date**.
3. Set **Planned visits a year** and tick whether spares and wear parts are included.
4. Add the scope and special terms, then save. The contract number is assigned automatically if left blank.

**Fields:** see [Create Equipment AMC Contract](#dialog-app-amc-contracts-1).

[Screenshot P156: New AMC contract page with sample machine and dates.]

**Tips and common errors:** The end date must be after the start date.

<a id="page-field-service-amc-renew"></a>

### Renew AMC contract

**Open:** `/field-service/amc/renew/:id`, from **Renew** on a contract. **Who can use it:** Users who may manage AMC contracts.

**Step-by-step**

1. Enter the **New Renewal Start Date** and **New Renewal End Date**.
2. Enter the **Renewal Contract Value (INR)** and choose the **Contract Scope** (comprehensive with spares, non-comprehensive, preventive only or on-demand SLA).
3. Save.

**Fields:** see [Renew Equipment AMC Contract](#dialog-app-amc-contracts-3).

[Screenshot P157: Renew AMC contract page.]

**Tips and common errors:** Check the renewal value with the customer's purchase order before saving.

<a id="page-field-service-amc-visit"></a>

### Record preventive visit

**Open:** `/field-service/amc/record-visit/:contractId/:visitId`, from a planned visit. **Who can use it:** Users who may record AMC visits.

**Step-by-step**

1. Enter the **Assigned Service Engineer**.
2. Describe the inspection and the maintenance carried out.
3. Save the visit.

**Fields:** see [Record Completed PM Visit](#dialog-app-amc-contracts-2).

[Screenshot P158: Record preventive visit page with inspection notes.]

**Tips and common errors:** Record only work actually done; the notes are the customer's service record.

<a id="page-field-service-tickets"></a>

### Field tickets

**Open:** `/field-service/tickets`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Manage equipment breakdowns from reporting to engineer resolution.

**Prerequisites:** Service-ticket access; customer, site, contact and equipment details.

**Views and sections:** Consumed Spare Parts.

**Step-by-step**

1. Click **Raise Service Ticket**, enter ticket/customer/equipment details, type, priority and symptoms, then **Raise Ticket**.
2. Select **Assign Engineer**, enter the engineer and scheduled visit, then **Dispatch Engineer**.
3. Record each replaced part with **Add Spare Part**, quantity and unit price; choose whether it is billable.
4. When resolved, click **Resolve Ticket**, enter root cause, resolution, customer representative and satisfaction rating.
5. Click **Resolve & Close Ticket** after verifying the work and customer sign-off details.

**Related windows:** [Raise Field Service / Breakdown Ticket](#dialog-app-field-service-tickets-1); [Dispatch & Assign Field Service Engineer](#dialog-app-field-service-tickets-2); [Record Spare Part Replaced](#dialog-app-field-service-tickets-3); [Resolve Ticket & Customer Signoff](#dialog-app-field-service-tickets-4).

[Screenshot P063: Field tickets page showing its principal sections and a suitable sample record; highlight “Raise Service Ticket” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Uncheck billable only when the spare is covered by an agreed AMC or warranty. Resolution should not be recorded before the fault is actually resolved.

<a id="page-field-service-tickets-new"></a>

### New field service ticket

**Open:** `/field-service/tickets/new`. **Who can use it:** Users who may raise field tickets.

**Purpose:** Raise a breakdown, preventive, installation or calibration job for a machine.

**Views and sections:** Contact and phone; site; equipment model; serial number; type; priority; what is wrong; ticket number.

**Step-by-step**

1. Choose the contact; the contact phone fills in from their WhatsApp number.
2. Enter the site, **Equipment model** and **Serial number**.
3. Choose the **Type** and **Priority** (Critical means production has stopped).
4. Describe **What is wrong**, with error codes and alarms, then save.

**Fields:** see [Raise Field Service / Breakdown Ticket](#dialog-app-field-service-tickets-1).

[Screenshot P159: New field service ticket page with a Critical breakdown.]

**Tips and common errors:** The ticket number is assigned automatically if left blank.

<a id="page-field-service-tickets-assign"></a>

### Assign field engineer

**Open:** `/field-service/tickets/:id/assign`. **Who can use it:** Users who may dispatch field engineers.

**Step-by-step**

1. Enter the **Field engineer name** with their designation.
2. Save to dispatch the engineer to the ticket.

**Fields:** see [Dispatch & Assign Field Service Engineer](#dialog-app-field-service-tickets-2).

[Screenshot P160: Assign field engineer page.]

**Tips and common errors:** Confirm the engineer's availability before dispatching.

<a id="page-field-service-tickets-spares"></a>

### Add spare parts

**Open:** `/field-service/tickets/:id/spares`. **Who can use it:** Users who may record spares on tickets.

**Step-by-step**

1. Search by part number or name and pick the part.
2. Enter the **Qty** and **Unit price (₹)**, and tick **Billable to customer** where it is charged.
3. Remove a line with ✕, then save.

**Fields:** see [Record Spare Part Replaced](#dialog-app-field-service-tickets-3).

[Screenshot P161: Add spare parts page with two parts, one billable.]

**Tips and common errors:** Parts under an AMC that includes spares are usually not billable; check the contract.

<a id="page-field-service-remote-maintenance"></a>

### AI Remote Maintenance & Diagnostics

**Open:** `/field-service/remote-maintenance`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Guide and record a remote equipment-diagnosis session.

**Prerequisites:** Remote-maintenance access; configured communication/AI services and a reachable technician or customer.

**Views and sections:** Equipment & Telemetry; Machine Sensor Telemetry; Reported Symptoms; AI Root Cause & Plan; Diagnosis; Remediation Steps; Recommended OEM Spares.

**Step-by-step**

1. Click **New Diagnostic Session**.
2. Enter customer, technician phone, equipment model/serial/category, preferred channel, fault code, symptoms and severity.
3. Click **Start Diagnostic Session**.
4. Select the active session and review **Live Diagnostic Console** and its WhatsApp or IVR view.
5. Enter or select the customer’s actual response; use the quick responses only when they accurately reflect the situation.
6. Choose **Mark Resolved Remotely** when verified, or **Escalate to Field Visit**, enter a reason and assigned engineer, then **Confirm Escalation**.
7. Use **All Sessions History** to review prior sessions.

**Related windows:** [Initiate AI Remote Diagnostic Session](#dialog-ar-remote-maintenance-1); [Escalate to On-Site Field Visit](#dialog-ar-remote-maintenance-2).

[Screenshot P064: AI Remote Maintenance & Diagnostics page showing its principal sections and a suitable sample record; highlight “New Diagnostic Session” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not follow unsafe machine instructions or use a simulator response as evidence of a real repair. Remote diagnosis still needs qualified judgement.

<a id="page-field-service-remote-maintenance-new"></a>

### New diagnostic session

**Open:** `/field-service/remote-maintenance/new`. **Who can use it:** Users who may start remote maintenance sessions.

**Purpose:** Start an AI-assisted remote diagnosis of a machine fault before sending an engineer.

**Views and sections:** Customer company; phone; preferred channel; equipment category; machine model; serial number; fault severity; fault code; symptoms.

**Step-by-step**

1. Enter the **Customer Company Name**, phone and preferred channel.
2. Enter the machine model and serial number, and choose the equipment category and fault severity.
3. Enter the fault code from the display or HMI and describe the symptoms.
4. Start the session.

**Fields:** see [Initiate AI Remote Diagnostic Session](#dialog-ar-remote-maintenance-1).

[Screenshot P162: New diagnostic session page with a sample VFD fault.]

**Tips and common errors:** Use the exact fault code shown on the machine.

<a id="page-tasks"></a>

### Tasks

**New in 1.2:** a task can be linked to any number of records (contacts, accounts, leads, quotations, sales orders, invoices, challans, campaigns and service tickets), shared with colleagues by email, WhatsApp or SMS, and reminded on email, WhatsApp and/or SMS. In the task window, choose the **Kind of record**, search and add each link; tick the reminder channels; use the share action (**Share with colleagues**) and choose **Send by**, with an optional note. A repeating task copies its links to the next one. WhatsApp and SMS reminders need the set-up in [Tasks & meetings settings](#page-settings-tasks-meetings), and each colleague's mobile number on their profile.

**Open:** `/tasks`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Organise assigned follow-up work and recurring tasks.

**Prerequisites:** Activities access; relevant team/customer/enquiry records where linked.

**Step-by-step**

1. Open **Tasks** and select **Mine** or **Everyone** according to your access.
2. Click **New task**, enter a title, owner, due date and the available priority/link/recurrence details.
3. Save the task.
4. Open a task to edit its details or mark completion with the displayed completion control.
5. Enable **Show finished** to review completed work.

**Related windows:** [Create or edit a task](#dialog-ar-task-dialog-1).

[Screenshot P065: Tasks page showing its principal sections and a suitable sample record; highlight “Tasks” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check the assigned owner and due date. A recurring task may create further work even after one occurrence is finished.

<a id="page-calls"></a>

### Calls

**Open:** `/calls`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Review team calls and record their business outcomes.

**Prerequisites:** Calling/Inbox access and the required voice feature; call records.

**Step-by-step**

1. Open **Calls** and choose **Mine** or **Everyone**.
2. Select **Only calls waiting for an outcome** to find unfinished follow-up.
3. Open a call or click **Say how it went**.
4. Record the outcome, notes and any next action offered, then save.
5. Use **Edit** for a permitted correction and **Show more** for older records.

**Related windows:** [How did the call go?](#dialog-ar-call-outcome-dialog-1).

[Screenshot P066: Calls page showing its principal sections and a suitable sample record; highlight “Calls” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A connected call is not automatically a successful sales outcome. Record the actual result and follow-up needed.

<a id="page-calls-whatsapp"></a>

### WhatsApp calls

**Open:** `/calls/whatsapp`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Review WhatsApp calls, recordings and call-menu settings.

**Prerequisites:** Voice/Inbox access; a calling-enabled WhatsApp channel; microphone permission when taking calls.

**Step-by-step**

1. Open **WhatsApp calls** and select the channel/filter controls shown.
2. Use **Missed only** to review unanswered calls.
3. Open **Call menu (IVR)** to configure the permitted call-routing flow.
4. Review **Record calls** and the **Recording notice** settings before enabling recording.
5. In the notice window play the current clip, upload a replacement or **Use the tone instead**, then finish.
6. Use **Play** for an available recording and delete only the intended recording(s) after reviewing the confirmation.
7. To review calls the AI voice agent handled, click **AI conversations** (shown to users who may open call recordings): search transcripts, open a call, correct extracted values, rate the agent’s answers and export the list.

**Related windows:** [Recording notice](#dialog-ar-whatsapp-calls-1); [WhatsApp call menu (IVR)](#dialog-ar-whatsapp-ivr-dialog-1); [AI conversations](#window-011).

[Screenshot P067: WhatsApp calls page showing its principal sections and a suitable sample record; highlight “WhatsApp calls” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Recording requires your organisation’s notice/consent process. Browser microphone permissions and a configured relay are necessary for live browser audio; a log entry alone does not prove audio quality. AI call transcripts are kept for 180 days from the start of the call and are then deleted automatically; deleting a call deletes its transcript. Each AI conversation also shows its **reply time**: how long the caller typically waited, and the time 9 in 10 replies came within, counted from the moment they stopped speaking (the agent's **When the caller has finished** setting adds its pause before that), and how soon the greeting started. The CSV export has the same figures (`reply_median_ms`, `reply_p90_ms`, `greeting_ms`). Agents on the speech pipeline start speaking after the first sentence of their reply is written, not the whole reply.

**AI call flow (phone line):** AI calls on your Exotel number need a second Exotel flow. Exotel enables its Voicebot applet on request, so ask them first if your flow builder doesn't show it. Under **Channels › Voice**, the **AI call flow** panel shows the **Voicebot** URL: in Exotel, create a new flow with one **Voicebot** applet using that URL, then a **Hangup** applet, and paste the flow's URL into **AI call flow URL** and click **Save**. Set the flow's call-status callback to the **Status** URL shown above it. Clearing the URL stops AI calls on the line.

**Incoming calls answered by the AI:** under **Agent for incoming calls**, choose the WhatsApp number whose agent should answer (its own agent, or the shared agent it is assigned to), then in Exotel point your number's incoming calls at the AI call flow instead of the menu flow. A new caller becomes a contact; the call, its transcript, actions, analysis and automations work as for the agent's outbound phone calls, without listening for voicemail. Choose **Nobody** to stop the AI answering.

**SIP trunks:** to use your own carrier or PBX instead of (or beside) Exotel, click **Add a SIP trunk** under **SIP trunks** and enter its **SIP host** and **Port**, the **Username** and **Password** it gives you (the password is kept in secret storage and never shown again), the **Addresses it sends calls from** (IPv4, up to 10), the **Caller ID for the agent's calls** and the **Agent**. Ask your carrier to send calls to the call relay's SIP address (your MNI contact gives it to you; the platform opens it to your carrier's address range). The trunk must use standard SIP over UDP with G.711 audio (μ-law or A-law), which Indian carriers offer. Calls the trunk sends are answered by the agent; choose **Call on: SIP trunk** in a conversation, a batch or an automation's AI call step to have the agent call out over it. Turn a trunk **Off** to stop both.

**More numbers:** if your Exotel account rents more than one ExoPhone, click **Get numbers from Exotel** (or type one and click **Add**) under **More numbers**. Calls to every number reach the same menu and AI call flow. For each number choose its agent: that WhatsApp number's agent answers incoming calls on it, and its AI phone calls show that number as the caller ID (otherwise the main number is used). **Remove** takes a number off this list; it doesn't release it at Exotel. A sync never adds a number another workspace already has, and lists the numbers here that Exotel no longer shows.

<a id="page-calls-ai-agents"></a>

### AI voice agents

**New in 1.2:** **+ Add agent** opens [New AI voice agent](#page-calls-ai-agents-new), and an agent opens for editing in **Voice Agent Studio** (`/calls/ai-agents/:id`) instead of a window. The builder starts with **playbooks**, and the page has a **Custom functions** panel; see that entry for both.

**Open:** `/calls/ai-agents` (menu **AI voice agents**). **Who can use it:** Signed-in users who can manage channels. The workspace must include the voice feature.

**Purpose:** Build a voice agent once and let it answer and place AI calls on several WhatsApp numbers. Change it in one place: every number assigned to it uses its newly published version on the next call.

**Prerequisites:** WhatsApp numbers connected directly to Meta. To take live AI calls, a number must also be allowed AI calling by the administrator.

**Views and sections:** The **New agent’s name** and **Start from** fields with **Create agent**; one card per agent with its type, whether it is published, the numbers using it, **Edit agent**, **Assign to a number…**, **Assignment history** and **Delete agent**.

**Step-by-step**

1. Enter a name. In **Start from** keep **A blank agent**, or choose a number to copy its current agent as the first draft. Click **Create agent**; the agent opens for editing.
2. In the [voice agent window](#dialog-ar-voice-agent-dialog-1) write, test and **publish** the agent, exactly as for a number’s own agent. Templates, AI drafting, review and version comparison all work the same way. Testing needs at least one assigned number, because the test uses that number’s catalogue, prices and AI allowance.
3. Use **Assign to a number…** to choose a number. A number already on another shared agent moves to this one (the list shows which agent it is on now).
4. Click **Unassign** next to a number to give it back its own agent.
5. Click **Assignment history** to see every number the agent has had, when it was assigned and unassigned, and by whom.
6. Click **Delete agent** and confirm to delete it; its numbers go back to their own agents.

[Screenshot P118a: AI voice agents page with one published agent assigned to two numbers and its assignment history open; highlight “Assign to a number…”. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A number assigned to an agent that isn’t published is **not** answered by AI — the card warns about this. A number’s own agent is kept unchanged while it is assigned; opening that number’s voice agent window says which shared agent answers its calls. AI call batches and automation **AI voice call** steps on an assigned number use the shared agent. Each AI call records the agent version (and shared agent) that handled it. A workspace can have up to 50 shared agents.

<a id="page-calls-ai-agents-new"></a>

### New AI voice agent / Voice Agent Studio

**Open:** `/calls/ai-agents/new`. **Other entry paths:** `/calls/ai-agents/:id` (Voice Agent Studio). **Who can use it:** Users who can manage channels; the workspace must include AI voice (Pro and above).

**Purpose:** Create an agent, then build, test and publish it on one page, starting from a tested playbook if you like.

**Prerequisites:** As for [AI voice agents](#page-calls-ai-agents).

**Views and sections:** Agent name; Voice Agent Studio (the [voice agent window](#dialog-ar-voice-agent-dialog-1) shown as a page); playbooks; custom functions; account and helpdesk tools; recording notice.

**Step-by-step**

1. Enter the **Agent Name** and create it. Voice Agent Studio opens.
2. To start from a tested package, choose a playbook (qualification, support, booking, reminders or collections). Each card shows what to **Set up first** (ticked when your workspace already has it) and what to **Try in a test call**. Click **Use this playbook** to fill in the instructions, greeting, tools, goal, analysis fields and, for outbound ones, the voicemail message.
3. Choose the acting user and team the agent works as (a playbook always leaves this to you).
4. Choose the tools. Besides actions on your records, an agent can look up a caller's **balance**, **orders** and **service contracts**, and send a **payment link**; read and raise **helpdesk tickets** (Freshdesk or Zendesk) and read **Shopify orders**, once those are connected in **Settings › Integrations**; and check free/busy on Google Calendar for bookings.
5. Tick any custom functions it may use (up to 10 an agent).
6. Test it with a test call, then publish.
7. Click **Back to Voice Agents** when finished.

**Custom functions** (panel on AI voice agents): click **Add function**, give it a **Name**, the https **Address** (a parameter's name in braces is filled in), the **Parameters the agent fills in** (type, description, allowed values, required), what the agent reads back, whether to send the caller's phone number as `caller_phone`, a time limit, and an optional auth header whose value is kept in secret storage. Use **Test** to try it. A function that changes something is read back to the caller for agreement first. A workspace can have up to 50 functions.

[Screenshot P163: Voice Agent Studio with the playbook cards open and the collections playbook's Set up first list; highlight Use this playbook.]

**Tips and common errors:** Every AI call now carries a recording notice in its greeting (see [Compliance](#page-compliance)), and every agent can stop calling a caller who asks: that is always on. A function address must be a public https address; local and private network addresses are refused. Exported agent files leave out custom functions.

<a id="page-calls-ai-batches-new"></a>

### New AI call batch

**Open:** `/calls/ai-batches/new`. **Who can use it:** Users who can manage channels.

**Purpose:** Schedule an AI agent to call a list of people within calling hours, retrying those who do not pick up.

**Views and sections:** Batch name; calling channel; line (WhatsApp, cellular/PSTN or SIP trunk); objective; calling window and schedule; concurrency and retry rules.

**Step-by-step**

1. Enter the **Batch Campaign Name** and choose the **Calling Channel** and **Line / Protocol**.
2. Add the objective or context the agent should use for this batch.
3. Set **Starts At**, **Allowed From** and **Allowed To**.
4. Set **Max Concurrent Calls**, **Max Attempts per Contact** and **Retry After (Minutes)**.
5. Save, then add the people to call as on [AI call batches](#page-calls-ai-batches).

[Screenshot P164: New AI call batch page with calling window and retry rules.]

**Tips and common errors:** AI calls are placed only within 09:00–21:00 India time, whatever window you set, and never to people who have opted out.

<a id="page-calls-whatsapp-conversations"></a>

### AI voice conversations

**Open:** `/calls/whatsapp/conversations`, from WhatsApp calls. **Who can use it:** Users with access to WhatsApp calls.

**Purpose:** Review AI call transcripts, recordings, analysis, reply times and cost.

**Step-by-step**

1. Open the conversation list; calls from the website call button are marked **Website**.
2. Open a conversation to see its transcript, summary, goal result, reply times and estimated cost.
3. Click **Back to WhatsApp calls** when finished.

**Fields:** see [AI conversations](#window-011).

[Screenshot P165: AI voice conversations page with one conversation open.]

**Tips and common errors:** Card numbers, OTPs and similar details are masked in transcripts.

<a id="page-calls-whatsapp-ivr"></a>

### WhatsApp call menu (IVR)

**Open:** `/calls/whatsapp/ivr`, from WhatsApp calls. **Who can use it:** Users who can manage channels.

**Purpose:** Set the keypad menu callers hear on your WhatsApp number.

**Fields and steps:** see [WhatsApp call menu (IVR)](#dialog-ar-whatsapp-ivr-dialog-1); the window is now shown as this page.

[Screenshot P166: WhatsApp call menu page with two options and a sub-menu.]

**Tips and common errors:** Add at least one option before switching the menu on, and say every option in the prompt.

<a id="page-calls-web-widget"></a>

### Website call button

**Open:** `/calls/web-widget` (menu **Calls › Website call button**). **Who can use it:** Users who can manage channels; the workspace must include AI voice.

**Purpose:** Let visitors to your website talk to your AI voice agent from the browser, with one click.

**Prerequisites:** A number with a published AI agent; your website addresses (https).

**Views and sections:** Call buttons; number; allowed websites; daily limit; embed code.

**Step-by-step**

1. Add a call button and choose the number whose published agent answers.
2. List your websites. Only https addresses (or localhost for testing) are accepted.
3. Set a daily limit. AI minutes cost money, and calls stop for the day at the limit.
4. Copy the embed code and paste it before `</body>` on your website's pages.
5. If the code was copied somewhere it should not be, make a new embed code; the old one stops at once.

[Screenshot P167: Website call button page with one button, two allowed websites and the embed code; obscure the key.]

**Tips and common errors:** The visitor gives their name and mobile number and agrees before the call, and becomes a contact. Each call is kept like any AI call: transcript, analysis, actions and follow-ups. A number or network can start only a few calls an hour. The button's own texts are in English. A visitor behind a strict company network may not be able to connect.

<a id="page-calls-ai-impact"></a>

### AI impact report

**Open:** `/calls/ai-impact` (menu **Calls › AI impact report**). **Who can use it:** Users with access to AI calls.

**Purpose:** See what your AI voice agents did, what it cost and the staff time it saved.

**Views and sections:** Calls; goals met; meetings; leads; tickets; payment links; cost; Savings.

**Step-by-step**

1. Choose the period, and a number if you want just one.
2. On the **Savings** card, enter how long a person takes per call (6 minutes unless changed) and what an hour of their time costs (₹300 unless changed).
3. Click **Show**.
4. Click **PDF** for a pilot review document, or **CSV** for the figures.

[Screenshot P168: AI impact report for a month with the Savings card; highlight PDF.]

**Tips and common errors:** Staff savings are estimates from the two figures on the Savings card. Costs are worked out from the rates in AI provider settings.

<a id="page-calls-ai-batches"></a>

### AI call batches

**Open:** `/calls/ai-batches`. **Who can use it:** Signed-in users with campaign access. Creating a batch and adding people needs campaign create permission; pausing, cancelling and changing it needs campaign update permission; **Start calling** needs campaign send permission. The workspace must include the voice feature.

**Purpose:** Have your published AI voice agent call a list of people for you — renewals, payment or service reminders, feedback, follow-ups — a few at a time, within calling hours, retrying people who don’t pick up.

**Prerequisites:** A WhatsApp number with a **published** voice agent that the administrator has allowed to make AI calls (see the [voice agent window](#dialog-ar-voice-agent-dialog-1)). Only people who have allowed WhatsApp calls from your number and have not opted out of messages or calls are called. A CSV file of the people to call, with a phone column.

**Views and sections:** Batch list with status and how many people were reached; the selected batch’s settings, counts by result, actions, CSV upload and the list of people with their status, attempts, next try and last outcome; the **New batch** window.

**Step-by-step**

1. Click **New batch**. Enter a **Batch name**, choose the **WhatsApp number** whose agent calls, and choose **Call on**: **WhatsApp** (only people who allowed WhatsApp calls) or **Phone line (Exotel)** (their number is rung from your Exotel number into its AI call flow, following the line's consent rules). On the phone line, voicemail and operator announcements count as not reached and are tried again within the batch's attempts.
2. Enter the **Reason for the calls**. The agent says this after its greeting. You can use variables such as `{{name}}`, or any column of your file such as `{{plan}}`.
3. Optionally set **Start at**; otherwise calling begins as soon as you start the batch.
4. Set **Call from** and **Call until** (never earlier than 09:00 or later than 21:00 India time), **Calls at once**, **Attempts per person** and **Minutes between attempts**, then click **Create batch**.
5. Select the batch and use **Add people from a CSV file**. The file needs a `phone` column (10-digit Indian numbers are accepted); a `name` column fills the contact’s name, and every other column becomes a variable for that person. Read the result: how many were added and any lines that were skipped, with the reason.
6. Review the list of people, then click **Start calling**.
7. Use **Refresh** to follow progress. Each person moves from **Waiting** to **On a call**, then to **Reached**, **Not reached** (no answer after every attempt), **Skipped** (opted out or no WhatsApp call permission), **Failed** or **Cancelled**.
8. Use **Pause** to stop placing new calls, and **Start calling** again to resume. **Cancel batch** stops all calls not yet placed; calls already in progress finish normally.
9. Review what the agent did on each call under **AI conversations** on the [WhatsApp calls](#page-calls-whatsapp) page.

[Screenshot P119: AI call batches page with a running batch selected, its counts and the list of people with statuses visible; highlight “Start calling” and the progress line. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Only people who granted WhatsApp call permission are called; everyone else is listed as **Skipped** with the reason and is never retried. Outside the calling window the batch simply waits, without using up anyone’s attempts. If the agent is unpublished or AI calling is switched off for the number, the batch pauses itself — fix the agent, then start it again. A batch holds at most 5,000 people. Put in the CSV only information the agent may say aloud to that person.

<a id="page-helpdesk"></a>

### Helpdesk

**Open:** `/helpdesk`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Manage customer support conversations as tracked tickets.

**Prerequisites:** Helpdesk access/feature; customer contact and issue details.

**Views and sections:** Ticket list; new ticket; customer ticket detail; support settings; portal and sign-off options.

**Step-by-step**

1. Click **New ticket**, select the customer and enter **Subject**, **Priority** and optional **Description**.
2. Click **Create ticket**.
3. Select **Mine** or **Everyone**, and use **Overdue only** to prioritise work.
4. Open a ticket to review its history, assignment, status and available replies/actions.
5. Update or resolve it after completing the work.
6. Open **Settings** to review portal, sign-off and service rules when authorised.

**Related windows:** [New ticket](#dialog-ar-helpdesk-1); [Ticket](#dialog-ar-ticket-detail-dialog-1); [Helpdesk rules, public portal and sign-off template](#dialog-ar-ticket-settings-dialog-1).

[Screenshot P068: Helpdesk page showing its principal sections and a suitable sample record; highlight “New ticket” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Helpdesk tickets and equipment Field tickets have separate workflows. Choose the relevant page for the type of service request.

<a id="page-helpdesk-new"></a>

### New ticket / Ticket details / Helpdesk settings

**Open:** `/helpdesk/new`. **Other entry paths:** `/helpdesk/:id` (Ticket details), `/helpdesk/settings`. **Who can use it:** Users with helpdesk access; settings need the manage permission.

**Purpose:** Raise a support ticket, work it on its own page, and set the helpdesk rules.

**Step-by-step**

1. On **New Support Ticket**, enter the **Subject** and the description (symptoms, error codes, line, steps already tried), then save.
2. On a ticket's page, set the **Ticket Status**, **Priority Level** and **Assigned Support Agent**.
3. Write an **Internal Note** for the team, or **Reply to Customer**.
4. Use **Delete Ticket** only for a ticket raised in error.
5. On **Helpdesk Settings**, set the rules, public portal and sign-off template.
6. Click **Back to Helpdesk** to return.

**Fields:** see [New ticket](#dialog-ar-helpdesk-1), [Ticket](#dialog-ar-ticket-detail-dialog-1) and [Helpdesk rules, public portal and sign-off template](#dialog-ar-ticket-settings-dialog-1).

[Screenshot P169: Ticket details page with status, priority and a customer reply.]

**Tips and common errors:** An internal note is not sent to the customer; check which one you chose before sending.

<a id="page-meetings"></a>

### Meetings

**New in 1.2:** a meeting can be linked to records and shared in the same way as a task, and reminded on email, WhatsApp and/or SMS. Tick **Remind the customer too** to remind the customer as well as the team. Every occurrence of a repeating meeting keeps its links. See [Tasks & meetings settings](#page-settings-tasks-meetings).

**Open:** `/meetings`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Schedule customer/team meetings and track responses and outcomes.

**Prerequisites:** Activities access; attendees and valid dates; external calendar connections if used.

**Views and sections:** Week calendar; schedule/edit; availability; detail; RSVP; done/no-show; cancellation/series; iCal import/export.

**Step-by-step**

1. Open **Meetings**, choose the week and **Mine** or **Everyone**.
2. Click **Schedule**, enter the meeting title, attendees, date/time, location or meeting link and related customer/enquiry details.
3. Review availability suggestions or conflicts, then save.
4. Open a meeting to **Accept** or **Decline** your attendance, **Edit**, export an **.ics file**, or **Copy details**.
5. After the meeting choose **Mark done**, enter the outcome and confirm.
6. Use **Cancel** or **No-show** only when appropriate; when cancelling choose whether later series occurrences are also cancelled.
7. Use **Import iCal** to import an approved calendar file.

**Related windows:** [Schedule or edit a meeting](#dialog-ar-meeting-dialog-1).

[Screenshot P069: Meetings page showing its principal sections and a suitable sample record; highlight “Meetings” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Verify time zones and recurring-meeting scope. Cancelling may notify attendees; do not confuse it with merely closing a detail window.

<a id="finance"></a>

## Finance

| Page | Open here |
| --- | --- |
| [Chart of accounts](#page-finance-chart-of-accounts) | `/finance/chart-of-accounts` |
| [Journal vouchers](#page-finance-journal-entries) | `/finance/journal-entries` |
| [Financial statements](#page-finance-statements) | `/finance/statements` |
| [GST compliance](#page-finance-gst-compliance) | `/finance/gst-compliance` |
| [Add account](#page-finance-chart-of-accounts-new) | `/finance/chart-of-accounts/new` |
| [New journal voucher / Edit journal voucher](#page-finance-journal-entries-new) | `/finance/journal-entries/new`, `/finance/journal-entries/:id/edit` |
| [Generate e-way bill](#page-finance-gst-compliance-eway) | `/finance/gst-compliance/eway/:id` |

<a id="page-finance-chart-of-accounts"></a>

### Chart of accounts

**Open:** `/finance/chart-of-accounts`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Maintain the account codes used for financial records.

**Prerequisites:** Finance/account-maintenance access and an approved accounting structure.

**Step-by-step**

1. Open **Chart of accounts** and review the category filters.
2. If appropriate for a new setup, use **Bootstrap Standard COA** and review what it creates.
3. Click **Add Account**, enter **Account Code**, **Account Name**, category, sub-category, normal balance and opening balance.
4. Add a clear purpose/description and click **Add Account**.
5. Check the account in its category before using it in a journal.

**Related windows:** [Add General Ledger Account](#dialog-app-chart-of-accounts-1).

[Screenshot P070: Chart of accounts page showing its principal sections and a suitable sample record; highlight “Chart of accounts” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Ask your accountant about the opening balance and normal balance nature. Bootstrapping should not be used casually on an already configured ledger.

<a id="page-finance-chart-of-accounts-new"></a>

### Add account

**Open:** `/finance/chart-of-accounts/new`. **Who can use it:** Users who may manage the chart of accounts.

**Step-by-step**

1. Enter the account code and **Account Name**.
2. Choose the **Category**: Asset (1xxx), Liability (2xxx), Equity (3xxx), Revenue (4xxx) or Expense (5/6xxx).
3. Enter the **Opening Balance (₹)** and the account's purpose, then save.

**Fields:** see [Add General Ledger Account](#dialog-app-chart-of-accounts-1).

[Screenshot P170: Add account page.]

**Tips and common errors:** Use a code in the range of its category.

<a id="page-finance-journal-entries"></a>

### Journal vouchers

**Open:** `/finance/journal-entries`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Record balanced accounting vouchers and controlled reversals.

**Prerequisites:** Journal access and an authorised transaction with correct ledger accounts.

**Views and sections:** General Ledger Posting Lines.

**Step-by-step**

1. Click **New Journal Voucher**.
2. Enter voucher number, date, type, reference document and narration.
3. Click **Add Ledger Line** for each debit/credit account and amount.
4. Confirm total debits equal total credits, then click **Create & Record Voucher**.
5. Review a draft before using **Post to General Ledger**.
6. If a posted entry requires correction, use **Reverse Voucher** according to your accounting approval process.

**Related windows:** [Create Double-Entry Journal Voucher](#dialog-app-journal-entries-1).

[Screenshot P071: Journal vouchers page showing its principal sections and a suitable sample record; highlight “New Journal Voucher” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Use reversal for an appropriate correction rather than creating an unrelated offset without a reference. Posting changes the accounting record.

<a id="page-finance-journal-entries-new"></a>

### New journal voucher / Edit journal voucher

**Open:** `/finance/journal-entries/new`. **Other entry paths:** `/finance/journal-entries/:id/edit`. **Who can use it:** Users who may post journal vouchers.

**Step-by-step**

1. Enter the **Voucher Number**, **Voucher Date**, any reference document and the **Narration & Audit Note**.
2. For each line choose the **General Ledger Account**, add a line narration and cost centre, and enter the debit or credit. Use **+ Add Ledger Line** for more lines.
3. Check that debits equal credits, then save.

**Fields:** see [Create Double-Entry Journal Voucher](#dialog-app-journal-entries-1).

[Screenshot P171: New journal voucher with two balanced lines.]

**Tips and common errors:** A voucher whose debits and credits differ cannot be saved.

<a id="page-finance-statements"></a>

### Financial statements

**Open:** `/finance/statements`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Read the ledger’s financial statement views.

**Prerequisites:** Financial-statement access and relevant posted accounting records.

**Views and sections:** Trial Balance; Profit & Loss Statement (Income Statement); Balance Sheet (Financial Position); Assets; Liabilities & Equity.

**Step-by-step**

1. Open **Financial statements** and set any displayed period filters.
2. Choose **Trial Balance**, **Profit & Loss (P&L) Statement** or **Balance Sheet**.
3. Review the balances and reporting period.
4. Click **Print Statement** for the selected view.

[Screenshot P072: Financial statements page showing its principal sections and a suitable sample record; highlight “Financial statements” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Draft or missing transactions can explain differences. Have an accountant review statements before external use.

<a id="page-finance-gst-compliance"></a>

### GST compliance

**New in 1.2:** issuing a sales invoice now enters it in the GST register; the screen offers the last 12 months (India time) as return periods and fills in invoices issued before this change. It no longer shows sample rows. **Generate E-Way** opens its own page ([Generate e-way bill](#page-finance-gst-compliance-eway)). E-way bill and IRN numbers are still generated inside MNI Assist, not by the government portal, and GSTR-3B eligible ITC is an estimate (65% of output tax); check both before filing.

**Open:** `/finance/gst-compliance`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Review GST report views and available invoice/transport actions.

**Prerequisites:** GST-compliance access; valid invoice data and the required external registration/configuration for electronic submissions.

**Views and sections:** Table 4: B2B Taxable Invoices; Table 9B: Credit & Debit Notes; Tax Liability Breakdown.

**Step-by-step**

1. Open **GST compliance** and review **Outward Invoices & E-Way / E-Invoice Hub**.
2. Open **GSTR-1 Return Tables Summary** or **GSTR-3B Tax & ITC Reconciliation** to inspect the required figures.
3. For an eligible invoice, review its details before choosing **Generate IRN**.
4. For applicable goods transport choose **Generate E-Way**, enter vehicle, transporter GSTIN and distance, then **Generate & Sign E-Way Bill**.
5. Confirm the returned reference/status; retain any failure message for the responsible accountant or administrator.

**Related windows:** [Generate Automated GST E-Way Bill](#dialog-app-gst-compliance-1).

[Screenshot P073: GST compliance page showing its principal sections and a suitable sample record; highlight “GST compliance” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A button being visible does not establish government acceptance. Use returned acknowledgements and the responsible accountant’s checks; do not treat a local report as a filed return.

<a id="page-finance-gst-compliance-eway"></a>

### Generate e-way bill

**Open:** `/finance/gst-compliance/eway/:id`, from **Generate E-Way** on an invoice in GST compliance. **Who can use it:** Users with GST compliance access.

**Step-by-step**

1. Check the invoice shown.
2. Enter the **Vehicle number**, the transporter's GSTIN or ID if any, and the **Distance (km)**.
3. Generate it. The number is copied to the sales invoice and its challan.

**Fields:** see [Generate Automated GST E-Way Bill](#dialog-app-gst-compliance-1).

[Screenshot P172: Generate e-way bill page with vehicle number and distance.]

**Tips and common errors:** The e-way bill number is generated inside MNI Assist and is not yet filed with the NIC e-way portal; do not move goods on it alone.

<a id="documents-and-reporting"></a>

## Documents and reporting

| Page | Open here |
| --- | --- |
| [Analytics](#page-analytics) | `/analytics` |
| [Campaign results](#page-analytics-campaigns) | `/analytics/campaigns` |
| [Ad attribution](#page-analytics-ads) | `/analytics/ads` |
| [Custom dashboards](#page-analytics-dashboards) | `/analytics/dashboards` |
| [Reports](#page-reports) | `/reports` |
| [My exports](#page-reports-exports) | `/reports/exports` |
| [Business reports](#page-reports-business) | `/reports/business` |
| [Documents](#page-documents) | `/documents` |
| [Products](#page-documents-products) | `/documents/products` |
| [Price lists](#page-documents-price-lists) | `/documents/price-lists` |

<a id="page-analytics"></a>

### Analytics

**Open:** `/analytics`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Understand message delivery and business conversion over a selected period.

**Prerequisites:** Analytics access; activity in the selected period; AI summarisation where enabled.

**Views and sections:** Summary; Volume by day; Spend by category; Template performance; Agent performance; Customer satisfaction by team; Enquiry conversion · all channels; MM Lite vs standard.

**Step-by-step**

1. Open **Analytics** and choose the reporting period.
2. Review delivery, read and conversion figures.
3. Choose the available conversion breakdown such as source, owner, stage or pipeline.
4. Click a drill-down figure to inspect the underlying enquiries and close the detail window when done.
5. Use **Summarise this period** if available and review the generated explanation.
6. Select an offered export format when you need a report file.

**Related windows:** [Analytics figure: underlying enquiries](#dialog-ar-analytics-1).

[Screenshot P074: Analytics page showing its principal sections and a suitable sample record; highlight “Analytics” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Use the same period and filters when comparing reports. An AI summary is an explanation to review, not a substitute for the underlying records.

<a id="page-analytics-campaigns"></a>

### Campaign results

**Open:** `/analytics/campaigns`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Compare campaign performance for the selected period.

**Prerequisites:** Campaign-results access and campaigns with recorded activity.

**Views and sections:** From send to sale; By campaign.

**Step-by-step**

1. Open **Campaign results**.
2. Select the reporting period.
3. Review campaign totals and the delivery, read, reply or outcome figures displayed.
4. Open the relevant campaign or related detail link to investigate a result.

[Screenshot P075: Campaign results page showing its principal sections and a suitable sample record; highlight “Campaign results” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Fresh sends may still be awaiting delivery events. Do not treat an unreported result as a confirmed failure.

<a id="page-analytics-ads"></a>

### Ad attribution

**Open:** `/analytics/ads`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Other entry paths:** `/analytics/ads/callback`. The same screen/procedure is used; a callback is entered automatically after provider authorisation.

**Purpose:** Connect ad accounts and see attributed lead activity.

**Prerequisites:** Ad-attribution access and a Meta user authorised for the intended ad accounts.

**Views and sections:** Ad spend from Meta; By ad.

**Step-by-step**

1. Open **Ad attribution** and click **Connect an ad account**.
2. Complete the Meta sign-in and permissions steps.
3. On return select the intended ad accounts in **Choose the ad accounts to connect** and click **Connect**.
4. Select a reporting period and use **Update now** to refresh available data.
5. Use **Connect again** for an expired authorisation or **Disconnect** when ending the connection.

**Related windows:** [Choose the ad accounts to connect](#dialog-ar-ad-attribution-1).

[Screenshot P076: Ad attribution page showing its principal sections and a suitable sample record; highlight “Ad attribution” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Connect only accounts you are authorised to manage. Returning from Meta without selecting an account does not finish setup.

<a id="page-analytics-dashboards"></a>

### Custom dashboards

**Open:** `/analytics/dashboards`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Create a reusable set of business-report tiles.

**Prerequisites:** Analytics access and permission to create or edit the dashboard.

**Step-by-step**

1. Open **Custom dashboards** and click **New dashboard**.
2. Enter **Name** and decide whether to **Share with everyone in the workspace**.
3. Click **Add tile** and choose the available measures and display options.
4. Use the up/down arrows to arrange tiles and remove an unwanted tile with its remove control.
5. Click **Save** and select the dashboard to view it.
6. Use **Edit** to revise it later.

**Related windows:** [Edit dashboard / New dashboard](#dialog-ar-custom-dashboards-1).

[Screenshot P077: Custom dashboards page showing its principal sections and a suitable sample record; highlight “Custom dashboards” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Sharing makes the dashboard visible more widely within the workspace; it does not grant access to restricted underlying data.

<a id="page-reports"></a>

### Reports

**Open:** `/reports`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Find the report you need from a single directory.

**Prerequisites:** Access to at least one of the reports listed for your role.

**Step-by-step**

1. Open **All reports**.
2. Read each report card’s description.
3. Choose Analytics, Campaign results, Ad attribution, Forecast, Business reports, Stock planning, AMC renewals, Custom dashboards, Scheduled reports or My exports as needed.
4. Complete that report’s filters before using its results.

[Screenshot P078: Reports page showing its principal sections and a suitable sample record; highlight “All reports” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** The directory may hide reports your role or plan cannot use.

<a id="page-reports-exports"></a>

### My exports

**Open:** `/reports/exports`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Download report exports that have finished preparing.

**Prerequisites:** A report export previously requested by your account and access to its data.

**Views and sections:** Exports.

**Step-by-step**

1. Open **My exports**.
2. Click **Refresh** to check preparation status.
3. Find the correct report and request time.
4. Click **Download** for a ready export and store the file appropriately.

[Screenshot P079: My exports page showing its principal sections and a suitable sample record; highlight “My exports” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A preparing or failed export is not ready to download. If a download expires, generate a new export from its original report.

<a id="page-reports-business"></a>

### Business reports

**Open:** `/reports/business`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Review stock and payment business reports.

**Prerequisites:** Permission for the corresponding inventory or payment data and any required reporting feature.

**Views and sections:** Stock; Payments; report filters; detail tables; available exports.

**Step-by-step**

1. Open **Business reports**.
2. Select **Stock** or **Payments**.
3. Choose the relevant period, customer or other filters shown for the selected report.
4. Review totals and detail rows.
5. Use the available export action when you need a file.

[Screenshot P080: Business reports page showing its principal sections and a suitable sample record; highlight “Business reports” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Stock reports and payment reports answer different questions. Use matching periods and filters when reconciling figures.

<a id="page-documents"></a>

### Documents

**Open:** `/documents`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Store approved documents for sharing and relevant knowledge searches.

**Prerequisites:** Document-library access; an allowed file and a clear decision about who may access it.

**Step-by-step**

1. Click **Upload document**, choose **File**, enter **Title**, optional category and related part numbers.
2. Select **Access** and any allowed account IDs required by the chosen access setting.
3. Click **Upload** and check the stored record.
4. Use **Edit** to change metadata or **Replace file** for an updated document.
5. Use **Download** or **Sent to** to review the document and sharing history.
6. Delete only an obsolete document after reviewing its usage.

**Related windows:** [Edit document / Upload a document](#dialog-ar-documents-1); [Sent to](#dialog-ar-documents-2).

[Screenshot P081: Documents page showing its principal sections and a suitable sample record; highlight “Upload document” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Access restrictions matter when sharing or using knowledge retrieval. Verify a replacement’s content rather than relying on the old title.

<a id="page-documents-products"></a>

### Products

**Open:** `/documents/products`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Maintain the product master and base list prices.

**Prerequisites:** Library/product access; unique part numbers, product names, units and approved prices.

**Step-by-step**

1. Open **Documents → Products** and search the part number before adding it.
2. Click **New product**, enter **Part number**, **Unit**, **Name**, approved **List price ₹** and any description/category/HSN/GST details.
3. Keep **Active** selected only for products available for use, then click **Save**.
4. Use **Edit** to maintain an existing product and **Active only** to filter the list.
5. To import, click **Import**, paste rows in this order: part number, name, price ₹, unit, category, HSN, GST %.
6. Click **Import** and review added, updated and skipped rows.

**Related windows:** [Edit product / New product](#dialog-ar-products-1); [Import products](#dialog-ar-products-2).

[Screenshot P082: Products page showing its principal sections and a suitable sample record; highlight “Documents → Products” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** An existing part number is updated by import. Enter rupees in the UI, not an amount multiplied into paise. A base list price is not necessarily a customer-specific final price.

<a id="page-documents-price-lists"></a>

### Price lists

**Open:** `/documents/price-lists`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Maintain customer/region/tier price overrides.

**Prerequisites:** Library/price-list access; existing products and an approved commercial pricing policy.

**Step-by-step**

1. Click **New price list**.
2. Enter **Name**, optional **Region**, **Distributor tier**, **Effective from** and the active setting.
3. Click **Add item**, select the product and enter the approved override price.
4. Repeat for the products covered by this list.
5. Review applicability and click **Save**.
6. Use **Edit** to update a list or remove individual entries with their remove controls.

**Related windows:** [Edit price list / New price list](#dialog-ar-price-lists-1).

[Screenshot P083: Price lists page showing its principal sections and a suitable sample record; highlight “New price list” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Blank region or tier can broaden a list’s applicability. The voice pilot’s base/catalogue reference is not a promise that customer-specific discounts are applied automatically.

<a id="channels-and-subscriptions"></a>

## Channels and subscriptions

| Page | Open here |
| --- | --- |
| [Billing](#page-billing) | `/billing` |
| [Channels](#page-channels) | `/channels` |
| [Numbers](#page-channels-numbers) | `/channels/numbers` |
| [Telecom & Reseller Numbers](#page-channels-telecom) | `/channels/telecom` |
| [Reseller programme](#page-resellers) | `/resellers` |
| [Lead forms](#page-channels-lead-forms) | `/channels/lead-forms` |
| [Chat links & QR](#page-channels-widget) | `/channels/widget` |
| [Migrate a number](#page-channels-migrate) | `/channels/migrate` |
| [Catalogue](#page-channels-catalogue) | `/channels/catalogue` |
| [Voice / IVR](#page-channels-voice-ivr) | `/channels/voice-ivr` |
| [Invoices](#page-billing-invoices) | `/billing/invoices` |
| [New IVR prompt / Edit IVR prompt](#page-channels-voice-ivr-prompts) | `/channels/voice-ivr/prompts/new`, `/channels/voice-ivr/prompts/:id` |

<a id="page-billing"></a>

### Billing

**Open:** `/billing`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Review the subscription and wallet and start a payment.

**Prerequisites:** Billing access; approved payment method and correct workspace billing details.

**Views and sections:** Wallet; This period; Plan; Plan usage; Ledger.

**Step-by-step**

1. Open **Billing** and review the current subscription, wallet balance and available plans.
2. Select a plan and inspect the cost and included features.
3. Click **Activate** when you intend to proceed and complete the offered checkout steps.
4. To fund usage choose **Top up wallet**, enter the amount and select a payment gateway when offered.
5. Complete gateway payment and return to check the updated status.
6. Use **Not now** to leave a proposed activation without proceeding.

[Screenshot P084: Billing page showing its principal sections and a suitable sample record; highlight “Billing” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not assume a payment succeeded because the browser left the gateway. Verify status before retrying. Manual payment-reference entry is available only where the workspace permits it.

<a id="page-channels"></a>

### Channels

**Open:** `/channels`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Review connected messaging numbers and open their setup actions.

**Prerequisites:** Channel access; provider/Meta authorisation for the number you intend to connect.

**Step-by-step**

1. Open **Channels** and review each channel’s connection and health.
2. Click **Connect a number** and follow the number-connection wizard.
3. Check the number appears in this workspace after the connection completes.
4. For a permitted WhatsApp number click **Voice agent** to review its instructions and settings.
5. Review **Numbers**, **Catalogue** or **Voice / IVR** for their specialised setup.

**Related windows:** [Connect a WhatsApp number](#dialog-ar-connect-number-dialog-1); [Voice agent: profile, actions, analysis, testing and versions](#dialog-ar-voice-agent-dialog-1).

[Screenshot P085: Channels page showing its principal sections and a suitable sample record; highlight “Channels” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A number must route to the intended workspace. Do not reuse another workspace’s live number without an authorised migration/release process.

<a id="page-channels-numbers"></a>

### Numbers

**Open:** `/channels/numbers`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Maintain WhatsApp display-name, registration and number-release settings.

**Prerequisites:** Channel access; management permissions for changes; access to the intended Meta number.

**Views and sections:** Display name; Two-step verification PIN.

**Step-by-step**

1. Open **Numbers** and click **Refresh**.
2. Use **Connect a number** for a new connection.
3. For a display-name change choose **Request a change**, enter the proposed name and **Submit for review**.
4. Use **Set PIN**, **Change PIN** or **Set PIN and register** only for the intended number.
5. To release a number select **Release number**, read whether Meta deregistration is also requested, type the number to confirm, then release only when authorised.

**Related windows:** [Connect a WhatsApp number](#dialog-ar-connect-number-dialog-1); [Release / ?](#dialog-ar-numbers-1).

[Screenshot P086: Numbers page showing its principal sections and a suitable sample record; highlight “Numbers” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Releasing breaks this workspace’s use of the number. Meta deregistration can stop it across applications until registered again; it is different from a workspace-only release.

<a id="page-channels-telecom"></a>

### Telecom & Reseller Numbers

**Open:** `/channels/telecom`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Administer a permitted telecom number pool, allocation and entity records.

**Prerequisites:** Authorised telecom/channel management role; carrier-supplied number and approved regulatory/entity information.

**Views and sections:** Inventory; allocation; release/quarantine; early reactivation; telecom entity profile; compliance audit certificate.

**Step-by-step**

1. Open **Telecom & numbers** and choose **Number Inventory & Reselling** or **Operating as Telecom Entity**.
2. Click **Add number to pool**, enter the 10-digit Indian number, carrier, provisioning type, rental, setup fee and carrier reference, then **Add to inventory**.
3. Select an available number, click **Allocate to workspace**, choose the authorised target and display name, then **Confirm allocation**.
4. Use **Release number** with a reason and cooling-off days when ending allocation.
5. In the entity view choose **Edit profile**, complete the actual registration and responsible-officer details, then **Save changes**.
6. Click **Run compliance audit** and review its certificate/results; use **Reactivate early** only where an authorised exception applies.

[Screenshot P087: Telecom & Reseller Numbers page showing its principal sections and a suitable sample record; highlight “Telecom & numbers” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Saving regulatory identifiers is not regulatory approval. Releasing or reallocating a working number can interrupt service.

<a id="page-resellers"></a>

### Reseller programme

**Open:** `/resellers`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Run a reseller partnership, branded client workspaces and commissions.

**Prerequisites:** Reseller-programme access/feature; host permissions for programme approval and payouts.

**Views and sections:** Host partner directory; registration; Overview; Branding & domain; Client workspaces; Commissions; Payouts; host approval/tier controls.

**Step-by-step**

1. Open **Reseller programme**; register with **Register as a partner**, or as host choose **Add partner** and complete the company/contact information.
2. Open a partner and review **Overview**.
3. In **Branding & domain**, enter the approved brand details and domain, then follow the shown domain-verification process.
4. In **Client workspaces**, click **Add client workspace** and review the plan, billing cycle, wholesale/client price and commission rate.
5. In **Commissions**, inspect records or record an authorised commission against the correct client/invoice.
6. In **Payouts**, request an eligible amount; host staff may **Mark paid** with a verified UTR or **Reject** with a reason.
7. Host staff can approve, suspend, reactivate or change tier according to the partnership agreement.

[Screenshot P088: Reseller programme page showing its principal sections and a suitable sample record; highlight “Reseller programme” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A domain is not live merely because it was entered. Recording a commission or marking a payout paid does not move money automatically.

<a id="page-channels-lead-forms"></a>

### Lead forms

**Open:** `/channels/lead-forms`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Other entry paths:** `/channels/lead-forms/callback`. The same screen/procedure is used; a callback is entered automatically after provider authorisation.

**Purpose:** Connect Facebook Pages and bring lead-form submissions into the workspace.

**Prerequisites:** Lead-form/channel access; a Meta account authorised for the intended Pages.

**Views and sections:** Connected Pages; Recent leads.

**Step-by-step**

1. Click **Connect a Facebook Page** and complete Meta authorisation.
2. On return select the Pages in **Choose the Pages to connect** and click **Connect**.
3. Choose whether to **Open an enquiry for each lead**.
4. Click **Fetch leads now** to retrieve available leads.
5. Review the connection status and reconnect or disconnect through the displayed controls when needed.

**Related windows:** [Choose the Pages to connect](#dialog-ar-lead-forms-1).

[Screenshot P089: Lead forms page showing its principal sections and a suitable sample record; highlight “Connect a Facebook Page” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A Page connection and an ad-account connection are separate authorisations. Verify the Page belongs to the workspace’s intended business.

<a id="page-channels-widget"></a>

### Chat links & QR

**Open:** `/channels/widget`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Create tracked WhatsApp chat links and QR assets.

**Prerequisites:** Channel access and a usable WhatsApp number.

**Step-by-step**

1. Click **New link**, choose **Channel** and enter **Name**, **Source** and optional pre-filled message.
2. Choose whether tracking is **Active**, then click **Create**.
3. Choose **Get link & QR** for the saved link.
4. Use **Copy** for the link or **Copy snippet** for the website code, and use the offered QR asset.
5. Test the link yourself before publishing it.
6. Use **Edit** to update a saved link.

**Related windows:** [Edit chat link / New chat link](#dialog-ar-chat-widgets-1); [Chat link](#dialog-ar-chat-widgets-2).

[Screenshot P090: Chat links & QR page showing its principal sections and a suitable sample record; highlight “New link” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A paused tracking link may still open the chat; the active switch controls counting, not a guarantee that the destination stops working.

<a id="page-channels-migrate"></a>

### Migrate a number

**Open:** `/channels/migrate`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Move an eligible WhatsApp number through the guided migration process.

**Prerequisites:** Number-onboarding permission, control of the phone number, the intended WABA and any required two-step PIN.

**Views and sections:** Before you start; History.

**Step-by-step**

1. Read the migration explanation and confirm that this is the intended number/account.
2. Enter **Country code**, **Number without country code** and **WABA ID**.
3. Read and acknowledge the warning about WhatsApp Business app chat history before **Start migration**.
4. Choose **SMS** or **Voice call** and click **Request code**.
5. Enter **Verification code** and the required six-digit **Two-step PIN**, then click **Verify & finish**.
6. Check the number’s resulting status in **Numbers**.

[Screenshot P091: Migrate a number page showing its principal sections and a suitable sample record; highlight “Country code” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not start on an actively used number without an approved change window. History and provider-routing consequences must be understood before proceeding.

<a id="page-channels-catalogue"></a>

### Catalogue

**Open:** `/channels/catalogue`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Maintain products published to the selected WhatsApp catalogue.

**Prerequisites:** Catalogue access; connected WhatsApp channel and product information accepted by Meta.

**Step-by-step**

1. Open **Catalogue** and select the intended number/catalogue if a selector is shown.
2. Choose **Add product**, enter **SKU retailer id**, name, optional description, **Price (₹)**, stock availability and optional image URL, then **Save**.
3. Alternatively choose **Add from products**, search the product master, select products and click **Add to catalogue**.
4. Review entries and click **Sync to WhatsApp**.
5. Check the final sync/status and correct rejected or incomplete records before customer use.

**Related windows:** [Edit product / Add product](#dialog-ar-catalogue-1); [Add from products](#dialog-ar-catalogue-2).

[Screenshot P092: Catalogue page showing its principal sections and a suitable sample record; highlight “Catalogue” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Saving locally is different from successfully publishing to WhatsApp. Use an image URL the provider can reach. Voice price reference uses eligible active/published data for the relevant workspace/channel.

<a id="page-channels-voice-ivr"></a>

### Voice / IVR

**Open:** `/channels/voice-ivr`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Set up the Exotel voice account, browser phone and keypad menu.

**Prerequisites:** Voice/channel access; a configured provider account and approved connection details from your administrator.

**Views and sections:** WhatsApp voice; Exotel voice and IVR; Connect to Exotel (once); In-browser phone; Check your menu; Try the menu.

**Step-by-step**

1. Open **Voice / IVR** and choose the relevant channel.
2. Click **Configure Exotel account**, enter the Exotel phone number, Account SID, correct API hostname and credential pair, then **Save account**.
3. For browser calling enter the supplied SIP domain, WebSocket server, username and password, enable the browser phone and **Save**.
4. Click **New prompt**, enter menu key/internal name, spoken text, digit limit and timeout, then save.
5. Use **Add branch** to map each digit to another prompt, agent transfer or hang-up.
6. Set the intended prompt as the **entry point** and test the configured flow using the available **Run** action.

**Related windows:** [Edit prompt / New prompt](#dialog-ar-voice-ivr-1); [Add branch](#dialog-ar-voice-ivr-2).

[Screenshot P093: Voice / IVR page showing its principal sections and a suitable sample record; highlight “Voice / IVR” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Provider credentials are private. Exotel keypad menus, WhatsApp IVR menus and AI voice agents are separate configurations; changing one does not configure the others.

<a id="page-channels-voice-ivr-prompts"></a>

### New IVR prompt / Edit IVR prompt

**Open:** `/channels/voice-ivr/prompts/new`. **Other entry paths:** `/channels/voice-ivr/prompts/:id`. **Who can use it:** Users who can manage channels.

**Step-by-step**

1. Enter the **Internal Prompt Name** and the words callers hear (for example “Press 1 for Sales, press 2 for Emergency Breakdown Support”).
2. Set **Max Digits to Collect** (usually 1) and **Input Timeout (Seconds)**.
3. Tick **Make this prompt the entry point** for the first message on incoming calls, then save.
4. Click **Back to Voice / IVR** to return.

**Fields:** see [Edit prompt / New prompt](#dialog-ar-voice-ivr-1).

[Screenshot P173: New IVR prompt page.]

**Tips and common errors:** Say every option in the prompt; callers cannot see the menu.

<a id="page-billing-invoices"></a>

### Invoices

**Open:** `/billing/invoices`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Review platform subscription/usage invoices and reconciliation checks.

**Prerequisites:** Billing access; correct business profile; invoice-generation or reconciliation rights for those actions.

**Step-by-step**

1. Open **Invoices** under Billing and review the relevant period and balance.
2. Use **Pay now** where offered and complete the payment gateway flow.
3. For an authorised invoice-generation task choose **Generate invoice**, enter invoice number, period and customer legal/GST/address details, then **Generate**.
4. To compare provider usage choose **Check Meta’s invoice**, select the WhatsApp number/month and supply the invoice details requested.
5. Click **Check against the meter** and review differences.
6. Use **Mark as checked** with the requested note only after investigating the variance.

**Related windows:** [Check Meta's invoice](#dialog-ar-invoices-1); [Generate a GST invoice](#dialog-ar-invoices-2).

[Screenshot P094: Invoices page showing its principal sections and a suitable sample record; highlight “Invoices” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** These are platform billing invoices, separate from customer Sales invoices and supplier Vendor bills. A reconciliation check is not a payment.

<a id="settings-and-administration"></a>

## Settings and administration

| Page | Open here |
| --- | --- |
| [DPDP readiness](#page-compliance-dpdp) | `/compliance/dpdp` |
| [Compliance](#page-compliance) | `/compliance` |
| [Settings](#page-settings) | `/settings` |
| [Your profile](#page-settings-profile) | `/settings/profile` |
| [Members & invites](#page-settings-members) | `/settings/members` |
| [Teams](#page-settings-teams) | `/settings/teams` |
| [Business profile](#page-settings-business-profile) | `/settings/business-profile` |
| [Branding](#page-settings-branding) | `/settings/branding` |
| [Workspaces](#page-admin-tenants) | `/admin/tenants` |
| [Users](#page-admin-users) | `/admin/users` |
| [Roles & permissions](#page-admin-roles) | `/admin/roles` |
| [Sign-in and password rules](#page-settings-security-policy) | `/settings/security-policy` |
| [Email templates](#page-settings-email-templates) | `/settings/email-templates` |
| [Audit log](#page-admin-audit-logs) | `/admin/audit-logs` |
| [Scheduled reports](#page-settings-reports) | `/settings/reports` |
| [Integrations](#page-settings-integrations) | `/settings/integrations` |
| [AI assistant](#page-settings-ai-assistant) | `/settings/ai-assistant` |
| [Payments](#page-settings-payments) | `/settings/payments` |
| [Email sending](#page-settings-email-sending) | `/settings/email-sending` |
| [Support access](#page-settings-support-access) | `/settings/support-access` |
| [Agency mode](#page-settings-agency) | `/settings/agency` |
| [Tasks & meetings](#page-settings-tasks-meetings) | `/settings/tasks-meetings` |
| [Shipping](#page-settings-shipping) | `/settings/shipping` |

<a id="page-compliance-dpdp"></a>

### DPDP readiness

**Open:** `/compliance/dpdp`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Review the workspace’s privacy-readiness checklist and editable notices.

**Prerequisites:** Compliance access and knowledge of the workspace’s actual privacy practices.

**Views and sections:** Your details as data fiduciary; Privacy notice draft.

**Step-by-step**

1. Open **DPDP readiness**.
2. Review each readiness item and its current status.
3. Update the editable privacy/consent information shown on the page.
4. Click **Save and recheck** and review what remains incomplete.
5. Use **Copy text** to reuse approved wording where the screen offers it.

[Screenshot P095: DPDP readiness page showing its principal sections and a suitable sample record; highlight “DPDP readiness” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A completed readiness checklist is not legal certification. Keep notices aligned with how your organisation actually handles customer information.

<a id="page-compliance"></a>

### Compliance

**New in 1.2:** the **AI call compliance** card sets the recording notice added to every AI call's greeting (on unless switched off, with your own wording). A caller who asks not to be called again is opted out straight away, and the request is kept in the consent ledger; the transcript is also checked for such requests after the call. Card numbers and similar details are masked in AI transcripts, and an access request's export includes AI call transcripts. Viewing the card needs compliance access; changing it needs the consent text permission.

**Open:** `/compliance`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Record and process customer privacy requests.

**Prerequisites:** Compliance access, the requester’s identifier and an approved identity/request-handling process.

**Views and sections:** Data-principal requests; Retention policies; Breach log.

**Step-by-step**

1. Click **Log a request**.
2. Choose **Request type**, enter **Requester identifier** and click **Log request**.
3. Review the request and verify the requester through your organisation’s procedure.
4. Use **Fulfil** only when you are authorised and ready to perform the requested action.
5. Use **Reject** where appropriate and enter a clear reason.

**Related windows:** [Log a DPDP request](#dialog-ar-compliance-1).

[Screenshot P096: Compliance page showing its principal sections and a suitable sample record; highlight “Log a request” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion or other fulfilment can affect customer records. Do not process an unverified request or confuse a logged request with a completed one.

<a id="page-settings"></a>

### Settings

**Open:** `/settings`. **Who can use it:** Signed-in users with access to this page.

**Purpose:** Manage workspace-wide sign-in settings and personal security tools.

**Prerequisites:** Sign in; appropriate administration permission for workspace-wide changes.

**Views and sections:** Single sign-on; two-step setup/recovery; session/device controls; delegated access.

**Step-by-step**

1. Open **Settings** and review the sections available to your account.
2. For SSO choose **Set up SSO** or **Edit**, enter the approved provider display name, issuer, optional authorisation/metadata URL and allowed email domains.
3. Choose the role for new SSO users and review whether password sign-in is hidden for those domains.
4. Choose **Save without enabling** to stage settings or **Save & enable** to turn them on after verification.
5. Review two-step verification, remembered sessions/devices and delegated-access cards where shown.
6. Use **Sign out everywhere else** only when you intend to end other sessions.

**Related windows:** [Set up your authenticator app](#dialog-ar-two-factor-card-1); [Save your recovery codes](#dialog-ar-two-factor-card-2); [Generate new recovery codes](#dialog-ar-two-factor-card-3); [Turn off two-step verification](#dialog-ar-two-factor-card-4).

[Screenshot P097: Settings page showing its principal sections and a suitable sample record; highlight “Settings” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** SSO and password-policy changes can affect other users. Keep a verified administrator recovery route; domain-based password hiding is described by the UI as advisory.

<a id="page-settings-profile"></a>

### Your profile

**Open:** `/settings/profile`. **Who can use it:** Signed-in users with access to this page.

**Purpose:** Maintain your own account details and password.

**Prerequisites:** Sign in; your current password for a password change.

**Views and sections:** Your details; Password; Appearance.

**Step-by-step**

1. Open your profile menu and select **Your profile**.
2. Update the permitted username, first/last name, email and optional phone number.
3. Click **Save details** and review the result.
4. In the password section enter **Current password**, **New password** and **Confirm new password**.
5. Click **Change password** and follow any sign-in prompt.

[Screenshot P098: Your profile page showing its principal sections and a suitable sample record; highlight “Your profile” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Changing an email can require confirmation. A phone used for sign-in must identify the correct account; do not reuse another member’s number.

<a id="page-settings-members"></a>

### Members & invites

**Open:** `/settings/members`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Invite workspace members and manage their active access.

**Prerequisites:** Member-management access; an email address and approved role for each invited person.

**Views and sections:** Invite a new member; Members; Deactivated; Outstanding invitations.

**Step-by-step**

1. Click **Invite someone**, enter **Email**, choose **Role** and add an optional invite note.
2. Click **Send invite** and review its status.
3. Use **Resend** for an outstanding invite or **Revoke** when it should no longer be accepted.
4. On an existing member review available role/security actions, **Devices**, and active status.
5. Use **Deactivate** with the requested reason when access should end; **Reactivate** only when approved.
6. Use **Reset 2-step**, session sign-out or **Act as** only within your authorised support/administration process.

**Related windows:** [Devices](#dialog-ar-members-1).

[Screenshot P099: Members & invites page showing its principal sections and a suitable sample record; highlight “Invite someone” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not invite someone with a broader role than needed. Deactivating a member or ending sessions can interrupt their work; check the selected person.

<a id="page-settings-teams"></a>

### Teams

**Open:** `/settings/teams`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Group members for ownership and conversation distribution.

**Prerequisites:** Team-management access and existing workspace members.

**Views and sections:** No teams yet; Inactive.

**Step-by-step**

1. Click **New team** or **Create the first team**.
2. Enter **Name**, optional description and **Lead**.
3. Select the members and review **Share new conversations**.
4. Click **Create team**.
5. Use **Edit** and **Save changes** to maintain membership or assignment settings.
6. Review any confirmation before **Delete**.

**Related windows:** [Edit team / New team](#dialog-ar-teams-1).

[Screenshot P100: Teams page showing its principal sections and a suitable sample record; highlight “New team” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A team’s distribution setting affects new conversations. Check membership before using the team as an assignment target.

<a id="page-settings-business-profile"></a>

### Business profile

**Open:** `/settings/business-profile`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Maintain the legal business details used on documents and billing.

**Prerequisites:** Business-profile management access and verified company/address information.

**Views and sections:** Business; Registered address; Contact on documents optional; How it prints.

**Step-by-step**

1. Open **Business profile**.
2. Enter required **Legal name**, **Address line 1**, **City**, **State** and **PIN code**.
3. Add the correct optional trade name, GSTIN, PAN, phone and email.
4. Check the displayed registered state and PAN information derived from GSTIN.
5. Click **Save** and inspect the saved profile.

[Screenshot P101: Business profile page showing its principal sections and a suitable sample record; highlight “Business profile” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** On the host this is the platform supplier’s profile; inside a workspace it is that business’s profile. Do not enter a customer’s legal details here.

<a id="page-settings-branding"></a>

### Branding

**Open:** `/settings/branding`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Change the workspace logo and interface brand colours.

**Prerequisites:** Branding access; an approved logo file and valid colours.

**Views and sections:** Logo; Colours.

**Step-by-step**

1. Click **Upload logo** and choose the approved image.
2. Review its appearance; use **Remove logo** to remove it if necessary.
3. Set **Primary colour** and **Accent colour**.
4. Click **Save colours** and check the navigation appearance.
5. Use **Reset to default** only if you intend to discard the custom colours.

[Screenshot P102: Branding page showing its principal sections and a suitable sample record; highlight “Upload logo” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Choose colours with readable contrast. Logo and colour changes do not change the workspace sign-in name or legal identity.

<a id="page-admin-tenants"></a>

### Workspaces

**Open:** `/admin/tenants`. **Who can use it:** Authorised platform-host users with the relevant management/view permission.

**Purpose:** Create and administer workspaces from the platform host.

**Prerequisites:** Host administrator with workspace-management permission.

**Views and sections:** All workspaces.

**Step-by-step**

1. Open **Workspaces** and search for an existing workspace first.
2. Click **New workspace**, enter **Workspace name**, **Admin email** and **Admin password**, then **Create workspace**.
3. Use **Rename** to update an allowed display/sign-in name and verify the result shown.
4. Use **Manage** to review status, subscriptions and the administrative actions offered.
5. Use **Features** to inspect or change the workspace’s permitted feature values.
6. Delete a workspace only through an approved removal process after reading its confirmation.

**Related windows:** [Workspace feature values](#dialog-ar-tenant-features-dialog-1); [New workspace / Rename workspace](#dialog-ar-admin-tenants-1); [Manage workspace: status, plan, wallet, invoices and database](#dialog-ar-workspace-manage-dialog-1).

[Screenshot P103: Workspaces page showing its principal sections and a suitable sample record; highlight “Workspaces” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Host changes can affect another company’s access and data. Renaming or deleting must be communicated through your approved administration process.

<a id="page-admin-users"></a>

### Users

**Open:** `/admin/users`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Maintain user accounts within the current authorised administration scope.

**Prerequisites:** User-management access; approved identity, role and security decisions.

**Views and sections:** Workspace users.

**Step-by-step**

1. Click **New user** and enter username, email and initial password, plus optional name/phone details.
2. Review **Active**, **Lockout enabled** and available role assignments, then **Save**.
3. Use **Edit** to update an existing user.
4. Use **Permissions** to review individual grants only when an exception is needed.
5. Open **Security** for the supported lockout, two-step or session actions.
6. Confirm deletion only for the intended account and approved reason.

**Related windows:** [User permission overrides](#dialog-ar-permission-dialog-1); [User security and sign-in controls](#dialog-ar-user-security-dialog-1); [New user / Edit user](#dialog-ar-admin-users-1).

[Screenshot P104: Users page showing its principal sections and a suitable sample record; highlight “New user” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Individual permissions can differ from the role defaults. Do not give two users the same phone for phone-based sign-in.

<a id="page-admin-roles"></a>

### Roles & permissions

**New in 1.2:** roles are edited in place on this page. Renaming a role keeps its permissions. When a member's role changes they are signed out everywhere within about a minute and see a notice that their role changed; they sign in again to get the new access.

**Open:** `/admin/roles`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Define reusable permission sets and assignable roles.

**Prerequisites:** Role/permission administration access.

**Views and sections:** Roles &amp; permissions hierarchy.

**Step-by-step**

1. Open **Roles & permissions** and choose the role to review.
2. For a new role click **New role**, enter **Name**, choose default/visible settings and click **Save**.
3. Review the permission groups and select only required permissions.
4. Click **Save all changes** when the permission selections are ready.
5. Use **Edit** for role properties and **Delete** only after reviewing its effect on assigned users.

**Related windows:** [New role / Edit role](#dialog-ar-admin-roles-1).

[Screenshot P105: Roles & permissions page showing its principal sections and a suitable sample record; highlight “Roles & permissions” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A page permission does not necessarily include create, update or delete rights. Broad grants affect everyone assigned to that role.

<a id="page-settings-security-policy"></a>

### Sign-in and password rules

**Open:** `/settings/security-policy`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Set workspace password, lockout and email-confirmation rules.

**Prerequisites:** Security-policy management permission and an approved organisation policy.

**Views and sections:** Passwords; Wrong passwords; Email confirmation.

**Step-by-step**

1. Open **Sign-in and password rules**.
2. Set minimum password length, different-character requirement and any displayed complexity options.
3. Set the password-change interval where used.
4. Review lockout enablement, wrong-attempt limit and lockout minutes.
5. Choose whether email must be confirmed before sign-in.
6. Click **Save** and communicate any user action required.

[Screenshot P106: Sign-in and password rules page showing its principal sections and a suitable sample record; highlight “Sign-in and password rules” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** An overly strict lockout policy can prevent legitimate access. Ensure account email delivery works before requiring confirmed email.

<a id="page-settings-email-templates"></a>

### Email templates

**Open:** `/settings/email-templates`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Customise the emails your workspace sends for supported events.

**Prerequisites:** Email-template management access and approved wording; familiarity with required template variables.

**Views and sections:** Preview.

**Step-by-step**

1. Select the required template or layout.
2. Edit **Subject** and the offered **Body (HTML)** or **Layout (HTML)**, retaining required variables.
3. Review the preview and click **Save**.
4. Choose **Discard changes** before saving if you do not want the edits.
5. Use **New template** for a new unique template key, display name, description and body.
6. Use **Restore default** or **Delete template** only after reviewing the impact.

**Related windows:** [New email template](#dialog-ar-email-templates-1).

[Screenshot P107: Email templates page showing its principal sections and a suitable sample record; highlight “Subject” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Removing required variables or entering malformed HTML can break important emails. A customised template is different from platform default wording.

<a id="page-admin-audit-logs"></a>

### Audit log

**Open:** `/admin/audit-logs`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Investigate recorded requests, data changes and sign-in events.

**Prerequisites:** Audit-log access; an authorised reason to inspect the records.

**Views and sections:** Requests; Changes; Sign-ins; request detail; entity change/history; filters; export.

**Step-by-step**

1. Open **Audit log** and select **Requests**, **Changes** or **Sign-ins**.
2. Set the relevant filters: user, URL/method/status or response time for requests; entity and change for data history; event/IP for sign-ins.
3. Click **Apply** or **Refresh**.
4. Open a record to inspect its details; use **Full history** where offered for an entity.
5. Use **Previous** and **Next** to page through results.
6. Click **Export to Excel** only when an exported audit file is appropriate.

**Related windows:** [Request](#dialog-ar-admin-audit-logs-1); [Entity change detail and full history](#dialog-ar-admin-audit-logs-2).

[Screenshot P108: Audit log page showing its principal sections and a suitable sample record; highlight “Audit log” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Audit exports can contain sensitive operational information. Use the correct time window before concluding that an event did not occur.

<a id="page-settings-reports"></a>

### Scheduled reports

**Open:** `/settings/reports`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Schedule recurring business-report delivery.

**Prerequisites:** Scheduled-report access; an available report and approved recipients/channels.

**Step-by-step**

1. Click **New report**, enter **Name** and choose **Report** and **Cadence**.
2. Set **Send at (hour, IST)**.
3. Choose email, in-app notification or WhatsApp digest and enter any extra recipients/WhatsApp number.
4. Select **Active** when it should run, then **Save**.
5. Use **Preview** to inspect the report and **Send now** for an authorised test/send.
6. Use **Edit** or **Delete** to maintain an existing schedule.

**Related windows:** [Edit report / New report](#dialog-ar-scheduled-reports-1); [Scheduled report preview](#dialog-ar-scheduled-reports-2).

[Screenshot P109: Scheduled reports page showing its principal sections and a suitable sample record; highlight “New report” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Scheduled WhatsApp delivery may require the approved report_ready template outside the reply window. Check recipients and IST before Send now.

<a id="page-settings-integrations"></a>

### Integrations

**New in 1.2:** the helpdesk and shop section connects **Freshdesk**, **Zendesk** and **Shopify**, so AI voice agents can read and raise tickets and read orders. **Google Calendar** can be connected so an agent checks free/busy before booking; bookings stay on the MNI Assist calendar.

**Open:** `/settings/integrations`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Connect external systems and configure event notifications.

**Prerequisites:** Integration access; authorised provider accounts and administrator-approved endpoints/credentials.

**Views and sections:** Provider cards; authorisation callbacks; field mapping; currency label; account hierarchy; message logging; webhook endpoints; test/secret rotation; ERP sync options.

**Step-by-step**

1. Open **Integrations** and find the intended provider.
2. Choose **Connect**, complete authorisation and verify the connection status after returning.
3. Review **Field mapping & currency** and the contact/company/message logging options before **Save mapping**.
4. Use **Resync open enquiries** or other sync actions only after confirming the intended scope.
5. For event notifications click **Add endpoint**, enter **Endpoint URL** and description and select the offered event settings.
6. Save the endpoint, store the shown signing secret securely and use **Send test**.
7. Use **Rotate secret** or **Re-enable** only with the receiving system ready.

**Related windows:** [Tally/SAP: choose what to sync](#dialog-ar-erp-sync-section-1); [Add a webhook endpoint](#dialog-ar-integrations-1); [selected record — field mapping](#dialog-ar-integrations-2).

[Screenshot P110: Integrations page showing its principal sections and a suitable sample record; highlight “Integrations” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A currency label does not convert values. Private-network integration endpoints require an administrator-configured allowance. Do not paste credentials into customer messages.

<a id="page-settings-tasks-meetings"></a>

### Tasks & meetings

**Open:** `/settings/tasks-meetings` (menu **Settings › Tasks & meetings**). **Who can use it:** Users who can manage channels.

**Purpose:** Set up task and meeting reminders and shares on WhatsApp and SMS as well as email.

**Prerequisites:** WhatsApp templates `task_reminder` and `meeting_reminder` approved by Meta; for SMS, a DLT-registered template with MSG91.

**Step-by-step**

1. Add **task_reminder** and **meeting_reminder** from **Templates › Industrial library** and submit them to Meta. This page shows whether they are approved.
2. Put each colleague's mobile number on their user profile.
3. For SMS, register a reminder template with DLT and MSG91, choose it here and click **Save**.

[Screenshot P174: Tasks & meetings settings showing template approval status and the SMS template choice.]

**Tips and common errors:** Without an approved template, WhatsApp reminders outside the 24-hour window cannot be sent.

<a id="page-settings-shipping"></a>

### Shipping

**Open:** `/settings/shipping` (menu **Settings › Shipping**). **Who can use it:** Users who may manage re-order settings.

**Purpose:** Tell customers on WhatsApp when their order is dispatched, and optionally use Shiprocket for rates and tracking.

**Step-by-step**

1. Choose whether to tell customers on dispatch, and the template to use outside the 24-hour window.
2. Optionally enter your Shiprocket API user and pickup PIN code.
3. Save. Dispatch won orders from Re-orders or Sales; delivery status follows on its own.

[Screenshot P175: Shipping settings with dispatch messages on; obscure the Shiprocket credentials.]

**Tips and common errors:** This used to be on the Re-orders page. Transporters you book directly work without Shiprocket.

<a id="page-settings-ai-assistant"></a>

### AI assistant

**Open:** `/settings/ai-assistant`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Maintain approved knowledge and control automatic text replies.

**Prerequisites:** AI-assistant access/feature; approved knowledge articles and an enabled backend service.

**Views and sections:** Assistant; Try a question; Knowledge base; Recent decisions.

**Step-by-step**

1. Click **Add article**, enter **Title** and **Text** and choose whether the assistant may answer from it, then **Save article**.
2. Use **Sync from Library** for eligible documents or **Re-index** after changes when needed.
3. Enter a test question and click **Ask** to review the answer.
4. Set the confidence threshold, replies-per-conversation limit, tone and handoff message.
5. Enable **Reply to customers’ messages automatically** only after reviewing tests, then **Save settings**.
6. Maintain articles with **Edit** or **Delete**.

**Related windows:** [Edit article / Add a knowledge article](#dialog-ar-ai-assistant-1).

[Screenshot P111: AI assistant page showing its principal sections and a suitable sample record; highlight “Add article” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Tone instructions do not authorise answers outside the knowledge base. This text-assistant setup is separate from a channel’s realtime Voice agent profile.

<a id="page-settings-payments"></a>

### Payments

**Open:** `/settings/payments`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Configure BillDesk payment requests for customers.

**Prerequisites:** Payment-management access; merchant-approved account details and the correct test/live environment.

**Views and sections:** BillDesk account; Requests.

**Step-by-step**

1. Open **Payments** in Settings.
2. Enter **Merchant ID**, **Client ID** and the signing secret supplied by the merchant administrator.
3. Choose **System Test (UAT)** for testing or **Live** only for the approved real merchant setup.
4. Choose whether the team may send payment requests and click **Save**.
5. Review the saved state before sending a test request through an approved test conversation.

[Screenshot P112: Payments page showing its principal sections and a suitable sample record; highlight “Payments” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Leave a saved secret field empty only when the UI says this keeps it. A live configuration can collect real money; do not mix UAT and live credentials.

<a id="page-settings-email-sending"></a>

### Email sending

**Open:** `/settings/email-sending`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Set the sender, outgoing delivery and optional inbound mailbox.

**Prerequisites:** Email/channel access; approved sender address and provider configuration for SMTP or mailbox connections.

**Views and sections:** Sender identity; shared relay/SMTP; open tracking; Google/Microsoft authorisation; IMAP mailbox; test email; mailbox pause/resume.

**Step-by-step**

1. Enter **From name**, **From address** and optional **Reply-to**, then **Save sender**.
2. Choose the shared relay or your **own SMTP server**.
3. For SMTP enter the provider host, port, username and password, then **Save delivery settings**.
4. Decide whether open tracking is appropriate for your organisation.
5. For incoming email use **Connect Gmail**, **Connect Microsoft 365**, or the supplied IMAP host/login/folder and **Connect mailbox**.
6. Use **Send test** and check delivery; use **Check now**, **Pause**, **Resume** or **Disconnect** for the intended mailbox as needed.

[Screenshot P113: Email sending page showing its principal sections and a suitable sample record; highlight “From name” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** An opened indicator is a hint, not proof the person read the email. Own-domain sending may require your email administrator’s DNS/authentication setup.

<a id="page-settings-support-access"></a>

### Support access

**Open:** `/settings/support-access`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action.

**Purpose:** Grant temporary, controlled access to support staff.

**Prerequisites:** Member/support-access management rights and a confirmed support need.

**Views and sections:** Session history; Expired and revoked grants.

**Step-by-step**

1. Click **Grant access**.
2. Enter **Why support needs access**, select **For how long** and add the ticket reference if available.
3. Leave **Allow changes** off for inspection-only support; enable it only for an authorised fix.
4. Click **Grant access** and review the active grant.
5. Click **Revoke now** as soon as access is no longer required.

**Related windows:** [Grant support access](#dialog-ar-support-access-1).

[Screenshot P114: Support access page showing its principal sections and a suitable sample record; highlight “Grant access” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Use the shortest suitable duration. Support access is not an invitation to create a permanent administrator account.

<a id="page-settings-agency"></a>

### Agency mode

**Open:** `/settings/agency`. **Who can use it:** Signed-in users with access to this page and any additional permission required for the selected action; the workspace must also include the relevant plan feature.

**Purpose:** Manage authorised agency access between client workspaces.

**Prerequisites:** Agency feature/access and a client’s explicitly granted connection.

**Views and sections:** Agencies with access to this workspace; Client workspaces you manage.

**Step-by-step**

1. As a client, click **Create invite code** and pass it to the intended agency through your approved process.
2. As an agency, enter the client code and choose **Redeem a client code**.
3. Confirm the client’s identity, then click **Enter workspace** to start an authorised session.
4. Check the workspace/session banner before taking action.
5. Use **End session** to return; use **Revoke** or **Leave** to end the relationship when appropriate.

[Screenshot P115: Agency mode page showing its principal sections and a suitable sample record; highlight “Create invite code” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Agency access is distinct from reseller billing and temporary support access. Always check the current workspace before editing customer data.

<a id="platform-host-operations"></a>

## Platform host operations

| Page | Open here |
| --- | --- |
| [Platform](#page-platform) | `/platform` |
| [Feature flags](#page-platform-feature-flags) | `/platform/feature-flags` |
| [AI providers](#page-platform-ai-providers) | `/platform/ai-providers` |
| [Status page](#page-platform-status) | `/platform/status` |
| [Payment gateways](#page-platform-payment-gateways) | `/platform/payment-gateways` |

<a id="page-platform"></a>

### Platform

**Open:** `/platform`. **Who can use it:** Authorised platform-host users with the relevant management/view permission.

**Purpose:** Monitor host-wide platform conditions and schedule usage rates.

**Prerequisites:** Host platform-metrics permission; additional management rights for rate or alert changes.

**Views and sections:** At-risk queue; Tenants; Rate history.

**Step-by-step**

1. Open **Console** under Platform.
2. Review the platform metrics and alerts; use **Only those needing attention** or **Show resolved** as required.
3. Use **Take it** to claim an alert and **Resolve** only after investigation, entering the requested note.
4. Use **Export** for an authorised report.
5. For rate administration click **Schedule a rate**, choose category, provider charge, tenant price and effective date, then **Schedule**.

**Related windows:** [Schedule a rate](#dialog-ar-platform-console-1).

[Screenshot P116: Platform page showing its principal sections and a suitable sample record; highlight “Console” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A scheduled rate can affect customer billing. Review category, rupee values and effective time carefully before confirming.

<a id="page-platform-feature-flags"></a>

### Feature flags

**Open:** `/platform/feature-flags`. **Who can use it:** Authorised platform-host users with the relevant management/view permission.

**Purpose:** Control host-wide or workspace-specific feature rollout.

**Prerequisites:** Host tenant-management permission and an approved rollout plan.

**Step-by-step**

1. Click **New rule**.
2. Choose **Feature** and enter **Tenant ID** only for a workspace-specific rule; leave it blank only for an intended global default.
3. Choose whether it is on for everyone covered, or set the **Rollout %**.
4. Add a note and click **Save**.
5. Review the rule’s scope before editing or deleting it.

**Related windows:** [Feature flag rule](#dialog-ar-feature-flags-1).

[Screenshot P117: Feature flags page showing its principal sections and a suitable sample record; highlight “New rule” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Blank tenant scope can affect every workspace. A rollout rule does not substitute for an account permission or subscription entitlement.

<a id="page-platform-ai-providers"></a>

### Phone numbers

**Open:** `/platform/phone-numbers` (menu **Phone numbers**). **Who can use it:** Platform-host users with tenant-management permission only.

**Purpose:** Find and rent Exotel numbers (ExoPhones) for a workspace. The number is rented on the **workspace's own Exotel account**, which Exotel charges the monthly rental; the workspace needs its Exotel line set up first.

1. Choose the **Workspace** and **Type** (Landline, Mobile or Toll-free), optionally a **Circle** (such as KA or MH) and digits the number should contain, and click **Search**. Each number shows Exotel's monthly rental.
2. Click **Rent…** beside a number. Read the rental, **type the number again**, optionally name it, choose where its incoming calls go (**The line's menu flow**, **The line's AI call flow** or **Nowhere yet**) and click **Rent this number**. Exotel is asked once; nothing is retried, so a lost answer can't rent the number twice.
3. The number joins the workspace's phone line under **More numbers**, where the workspace chooses its agent.

### AI providers

**Open:** `/platform/ai-providers` (menu **AI providers**). **Who can use it:** Platform-host users with tenant-management permission.

**Purpose:** Choose which AI model the platform uses for analysis work, and check which AI provider keys the server has.

**Prerequisites:** The provider keys stored in the server’s secret storage (AWS Secrets Manager in production) under the setting names shown on the page. Keys are never entered or shown on this page.

**Step-by-step**

1. Under **Analysis model**, choose **Automatic (OpenAI when it has a key)**, **OpenAI** or **Anthropic** and click **Save**. This model writes after-call analysis, drafts voice agents with AI and reviews them before publishing. **In use now** shows the model actually used; if the chosen provider has no key, the other one is used.
2. Under **Provider keys**, check that each provider you rely on shows **Set**. Deepgram and ElevenLabs run the **speech pipeline** engine. Their keys are stored for the call relay (`RELAY_DEEPGRAM_API_KEY`, `RELAY_ELEVENLABS_API_KEY`, with the voice in `RELAY_ELEVENLABS_VOICE`), not for the API, so they show **Set** only when the relay reports it has both. A provider marked **(not used yet)**, such as Sarvam AI or Bhashini, comes in a later update.
3. Under **Voice engine fallback**, leave **Switch to the other engine when an agent's engine fails** ticked (the default) and click **Save**, or untick it to turn fallback off. With it on, an agent whose speech engine can't start answers with the other engine instead of sending the call to your team, and an engine that fails during a call hands the conversation to the other engine once: the caller hears a short apology and the new engine carries on from the transcript so far, within the same call length limit. The line under the switch says whether the call relay can run both engines; with only one, there is nothing to switch to. A call that switched says so on its transcript in [AI conversations](#window-011).

[Screenshot P117a: AI providers page with the analysis model saved and the provider key table; highlight “In use now”. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Until a choice is saved here, the server configuration decides (the page says so). Live AI calls use OpenAI’s realtime model, chosen per agent in the [voice agent window](#dialog-ar-voice-agent-dialog-1), not this setting.

<a id="page-platform-payment-gateways"></a>

### Payment gateways

**Open:** `/platform/payment-gateways` (menu **Platform › Payment gateways**). **Who can use it:** Host operators who may manage workspaces.

**Purpose:** Set the Razorpay and PayU accounts workspaces pay the platform through when they top up their wallet or pay an invoice.

**Prerequisites:** Razorpay and/or PayU merchant accounts.

**Views and sections:** Razorpay (key id, key secret, webhook secret, Active); PayU (merchant key, salt, Active); Test saved keys.

**Step-by-step**

1. Enter the key id and key secret (Razorpay) or the merchant key and salt (PayU), then click **Save**.
2. Click **Test saved keys** to ask the gateway whether it accepts them.
3. For Razorpay, add the webhook URL shown here on Razorpay's dashboard, with the events payment.captured and order.paid and the same webhook secret.
4. Switch a gateway's **Active** off to hide it at checkout without losing its keys.

[Screenshot P176: Payment gateways page with Razorpay active; obscure every key.]

**Tips and common errors:** Secrets and salts go to secret storage and are never shown again; leave a secret empty to keep the one already saved. A field left empty uses the server configuration if it has one. Use rzp_test_ keys or PayU's test environment to try checkout without real money. Payments already in progress still settle when a gateway is switched off.

<a id="page-platform-status"></a>

### Status page

**Open:** `/platform/status`. **Who can use it:** Authorised platform-host users with the relevant management/view permission.

**Purpose:** Publish service incidents and planned maintenance to the public status page.

**Prerequisites:** Host status/tenant-management permission and verified incident information.

**Step-by-step**

1. Click **New incident**.
2. Enter **Title**, choose **Impact**, write **Message to customers**, and enter start/planned-end times.
3. Click **Post**.
4. Use **Update** and **Post update** as verified information changes.
5. When service is restored choose **Resolve**, write the closing message and confirm.
6. Open the public **System status** page to check the published notice.

**Related windows:** [Update incident / New incident](#dialog-ar-status-incidents-1).

[Screenshot P118: Status page page showing its principal sections and a suitable sample record; highlight “New incident” and the result of the main workflow. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Only publish verified information suitable for customers. Deleting an incident is different from resolving it.

<a id="dialogs"></a>

## Dialog and drawer guide

Open these windows from the relevant page or record action. The available fields depend on the chosen mode and your permission. Fill starred/required fields, review optional values and use the action named in that window. Never assume every field listed below appears in every mode. A record’s name may replace the sample title.

Since edition 1.2 many of these windows open as their own pages; each such entry starts with a **Now a page** line naming the page. Use **Close**, the close icon or **Cancel** to leave an unfinished change. Follow any unsaved-change warning. Some windows can be dragged by their title bar. Do not assume closing a payment gateway cancels a payment already submitted.

<a id="dialog-ar-meeting-dialog-1"></a>

### D001. Schedule or edit a meeting

**Location:** [Enquiries](#page-enquiries); [Meetings](#page-meetings).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Title | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Starts | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Length | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Kind | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Remind | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Where a place, or a link for an online meeting | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| (you) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| About a deal optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Notes optional | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** Click **Schedule** on Meetings or the meeting action on a customer/enquiry; select **Edit** for an existing meeting.

**Step-by-step**

1. Enter **Title**, **Starts**, **Length**, **Kind**, reminder and location/link.
2. Choose internal attendees and use **Add a guest** for an external attendee. Link a deal and add notes if needed.
3. If a connected calendar provider is offered, choose Teams, Google Meet or Zoom for the intended online-meeting option.
4. Use **Find a time when everyone is free** and review suggested times/conflicts.
5. Click **Save** after review. Choose **Schedule anyway** only when knowingly accepting the displayed conflict.

[Screenshot D001: “Schedule or edit a meeting” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check attendees, time zone and duration. A suggested time is not the same as a saved meeting.

<a id="dialog-ar-task-dialog-1"></a>

### D002. Create or edit a task

**Location:** [Enquiries](#page-enquiries); [Tasks](#page-tasks).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| What has to be done | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Due optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Priority | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Who does it | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Remind them | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| About a deal optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Notes optional | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** Click **New task**, a customer/enquiry task action, or an existing task.

**Step-by-step**

1. Enter **What has to be done**, optional due date, **Priority** and **Who does it**.
2. Set the reminder and any deal link, notes or recurring-task options shown.
3. Click **Save** and check the assigned owner/due date in the task list.
4. For an existing task use **Cancel task** or **Delete** only for the intended work item and confirm when asked.

[Screenshot D002: “Create or edit a task” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Cancelling a task and closing the window are different actions. Review recurring-task scope before changing a repeated task.

<a id="dialog-ar-admin-audit-logs-1"></a>

### D003. Request

**Location:** [Audit log](#page-admin-audit-logs).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Request** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Wait for the success or validation message. Correct a reported problem before retrying.
4. Close the window and check the affected record or list.

[Screenshot D003: “Request” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-admin-audit-logs-2"></a>

### D004. Entity change detail and full history

**Location:** [Audit log](#page-admin-audit-logs).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** In Audit log → Changes, open the relevant change record.

**Step-by-step**

1. Check the entity and time.
2. Review the recorded change details.
3. Click **Full history** if offered to inspect the available sequence of changes.
4. Close the history/detail when finished.

[Screenshot D004: “Entity change detail and full history” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** History is for inspection. It does not provide an undo operation.

<a id="dialog-ar-permission-dialog-1"></a>

### D005. User permission overrides

**Location:** [Users](#page-admin-users).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On Users, click **Permissions** for the selected account.

**Step-by-step**

1. Check the user name and browse the permission groups.
2. Review the existing grants before changing any checkbox.
3. Change only approved exceptions and use the displayed save action.
4. Ask the user to reload/sign in again if their visible menu has not refreshed.

[Screenshot D005: “User permission overrides” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Individual grants can differ from role grants. Grant the narrow action needed rather than every permission in a group.

<a id="dialog-ar-admin-roles-1"></a>

### D006. New role / Edit role

**Location:** [Roles & permissions](#page-admin-roles).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Assign to new users by default | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Visible when assigning roles | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **New role / Edit role** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D006: “New role / Edit role” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-tenant-features-dialog-1"></a>

### D007. Workspace feature values

**Location:** [Workspaces](#page-admin-tenants).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Enabled / Disabled | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** As host, click **Features** on the intended workspace.

**Step-by-step**

1. Verify the workspace name.
2. Review each available feature and its existing value.
3. Change only the approved values or limits and use the displayed save action.
4. Reopen the window or affected page to confirm the saved values.

[Screenshot D007: “Workspace feature values” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A feature entitlement is separate from a user role. A feature may also require backend configuration.

<a id="dialog-ar-admin-tenants-1"></a>

### D008. New workspace / Rename workspace

**Location:** [Workspaces](#page-admin-tenants).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Workspace name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Admin email | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| Admin password | Use the credential supplied through your approved administrator process. Do not copy it into screenshots or messages; follow any “leave blank to keep” hint. |

**Open it:** On the parent page open the matching **New workspace / Rename workspace** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Create workspace / Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D008: “New workspace / Rename workspace” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-user-security-dialog-1"></a>

### D009. User security and sign-in controls

**Location:** [Users](#page-admin-users).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Until optional — blank means until unlocked | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| New password | Use the credential supplied through your approved administrator process. Do not copy it into screenshots or messages; follow any “leave blank to keep” hint. |
| They must choose their own at the next sign-in | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On Users, select the intended user and click **Security**.

**Step-by-step**

1. Confirm the user identity at the top of the window.
2. Review lockout, two-step and active-session information.
3. Choose only the authorised reset, unlock or session action shown, and complete its requested confirmation.
4. Check the resulting state and close the window.

[Screenshot D009: “User security and sign-in controls” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Resetting a security control or ending a session may stop the user’s current work. Verify the support request before acting.

<a id="dialog-ar-admin-users-1"></a>

### D010. New user / Edit user

**Location:** [Users](#page-admin-users).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Username | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| First name optional | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Last name optional | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Email | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| Phone optional | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Password | Use the credential supplied through your approved administrator process. Do not copy it into screenshots or messages; follow any “leave blank to keep” hint. |
| Active | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| Lockout enabled | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **New user / Edit user** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D010: “New user / Edit user” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-workspace-manage-dialog-1"></a>

### D011. Manage workspace: status, plan, wallet, invoices and database

**Location:** [Workspaces](#page-admin-tenants).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Plan | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Billing | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Current period ends | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Plan ends | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Monthly fee (₹, optional) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Agent seats (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| A trial — it ends at the end of the current period unless it is paid for | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Grace allowance (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| New password for | Use the credential supplied through your approved administrator process. Do not copy it into screenshots or messages; follow any “leave blank to keep” hint. |
| Type it again | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Ask them to choose a new one at their next sign-in | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| From | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| To | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Place of supply (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Connection string | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** As an authorised host administrator, click **Manage** on Workspaces.

**Step-by-step**

1. Verify the workspace identity before any action. Use **Enter workspace** only for an authorised administrative session.
2. For a plan assignment choose **Plan**, **Billing**, period/end dates, optional fee/seats and trial option, then **Assign plan**.
3. Review Wallet and **Grace allowance**; choose **Save grace** only for an approved allowance.
4. For an approved password reset enter both password fields, review the next-sign-in change requirement, then **Set password**.
5. Review existing invoices before **Generate draft invoice**, **Issue**, **Mark paid** or **PDF**; mark paid only with verified payment evidence.
6. Use **Suspend workspace** or **Reactivate workspace** only after checking the intended service-access consequence.
7. Database-selection and **Create or update tables** actions are specialist platform operations. End users must request the platform administrator’s managed migration procedure rather than changing them themselves.

[Screenshot D011: “Manage workspace: status, plan, wallet, invoices and database” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** This is host administration, not ordinary workspace setup. Suspension, password changes, billing adjustments and database operations can affect an entire customer business.

<a id="dialog-ar-ad-attribution-1"></a>

### D012. Choose the ad accounts to connect

**Location:** [Ad attribution](#page-analytics-ads).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| already connected (refreshes it) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Choose the ad accounts to connect** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Connect**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D012: “Choose the ad accounts to connect” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-analytics-1"></a>

### D013. Analytics figure: underlying enquiries

**Location:** [Analytics](#page-analytics).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On Analytics, click an available conversion/detail figure.

**Step-by-step**

1. Read the selected measure and period in the window.
2. Review each underlying enquiry, customer, outcome and amount.
3. Open an enquiry reference for further work or click **Close** to return.

[Screenshot D013: “Analytics figure: underlying enquiries” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** The detail inherits the current report filters. Closing does not change the underlying records.

<a id="dialog-ar-custom-dashboards-1"></a>

### D014. Edit dashboard / New dashboard

**Location:** [Custom dashboards](#page-analytics-dashboards).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Share with everyone in the workspace | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **Edit dashboard / New dashboard** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **↑**, **↓**, **+ Add tile**, **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D014: “Edit dashboard / New dashboard” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-automations-1"></a>

### D015. New automation

**Location:** [Automations](#page-automations).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Channel | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Trigger | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Keyword | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Pipeline optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| When a deal reaches | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **New automation** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Create draft**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D015: “New automation” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-automations-2"></a>

### D016. Dry-run

**Location:** [Automations](#page-automations).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Contact | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Dry-run** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Run dry-run**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D016: “Dry-run” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-invoices-1"></a>

### D017. Check Meta's invoice

**Location:** [Invoices](#page-billing-invoices).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| WhatsApp number | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Month | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Invoice number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Open it:** On the parent page open the matching **Check Meta's invoice** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Done / Cancel**, **Check against the meter**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D017: “Check Meta's invoice” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Verify amounts and references; recording payment or marking paid does not transfer funds.

<a id="dialog-ar-invoices-2"></a>

### D018. Generate a GST invoice

**Location:** [Invoices](#page-billing-invoices).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Period start | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Period end | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Customer legal name | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| GSTIN (optional) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Place of supply (state code) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Address (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Generate a GST invoice** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Generate**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D018: “Generate a GST invoice” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Verify amounts and references; recording payment or marking paid does not transfer funds.

<a id="dialog-ar-call-dialog-1"></a>

### D019. Call

**Location:** [Inbox](#page-inbox); [Enquiries](#page-enquiries).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Ring me on | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Use this number from now on | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Record the call | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Call** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Call in browser**, **Ring my phone**, **Done / Cancel**, **Call now**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D019: “Call” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-call-outcome-dialog-1"></a>

### D020. How did the call go?

**Location:** [Enquiries](#page-enquiries); [Calls](#page-calls).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| What was said optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **How did the call go?** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Not now**, **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D020: “How did the call go?” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-log-call-dialog-1"></a>

### D021. Log a call with

**Location:** [Enquiries](#page-enquiries).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Direction | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Started | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Minutes on the call | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| How it went | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| What was said optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Log a call with** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Log call**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D021: “Log a call with” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-whatsapp-calls-1"></a>

### D022. Recording notice

**Location:** [WhatsApp calls](#page-calls-whatsapp).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Replace with / Upload a clip | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Recording notice** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Play the current clip**, **Use the tone instead**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D022: “Recording notice” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-whatsapp-ivr-dialog-1"></a>

### D023. WhatsApp call menu (IVR)

**Now a page (1.2):** this opens as its own page, `/calls/whatsapp/ivr` ([WhatsApp call menu (IVR)](#page-calls-whatsapp-ivr)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [WhatsApp calls](#page-calls-whatsapp).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Spoken first, before the menu (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Replace with / Upload a recording (WAV, MP3, M4A or Ogg, under 30 s) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Seconds to wait for a key | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Times the prompt plays | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Answer WhatsApp calls with this menu | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On **WhatsApp calls**, click **Call menu (IVR)**.

**Step-by-step**

1. Enter an optional welcome greeting and choose or upload the main menu prompt.
2. Use **Use the recommended menu** if appropriate, then review every generated option.
3. Click **Add an option**, set the keypad **Key**, **Label**, and action under **Pressing it**. Configure its lookup/team/sub-menu or destination as shown.
4. For sub-menus add the required opening words and options, and check each route back or onward.
5. Set **Seconds to wait for a key** and **Times the prompt plays**. Play the prompt and check intelligibility.
6. Select **Answer WhatsApp calls with this menu** only when ready and click **Save**.

[Screenshot D023: “WhatsApp call menu (IVR)” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Use distinct keys and active destination teams. An uploaded prompt must meet the displayed format/duration limit. This menu is separate from Exotel IVR and the AI voice profile.

<a id="dialog-ar-campaign-builder-1"></a>

### D024. New campaign

**Now a page (1.2):** this opens as its own page, `/campaigns/new` ([Campaigns](#page-campaigns)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Campaigns](#page-campaigns).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Channel | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Approved template Loading approved templates… | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **New campaign** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Create draft**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D024: “New campaign” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-catalogue-1"></a>

### D025. Edit product / Add product

**Location:** [Catalogue](#page-channels-catalogue).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| SKU retailer id | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Description optional | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Price (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| In stock | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| Image URL optional | Use the approved address supplied for this business/service. Check spelling and the required address format. |

**Open it:** On the parent page open the matching **Edit product / Add product** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D025: “Edit product / Add product” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-catalogue-2"></a>

### D026. Add from products

**Location:** [Catalogue](#page-channels-catalogue).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Search | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Add from products** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Add / to catalogue**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D026: “Add from products” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-chat-widgets-1"></a>

### D027. Edit chat link / New chat link

**Location:** [Chat links & QR](#page-channels-widget).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Channel | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Source | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Pre-filled message optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Active — a paused link still works but new clicks are not counted | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **Edit chat link / New chat link** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save / Create**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D027: “Edit chat link / New chat link” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-chat-widgets-2"></a>

### D028. Chat link

**Location:** [Chat links & QR](#page-channels-widget).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Chat link** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **link / Copied / Copy**, **snippet / Copied / Copy snippet**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D028: “Chat link” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-connect-number-dialog-1"></a>

### D029. Connect a WhatsApp number

**Location:** [Channels](#page-channels); [Numbers](#page-channels-numbers).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| WhatsApp security PIN (6 digits) | Use the credential supplied through your approved administrator process. Do not copy it into screenshots or messages; follow any “leave blank to keep” hint. |
| WhatsApp Business Account ID | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Phone number ID | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Meta system-user access token | Use the credential supplied through your approved administrator process. Do not copy it into screenshots or messages; follow any “leave blank to keep” hint. |

**Open it:** On **Channels** or **Numbers**, click **Connect a number**.

**Step-by-step**

1. Choose the connection method offered for your provider: Facebook setup, an existing Meta number, or the supported provider signup.
2. For Facebook setup click **Continue with Facebook**, sign in as an authorised business administrator, select the intended business/number and complete the provider’s steps.
3. For an existing number enter **WhatsApp Business Account ID**, **Phone number ID**, the administrator-supplied system-user token and requested security PIN, then click **Connect existing number**.
4. For the provider signup method use **Start setup**, **Resume setup** or the offered signup link and complete verification.
5. Wait for the connection result, close the window and verify the number appears in the correct workspace.

[Screenshot D029: “Connect a WhatsApp number” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not share access tokens or PINs. A number already allocated elsewhere needs an approved release/migration. An expired setup link must be replaced.

<a id="dialog-ar-lead-forms-1"></a>

### D030. Choose the Pages to connect

**Location:** [Lead forms](#page-channels-lead-forms).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Page · already connected (refreshes it) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Choose the Pages to connect** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Connect**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D030: “Choose the Pages to connect” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-numbers-1"></a>

### D031. Release / ?

**Location:** [Numbers](#page-channels-numbers).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Also deregister it at Meta. Needed to move the number to another provider or back to the WhatsApp Business app. It then stops working on every app until it is | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Type the number to confirm | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Release / ?** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Release number**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D031: “Release / ?” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review affected rows or identities and consequences before applying the change.

<a id="dialog-ar-voice-agent-dialog-1"></a>

### D032. Voice agent: profile, actions, analysis, testing and versions

**Now a page (1.2):** this opens as its own page, `/calls/ai-agents/:id` ([Voice Agent Studio](#page-calls-ai-agents-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Channels](#page-channels).

**Purpose and access:** Set up the AI voice agent that answers (and, if allowed, places) calls on one WhatsApp number: what it says, what it may do during calls, what is worked out after each call, and which saved version is live. You need permission to manage channels.

**Prerequisites:** A WhatsApp number connected directly through Meta. AI calling must also be allowed for that number by the platform administrator; until then you can prepare and save a draft but no call is answered by it. For actions during calls, the staff member the agent will act as must already be an active user of the workspace; for follow-up messages outside the 24-hour window, an approved WhatsApp template with one body variable.

| Field or control | What to do |
| --- | --- |
| Starting template | Optionally choose a starter and click **Apply to draft**. It replaces the name, instructions and greeting in the draft only. |
| Agent name | A recognisable name for the agent and its saved versions. |
| Agent type | **Single prompt** follows its instructions freely. **Conversation flow (stages)** also works through stages in order: each stage has a goal, and up to 4 conditions (“When the caller only wants a price list → Close the call”) that send the call to another stage; otherwise it moves to the next stage. Up to 12 stages. Both types talk speech to speech in real time; stages guide the AI rather than fix a script. For a keypad menu, use the WhatsApp IVR. |
| Agent instructions | What the agent is for, what it may and may not say, and how it should speak. You may use variables such as `{{name}}`, `{{first_name}}`, `{{company}}`, `{{city}}` or `{{name\|there}}` (a value with a default). |
| Opening greeting | The first sentence. It must say the caller is speaking to an AI assistant. Variables work here too. |
| Voice / Preferred language | The speaking voice — Marin and Cedar are recommended, eight more are offered — and the language to speak (or **Follow caller**). Hindi–English mixing is followed when the caller uses it. Click **Hear the greeting in this voice** for a short sample; a test call gives the exact sound. |
| Speech engine | **Speech to speech (OpenAI realtime)** or **Speech pipeline (Deepgram + ElevenLabs)**. The pipeline hears the caller with Deepgram, writes each reply with a chat model and speaks it with ElevenLabs. Replies come a little slower, the voice is the platform’s ElevenLabs voice, and **Voice** and **Model tier** are hidden because they apply only to speech to speech. Hindi and English are recognised best. The option can be chosen only when the call relay has the pipeline’s keys; an agent left on it after they are removed sends its calls to your team. |
| Voicemail message (phone calls) | What the agent says, once, when a phone call it places reaches voicemail; it then hangs up. Leave it blank and the agent leaves a short message of its own (saying it is an AI assistant, who it calls for and why, and that they will be called again). It can use the greeting's `{{variables}}`. On the phone line the agent listens first: it greets a person in reply to their "hello" (or after three seconds of silence), and an operator announcement such as "switched off" or "not reachable" ends the call at once. The call log records **Left message** or **No answer** with a note. |
| Speech tuning | **When the caller has finished**: **Quick** (short pauses end the caller's turn), **Normal** or **Patient** (waits through longer pauses, for callers who stop to think). **The caller can interrupt the agent**: untick it so the agent finishes what it is saying before answering. **Speaking speed** 80–120%. **Background noise reduction** (speech to speech only): **Phone held to the ear** or **Speakerphone or noisy room**. **Words to recognise**: one per line, up to 50 product names, brands, places or codes callers say. **Pronunciations**: up to 30 words with how to say them, such as a surname or a code read letter by letter. Place a test call after changing these. |
| Model tier | **Platform default**, **Best quality** or **Lower cost**. Lower cost uses a cheaper realtime model per minute; test it before publishing, especially for Indian languages and prices. Which model each tier uses is set on the server. |
| Maximum call length (seconds) | 30–600. The agent ends politely at the limit. |
| Silence reminder / End after silence (seconds) | Optional. The agent checks whether the caller is still there after the reminder time (5–120 s) and ends the call after the end time (10–300 s, at least 5 s after the reminder). 0 switches either off. |
| Actions during calls → Act as | The staff member every action runs as. Their permissions decide what succeeds, and bookings go into their calendar. **No one** keeps all actions off. |
| Book meetings in the app calendar | Lets the agent find free times and book a call meeting. Set the meeting length (10–240 minutes) and the bookable hours. |
| Save caller details and open sales enquiries | Lets the agent save the caller’s name, email, company and city, and open an enquiry for a stated requirement (source: AI voice agent). |
| Raise support tickets | Lets the agent raise a ticket for a problem the caller reports. |
| Send WhatsApp follow-up messages | Lets the agent send a short WhatsApp message to the caller. Choose a **Follow-up template** so it also reaches callers outside the 24-hour window. |
| Answer from the knowledge base | Lets the agent search your enabled knowledge articles for the caller’s question. |
| Look up products and list prices | Lets the agent search the whole product list and catalogue by name, model or part number. |
| Remember returning callers | Starts each call knowing the caller’s name, open tickets, upcoming meetings, open enquiries and summaries of their last calls. |
| Hand the call to a person when needed | When the caller asks for a person, is upset, or needs something the agent can’t do, the agent rings a team with its reason and a summary of the call. Tick up to 5 **Teams it may ring**; the first ticked is the **default**. Needs no one to act as. |
| After-call analysis | **Write a summary**, **Record the caller’s sentiment**, a **Goal of the call** (judged after each call) and up to 20 fields to pull out of each call. For each field give a **Field name**, a **Key** (lowercase letters, digits and `_`, used in exports), a **Type** (text, one of a list, yes/no, number, date) and, for a list, the **Choices** separated by a vertical bar (for example `hot\|warm\|cold`). |

**Open it:** On **Channels**, click **Voice agent** for the intended WhatsApp number.

**Step-by-step**

1. Read the notice at the top: whether AI calling is allowed for this number, and whether a version is published.
2. Optionally choose **Starting template** and click **Apply to draft**; review the replacement wording. Or open **Build and reuse** (above Version history):
   - **Draft with AI:** describe your business, who calls and what the agent must and must not do, pick the agent type and click **Draft agent**. It fills the name, instructions, greeting, stages and after-call analysis, keeps your actions as they are, and saves nothing. It needs an AI model set up for the workspace.
   - **Your templates:** apply one of the workspace’s own templates (grouped by folder), or save the draft with **Save draft as template** under a name and optional folder; the same folder and name replaces the old one. Templates leave out the person it acts as, the follow-up template and transfer teams.
   - **File:** **Export draft as JSON** downloads the agent to share with another workspace; **Import a JSON file** fills the draft from one.
3. Complete name, instructions, greeting, voice, language, length and silence settings.
4. Under **Actions during calls**, choose who the agent acts as and tick only the actions you want. Reads (knowledge, products, memory) and handing over to a person need no one to act as.
5. Under **After-call analysis**, choose what to record after each call and add your fields.
6. Click **Save draft**. Saving never changes live calls.
7. Test the draft with **Test call from this browser** ([test call](#panel-ar-voice-agent-test)) and mark the result as passed or failed.
8. Click **Publish saved draft**, read the confirmation, optionally click **Review before publishing** (fixed checks such as a greeting that doesn’t say it’s an AI, or instructions that mention booking when booking is off, plus the AI model’s advice when one is set up), and click **Confirm publish**. New calls use the published version; calls already in progress keep the version they started with.
9. To see what changed, open **Version history** and tick **Compare** on two versions: every setting is shown side by side with changes marked, and the instructions line by line. To go back to an earlier version open **Version history**, choose **Restore this version**, then **Confirm restore**. Restoring changes only the draft; publish it to make it live.

[Screenshot D032: “Voice agent” window with the profile, the Actions during calls section (Act as and a few ticked actions) and After-call analysis fields visible; highlight Save draft and Publish saved draft. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Before any change the agent reads the details back and waits for the caller to agree; it never books, saves, raises or sends on its own say-so, and every action it takes is listed on the call in [AI conversations](#window-011). An action fails if the acting user lacks permission for it — the agent then apologises and offers a person. Put in the instructions only what the agent may say to callers. Answers come only from your knowledge base, product list and catalogue; customer-specific discounts and final quotations still need your team. AI calling also needs the platform administrator’s allowance, a funded provider and a working call relay. When the agent hands a call over, the team’s members see it ringing in the call bar with the reason; the first to click **Take over** joins the call and the AI leaves it. The caller stays with the AI while it rings. Ringing stops after 3 minutes; the agent is told to offer a call back if the caller is kept waiting. In automations, an **If…** step can check **AI call: asked for a person** (`none`, `taken` or `missed`), for example to create a call-back task when it was missed.

<a id="dialog-ar-voice-ivr-1"></a>

### D033. Edit prompt / New prompt

**Now a page (1.2):** this opens as its own page, `/channels/voice-ivr/prompts/new` ([New IVR prompt / Edit IVR prompt](#page-channels-voice-ivr-prompts)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Voice / IVR](#page-channels-voice-ivr).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Internal name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Spoken text | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Max digits to collect | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Input timeout (seconds) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Make this the channel's entry point | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Edit prompt / New prompt** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D033: “Edit prompt / New prompt” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-voice-ivr-2"></a>

### D034. Add branch

**Location:** [Voice / IVR](#page-channels-voice-ivr).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Digit | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Action | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Target prompt | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Transfer to (E.164) | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |

**Open it:** On the parent page open the matching **Add branch** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D034: “Add branch” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-compliance-1"></a>

### D035. Log a DPDP request

**Location:** [Compliance](#page-compliance).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Request type | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Requester identifier | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Log a DPDP request** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Log request**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D035: “Log a DPDP request” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-account-health-1"></a>

### D036. Tune the health score

**Location:** [Account health](#page-account-health).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Tune the health score** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Restore defaults**, **Save and rescore**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D036: “Tune the health score” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-accounts-1"></a>

### D037. Edit account / New account

**Now a page (1.2):** this opens as its own page, `/contacts/accounts/new` ([New account / Edit account](#page-contacts-accounts-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Accounts](#page-contacts-accounts).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Industry optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Website optional | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| City optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| State optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Parent account optional | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Notes optional | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Edit account / New account** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save / Create**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D037: “Edit account / New account” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-accounts-2"></a>

### D038. Account / — rollup

**Now a page (1.2):** this opens as its own page, `/contacts/accounts/:accountId/rollup` ([Account roll-up](#page-contacts-accounts-rollup)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Accounts](#page-contacts-accounts).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Include subsidiary / ies | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **Account / — rollup** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Wait for the success or validation message. Correct a reported problem before retrying.
4. Close the window and check the affected record or list.

[Screenshot D038: “Account / — rollup” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-accounts-3"></a>

### D039. Contacts at

**Location:** [Accounts](#page-contacts-accounts).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Include contacts at its subsidiaries | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **Contacts at** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Wait for the success or validation message. Correct a reported problem before retrying.
4. Close the window and check the affected record or list.

[Screenshot D039: “Contacts at” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-contact-import-1"></a>

### D040. Import contacts: upload, mapping, consent and results

**Location:** [Contacts](#page-contacts); [Audience builder](#page-contacts-segments).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Where did these contacts agree to hear from you? | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Country code for numbers without one | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| They may receive | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Opt-in evidence required / optional | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| Consent notice version | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On **Contacts** or **Audiences**, click **Import** or **Import contacts**.

**Step-by-step**

1. Choose a CSV UTF-8 file or supported vCard file; the displayed limit is up to 20,000 contacts.
2. Review the column mapping and preview. Supply a default country code only for numbers that do not already have one.
3. Specify where these contacts agreed to hear from you, permitted message categories, evidence and notice version as required.
4. Click **Check the file** and correct invalid rows or mappings before proceeding.
5. Review the eligible count and click **Import** once. Read the added/skipped/invalid results, then click **Done**.

[Screenshot D040: “Import contacts: upload, mapping, consent and results” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A list of phone numbers is not proof of marketing consent. Check the preview for shifted columns, duplicate numbers and missing country codes.

<a id="dialog-ar-contacts-1"></a>

### D041. Edit contact / New contact

**Now a page (1.2):** this opens as its own page, `/contacts/new` ([New contact / Edit contact](#page-contacts-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Contacts](#page-contacts).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| card / Reading the card… / A visiting card photo | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| A vCard (.vcf) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| WhatsApp number | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Designation optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Account optional | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Company optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Email optional | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| Decision role | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| City optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| State optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Edit contact / New contact** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save changes / Add contact**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D041: “Edit contact / New contact” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-customer-actions-1"></a>

### D042. Record payment / Create delivery challan / Create invoice

**Location:** [Customer 360](#page-contacts-360).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Send via | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| WhatsApp number | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Approved template | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Variable | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Subject | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Message | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Optional sales document | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Invoice | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Amount received (INR) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Payment mode | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Sales order | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Record payment / Create delivery challan / Create invoice** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Preview document**, **Send message / Record payment / Create draft**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D042: “Record payment / Create delivery challan / Create invoice” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Verify amounts and references; recording payment or marking paid does not transfer funds.

<a id="dialog-ar-duplicates-1"></a>

### D043. Merge contacts

**Location:** [Duplicates](#page-contacts-duplicates).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| + / No phone or email | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |

**Open it:** On the parent page open the matching **Merge contacts** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Merge contacts**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D043: “Merge contacts” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review affected rows or identities and consequences before applying the change.

<a id="dialog-ar-segments-1"></a>

### D044. Edit segment / Save segment

**Location:** [Audience builder](#page-contacts-segments).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Description optional | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Edit segment / Save segment** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Update segment / Save segment**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D044: “Edit segment / Save segment” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-documents-1"></a>

### D045. Edit document / Upload a document

**Location:** [Documents](#page-documents).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| File | Select the requested file or paste rows in the order stated in the window. Review the preview/validation before applying. |
| Title | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Category (optional) | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Part numbers (comma-separated) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Access | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Allowed account IDs (comma-separated) | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Edit document / Upload a document** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save / Upload**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D045: “Edit document / Upload a document” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-documents-2"></a>

### D046. Sent to

**Location:** [Documents](#page-documents).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Sent to** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Wait for the success or validation message. Correct a reported problem before retrying.
4. Close the window and check the affected record or list.

[Screenshot D046: “Sent to” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-price-lists-1"></a>

### D047. Edit price list / New price list

**Location:** [Price lists](#page-documents-price-lists).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Region blank = any | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Distributor tier blank = any | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Effective from | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Active | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **Edit price list / New price list** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **+ Add item**, **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D047: “Edit price list / New price list” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-products-1"></a>

### D048. Edit product / New product

**Location:** [Products](#page-documents-products).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Part number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Unit | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Description optional | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| List price ₹ | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Category optional | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| GST % blank = quote's | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| HSN optional | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Active — can be added to quotations | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **Edit product / New product** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D048: “Edit product / New product” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-products-2"></a>

### D049. Import products

**Location:** [Products](#page-documents-products).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Rows | Select the requested file or paste rows in the order stated in the window. Review the preview/validation before applying. |

**Open it:** On the parent page open the matching **Import products** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Import**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D049: “Import products” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review affected rows or identities and consequences before applying the change.

<a id="dialog-app-amc-contracts-1"></a>

### D050. Create Equipment AMC Contract

**Now a page (1.2):** this opens as its own page, `/field-service/amc/new` ([New AMC contract](#page-field-service-amc-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [AMC contracts](#page-field-service-amc).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Contract Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Customer Name | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Customer Site Address / Plant Location | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Equipment Serial Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Equipment Model / Machine Name | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Contract Type | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| SLA Response Time (Hours) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Annual Contract Value (INR) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Scheduled PM Visits Per Year | Enter the actual or agreed quantity in the product/field’s displayed unit. |
| Start Date | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| End Date | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Replacement spare parts included in contract pricing | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| Remarks & SLA Terms | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Create Equipment AMC Contract** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Create AMC Contract**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D050: “Create Equipment AMC Contract” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-amc-contracts-2"></a>

### D051. Record Completed PM Visit

**Now a page (1.2):** this opens as its own page, `/field-service/amc/record-visit/:contractId/:visitId` ([Record preventive visit](#page-field-service-amc-visit)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [AMC contracts](#page-field-service-amc).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Service Engineer Who Performed Visit | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Inspection Notes & Maintenance Carried Out | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Record Completed PM Visit** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Confirm & Close Visit**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D051: “Record Completed PM Visit” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-amc-contracts-3"></a>

### D052. Renew Equipment AMC Contract

**Now a page (1.2):** this opens as its own page, `/field-service/amc/renew/:id` ([Renew AMC contract](#page-field-service-amc-renew)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [AMC contracts](#page-field-service-amc).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| New Start Date | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| New End Date | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| New Contract Value (INR) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Contract Type | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Renew Equipment AMC Contract** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Renew Contract**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D052: “Renew Equipment AMC Contract” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-remote-maintenance-1"></a>

### D053. Initiate AI Remote Diagnostic Session

**Now a page (1.2):** this opens as its own page, `/field-service/remote-maintenance/new` ([New diagnostic session](#page-field-service-remote-maintenance-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [AI Remote Maintenance & Diagnostics](#page-field-service-remote-maintenance).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Customer Name * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Technician / Contact Phone * | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Equipment Model * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Equipment Serial Number * | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Equipment Category | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Preferred Interaction Channel * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Fault Code (from display/HMI) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Reported Symptoms & Fault Description * | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Severity Level | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page choose **New Diagnostic Session** for the intended record.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Start Diagnostic Session**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D053: “Initiate AI Remote Diagnostic Session” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-remote-maintenance-2"></a>

### D054. Escalate to On-Site Field Visit

**Location:** [AI Remote Maintenance & Diagnostics](#page-field-service-remote-maintenance).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Escalation Reason * | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Assigned Field Service Engineer | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Escalate to On-Site Field Visit** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Confirm Escalation**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D054: “Escalate to On-Site Field Visit” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-field-service-tickets-1"></a>

### D055. Raise Field Service / Breakdown Ticket

**Now a page (1.2):** this opens as its own page, `/field-service/tickets/new` ([New field service ticket](#page-field-service-tickets-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Field tickets](#page-field-service-tickets).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Ticket Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Customer Name | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Customer Site Address | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Customer Contact Phone | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Equipment Serial Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Equipment Model / Machine | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Ticket Type | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Priority | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Problem Description / Breakdown Symptoms | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Raise Field Service / Breakdown Ticket** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Raise Ticket**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D055: “Raise Field Service / Breakdown Ticket” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-field-service-tickets-2"></a>

### D056. Dispatch & Assign Field Service Engineer

**Now a page (1.2):** this opens as its own page, `/field-service/tickets/:id/assign` ([Assign field engineer](#page-field-service-tickets-assign)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Field tickets](#page-field-service-tickets).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Field Engineer Name | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Scheduled On-Site Visit Date/Time | Choose the intended date/time using the control. Check the date order and the displayed time zone. |

**Open it:** On the parent page open the matching **Dispatch & Assign Field Service Engineer** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Dispatch Engineer**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D056: “Dispatch & Assign Field Service Engineer” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-field-service-tickets-3"></a>

### D057. Record Spare Part Replaced

**Now a page (1.2):** this opens as its own page, `/field-service/tickets/:id/spares` ([Add spare parts](#page-field-service-tickets-spares)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Field tickets](#page-field-service-tickets).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Spare Part Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Part Description | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Quantity Replaced | Enter the actual or agreed quantity in the product/field’s displayed unit. |
| Unit Price (INR) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Billable to customer (uncheck if covered under AMC/Warranty) | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Record Spare Part Replaced** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Add Replaced Part**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D057: “Record Spare Part Replaced” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-field-service-tickets-4"></a>

### D058. Resolve Ticket & Customer Signoff

**Location:** [Field tickets](#page-field-service-tickets).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Root Cause Analysis (RCA) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Resolution Summary & Actions Taken | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Customer Representative Name | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Customer Satisfaction Rating (1 to 5 Stars) | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Resolve Ticket & Customer Signoff** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Resolve & Close Ticket**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D058: “Resolve Ticket & Customer Signoff” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-field-1"></a>

### D059. Help · Field Service

**Location:** [Field](#page-field).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Help · Field Service** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Got it**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D059: “Help · Field Service” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-chart-of-accounts-1"></a>

### D060. Add General Ledger Account

**Now a page (1.2):** this opens as its own page, `/finance/chart-of-accounts/new` ([Add account](#page-finance-chart-of-accounts-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Chart of accounts](#page-finance-chart-of-accounts).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Account Code | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Account Name | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Category | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Sub-Category | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Normal Balance Nature | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Opening Balance (INR) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Account Description & Purpose | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Add General Ledger Account** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Add Account**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D060: “Add General Ledger Account” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-gst-compliance-1"></a>

### D061. Generate Automated GST E-Way Bill

**Now a page (1.2):** this opens as its own page, `/finance/gst-compliance/eway/:id` ([Generate e-way bill](#page-finance-gst-compliance-eway)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [GST compliance](#page-finance-gst-compliance).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Vehicle Number (Part B) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Transporter GSTIN | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Transit Distance (KM) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Generate Automated GST E-Way Bill** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Generate & Sign E-Way Bill**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D061: “Generate Automated GST E-Way Bill” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-journal-entries-1"></a>

### D062. Create Double-Entry Journal Voucher

**Now a page (1.2):** this opens as its own page, `/finance/journal-entries/new` ([New journal voucher](#page-finance-journal-entries-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Journal vouchers](#page-finance-journal-entries).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Voucher Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Voucher Date | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Voucher Type | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Reference Document # | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Narration & Explanation | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Create Double-Entry Journal Voucher** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **x**, **+ Add Ledger Line**, **Create & Record Voucher**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D062: “Create Double-Entry Journal Voucher” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-flows-1"></a>

### D063. New flow

**Location:** [Flows](#page-flows).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Channel | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **New flow** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Create draft**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D063: “New flow” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-flows-2"></a>

### D064. — funnel

**Location:** [Flows](#page-flows).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **— funnel** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Wait for the success or validation message. Correct a reported problem before retrying.
4. Close the window and check the affected record or list.

[Screenshot D064: “— funnel” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-helpdesk-1"></a>

### D065. New ticket

**Now a page (1.2):** this opens as its own page, `/helpdesk/new` ([New ticket](#page-helpdesk-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Helpdesk](#page-helpdesk).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Subject | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Priority | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Description (optional) | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **New ticket** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Create ticket**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D065: “New ticket” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-ticket-detail-dialog-1"></a>

### D066. Ticket

**Now a page (1.2):** this opens as its own page, `/helpdesk/:id` ([Ticket details](#page-helpdesk-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Enquiries](#page-enquiries); [Helpdesk](#page-helpdesk).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Status | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Priority | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Assigned to optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Ticket** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **★**, **Internal note**, **Reply to customer**, **Add note / Send reply**, **Delete ticket**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D066: “Ticket” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-ticket-dialog-1"></a>

### D067. Raise a ticket for

**Location:** [Enquiries](#page-enquiries).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| What's wrong | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Category optional | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Priority | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Details optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Raise a ticket for** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Raise ticket**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D067: “Raise a ticket for” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-ticket-settings-dialog-1"></a>

### D068. Helpdesk rules, public portal and sign-off template

**Now a page (1.2):** this opens as its own page, `/helpdesk/settings` ([Helpdesk settings](#page-helpdesk-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Helpdesk](#page-helpdesk).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Urgent | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| High | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Normal | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Low | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Let customers raise a ticket themselves, with no sign-in | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Authentication template optional | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On Helpdesk, click **Settings**.

**Step-by-step**

1. Set the response-time hours for Urgent, High, Normal and Low priorities according to your service policy.
2. Choose whether customers may raise tickets without signing in.
3. Review the public portal link and use **Copy link** only when the portal is intended to be public.
4. Choose the approved authentication template for field visit sign-off if required, then **Save**.

[Screenshot D068: “Helpdesk rules, public portal and sign-off template” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** An authentication template must be eligible for the selected number. Publishing a portal link allows external submissions.

<a id="dialog-ar-inbox-1"></a>

### D069. Request a payment

**Location:** [Inbox](#page-inbox).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Amount (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| What it's for | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Request a payment** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Send payment link**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D069: “Request a payment” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Verify amounts and references; recording payment or marking paid does not transfer funds.

<a id="dialog-ar-inbox-2"></a>

### D070. Draft a quote from this file

**Location:** [Inbox](#page-inbox).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| = maxMoreFiles" (change)="toggleMore(o.id, $any($event.target).checked)" /> | Select the requested file or paste rows in the order stated in the window. Review the preview/validation before applying. |

**Open it:** On the parent page open the matching **Draft a quote from this file** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Draft from / files / Draft quotation**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D070: “Draft a quote from this file” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-inbox-3"></a>

### D071. Reply buttons

**Location:** [Inbox](#page-inbox).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Message | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Footer (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Reply buttons** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Send**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D071: “Reply buttons” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-share-location-dialog-1"></a>

### D072. Share a location

**Location:** [Inbox](#page-inbox).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name (optional) | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Address (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Google Maps link or coordinates | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Share a location** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Use my current location**, **Send location**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D072: “Share a location” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-purchasing-1"></a>

### D073. Edit / New purchase order

**Now a page (1.2):** this opens as its own page, `/purchasing/orders/new` ([New purchase order / Edit purchase order](#page-purchasing-orders-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Purchasing](#page-purchasing).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Supplier | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Receive into | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Expected (blank: from the lead time) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Quantity | Enter the actual or agreed quantity in the product/field’s displayed unit. |
| ₹ each | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Add a part | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Note (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Edit / New purchase order** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Remove**, **Save draft**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D073: “Edit / New purchase order” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-purchasing-2"></a>

### D074. Receive

**Location:** [Purchasing](#page-purchasing).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Arrived | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Serial numbers, one per line optional | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Batch optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Expiry optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Supplier's invoice or delivery note (optional) | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Receive** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Receive**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D074: “Receive” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-purchasing-3"></a>

### D075. Edit supplier / New supplier

**Now a page (1.2):** this opens as its own page, `/purchasing/suppliers/new` ([New supplier / Edit supplier](#page-purchasing-suppliers-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Purchasing](#page-purchasing).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| GSTIN (optional) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Lead time, days (optional) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Phone (optional) | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Email (optional) | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| Address (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| In use: offered on new orders | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Edit supplier / New supplier** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D075: “Edit supplier / New supplier” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-stock-1"></a>

### D076. Receive, issue, adjust, count or set minimum stock

**Location:** [Stock](#page-stock).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Part | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Location | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Cost per unit, ₹ before GST (optional: moves the average cost) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| adjust / count / Serial number / Serial numbers issue / (blank: the oldest go first) / receive / (one per line, one per unit) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Batch number (blank: soonest expiry first) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Expiry (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Reason adjust / (required: damage, return, correction…) / (optional) | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On Stock, select a part and choose **Receive**, **Issue**, **Adjust**, **Count** or **Minimum**.

**Step-by-step**

1. Check the movement type, part and location in the window heading.
2. Enter the quantity appropriate to that operation: incoming/outgoing units for a movement, or the actual total for a count.
3. Enter cost if requested and complete required serial numbers, batch/expiry and reason fields.
4. Click **Save** and review the resulting balance and History.

[Screenshot D076: “Receive, issue, adjust, count or set minimum stock” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A count sets the balance; receiving adds units. Required serial numbers must match the units. Do not use an adjustment to hide a missing receiving or dispatch record.

<a id="dialog-ar-stock-2"></a>

### D077. Tracking

**Location:** [Stock](#page-stock).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Tracking** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D077: “Tracking” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-stock-3"></a>

### D078. Serial / Serials · / Batches

**Location:** [Stock](#page-stock).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Serial / Serials · / Batches** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Wait for the success or validation message. Correct a reported problem before retrying.
4. Close the window and check the affected record or list.

[Screenshot D078: “Serial / Serials · / Batches” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-stock-4"></a>

### D079. Trace a batch or serial number

**Location:** [Stock](#page-stock).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Batch or serial number optional | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Open it:** On the parent page open the matching **Trace a batch or serial number** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Trace**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D079: “Trace a batch or serial number” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-stock-5"></a>

### D080. History

**Location:** [Stock](#page-stock).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **History** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Wait for the success or validation message. Correct a reported problem before retrying.
4. Close the window and check the affected record or list.

[Screenshot D080: “History” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-stock-6"></a>

### D081. Import stock

**Location:** [Stock](#page-stock).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| A count: set each part to the quantity (opening stock, a stocktake) A delivery: add the quantity to what's there CSV file | Enter the actual or agreed quantity in the product/field’s displayed unit. |

**Open it:** On the parent page open the matching **Import stock** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Apply / rows**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D081: “Import stock” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review affected rows or identities and consequences before applying the change.

<a id="dialog-ar-stock-7"></a>

### D082. Stock settings

**Location:** [Stock](#page-stock).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| This workspace syncs with Tally or SAP. If stock is also kept there, you'll have two stock records that drift apart. Keep stock here only if the ERP doesn't | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| Issue a quotation's parts from stock when it is won | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Open it:** On the parent page open the matching **Stock settings** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Add**, **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D082: “Stock settings” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-bill-of-materials-1"></a>

### D083. BOM Structure: / ( / )

**Now a page (1.2):** this opens as its own page, `/manufacturing/bom/:id` ([BOM details](#page-manufacturing-bom-id)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Bill of materials](#page-manufacturing-bom).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **BOM Structure: / ( / )** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Generate Production Work Order**, **Release to Production**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D083: “BOM Structure: / ( / )” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-bill-of-materials-2"></a>

### D084. Create Bill of Materials (BOM)

**Now a page (1.2):** this opens as its own page, `/manufacturing/bom/new` ([Create bill of materials](#page-manufacturing-bom-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Bill of materials](#page-manufacturing-bom).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Finished Good Part # * | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Revision Code * | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Product Description * | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| BOM Type | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Base Quantity & UOM | Enter the actual or agreed quantity in the product/field’s displayed unit. |

**Open it:** On the parent page open the matching **Create Bill of Materials (BOM)** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **x**, **+ Add Component**, **Save & Compute Costing**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D084: “Create Bill of Materials (BOM)” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-work-orders-1"></a>

### D085. Create Production Work Order

**Now a page (1.2):** this opens as its own page, `/manufacturing/work-orders/new` ([New work order](#page-manufacturing-work-orders-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Work orders](#page-manufacturing-work-orders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Work Order Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Batch Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Finished Good Part # | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Part Description | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Planned Production Quantity | Enter the actual or agreed quantity in the product/field’s displayed unit. |
| Assigned Supervisor | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Planned Start Date | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Planned End Date | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Production Notes & Instructions | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Create Production Work Order** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Generate Work Order**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D085: “Create Production Work Order” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-work-orders-2"></a>

### D086. Issue Material to Work Order

**Location:** [Work orders](#page-manufacturing-work-orders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Component Part # | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Component Description | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Required Qty | Enter the actual or agreed quantity in the product/field’s displayed unit. |
| Issued Qty | Enter the actual or agreed quantity in the product/field’s displayed unit. |
| Wasted / Scrap Qty | Enter the actual or agreed quantity in the product/field’s displayed unit. |
| Issuing Warehouse | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Issue Material to Work Order** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Issue to Shop Floor**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D086: “Issue Material to Work Order” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review the intended customer/recipient and final wording before any external send.

<a id="dialog-app-work-orders-3"></a>

### D087. Complete Routing Step & QC Inspection

**Location:** [Work orders](#page-manufacturing-work-orders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Actual Machine / Labor Hours | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Quality Inspector Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Step passed QC tolerance and met drawing specifications | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Complete Routing Step & QC Inspection** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Confirm Step Completion**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D087: “Complete Routing Step & QC Inspection” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-app-work-orders-4"></a>

### D088. Complete Work Order & Inward FG

**Location:** [Work orders](#page-manufacturing-work-orders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Final Produced Good Quantity | Enter the actual or agreed quantity in the product/field’s displayed unit. |
| Total Scrapped / Rejected Quantity | Enter the actual or agreed quantity in the product/field’s displayed unit. |
| Finished Goods Storage Warehouse & Rack | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Completion Remarks | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Complete Work Order & Inward FG** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Complete Order & Update Inventory**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D088: “Complete Work Order & Inward FG” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-network-1"></a>

### D089. Territory · / Invite a dealer

**Location:** [Dealer network](#page-network); [Leads for us](#page-network-incoming).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Dealer's name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| PIN code prefixes (e.g. 4110, 41102) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Cities optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| States optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Product lines (optional; blank = everything. Matched with the enquiry's “product_line”) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Territory · / Invite a dealer** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Copy code**, **Save territory / Create invite**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D089: “Territory · / Invite a dealer” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review the intended customer/recipient and final wording before any external send.

<a id="dialog-ar-network-2"></a>

### D090. Conversation with

**Location:** [Dealer network](#page-network); [Leads for us](#page-network-incoming).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Conversation with** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Wait for the success or validation message. Correct a reported problem before retrying.
4. Close the window and check the affected record or list.

[Screenshot D090: “Conversation with” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-network-3"></a>

### D091. Network settings

**Location:** [Dealer network](#page-network); [Leads for us](#page-network-incoming).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| When a dealer declines or doesn't answer in time, offer the lead to the next match Off: it comes back to your queue for you to decide. | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Hours a dealer has to accept (1–168) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Consent wording: how your customers learn a dealer may contact them (your team confirms it before routing; recorded on every lead and shown to the dealer; | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Give the dealer who accepts the customer's WhatsApp conversation with you The last 100 messages, as a read-only copy; photos and documents are named, not sent. | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Network settings** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D091: “Network settings” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-network-4"></a>

### D092. Routed lead detail

**Location:** [Dealer network](#page-network); [Leads for us](#page-network-incoming).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page choose **Enquiry · · est. } } } } · quoted** for the intended record.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Refresh now**, **Take back**, **Close without a dealer**, **Route again**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D092: “Routed lead detail” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-route-lead-dialog-1"></a>

### D093. Route to a dealer

**Location:** [Enquiries](#page-enquiries); [Dealer network](#page-network); [Leads for us](#page-network-incoming).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Best match : ; equals take turns | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| The customer may be contacted by a dealer, and the dealer who accepts will see their WhatsApp conversation with us. | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Route to a dealer** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Offer to dealer / Put in queue**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D093: “Route to a dealer” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-collections-1"></a>

### D094. Collection reminders

**Now a page (1.2):** this opens as its own page, `/collections/settings` ([Collection reminders](#page-collections-settings)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Collections](#page-collections).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Send reminders automatically | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| Approved WhatsApp template | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Credit days (used when the ERP gives no due date) | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Include a BillDesk pay link for the amount outstanding | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |

**Open it:** On the parent page open the matching **Collection reminders** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **settings / Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D094: “Collection reminders” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review the intended customer/recipient and final wording before any external send.

<a id="dialog-ar-ai-negotiator-1"></a>

### D095. Manager Commercial Intervention

**Location:** [Autonomous AI Negotiator](#page-pipeline-ai-negotiator).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Intervention Action | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Approved Amount (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Approved Payment Terms | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Executive Notes / Rationale | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Manager Commercial Intervention** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Confirm & Apply**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D095: “Manager Commercial Intervention” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-enquiries-1"></a>

### D096. New enquiry

**Now a page (1.2):** this opens as its own page, `/enquiries/new` ([New enquiry](#page-enquiries-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Enquiries](#page-enquiries).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Title | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Requirement (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Est. value (₹) optional | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Source | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **New enquiry** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Create enquiry**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D096: “New enquiry” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-enquiry-drawer-1"></a>

### D097. Edit enquiry

**Location:** [Enquiries](#page-enquiries).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Title | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Requirement (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Est. value (₹) (optional) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Expected order date | Choose the intended date/time using the control. Check the date order and the displayed time zone. |

**Open it:** On the parent page open the matching **Edit enquiry** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save changes**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D097: “Edit enquiry” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-forecast-1"></a>

### D098. Quotas

**Location:** [Forecast](#page-forecast).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Quotas** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Save quotas**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D098: “Quotas” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-forecast-2"></a>

### D099. Forecast assumptions

**Location:** [Forecast](#page-forecast).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Financial year starts in | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Learn the chances from closed deals (your figures below are the starting point) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Chances for | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Forecast assumptions** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Use the default chances for this pipeline**, **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D099: “Forecast assumptions” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-installed-base-1"></a>

### D100. Import AMC values

**Location:** [Installed base](#page-installed-base).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| CSV file | Select the requested file or paste rows in the order stated in the window. Review the preview/validation before applying. |
| …or paste it | Select the requested file or paste rows in the order stated in the window. Review the preview/validation before applying. |

**Open it:** On the parent page open the matching **Import AMC values** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Check**, **Apply / change(s)**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D100: “Import AMC values” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review affected rows or identities and consequences before applying the change.

<a id="dialog-ar-installed-base-2"></a>

### D101. Edit machine / Register a machine

**Now a page (1.2):** this opens as its own page, `/installed-base/new` ([Register a machine](#page-installed-base-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Installed base](#page-installed-base).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Description | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Serial no. optional | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| AMC ends optional | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| AMC value (₹, before GST) (optional) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| AMC term (months) (default 12) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Make optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Model optional | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Site name optional | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Site city optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Edit machine / Register a machine** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save / Register**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D101: “Edit machine / Register a machine” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-pipeline-stages-1"></a>

### D102. Pipeline and stage management window

**Location:** [Pipelines](#page-enquiries-pipelines).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Move enquiries to | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Start from optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Counts as | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** In Pipelines choose **New pipeline**, **Rename**, **Add stage**, **Edit**, or the relevant **Delete** action.

**Step-by-step**

1. Check the window title to confirm whether you are editing a pipeline or one stage.
2. For a new pipeline enter its name and choose an optional source to copy.
3. For a stage enter the name and select **Counts as** so reporting treats it correctly.
4. For deletion select the destination under **Move enquiries to** before proceeding.
5. Click the displayed **Save** or **Delete** only after reviewing the affected pipeline/stage.

[Screenshot D102: “Pipeline and stage management window” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** The same window changes its fields by action. Moving existing enquiries is a business-data change, not just renaming a column.

<a id="dialog-ar-quotations-1"></a>

### D103. New quotation

**Now a page (1.2):** this opens as its own page, `/quotations/new` ([Quotation page](#page-quotations-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Quotations](#page-quotations).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Enquiry | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **New quotation** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Create draft**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D103: “New quotation” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-quotations-2"></a>

### D104. Issue

**Now a page (1.2):** this opens as its own page, `/quotations/:id/edit` ([Quotation page](#page-quotations-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Quotations](#page-quotations).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Valid for (days) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Send the PDF to the customer on WhatsApp | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Template if their 24-hour window is closed (fills name, reference and total) | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Issue** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Issue**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D104: “Issue” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review the intended customer/recipient and final wording before any external send.

<a id="dialog-ar-quote-signature-dialog-1"></a>

### D105. Create, send or withdraw a quotation-signing link

**Location:** [Quotations](#page-quotations).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Who signs | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| WhatsApp number optional | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Email optional | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| Link works for (days) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Email the link to the address above | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| Send on WhatsApp to the customer's number on file | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Approved template 3 variables: name, quote reference, link | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Ask the signer for a one-time code we email them (needs an email address) | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |

**Open it:** On the quotation, click **Signature**.

**Step-by-step**

1. Review existing signing requests for this quotation before creating another.
2. Enter **Who signs**, the intended contact destination and **Link works for (days)**.
3. If requesting a one-time code by email, provide the signer’s email and enable that option.
4. Choose any intended email/WhatsApp delivery and an approved template where required, then click **Create link** or **Make a new link**.
5. Use **Copy link**, **Send on WhatsApp** or **Send by email** only for the intended signer.
6. Use **Withdraw** if a still-active request must no longer be accepted.

[Screenshot D105: “Create, send or withdraw a quotation-signing link” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** This is a private link. Creating another request can change which request the customer should use; check validity and the latest state before resending.

<a id="dialog-ar-renewals-1"></a>

### D106. Mark lost

**Location:** [AMC renewals](#page-renewals).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Reason (optional) | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Mark lost** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Mark lost**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D106: “Mark lost” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-renewals-2"></a>

### D107. Renewal settings

**Location:** [AMC renewals](#page-renewals).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Yearly uplift (%) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| AMC item code (what Tally / SAP calls the service) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Pipeline for renewal enquiries | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Renewal settings** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **settings / Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D107: “Renewal settings” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-spares-1"></a>

### D108. Remind customers on WhatsApp

**Location:** [Spares due](#page-spares).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Send reminders automatically | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| Approved WhatsApp template | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Follow up if there's no answer after (days) (0 = no follow-up; a tap or any message counts as an answer) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Follow-ups at most (each the same number of days after the last) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Follow-up template (optional; the reminder is sent again if blank) | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Remind customers on WhatsApp** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **remind / Send due reminders now**, **rem-save / Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D108: “Remind customers on WhatsApp” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review the intended customer/recipient and final wording before any external send.

<a id="dialog-ar-spares-2"></a>

### D109. Spare part rules

**Now a page (1.2):** this opens as its own page, `/spares/rules` ([Spare part rules](#page-spares-rules)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Spares due](#page-spares).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Machine (make and model, or its part number) | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Spare part number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Description (optional) | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Per machine | Enter the actual or agreed quantity in the product/field’s displayed unit. |
| Every (days) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Show ahead (days) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |

**Open it:** On the parent page open the matching **Spare part rules** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **rule / Add rule**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D109: “Spare part rules” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-platform-console-1"></a>

### D110. Schedule a rate

**Location:** [Platform](#page-platform).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Category | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| What Meta charges (₹ per message) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| What tenants pay (₹ per message) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Effective from | Choose the intended date/time using the control. Check the date order and the displayed time zone. |

**Open it:** On the parent page open the matching **Schedule a rate** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Schedule**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D110: “Schedule a rate” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-feature-flags-1"></a>

### D111. Feature flag rule

**Location:** [Feature flags](#page-platform-feature-flags).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Feature | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Tenant ID blank = global default | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| On for everyone this rule covers | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| Rollout % | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Note optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Feature flag rule** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D111: “Feature flag rule” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-status-incidents-1"></a>

### D112. Update incident / New incident

**Location:** [Status page](#page-platform-status).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Title | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Impact | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Message to customers | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Starts / Started | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Planned end | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Update incident / New incident** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Post update / Post**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D112: “Update incident / New incident” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-projection-plan-1"></a>

### D113. AI Strategic Projection Plan Generator

**Location:** [Projection Plan](#page-pipeline-projection-plan).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Fiscal Year | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Annual Growth Rate Target (%) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Target Gross Margin (%) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Planning Horizon | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Include probability-weighted pipeline opportunities | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page choose **AI Auto-Generate Plan** for the intended record.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Synthesizing... / Generate Strategic Plan**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D113: “AI Strategic Projection Plan Generator” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-projection-plan-2"></a>

### D114. Create Projection Plan

**Location:** [Projection Plan](#page-pipeline-projection-plan).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Plan Title * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Fiscal Year * | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Planning Horizon | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Notes & Strategic Context | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page choose **New Plan** for the intended record.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Create Plan**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D114: “Create Projection Plan” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-vendor-bills-1"></a>

### D115. Vendor Bill: / ( / )

**Now a page (1.2):** this opens as its own page, `/purchasing/bills/:id` ([Vendor bill](#page-purchasing-bills-id)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Vendor bills](#page-purchasing-bills).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Vendor Bill: / ( / )** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Disburse Payment (₹1.2-2)**, **Mark GSTR-2B Reconciled**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D115: “Vendor Bill: / ( / )” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-vendor-bills-2"></a>

### D116. Disburse Vendor Payment

**Location:** [Vendor bills](#page-purchasing-bills).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Payment Amount (₹) * | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Disbursement Mode * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Bank UTR / Transaction Reference * | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| TDS Certificate (Form 16A / Challan Ref) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Payment Remarks | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Disburse Vendor Payment** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Confirm & Record Disbursement**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D116: “Disburse Vendor Payment” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Verify amounts and references; recording payment or marking paid does not transfer funds.

<a id="dialog-ar-vendor-bills-3"></a>

### D117. Record Vendor Bill (Purchase Invoice)

**Now a page (1.2):** this opens as its own page, `/purchasing/bills/new` ([Record vendor bill](#page-purchasing-bills-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Vendor bills](#page-purchasing-bills).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Supplier Name * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Supplier GSTIN | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Vendor Invoice Number * | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| PO Reference | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| GRN Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| TDS Withholding Section | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Record Vendor Bill (Purchase Invoice)** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **x**, **+ Add Line**, **Save & Perform 3-Way Match**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D117: “Record Vendor Bill (Purchase Invoice)” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Verify amounts and references; recording payment or marking paid does not transfer funds.

<a id="dialog-ar-vendor-debit-notes-1"></a>

### D118. Vendor Debit Note

**Now a page (1.2):** this opens as its own page, `/purchasing/debit-notes/:id` ([Debit note](#page-purchasing-debit-notes-id)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Vendor debit notes](#page-purchasing-debit-notes).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Vendor Debit Note** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Mark as Settled / Deducted**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D118: “Vendor Debit Note” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-vendor-debit-notes-2"></a>

### D119. Create Vendor Debit Note

**Now a page (1.2):** this opens as its own page, `/purchasing/debit-notes/new` ([Issue debit note](#page-purchasing-debit-notes-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Vendor debit notes](#page-purchasing-debit-notes).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Supplier Name * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Vendor Bill # | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Goods Receipt Note (GRN) # | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| GST Supply Type | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Reason for Debit Note * | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Create Vendor Debit Note** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **x**, **+ Add Item**, **Issue Debit Note**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D119: “Create Vendor Debit Note” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-goods-receipt-notes-1"></a>

### D120. GRN Dossier

**Now a page (1.2):** this opens as its own page, `/purchasing/grn/:id` ([Goods receipt](#page-purchasing-grn-id)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Goods receipt (GRN)](#page-purchasing-grn).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **GRN Dossier** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Record QC Decision**, **Create Vendor Bill**, **Issue Debit Note for Rejections**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D120: “GRN Dossier” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-goods-receipt-notes-2"></a>

### D121. Complete Material QC Inspection

**Now a page (1.2):** this opens as its own page, `/purchasing/grn/:id/inspect` ([QC inspection](#page-purchasing-grn-inspect)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Goods receipt (GRN)](#page-purchasing-grn).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Quality Inspector Name * | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Inspection Summary / Quality Certificate Remarks | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Complete Material QC Inspection** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Confirm & Approve Put-Away**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D121: “Complete Material QC Inspection” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-goods-receipt-notes-3"></a>

### D122. Record Inward Gate Entry (GRN)

**Now a page (1.2):** this opens as its own page, `/purchasing/grn/new` ([Inward goods receipt](#page-purchasing-grn-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Goods receipt (GRN)](#page-purchasing-grn).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Supplier Name * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Purchase Order Ref | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Vendor Delivery Challan # * | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Gate Entry # * | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Vehicle Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Transporter Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |

**Open it:** On the parent page open the matching **Record Inward Gate Entry (GRN)** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **x**, **+ Add Item**, **Save & Move to QC Inspection**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D122: “Record Inward Gate Entry (GRN)” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-reorder-buyers-1"></a>

### D123. Customer company: buyers and credit

**Now a page (1.2):** this opens as its own page, `/contacts/accounts/credit` ([Buyers & credit](#page-contacts-accounts-credit)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Re-orders](#page-reorders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Company | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Role | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Above ₹ (blank: always) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Credit limit, ₹ (blank: none) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Payment terms, days (blank: advance) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Flag orders when overdue by, days (blank: never) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| On hold: flag every new order for a word with the customer | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Reason (staff only) optional | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Customer company: buyers and credit** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Remove**, **Saved / Save**, **Saved / Save terms**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D123: “Customer company: buyers and credit” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-reorder-dispatch-1"></a>

### D124. Dispatch

**Now a page (1.2):** this opens as its own page, `/reorders/dispatch/:quotationId` ([Dispatch an order](#page-reorders-dispatch)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Re-orders](#page-reorders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Transporter or courier | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Docket, LR or AWB number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Tracking link (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Expected (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Packages (optional) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Freight, ₹ (optional) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Delivery PIN code | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Weight, kg | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| / days | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |

**Open it:** On the parent page open the matching **Dispatch** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Get rates**, **Dispatch**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D124: “Dispatch” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-reorders-1"></a>

### D125. Send a re-order link

**Now a page (1.2):** this opens as its own page, `/reorders/send` ([Send a re-order link](#page-reorders-send)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Re-orders](#page-reorders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page choose **Send a re-order link** for the intended record.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Continue**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D125: “Send a re-order link” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Review the intended customer/recipient and final wording before any external send.

<a id="dialog-ar-reorders-2"></a>

### D126. Re-order portal settings

**Now a page (1.2):** this opens as its own page, `/reorders/settings` ([Re-order portal settings](#page-reorders-settings)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Re-orders](#page-reorders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Portal on: customers can open their links and send requests | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Send for quotation A draft quotation for your team to check stock and delivery, then issue. Order and pay The quotation is issued at once and the customer pays | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| A line under it (delivery times, who to call) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Links work for (days) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Minimum order, ₹ (blank: none) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| “Limited stock” below | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Show customers exact quantities (“12 in stock”) instead of in stock, limited or on order | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Customers can also sign in with their WhatsApp number and a password | Use the credential supplied through your approved administrator process. Do not copy it into screenshots or messages; follow any “leave blank to keep” hint. |
| Public catalogue: anyone can look up your parts and send an enquiry | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| Show list prices in the public catalogue (otherwise “price on request”) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Link template (outside the 24-hour window; a URL button whose dynamic part is the link's code, at most one body variable: the customer's name) | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| Code template (authentication category; blank uses the helpdesk sign-off template) | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **Re-order portal settings** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D126: “Re-order portal settings” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-send-reorder-link-1"></a>

### D127. Re-order link for

**Location:** [Inbox](#page-inbox); [Contacts](#page-contacts); [Spares due](#page-spares); [Re-orders](#page-reorders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Re-order link for** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Copied / Copy**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D127: “Re-order link for” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-delivery-challans-1"></a>

### D128. Delivery Challan: / ( / )

**Now a page (1.2):** this opens as its own page, `/sales/challans/:id` ([Delivery challan](#page-sales-challans-id)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Delivery challans](#page-sales-challans).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page choose **View** for the intended record.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Dispatch Consignment**, **Mark as Delivered**, **Bill Delivery (Tax Invoice)**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D128: “Delivery Challan: / ( / )” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-delivery-challans-2"></a>

### D129. Dispatch Challan

**Now a page (1.2):** this opens as its own page, `/sales/challans/:id?dispatch=1` ([Delivery challan](#page-sales-challans-id)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Delivery challans](#page-sales-challans).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Transporter Name * | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Vehicle Number * | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| LR / Docket Number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| GST e-Way Bill Number (12 digits) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Open it:** On the parent page open the matching **Dispatch Challan** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Confirm Dispatch**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D129: “Dispatch Challan” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-sales-invoices-1"></a>

### D130. Tax Invoice: / ( / )

**Now a page (1.2):** this opens as its own page, `/sales/invoices/:id` ([Sales invoice](#page-sales-invoices-id)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Sales invoices](#page-sales-invoices).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page choose **View** for the intended record.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Issue Tax Invoice**, **Record Payment**, **Customer 360 Dossier**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D130: “Tax Invoice: / ( / )” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Verify amounts and references; recording payment or marking paid does not transfer funds.

<a id="dialog-ar-sales-invoices-2"></a>

### D131. Record Payment for

**Now a page (1.2):** this opens as its own page, `/sales/invoices/:id?pay=1` ([Sales invoice](#page-sales-invoices-id)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Sales invoices](#page-sales-invoices).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Payment Amount (₹) * | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Payment Mode * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| UTR / Transaction Ref # | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Remarks | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Record Payment for** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Confirm Payment**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D131: “Record Payment for” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing. Verify amounts and references; recording payment or marking paid does not transfer funds.

<a id="dialog-ar-sales-orders-1"></a>

### D132. Sales Order: / ( / )

**Now a page (1.2):** this opens as its own page, `/sales/orders/:id` ([Sales order](#page-sales-orders-id)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Sales orders](#page-sales-orders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Sales Order: / ( / )** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Confirm Sales Order**, **Create Delivery Challan**, **Generate Sales Invoice**, **Customer 360 Dossier**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D132: “Sales Order: / ( / )” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-sales-orders-2"></a>

### D133. Create New Sales Order

**Now a page (1.2):** this opens as its own page, `/sales/orders/new` ([New sales order](#page-sales-orders-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Location:** [Sales orders](#page-sales-orders).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Customer * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Customer PO Number * | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Payment Terms (Days) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Delivery Terms | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Shipping / Site Address | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **Create New Sales Order** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **+ Add line item**, **Create Sales Order**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D133: “Create New Sales Order” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-ai-assistant-1"></a>

### D134. Edit article / Add a knowledge article

**Location:** [AI assistant](#page-settings-ai-assistant).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Title | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Text | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| The assistant may answer from this article | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **Edit article / Add a knowledge article** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save article**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D134: “Edit article / Add a knowledge article” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-email-templates-1"></a>

### D135. New email template

**Location:** [Email templates](#page-settings-email-templates).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Template Key (unique identifier) | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Display Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Description | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Subject | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Body (HTML) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Open it:** On the parent page open the matching **New email template** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Create template**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D135: “New email template” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-erp-sync-section-1"></a>

### D136. Tally/SAP: choose what to sync

**Location:** [Integrations](#page-settings-integrations).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Customers — each company account (or a contact with no account) as a ledger / business partner | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Sales orders — a won quotation, once. Every line needs a part number matching an item in . | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Invoices and outstanding — read back for customers already in | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Stock on hand — read back so the re-order portal shows availability, when stock is kept in (Stock → Settings). Items match catalogue parts by part number. | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Company (when more than one is open in Tally) | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Sales ledger | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Customer group | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Customer code prefix | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** In Integrations → Tally & SAP Business One, choose **What to sync**.

**Step-by-step**

1. Choose the permitted customer, sales-order, invoice/outstanding and stock-on-hand sync options.
2. For Tally select the intended company and sales ledger where shown.
3. For SAP review customer-group and customer-code-prefix settings where shown.
4. Click **Save**, then run **Sync now** only after checking source/destination and mappings.

[Screenshot D136: “Tally/SAP: choose what to sync” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Order lines need matching part numbers. Choose a single authoritative stock source; a private endpoint needs an administrator allowance.

<a id="dialog-ar-integrations-1"></a>

### D137. Add a webhook endpoint

**Location:** [Integrations](#page-settings-integrations).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Endpoint URL | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| Description (optional) | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Open it:** On the parent page open the matching **Add a webhook endpoint** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Add endpoint**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D137: “Add a webhook endpoint” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-integrations-2"></a>

### D138. selected record — field mapping

**Location:** [Integrations](#page-settings-integrations).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Currency code (optional — labels the amount, does not convert it) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Log WhatsApp messages on the contact's timeline | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Include campaign sends (one CRM entry per recipient — counts against its API limits) | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Sync company accounts to , keeping the parent-child hierarchy, and link each contact to its account | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |

**Open it:** On the parent page open the matching **selected record — field mapping** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save mapping**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D138: “selected record — field mapping” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-members-1"></a>

### D139. Devices

**Location:** [Members & invites](#page-settings-members).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On the parent page open the matching **Devices** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Read the displayed status, reference, preview or history before choosing another action.
3. Use the action appropriate to your task: **Sign out**, **Sign out everywhere**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D139: “Devices” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-scheduled-reports-1"></a>

### D140. Edit report / New report

**Location:** [Scheduled reports](#page-settings-reports).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Report | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Cadence | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Send at (hour, IST) | Review the checkbox/switch wording and select it only when that behaviour is intended. |
| Email | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| In-app notification | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| WhatsApp digest | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Extra email recipients comma-separated | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| WhatsApp number E.164, no + | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Active | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **Edit report / New report** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D140: “Edit report / New report” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-scheduled-reports-2"></a>

### D141. Scheduled report preview

**Location:** [Scheduled reports](#page-settings-reports).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** On Scheduled reports, click **Preview** for the intended report.

**Step-by-step**

1. Check the report heading and period.
2. Review the rendered report content and recipients configured on its schedule.
3. Click **Close**; use **Edit** on the schedule if corrections are needed.

[Screenshot D141: “Scheduled report preview” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Preview does not send the report. Use Send now only for an authorised delivery.

<a id="dialog-ar-support-access-1"></a>

### D142. Grant support access

**Location:** [Support access](#page-settings-support-access).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Why support needs access | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| For how long | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Ticket reference optional | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Allow changes — without this, support can look but not change anything. Turn it on only if they asked to fix something for you. | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **Grant support access** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Grant access**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D142: “Grant support access” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-teams-1"></a>

### D143. Edit team / New team

**Location:** [Teams](#page-settings-teams).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Description optional | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |
| Lead optional | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Share new conversations | Review the checkbox/switch wording and select it only when that behaviour is intended. |

**Open it:** On the parent page open the matching **Edit team / New team** action or the relevant record’s detail action.

**Step-by-step**

1. Confirm the selected record shown in the window heading.
2. Complete the applicable fields in the table above; follow any required-field markers, sample format and limits shown in the window.
3. Use the action appropriate to your task: **Save changes / Create team**. If it opens another confirmation, review that confirmation before continuing.
4. Wait for the success or validation message. Correct a reported problem before retrying.
5. Close the window and check the affected record or list.

[Screenshot D143: “Edit team / New team” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If the action is unavailable, check required fields, the record’s current status and your permission. Do not repeatedly click while it is processing.

<a id="dialog-ar-two-factor-card-1"></a>

### D144. Set up your authenticator app

**Location:** [Settings](#page-settings).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Enter the 6-digit code it shows | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Open it:** In Settings → Two-step verification, click **Set up authenticator app**.

**Step-by-step**

1. Open your authenticator app and scan the displayed QR code or enter the setup key as instructed.
2. Enter its current six-digit authentication code in MNI Assist.
3. Click **Turn on**.
4. Save the recovery codes in the next window before closing the setup process.

[Screenshot D144: “Set up your authenticator app” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Never share the QR code or setup key. If codes fail, check the phone’s clock and use a fresh code.

<a id="dialog-ar-two-factor-card-2"></a>

### D145. Save your recovery codes

**Location:** [Settings](#page-settings).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

**Open it:** This window opens after successful authenticator setup.

**Step-by-step**

1. Use **Copy** or **Download** to save the recovery codes in your approved secure storage.
2. Check you can retrieve them without relying on the phone you just registered.
3. Click **I’ve saved them** only after saving them.

[Screenshot D145: “Save your recovery codes” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Recovery codes are private account credentials. Do not include them in a support ticket or screenshot.

<a id="dialog-ar-two-factor-card-3"></a>

### D146. Generate new recovery codes

**Location:** [Settings](#page-settings).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Authentication code | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Open it:** In Two-step verification, click **New recovery codes**.

**Step-by-step**

1. Complete the requested authentication check.
2. Click **Make new codes**.
3. Copy/download the new set and replace the old stored set.

[Screenshot D146: “Generate new recovery codes” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not rely on previously generated codes after replacing them. Keep the new codes private.

<a id="dialog-ar-two-factor-card-4"></a>

### D147. Turn off two-step verification

**Location:** [Settings](#page-settings).

**Purpose and access:** Complete or inspect the named action for the selected record. You need access to the parent page and permission for that action. Read-only detail windows do not change the record.

**Prerequisites:** Open the correct customer, workspace, channel or business record first. Related products, members, templates or provider connections must already exist where the window asks you to select them.

| Field or control | What to do |
| --- | --- |
| Your password | Use the credential supplied through your approved administrator process. Do not copy it into screenshots or messages; follow any “leave blank to keep” hint. |
| Authentication code | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Open it:** In Two-step verification, click **Turn off**.

**Step-by-step**

1. Read the effect on sign-in protection.
2. Enter the requested password/authentication check.
3. Click **Turn off** only when your account policy permits it.

[Screenshot D147: “Turn off two-step verification” window opened from its parent page, with the record identity, applicable fields/preview and final action button visible; highlight the final action and any important warning. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Closing the window cancels the change. Turning off two-step protection may require administrator permission.

<a id="confirmations"></a>

## Confirmation and question windows

These windows appear only after you choose the corresponding action. For a question form, supply the requested information and click the displayed confirmation button. For a confirmation, verify the selected record and consequences before proceeding. **Cancel** leaves the proposed action unconfirmed. Outside the main application shell, your browser may show a simpler native confirmation.

### Shared confirmation and question window

**Who can use it:** The user authorised for the initiating action.

**Prerequisites:** Start the action from its page and verify the selected record.

1. Read the title, message and any short facts listed.
2. For a question form complete every required field.
3. Click the named confirmation action only if all details are correct; otherwise click **Cancel**.
4. Wait for the result and check the record.

[Screenshot C000: A confirmation and a question-form example side by side; highlight the selected record, consequences, required fields, confirmation button and Cancel. Use approved sample data; obscure personal details, account secrets and private links.]

<a id="confirmation-001"></a>

### C001. Choose payment gateway

**Location and purpose:** Billing/payment checkout. Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Pay with | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Continue to payment** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C001: “Choose payment gateway” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check amount, payee and transaction reference. A status entry is not evidence that money moved.

<a id="confirmation-002"></a>

### C002. Delete this task?

**Location and purpose:** [Enquiries](#page-enquiries); [Tasks](#page-tasks). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C002: “Delete this task?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-003"></a>

### C003. Delete role "the selected record"?

**Location and purpose:** [Roles & permissions](#page-admin-roles). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C003: “Delete role "the selected record"?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-004"></a>

### C004. Reset features?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Reset to default** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C004: “Reset features?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-005"></a>

### C005. Delete this workspace?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C005: “Delete this workspace?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-006"></a>

### C006. Lock the selected record?

**Location and purpose:** [Users](#page-admin-users). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Lock** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C006: “Lock the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-007"></a>

### C007. Delete this user?

**Location and purpose:** [Users](#page-admin-users). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C007: “Delete this user?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-008"></a>

### C008. Issue this invoice to the selected record?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Issue invoice** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C008: “Issue this invoice to the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-009"></a>

### C009. Mark the selected record as paid?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Mark paid** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C009: “Mark the selected record as paid?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check amount, payee and transaction reference. A status entry is not evidence that money moved.

<a id="confirmation-010"></a>

### C010. Set a new password for the selected record?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Set password** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C010: “Set a new password for the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-011"></a>

### C011. Suspend the selected record?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Reason | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Suspend** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C011: “Suspend the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-012"></a>

### C012. Reactivate the selected record?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Reactivate** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C012: “Reactivate the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-013"></a>

### C013. Put the selected record on the selected recordthe selected record?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Assign plan** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C013: “Put the selected record on the selected recordthe selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-014"></a>

### C014. Create its tables now?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Create tables** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C014: “Create its tables now?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-015"></a>

### C015. Move the selected record back to the shared database?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Move back** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C015: “Move the selected record back to the shared database?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-016"></a>

### C016. Enter the selected record as its owner?

**Location and purpose:** [Workspaces](#page-admin-tenants). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Enter workspace** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C016: “Enter the selected record as its owner?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-017"></a>

### C017. Disconnect the selected record?

**Location and purpose:** [Ad attribution](#page-analytics-ads). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Disconnect** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C017: “Disconnect the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-018"></a>

### C018. Delete this dashboard?

**Location and purpose:** [Custom dashboards](#page-analytics-dashboards). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C018: “Delete this dashboard?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-019"></a>

### C019. Delete automation?

**Location and purpose:** [Automations](#page-automations). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C019: “Delete automation?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-020"></a>

### C020. Top up the wallet

**Location and purpose:** [Billing](#page-billing). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Amount (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Payment reference from the gateway | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Top up** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C020: “Top up the wallet” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check amount, payee and transaction reference. A status entry is not evidence that money moved.

<a id="confirmation-021"></a>

### C021. Top up the wallet

**Location and purpose:** [Billing](#page-billing). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Amount (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Continue to payment** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C021: “Top up the wallet” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check amount, payee and transaction reference. A status entry is not evidence that money moved.

<a id="confirmation-022"></a>

### C022. Move to the the selected record plan?

**Location and purpose:** [Billing](#page-billing). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Change plan** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C022: “Move to the the selected record plan?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-023"></a>

### C023. Mark this variance as checked?

**Location and purpose:** [Invoices](#page-billing-invoices). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| What did you find? | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **the confirmation action shown** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C023: “Mark this variance as checked?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-024"></a>

### C024. Delete this call?

**Location and purpose:** [WhatsApp calls](#page-calls-whatsapp). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C024: “Delete this call?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-025"></a>

### C025. Delete selected call recordings?

**Location and purpose:** [WhatsApp calls](#page-calls-whatsapp). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C025: “Delete selected call recordings?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-026"></a>

### C026. Replace the menu?

**Location and purpose:** [WhatsApp calls](#page-calls-whatsapp). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Replace** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C026: “Replace the menu?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-027"></a>

### C027. Cancel “the selected record”?

**Location and purpose:** [Campaigns](#page-campaigns). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Cancel campaign** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C027: “Cancel “the selected record”?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-028"></a>

### C028. Delete campaign?

**Location and purpose:** [Campaigns](#page-campaigns). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C028: “Delete campaign?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-029"></a>

### C029. Remove from the catalogue?

**Location and purpose:** [Catalogue](#page-channels-catalogue). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Remove** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C029: “Remove from the catalogue?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-030"></a>

### C030. Delete this chat link?

**Location and purpose:** [Chat links & QR](#page-channels-widget). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C030: “Delete this chat link?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-031"></a>

### C031. Disconnect the selected record?

**Location and purpose:** [Lead forms](#page-channels-lead-forms). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Disconnect** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C031: “Disconnect the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-032"></a>

### C032. Delete this menu?

**Location and purpose:** [Voice / IVR](#page-channels-voice-ivr). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C032: “Delete this menu?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-033"></a>

### C033. Remove this branch?

**Location and purpose:** [Voice / IVR](#page-channels-voice-ivr). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Remove** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C033: “Remove this branch?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-034"></a>

### C034. No contact matches this request

**Location and purpose:** [Compliance](#page-compliance). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Reject: no data held** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C034: “No contact matches this request” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-035"></a>

### C035. Fulfil this the selected record request?

**Location and purpose:** [Compliance](#page-compliance). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Fulfil** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C035: “Fulfil this the selected record request?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-036"></a>

### C036. Reject this request?

**Location and purpose:** [Compliance](#page-compliance). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Reason for rejecting | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **the confirmation action shown** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C036: “Reject this request?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-037"></a>

### C037. Delete this account?

**Location and purpose:** [Accounts](#page-contacts-accounts). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C037: “Delete this account?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-038"></a>

### C038. Delete this contact?

**Location and purpose:** [Contacts](#page-contacts). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C038: “Delete this contact?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-039"></a>

### C039. Delete this segment?

**Location and purpose:** [Audience builder](#page-contacts-segments). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C039: “Delete this segment?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-040"></a>

### C040. Delete document?

**Location and purpose:** [Documents](#page-documents). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C040: “Delete document?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-041"></a>

### C041. Replace the file of “the selected record”?

**Location and purpose:** [Documents](#page-documents). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Replace** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C041: “Replace the file of “the selected record”?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-042"></a>

### C042. Delete this price list?

**Location and purpose:** [Price lists](#page-documents-price-lists). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C042: “Delete this price list?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-043"></a>

### C043. Delete this product?

**Location and purpose:** [Products](#page-documents-products). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C043: “Delete this product?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-044"></a>

### C044. Deprecate “the selected record”?

**Location and purpose:** [Flows](#page-flows). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Deprecate** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C044: “Deprecate “the selected record”?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-045"></a>

### C045. Delete flow?

**Location and purpose:** [Flows](#page-flows). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C045: “Delete flow?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-046"></a>

### C046. Delete this form?

**Location and purpose:** [Web forms](#page-forms). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C046: “Delete this form?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-047"></a>

### C047. Delete ticket?

**Location and purpose:** [Enquiries](#page-enquiries); [Helpdesk](#page-helpdesk). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C047: “Delete ticket?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-048"></a>

### C048. End the link with the selected record?

**Location and purpose:** [Dealer network](#page-network); [Leads for us](#page-network-incoming). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **End link** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C048: “End the link with the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-049"></a>

### C049. Take the selected record back?

**Location and purpose:** [Dealer network](#page-network); [Leads for us](#page-network-incoming). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Reason | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Take back** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C049: “Take the selected record back?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-050"></a>

### C050. Close this lead without a dealer?

**Location and purpose:** [Dealer network](#page-network); [Leads for us](#page-network-incoming). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Reason | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Close lead** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C050: “Close this lead without a dealer?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-051"></a>

### C051. Leave the selected record's network?

**Location and purpose:** [Dealer network](#page-network); [Leads for us](#page-network-incoming). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Leave network** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C051: “Leave the selected record's network?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-052"></a>

### C052. Decline this lead from the selected record?

**Location and purpose:** [Dealer network](#page-network); [Leads for us](#page-network-incoming). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Tell them why | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Decline** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C052: “Decline this lead from the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-053"></a>

### C053. Hand this lead back to the selected record?

**Location and purpose:** [Dealer network](#page-network); [Leads for us](#page-network-incoming). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Tell them why | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Hand back** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C053: “Hand this lead back to the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-054"></a>

### C054. Delete enquiry?

**Location and purpose:** [Enquiries](#page-enquiries). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C054: “Delete enquiry?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-055"></a>

### C055. Delete machine?

**Location and purpose:** [Installed base](#page-installed-base). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C055: “Delete machine?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-056"></a>

### C056. Retire this machine?

**Location and purpose:** [Installed base](#page-installed-base). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Retire** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C056: “Retire this machine?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-057"></a>

### C057. Mark this quotation lost?

**Location and purpose:** [Quotations](#page-quotations). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Why was it lost? | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **the confirmation action shown** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C057: “Mark this quotation lost?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-058"></a>

### C058. Delete quotation?

**Location and purpose:** [Quotations](#page-quotations). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C058: “Delete quotation?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-059"></a>

### C059. Discard your changes?

**Location and purpose:** [Quotations](#page-quotations). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Discard** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C059: “Discard your changes?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-060"></a>

### C060. Withdraw this signature request?

**Location and purpose:** [Quotations](#page-quotations). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Withdraw** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C060: “Withdraw this signature request?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-061"></a>

### C061. Delete this rule?

**Location and purpose:** [Spares due](#page-spares). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C061: “Delete this rule?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-062"></a>

### C062. Resolve this alert?

**Location and purpose:** [Platform](#page-platform). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Closing note | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **the confirmation action shown** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C062: “Resolve this alert?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-063"></a>

### C063. Delete the selected feature rule?

**Location and purpose:** [Feature flags](#page-platform-feature-flags). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C063: “Delete the selected feature rule?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-064"></a>

### C064. Resolve “the selected record”?

**Location and purpose:** [Status page](#page-platform-status). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Closing message | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Resolve** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C064: “Resolve “the selected record”?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-065"></a>

### C065. Delete “the selected record”?

**Location and purpose:** [Status page](#page-platform-status). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C065: “Delete “the selected record”?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-066"></a>

### C066. Add or register a reseller partner

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Partner code | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Company name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Contact name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Contact email | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| Contact phone | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Website | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| GSTIN or tax ID | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Add partner / Register** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C066: “Add or register a reseller partner” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-067"></a>

### C067. Edit contact details

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Company name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Contact name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Contact email | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| Contact phone | Enter the intended reachable number in the displayed format, including country code when requested. Verify the customer or staff identity. |
| Website | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| GSTIN or tax ID | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Save** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C067: “Edit contact details” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-068"></a>

### C068. Approve the selected record

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Note for the record | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Approve** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C068: “Approve the selected record” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-069"></a>

### C069. Suspend the selected record

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Reason | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Suspend** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C069: “Suspend the selected record” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-070"></a>

### C070. Reactivate the selected record?

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Reactivate** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C070: “Reactivate the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-071"></a>

### C071. Tier for the selected record

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Tier | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Billing model | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Commission rate (%) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Wholesale discount (%) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Most client workspaces | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Save tier** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C071: “Tier for the selected record” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-072"></a>

### C072. Branding

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Brand name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Primary colour | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Secondary colour | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Logo URL (light backgrounds) | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| Logo URL (dark backgrounds) | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| Favicon URL | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| Support email | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| Help desk URL | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| Terms URL | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| Privacy policy URL | Use the approved address supplied for this business/service. Check spelling and the required address format. |
| Email sender name | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| Email sender address | Enter the intended email address, or select the email-delivery option if this is a checkbox. Check the recipient before sending. |
| AutoReach branding | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Save branding** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C072: “Branding” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-073"></a>

### C073. Custom domain

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Domain | Use the approved address supplied for this business/service. Check spelling and the required address format. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Save domain** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C073: “Custom domain” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-074"></a>

### C074. Mark the custom domain as verified or failed?

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Mark verified / Mark failed** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C074: “Mark the custom domain as verified or failed?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-075"></a>

### C075. Add a client workspace

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Client name | Enter a clear, recognisable name or heading for this record. Follow any naming rules shown. |
| Plan | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Billing cycle | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Wholesale rate per month (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Your price to the client per month (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Commission rate (%) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |
| Notes | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Add client** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C075: “Add a client workspace” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-076"></a>

### C076. Plan for the selected record

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Plan | Choose the intended available option. Confirm it belongs to the record, workspace and action you are handling. |
| Billing cycle | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Wholesale rate per month (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Your price to the client per month (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Commission rate (%) | Enter the approved limit or interval in the displayed unit and stay within any limits shown by the control. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Save plan** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C076: “Plan for the selected record” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-077"></a>

### C077. Deactivate the selected record?

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Reason | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Deactivate** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C077: “Deactivate the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-078"></a>

### C078. Record commission for the selected record

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Client | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| Invoice number | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |
| Invoice amount (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |
| Description | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Record** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C078: “Record commission for the selected record” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check amount, payee and transaction reference. A status entry is not evidence that money moved.

<a id="confirmation-079"></a>

### C079. Request a payout

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Amount (₹) | Enter the approved monetary amount in the displayed currency/unit. Review whether the field includes or excludes tax. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Request payout** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C079: “Request a payout” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check amount, payee and transaction reference. A status entry is not evidence that money moved.

<a id="confirmation-080"></a>

### C080. Mark the selected record as paid

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Payment reference (UTR) | Use the exact code or reference from the relevant approved record. Preserve significant digits and letters. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Mark paid** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C080: “Mark the selected record as paid” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check amount, payee and transaction reference. A status entry is not evidence that money moved.

<a id="confirmation-081"></a>

### C081. Reject the selected record

**Location and purpose:** [Reseller programme](#page-resellers). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Reason | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Reject** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C081: “Reject the selected record” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-082"></a>

### C082. Revoke the selected record's access?

**Location and purpose:** [Agency mode](#page-settings-agency). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Revoke access** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C082: “Revoke the selected record's access?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-083"></a>

### C083. Stop managing the selected record?

**Location and purpose:** [Agency mode](#page-settings-agency). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Stop managing** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C083: “Stop managing the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-084"></a>

### C084. Delete this article?

**Location and purpose:** [AI assistant](#page-settings-ai-assistant). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C084: “Delete this article?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-085"></a>

### C085. Delegate access

**Location and purpose:** [Settings](#page-settings). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Colleague | Complete this control for the selected record as described by its on-screen label and hint. Leave it blank only if the screen marks it optional. |
| First day | Choose the intended date/time using the control. Check the date order and the displayed time zone. |
| Last day | Choose the intended date/time using the control. Check the date order and the displayed time zone. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Delegate** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C085: “Delegate access” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-086"></a>

### C086. Stop the selected record acting for you?

**Location and purpose:** [Settings](#page-settings). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Remove** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C086: “Stop the selected record acting for you?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-087"></a>

### C087. Act for the selected record?

**Location and purpose:** [Settings](#page-settings). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Act for them** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C087: “Act for the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-088"></a>

### C088. Disconnect this mailbox?

**Location and purpose:** [Email sending](#page-settings-email-sending). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Disconnect** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C088: “Disconnect this mailbox?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-089"></a>

### C089. Delete "the selected record"?

**Location and purpose:** [Email templates](#page-settings-email-templates). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C089: “Delete "the selected record"?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-090"></a>

### C090. Discard your changes?

**Location and purpose:** [Email templates](#page-settings-email-templates). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Discard** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C090: “Discard your changes?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-091"></a>

### C091. Restore the default wording?

**Location and purpose:** [Email templates](#page-settings-email-templates). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Restore** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C091: “Restore the default wording?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-092"></a>

### C092. Unlink the selected record?

**Location and purpose:** [Settings](#page-settings). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Unlink** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C092: “Unlink the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-093"></a>

### C093. Unlink the selected record?

**Location and purpose:** [Settings](#page-settings). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Unlink** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C093: “Unlink the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-094"></a>

### C094. Revoke invitation?

**Location and purpose:** [Members & invites](#page-settings-members). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Revoke** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C094: “Revoke invitation?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-095"></a>

### C095. Deactivate the selected record?

**Location and purpose:** [Members & invites](#page-settings-members). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Reason | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Deactivate** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C095: “Deactivate the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-096"></a>

### C096. Reactivate the selected record?

**Location and purpose:** [Members & invites](#page-settings-members). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Reactivate** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C096: “Reactivate the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-097"></a>

### C097. Act as the selected record?

**Location and purpose:** [Members & invites](#page-settings-members). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Act as them** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C097: “Act as the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-098"></a>

### C098. Turn off two-step verification for the selected record?

**Location and purpose:** [Members & invites](#page-settings-members). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Turn off** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C098: “Turn off two-step verification for the selected record?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-099"></a>

### C099. Sign this device out?

**Location and purpose:** [Members & invites](#page-settings-members). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Sign out** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C099: “Sign this device out?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-100"></a>

### C100. Sign the selected record out everywhere?

**Location and purpose:** [Members & invites](#page-settings-members). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

| Field or control | What to do |
| --- | --- |
| Reason | Write a clear description relevant to this record or decision. Include useful references, but no passwords or unnecessary personal details. |

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Complete the fields above and review any displayed limits or required reason.
3. Click **Sign out** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C100: “Sign the selected record out everywhere?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-101"></a>

### C101. Delete this scheduled report?

**Location and purpose:** [Scheduled reports](#page-settings-reports). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C101: “Delete this scheduled report?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-102"></a>

### C102. Require confirmed email addresses?

**Location and purpose:** [Sign-in and password rules](#page-settings-security-policy). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Require it** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C102: “Require confirmed email addresses?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-103"></a>

### C103. Sign this device out?

**Location and purpose:** [Settings](#page-settings). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Sign out** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C103: “Sign this device out?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-104"></a>

### C104. Sign out every other device?

**Location and purpose:** [Settings](#page-settings). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Sign out others** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C104: “Sign out every other device?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-105"></a>

### C105. Revoke support access?

**Location and purpose:** [Support access](#page-settings-support-access). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Revoke now** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C105: “Revoke support access?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-106"></a>

### C106. Delete team?

**Location and purpose:** [Teams](#page-settings-teams). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C106: “Delete team?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="confirmation-107"></a>

### C107. Submit selected draft templates to Meta?

**Location and purpose:** [Templates](#page-templates). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Submit all** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C107: “Submit selected draft templates to Meta?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A confirmation does not bypass role checks or the business approval process.

<a id="confirmation-108"></a>

### C108. Delete template?

**Location and purpose:** [Templates](#page-templates). Confirm the named action for the selected record; available only with the initiating action’s permission.

**Prerequisites:** Select the intended record and review the proposed change before opening this window.

**Step-by-step**

1. Check the record named in the title and read all stated consequences.
2. Review any confirmation text, reason or additional facts requested in this window.
3. Click **Delete** only if this is the intended action; otherwise choose **Cancel**.
4. Wait for the result and verify the affected record or status.

[Screenshot C108: “Delete template?” confirmation or question window showing the selected record, consequences, required information and confirmation/Cancel buttons. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Deletion can be irreversible or affect linked records. Inspect dependencies; do not confirm merely to remove a row from a filtered view.

<a id="additional-windows"></a>

## Additional detail windows

<a id="window-001"></a>

### W001. Conversation filters

**Page:** [/inbox](#page-inbox). **Access:** The parent page and the selected action must be permitted.

**Purpose:** Review or complete the named detail action.

**Prerequisites:** Open the relevant customer or business record; have the values needed for the action ready.

**Open it:** Click **Filters** on Inbox.

**Step-by-step**

1. Choose the assignee and any **Assigned to me**, **Unread only** or **Reply window closing soon** options.
2. Review matching conversations.
3. Click **Done**; use **Clear filters** when you want the full list again.

[Screenshot W001: Conversation filters open with its heading, selected record, relevant fields and final action highlighted. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Filters change the view, not the conversation assignment.

<a id="window-002"></a>

### W002. Attach a document

**Page:** [/inbox](#page-inbox). **Access:** The parent page and the selected action must be permitted.

**Purpose:** Review or complete the named detail action.

**Prerequisites:** Open the relevant customer or business record; have the values needed for the action ready.

**Open it:** In a conversation choose the document-library attachment action.

**Step-by-step**

1. Search/select an eligible document.
2. Review its title, access scope and intended customer.
3. Use the displayed attach/send action and confirm the message result.

[Screenshot W002: Attach a document open with its heading, selected record, relevant fields and final action highlighted. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A restricted document must be allowed for this customer. Attaching and sending can be separate steps.

<a id="window-003"></a>

### W003. Enquiry detail drawer

**Page:** [/enquiries](#page-enquiries). **Access:** The parent page and the selected action must be permitted.

**Purpose:** Review or complete the named detail action.

**Prerequisites:** Open the relevant customer or business record; have the values needed for the action ready.

**Open it:** Click an enquiry card or an enquiry reference.

**Step-by-step**

1. Verify the contact and enquiry reference.
2. Review requirements, owner, stage, activity and linked records.
3. Use **Edit enquiry** for details or the displayed task, meeting, quotation, note or dealer-routing action.
4. Complete its child window and check the updated record.
5. Close the drawer to return to the board.

[Screenshot W003: Enquiry detail drawer open with its heading, selected record, relevant fields and final action highlighted. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A note or stage change does not issue a quotation or confirm payment.

<a id="window-004"></a>

### W004. Quotation line editor

**Now a page (1.2):** this opens as its own page, `/quotations/new` ([Quotation page](#page-quotations-new)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Page:** [/quotations](#page-quotations). **Access:** The parent page and the selected action must be permitted.

**Purpose:** Review or complete the named detail action.

**Prerequisites:** Open the relevant customer or business record; have the values needed for the action ready.

**Open it:** On a draft quotation click **Lines** or its edit action.

**Step-by-step**

1. Review the customer and quotation identity.
2. Add/select products or enter the permitted part number and description.
3. Enter quantities, units, agreed prices, discounts and tax/terms fields shown.
4. Review the line totals and quotation total.
5. Use the editor’s save action; issue the quotation separately when ready.

[Screenshot W004: Quotation line editor open with its heading, selected record, relevant fields and final action highlighted. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check whether a customer price list or product tax rate applies. Saving lines does not itself send the quotation.

<a id="window-005"></a>

### W005. Meeting detail and completion/cancellation

**Page:** [/meetings](#page-meetings). **Access:** The parent page and the selected action must be permitted.

**Purpose:** Review or complete the named detail action.

**Prerequisites:** Open the relevant customer or business record; have the values needed for the action ready.

**Open it:** Click a meeting on the calendar.

**Step-by-step**

1. Review attendees, time, place/link, series information and current status.
2. Use **Accept** or **Decline** for your attendance response.
3. Choose **Mark done** and enter the outcome after the meeting, or use **No-show** for the appropriate result.
4. To cancel select the cancellation action, enter the reason and choose whether later series occurrences are also cancelled.
5. Confirm **Cancel the meeting** only when intended; otherwise use **Back** or close.
6. Use **Copy details** or **.ics file** to copy/export the meeting.

[Screenshot W005: Meeting detail and completion/cancellation open with its heading, selected record, relevant fields and final action highlighted. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Cancellation may notify attendees. A recurring series selection can affect more than one meeting.

<a id="window-006"></a>

### W006. Add Number to Inventory Pool

**Page:** [/channels/telecom](#page-channels-telecom). **Access:** The parent page and the selected action must be permitted.

**Purpose:** Review or complete the named detail action.

**Prerequisites:** Open the relevant customer or business record; have the values needed for the action ready.

**Open it:** Click **Add number to pool**.

**Step-by-step**

1. Enter the 10-digit number under the displayed +91 prefix.
2. Choose the authorised carrier and provisioning type.
3. Enter approved monthly rental, setup fee and carrier reference.
4. Click **Add to inventory** and check the new pool record.

[Screenshot W006: Add Number to Inventory Pool open with its heading, selected record, relevant fields and final action highlighted. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Adding a record does not purchase a line from a carrier.

<a id="window-007"></a>

### W007. Allocate Number to Workspace

**Page:** [/channels/telecom](#page-channels-telecom). **Access:** The parent page and the selected action must be permitted.

**Purpose:** Review or complete the named detail action.

**Prerequisites:** Open the relevant customer or business record; have the values needed for the action ready.

**Open it:** Select an available pool number and click **Allocate to workspace**.

**Step-by-step**

1. Verify the selected number.
2. Choose the intended target workspace and enter its verified WhatsApp display name.
3. Click **Confirm allocation** and review the result.

[Screenshot W007: Allocate Number to Workspace open with its heading, selected record, relevant fields and final action highlighted. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not allocate a number already in live use without an approved routing change.

<a id="window-008"></a>

### W008. Release Number from Workspace

**Page:** [/channels/telecom](#page-channels-telecom). **Access:** The parent page and the selected action must be permitted.

**Purpose:** Review or complete the named detail action.

**Prerequisites:** Open the relevant customer or business record; have the values needed for the action ready.

**Open it:** Click **Release number** on the allocation.

**Step-by-step**

1. Verify the number and current workspace.
2. Enter **Reason for Release** and the quarantine cooling-off period.
3. Click **Release & quarantine** only after authorisation.

[Screenshot W008: Release Number from Workspace open with its heading, selected record, relevant fields and final action highlighted. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** This can interrupt the workspace’s communications. Quarantine is different from deleting a record.

<a id="window-009"></a>

### W009. Edit Telecom Entity Registration

**Page:** [/channels/telecom](#page-channels-telecom). **Access:** The parent page and the selected action must be permitted.

**Purpose:** Review or complete the named detail action.

**Prerequisites:** Open the relevant customer or business record; have the values needed for the action ready.

**Open it:** In the entity tab click **Edit profile**.

**Step-by-step**

1. Enter the legal entity name and regulatory classification.
2. Enter the actual DoT/DLT/TRAI identifiers and carrier/interconnect details requested.
3. Complete the responsible officer’s name, official email and emergency contact.
4. Review all values and click **Save changes**.

[Screenshot W009: Edit Telecom Entity Registration open with its heading, selected record, relevant fields and final action highlighted. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** These entries must come from verified business records. Saving them is not regulatory approval.

<a id="window-010"></a>

### W010. Telecom Compliance & SIM-Binding Audit Certificate

**Page:** [/channels/telecom](#page-channels-telecom). **Access:** The parent page and the selected action must be permitted.

**Purpose:** Review or complete the named detail action.

**Prerequisites:** Open the relevant customer or business record; have the values needed for the action ready.

**Open it:** Click **Run compliance audit** or **Run audit now**.

**Step-by-step**

1. Review the audit time and the number/status totals.
2. Read any findings or failed checks.
3. Send necessary corrections through the authorised telecom administrator, then rerun when appropriate.
4. Click **Done** to close.

[Screenshot W010: Telecom Compliance & SIM-Binding Audit Certificate open with its heading, selected record, relevant fields and final action highlighted. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** The displayed audit is an application check, not a substitute for carrier or regulator confirmation.

<a id="window-011"></a>

### W011. AI conversations

**Now a page (1.2):** this opens as its own page, `/calls/whatsapp/conversations` ([AI voice conversations](#page-calls-whatsapp-conversations)). The fields and steps below still apply; use the page’s Back or Cancel button instead of closing a window.

**Page:** [/calls/whatsapp](#page-calls-whatsapp). **Access:** Users who may open call recordings, and only calls they are allowed to see. **Suggest instruction changes** also needs permission to manage channels.

**Purpose:** Find and review calls the AI voice agent handled: transcript, summary, outcome, extracted values and every action the agent took; correct values, give feedback on the agent’s answers and export the list.

**Prerequisites:** Transcript capture switched on for the AI calls (a platform setting) and at least one finished AI call. Transcripts are kept for 180 days from the start of the call.

**Open it:** On **WhatsApp calls**, click **AI conversations**.

**Step-by-step**

1. Type words the caller or agent said under **Search transcripts** and click **Search**; use **Previous** and **Next** to page through.
2. Click a call to open it. Check **Deleted on** and the notices: a transcript may be marked as possibly incomplete or cut short.
3. Under **After the call** read the summary, caller sentiment and whether the call’s goal was met.
4. Correct any extracted value by editing its box; the change is saved when you leave the box. Clear a box to remove a wrong value.
5. Under **What the agent did** check each action the agent read back or completed (for example a booking or a ticket) and its result.
6. Read the transcript. Under an agent answer click **Good answer**, or **Needs work** to type what the agent should have done, then **Save note**.
7. After rating answers, click **Suggest instruction changes** to get proposed edits for the agent’s instructions. Nothing is changed automatically; edit the voice agent yourself if you agree.
8. Click **Export CSV** to download the listed calls (up to 5,000) with outcome, summary and one column per extracted value.

[Screenshot W011: AI conversations window with one call open showing the summary, an extracted field, the actions list and a rated agent answer; highlight Export CSV. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Transcripts come from automatic speech recognition and may contain mistakes; an agent line is what the AI produced, which may differ slightly from what the caller heard. If a call says it couldn’t be analysed, the analysis model is not set up or gave no usable answer — ask your administrator. Treat the CSV as personal data: share it only with people allowed to see these calls.

<a id="shared-views"></a>

## Shared panels, menus and embedded views

These views are part of a page or call session rather than separate URLs. They inherit the parent page’s access and the specific action’s permissions.

<a id="panel-ar-campaign-setup"></a>

### V001. Campaign audience, variables and readiness

**Purpose:** Campaign audience, variables and readiness. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** An existing campaign draft with a selected template and an audience you may contact.

**Step-by-step**

1. Open the draft’s setup panel and select **Audience**.
2. For each template variable choose **Use a customer field or fixed text** and enter/select the appropriate value.
3. Set **Fallback when the customer field is empty** where needed, so missing data does not produce an incomplete message.
4. Review the sample message and audience, then click **Save and check readiness**.
5. Read all readiness issues before returning to the campaign’s send action.

[Screenshot V001: Campaign audience, variables and readiness within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Readiness is not consent and does not itself send the campaign.

<a id="panel-ar-recurrence-picker"></a>

### V002. Recurring tasks and meetings

**Purpose:** Recurring tasks and meetings. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** A task or meeting editor that offers recurrence.

**Step-by-step**

1. Open **Repeats** and choose the intended recurrence pattern.
2. Set the offered interval/day/date options.
3. Choose whether it ends **Never**, **On** a date, or another offered end condition.
4. Review the repeated dates and save the containing task or meeting.

[Screenshot V002: Recurring tasks and meetings within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Changing or cancelling one occurrence may differ from changing the series. Check the parent window’s scope.

<a id="panel-ar-automation-canvas"></a>

### V003. Automation canvas controls and connections

**Purpose:** Automation canvas controls and connections. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** An editable automation with List/Canvas views.

**Step-by-step**

1. Select **Canvas** in the automation builder.
2. Add a step from the offered palette or editor and complete its fields.
3. Connect the bottom connection point of a step to the next step.
4. For conditions or reply waits connect each intended branch; an unconnected exit can end the journey.
5. Use zoom minus/plus, **Fit**, **Tidy up** and **Undo** as appropriate.
6. Save the automation and dry-run it from the list.

[Screenshot V003: Automation canvas controls and connections within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A tidy visual layout does not prove the branches or customer timeouts are correct.

<a id="panel-ar-contact-picker"></a>

### V004. Select or quickly add a customer

**Purpose:** Select or quickly add a customer. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** A form that asks you to choose an existing customer/contact.

**Step-by-step**

1. Search by the available name/number criteria.
2. Select the intended match and check its company/number.
3. Use **change** if you selected the wrong person.
4. If no match exists and creation is permitted, choose **Add as a new contact**, complete the fields and **Add and choose**.

[Screenshot V004: Select or quickly add a customer within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Search before creating. Similar customer names can belong to different companies.

<a id="panel-ar-lead-rotation-panel"></a>

### V005. Lead rotation and ownership distribution

**Purpose:** Lead rotation and ownership distribution. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** Permission to manage assignment rules and eligible workspace members.

**Step-by-step**

1. Open the lead-rotation panel on the page that offers it.
2. Choose **On / Off** and **How to choose**.
3. Use **Add a person**, set each person’s share/limit and arrange their order with the arrows.
4. Review whether assignment also creates contact ownership and whether an email notice is sent.
5. Use **Pause**, **Resume** or **Remove** for the intended member only, then click **Save rotation**.

[Screenshot V005: Lead rotation and ownership distribution within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Distribution limits and inactive/paused members can prevent assignment. Review the result with a test lead.

<a id="panel-ar-sms-inbound-card"></a>

### V006. SMS replies: virtual-number mapping

**Purpose:** SMS replies: virtual-number mapping. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** A provider/channel connection that supports incoming SMS and channel-management rights.

**Step-by-step**

1. Open the **SMS replies** card on its channel setup page.
2. Enter the approved **Virtual number (with country code)**.
3. Review any displayed provider callback/setup information.
4. Click **Save** and test with an approved test sender.

[Screenshot V006: SMS replies: virtual-number mapping within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Saving a number does not purchase it or change the provider’s routing automatically.

<a id="panel-ar-erp-ledger"></a>

### V007. Account ERP ledger view

**Purpose:** Account ERP ledger view. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** An account with an authorised ERP connection and matched source records.

**Step-by-step**

1. Open the account’s ledger section.
2. Confirm the account identity and source.
3. Review available transactions/balances and use the displayed links or filters to inspect the underlying record.

[Screenshot V007: Account ERP ledger view within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A missing ledger can mean no source match or sync data, not a zero balance.

<a id="panel-ar-enquiry-activities"></a>

### V008. Enquiry tasks and meetings

**Purpose:** Enquiry tasks and meetings. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** An existing enquiry and permission for activities.

**Step-by-step**

1. Open the enquiry drawer and find **Tasks and meetings**.
2. Review linked work before adding a duplicate.
3. Click **Add a task** or **Schedule a meeting**.
4. Complete its editor and save, then check the linked item appears.

[Screenshot V008: Enquiry tasks and meetings within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Linking an activity to a deal does not change the deal’s stage.

<a id="panel-ar-enquiry-calls"></a>

### V009. Enquiry call history and manual call logging

**Purpose:** Enquiry call history and manual call logging. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** An existing enquiry; call rights for calling or logging.

**Step-by-step**

1. Open **Calls** within the enquiry.
2. Review previous call outcomes.
3. Use **Call** only for an authorised customer contact.
4. Use **Log a call** for a call that already took place, or **Say how it went** to complete an existing outcome.
5. Save and verify the history entry.

[Screenshot V009: Enquiry call history and manual call logging within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not log a call as connected or completed if it did not happen.

<a id="panel-ar-enquiry-tickets"></a>

### V010. Service tickets linked to an enquiry

**Purpose:** Service tickets linked to an enquiry. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** An existing enquiry/customer and Helpdesk access.

**Step-by-step**

1. Open **Service tickets** in the enquiry.
2. Review existing tickets for the same issue.
3. Click **Raise a ticket**, complete the issue and priority, and save.
4. Open a linked ticket to continue the Helpdesk workflow.

[Screenshot V010: Service tickets linked to an enquiry within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A linked support ticket does not automatically close the sales enquiry.

<a id="panel-ar-enquiry-network"></a>

### V011. Dealer routing inside an enquiry

**Purpose:** Dealer routing inside an enquiry. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** An eligible enquiry, dealer network and customer consent for the proposed sharing.

**Step-by-step**

1. Open **Dealer network** in the enquiry.
2. Review current/past routing.
3. Click **Route to a dealer** or **Route again**.
4. Review matching dealers and confirm the required consent before completing the routing window.

[Screenshot V011: Dealer routing inside an enquiry within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check whether the lead is already accepted or shared before rerouting.

<a id="panel-ar-browser-notifications-card"></a>

### V012. Browser desktop notifications

**Purpose:** Browser desktop notifications. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** A supported browser, notification permission and an appropriate signed-in account.

**Step-by-step**

1. Open the notifications card in Settings.
2. Choose personal/assigned notices or additionally unassigned new messages as offered.
3. Click **Turn on notifications** and allow the browser request if intended.
4. Use **Send a test** to verify delivery.
5. Use **Turn off** to disable it.

[Screenshot V012: Browser desktop notifications within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** If blocked, change the browser’s site notification permission. Operating-system focus/notification settings can also suppress alerts.

<a id="panel-ar-delegations-card"></a>

### V013. Delegate access or act for a colleague

**Purpose:** Delegate access or act for a colleague. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** Delegation rights and a verified colleague/date range.

**Step-by-step**

1. In Settings find **People who can act for you** and choose **Delegate access**.
2. Choose the colleague and first/last day in the question window, then **Delegate**.
3. Review the resulting delegation and use **Remove** when it should end.
4. Under **You can act for**, choose **Act for them** only for an authorised task and check the session identity before acting.

[Screenshot V013: Delegate access or act for a colleague within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Delegated access, agency sessions and support grants are separate mechanisms. End the acting session when the task is finished.

<a id="panel-ar-external-logins-card"></a>

### V014. Link an external sign-in identity

**Purpose:** Link an external sign-in identity. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** A signed-in account and access to the intended external identity provider.

**Step-by-step**

1. Open the external-login card in Settings.
2. Choose **Link** for the intended provider and complete its authorisation flow.
3. Return and confirm the correct identity is linked.
4. Use **Unlink** only when you retain another verified way to sign in.

[Screenshot V014: Link an external sign-in identity within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Link your own identity, not a shared or unrelated provider account.

<a id="panel-ar-linked-accounts-card"></a>

### V015. Link and switch between your accounts

**Purpose:** Link and switch between your accounts. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** You are authorised to use each account you link and know its current sign-in credentials.

**Step-by-step**

1. Click **Link another account** in Settings.
2. Enter its **Workspace**, **Username, email or phone number**, **Its password** and authentication code if required.
3. Click **Link account** and verify the saved identity.
4. Choose **Switch to it** to change accounts and check the new workspace/user indicator.
5. Use **Unlink** to remove the convenience connection.

[Screenshot V015: Link and switch between your accounts within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Linking does not grant permissions in another workspace. Never enter another person’s credentials.

<a id="panel-ar-sign-in-history-card"></a>

### V016. Your sign-in history

**Purpose:** Your sign-in history. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** Sign in and open the security section in Settings.

**Step-by-step**

1. Open the sign-in-history card.
2. Review the recent times, outcome and device/network details shown.
3. For an unfamiliar successful sign-in, follow your organisation’s account-security process and review sessions/password/two-step settings.

[Screenshot V016: Your sign-in history within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A network location or browser label can be approximate. Compare it with your own activity before escalating.

<a id="panel-ar-signature-pad"></a>

### V017. Draw or clear a signature

**Purpose:** Draw or clear a signature. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** A permitted signing form and the correct signer identity.

**Step-by-step**

1. Draw in the signature area using a mouse, finger or stylus.
2. Click **Clear** if you need to start again.
3. Complete the containing form’s name, verification and acceptance steps before submitting.

[Screenshot V017: Draw or clear a signature within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Drawing a signature is not the same as submitting it. Review the document before the final acceptance.

<a id="panel-ar-landing-plans"></a>

### V018. Compare monthly and annual plans

**Purpose:** Compare monthly and annual plans. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** None; this section is on the public website.

**Step-by-step**

1. Open the website’s plans section.
2. Choose **Monthly** or **Annual**.
3. Compare the features, limits and price for the intended billing cycle.
4. Choose the plan’s signup/activation action and review the final billing screen before payment.

[Screenshot V018: Compare monthly and annual plans within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A marketing comparison does not override your workspace’s saved subscription or invoice.

<a id="panel-ar-landing-ai"></a>

### V019. Public AI demonstration

**Purpose:** Public AI demonstration. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** None; the website may show an illustrative product demonstration.

**Step-by-step**

1. Open the public AI section.
2. Select an offered example response to see the demonstration change.
3. Use the example to understand the workflow, then test the real feature inside an authorised workspace.

[Screenshot V019: Public AI demonstration within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** A demonstration is illustrative and does not send a customer message or prove a production AI connection.

<a id="panel-ar-landing-chat"></a>

### V020. Website demonstration conversation

**Purpose:** Website demonstration conversation. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** None.

**Step-by-step**

1. Review the public website’s example conversation.
2. Read it as a product illustration, then use Sign in or Create a workspace for real business work.

[Screenshot V020: Website demonstration conversation within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not assume an illustrative conversation is your workspace Inbox.

<a id="panel-ar-landing-industries"></a>

### V021. Industry use-case overview

**Purpose:** Industry use-case overview. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** None.

**Step-by-step**

1. Review the industry examples on the public website.
2. Use them to choose the relevant operational workflow in this manual.

[Screenshot V021: Industry use-case overview within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** An industry example does not mean a feature is included in every subscription.

<a id="panel-ar-landing-faq"></a>

### V022. Website frequently asked questions

**Purpose:** Website frequently asked questions. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** None.

**Step-by-step**

1. Open the FAQ section.
2. Expand the question you want to read where an expand control is offered.
3. Use the relevant signup, plan or sign-in link for the next action.

[Screenshot V022: Website frequently asked questions within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** For workspace-specific billing or setup, use your actual saved configuration and support route.

<a id="panel-ar-auth-showcase"></a>

### V023. Sign-in introduction panel

**Purpose:** Sign-in introduction panel. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** None; displayed beside the account form on supported screen sizes.

**Step-by-step**

1. Read the introduction if useful.
2. Use the adjacent sign-in or signup form to continue.

[Screenshot V023: Sign-in introduction panel within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** The illustration panel has no separate account-creation action.

<a id="panel-ar-email-confirmation-banner"></a>

### V024. Email confirmation reminder

**Purpose:** Email confirmation reminder. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** A signed-in account with an unconfirmed email.

**Step-by-step**

1. Read the reminder and confirm the email on your profile is correct.
2. Click **Send confirmation link**.
3. Open the email, confirm it, and return to refresh the profile/checklist.

[Screenshot V024: Email confirmation reminder within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Repeatedly requesting mail does not verify ownership; the link must be opened.

<a id="panel-ar-softphone-bar"></a>

### V025. Browser phone: answer, mute, keypad and hang up

**Purpose:** Browser phone: answer, mute, keypad and hang up. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** A configured SIP/browser phone, call permission, headset and browser microphone access.

**Step-by-step**

1. For an authorised outgoing call enter/select the intended destination and click **Call**.
2. For an incoming call choose **Answer** or **Decline**.
3. Use **Mute / Unmute** and **Keypad** during the connected call as needed.
4. Click **Hang up** when finished, then record the call outcome where asked.

[Screenshot V025: Browser phone: answer, mute, keypad and hang up within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Check browser microphone permission, headset and provider connection if you cannot hear or speak. Call controls do not prove the customer heard you.

<a id="panel-ar-whatsapp-call-bar"></a>

### V026. Live WhatsApp call bar, transfer and rejoin

**Purpose:** Live WhatsApp call bar, transfer and rejoin. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** A calling-enabled WhatsApp channel, allowed staff access, working media relay and browser microphone permission.

**Step-by-step**

1. Enable ringtone/call alerts if desired and allow any browser permission requested.
2. For an incoming call choose **Answer**, **Take call** or **Decline** as offered. When an AI voice agent asks for a person, the bar says **The AI agent is asking for a person** with the team and the reason; click **Take over** to join the call (the AI leaves when you start speaking). It can’t be declined, because it rings your whole team. Once connected, the bar shows the AI’s summary of the call so far.
3. During a call use **Mute / Unmute** and **Look up** when needed.
4. To transfer, choose **Transfer to**, check the intended recipient and click **Transfer**; use **Keep call** if abandoning the transfer.
5. If the interface offers **Rejoin** after a recoverable disconnect, use it and confirm audio has resumed.
6. Click **Hang up** when finished. Use **Call back** only when permitted and intended.

[Screenshot V026: Live WhatsApp call bar, transfer and rejoin within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Do not navigate away expecting the call to continue in every browser. A reconnect state needs an actual audio check. Outgoing calls may need customer permission.

<a id="panel-ar-call-assist"></a>

### V027. Look up business context during a call

**Purpose:** Look up business context during a call. **Who can use it:** The authorised user of the containing page or session.

**Prerequisites:** An active permitted call and access to the searched records/knowledge.

**Step-by-step**

1. Open **Look up** from the call bar.
2. Search **customers, parts, orders, tickets** and select the relevant result.
3. For technical support enter the question under **Ask technical support** and click **Ask**.
4. Review the source and answer before speaking it to the customer.

[Screenshot V027: Look up business context during a call within its containing page; highlight its entry control and final action or selected option. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** An assistant answer can be incomplete; do not invent a price or confirm an action the system has not completed.

<a id="panel-ar-inbox-ai-call"></a>

### V028. Call with AI agent

**Purpose:** Have the WhatsApp number’s published AI voice agent call the customer of the open conversation. **Who can use it:** Users who may reply in the Inbox, in a workspace with the voice feature.

**Prerequisites:** The conversation’s WhatsApp number has a published voice agent allowed to make AI calls; the customer has allowed WhatsApp calls (use **Ask to call** first) and has not opted out; the time is between 09:00 and 21:00 India time.

**Step-by-step**

1. In the conversation header click **Call with AI agent**.
2. Optionally enter **Reason for the call**, for example “Their AMC renewal is due on 5 November.” The agent says why it is calling right after its greeting.
3. Click **Place AI call** and read the result. If the call can’t be placed, the message says why (no call permission, opted out, outside calling hours, or no published agent).
4. Review the call later under **AI conversations** on the WhatsApp calls page.

[Screenshot V028: Inbox conversation with the Call with AI agent panel open, a reason entered and the result message visible. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** The agent introduces itself as an AI assistant and ends politely if the customer asks not to be called. To call many customers use [AI call batches](#page-calls-ai-batches).

<a id="panel-ar-voice-agent-test"></a>

### V029. Test call from this browser

**Purpose:** Talk to the voice agent’s latest saved draft through your microphone, as a caller would, before publishing it. **Who can use it:** Users who may manage channels, inside the [voice agent window](#dialog-ar-voice-agent-dialog-1).

**Prerequisites:** A saved draft; AI calling allowed for the number; microphone permission in the browser; headphones are recommended.

**Step-by-step**

1. In the voice agent window expand **Test call from this browser** and click **Start test call**. Allow the microphone if asked.
2. Speak to begin. The agent greets you and the transcript appears as you talk.
3. Try the questions and requests your callers make. Searches use real data; bookings, saved details, tickets and messages stop at the read-back and the agent says what would have happened.
4. Click **End test call**.
5. Under **Recent tests**, open the test, read the transcript and click **Mark as passed** or **Mark as failed**.

[Screenshot V029: Voice agent window with the test call running and a live transcript, plus a passed test under Recent tests. Use approved sample data; obscure personal details, account secrets and private links.]

**Tips and common errors:** Tests use AI minutes and the same capacity as live calls; if all AI lines are busy, try again in a minute. Test transcripts are kept for 180 days. To test on a phone, publish the agent and use [Call with AI agent](#panel-ar-inbox-ai-call) on a conversation with your own WhatsApp number (it must have allowed calls).

<a id="troubleshooting"></a>

## Common troubleshooting

| What you see | What to check and do |
| --- | --- |
| Sign-in fails with a password you believe is correct | Check Workspace first, then username/email/phone and password. Host sign-in uses a blank workspace only for an authorised host account. |
| Account is temporarily locked | Wait for the configured lockout interval or ask your administrator to review the account. Do not keep submitting passwords. |
| Authentication code fails | Use a fresh code for the correct account, check the phone clock and use your saved recovery method if needed. Never send recovery codes to support. |
| Confirmation/reset email does not arrive | Check spam, the address on your profile and the correct workspace. Request a fresh link; contact your administrator if delivery is still failing. |
| Email link is expired or invalid | Request a new link and use the newest message in the same intended account flow. |
| Get started opens a later step | Review which earlier steps are marked complete. Choose an unfinished step on the rail. Email/mobile ownership must be verified through the actual check. |
| Signed out / session ended | Sign in again, then reopen the page. Copy any unsaved non-sensitive work before navigating away if possible. |
| Not allowed / menu item missing | Ask the administrator to review role permissions, plan feature and host-versus-workspace scope. A typed URL cannot grant access. |
| Create, edit or delete button is missing | Page viewing and individual actions may have separate permissions; the record’s current status may also restrict the action. |
| List is empty | Clear filters, check the selected period/customer/channel/workspace and confirm data has been added. An empty new workspace is normal. |
| Save button is disabled | Complete required fields, correct invalid dates/numbers and wait for a request already processing. Read the field-level hints. |
| Import has skipped/invalid rows | Check column order/mapping, file encoding, required identifiers, duplicates and number formats. Correct and recheck the affected rows before applying again. |
| Normal WhatsApp reply is blocked | Check the reply-window notice, customer consent, channel status and whether an approved template is required. |
| Copied host template cannot send | It is a workspace draft; submit it for your own WhatsApp account and wait for approval. |
| Template was rejected | Read the returned reason, correct content/category/variables/samples and resubmit. Do not keep resubmitting unchanged wording. |
| Channel or catalogue is not ready | Review connection/verification, the selected number, provider status and completed sync/publication. Saving locally is not publication. |
| Campaign or automation does not send | Check draft/active/paused status, channel health, audience eligibility, template approval, readiness errors and any applicable wallet/plan limit. |
| A payment looks pending | Check the gateway result and reference. If funds were deducted, ask the responsible team to reconcile before initiating another payment. |
| An invoice balance differs | Distinguish customer Sales invoices, Vendor bills and platform Billing invoices; compare the same period and verified receipts/credits. |
| Stock does not match the ERP | Confirm the chosen authoritative source, locations, units, source mappings and last successful sync. Avoid correcting both systems independently without a reconciliation plan. |
| Cannot hear or speak on a browser call | Check browser microphone permission, headset/system audio, network and provider/relay connection. Confirm audio in both directions using an authorised test. |
| AI voice cannot answer a product price | Check eligible active Products and successfully published catalogue entries for the correct workspace/channel. Give a clear part number. The pilot does not authorise guessed prices or customer discounts. |
| AI answering is disabled or silent | Ask the administrator to verify channel allowance, provider funding, calling/relay configuration and public audio connectivity. Saving the profile alone does not activate all dependencies. |
| AI agent didn’t book, raise or send what the caller asked | Open the call in AI conversations and check **What the agent did**. A refused action shows why: the action isn’t switched on, the acting user lacks permission, the caller didn’t confirm after the read-back, or (for messages) there is no WhatsApp conversation or approved follow-up template. |
| Call with AI agent or a batch says the call can’t be placed | Check that the customer allowed WhatsApp calls, hasn’t opted out, the time is 09:00–21:00 India time and the number has a published agent allowed to make AI calls. |
| An AI call batch shows everyone as Skipped | Those people have not allowed WhatsApp calls from your number (or have opted out). Ask them for call permission from the Inbox first; skipped people are not retried. |
| AI conversation shows no summary or values | After-call analysis must be switched on in the voice agent, and the platform’s analysis model must be set up. A call with no transcript can’t be analysed. |
| Test call doesn’t start | Allow the microphone, save the draft first, and check that AI calling is allowed for the number. If all AI lines are busy, try again in a minute. |
| AI answer is wrong or repetitive | Do not repeat an uncertain answer as fact. Verify the source, use human handoff and report the exact test question and approximate time through the approved support route. |
| Browser notifications do not appear | Check the page’s notification choice, browser site permission and operating-system notification/focus settings. |
| Export is not downloadable | Open My exports, refresh and wait for Ready. Recreate an expired/failed export from its report when appropriate. |
| Field notes remain unsynced | Restore connectivity, tap Sync and check success before clearing browser data or changing devices. |
| External connection returns an error | Restart the connection from its own page using the intended provider account; ask the administrator to review access and approved endpoint settings. |
| An external report/action has no acknowledgement | Inspect the returned status or reference; do not assume a visible action button proves delivery, publication, government filing or payment completion. |

### Information to provide when asking for help

1. The page name and the non-sensitive record reference.
2. The action you chose and the exact visible error message.
3. Approximate local time and whether the issue affects other users.
4. A screenshot with customer details, private links, account tokens, passwords, PINs, QR setup secrets and recovery codes hidden.
5. For a call: whether it rang, connected, had audio in both directions and ended normally. Do not include the customer’s number unless your approved support process requires it.

<a id="local-voice-lab"></a>

## Experimental local voice lab — separate from production

**Page:** `http://127.0.0.1:8091/` on the computer running the prototype. **Purpose:** Test a self-hosted speech pipeline and inspect its latency. **Who can use it:** An operator with access to that local computer and its microphone. This is not a production workspace screen, a live WhatsApp route or a confirmed INR 0.50/minute service.

**Prerequisites:** The local lab and model service must be running. Use synthetic or approved test speech. English uses a baseline US voice; Indian English quality is not established. The tested small Hindi model combination failed quality/latency acceptance.

1. Open the local lab address and wait for **Ready**.
2. Choose **English**, **हिन्दी** or **Detect language**.
3. Click **Record turn** and allow microphone access if intended.
4. Speak a short question, then click **Stop recording / playback**. Recording is bounded; it is not a continuous phone call.
5. Wait for **AI response ready** and listen to the returned audio. Use the playback controls to pause or replay.
6. Review the transcript, answer, language and timing results. A missing-price refusal is expected because this lab has no approved live product catalogue.
7. Stop playback with **Stop recording / playback** before another test. Report incorrect recognition, invented answers or repeated output.

**Tips and common errors:** HTTP success and audible playback do not prove the answer is correct. A capacity error means the local inference slot is occupied; retry after the current test finishes. This baseline does not support 100 simultaneous live calls, automatic interruption or a production calling session. The cost result remains unverified until actual WhatsApp charges and taxes are supplied and reconciled. Hosting is reported separately.

[Screenshot E001: Local voice cost lab with the language selector, Record turn, Stop recording / playback, response audio and timing result visible. Highlight the local-only status and unverified-cost result; use a synthetic question.]

<a id="glossary"></a>

## Glossary

| Term | Plain-language meaning |
| --- | --- |
| Workspace | Your company’s separated working area and its sign-in name |
| Host | Platform administration outside an ordinary customer workspace |
| Role / permission | The actions an account is allowed to perform |
| Channel | A connected communication route such as a particular WhatsApp number |
| Contact / account | A person / a company or related business entity |
| Audience / segment | Contacts selected by saved conditions for a particular purpose |
| Enquiry / pipeline / stage | A potential business requirement / its sales process / its current position |
| Quotation | A proposed customer price and terms; a draft and an issued quotation have different states |
| Sales order | A recorded customer purchase requirement accepted into the order process |
| Delivery challan | A record accompanying/recording the movement of goods |
| Invoice / outstanding | A bill / the amount still recorded as unpaid |
| SKU / part number | The code used to identify a product |
| HSN / GSTIN | Product-tax classification / business GST identification fields used by the relevant business process |
| GRN / QC | Goods receipt note / quality-control inspection |
| BOM / work order | The component recipe / the instruction to produce a quantity |
| AMC / installed base | Annual maintenance contract / the customer equipment you maintain |
| Lead time | Time expected between ordering and availability/delivery |
| Template | Provider-approved reusable message wording with permitted variables |
| Reply window | The provider’s permitted time/context for particular kinds of customer replies |
| Catalogue sync | Sending eligible product changes to the connected provider and checking their result |
| Automation / Flow / IVR | A configured journey / an interactive WhatsApp form / a telephone keypad menu |
| AI handoff | Stopping automatic handling and passing the conversation to a person or the configured next route |
| Two-step verification / recovery code | An additional sign-in check / a saved alternative for account recovery |
| SSO | Sign-in through your organisation’s identity provider |
| Webhook endpoint | An approved destination that receives selected system event notifications |
| UAT | A test payment environment that must be kept separate from live money collection |
| UTR / transaction reference | A payment identifier used to verify and reconcile a transaction |
| Export | A file prepared from a report or data list |
| Tenant | Another term for a workspace, sometimes used in administrator screens |
| Breadcrumb | The trail at the top of a page; it names the 360 screen or campaign you came from and takes you back |
| Playbook | A tested starting point for a voice agent (qualification, support, booking, reminders or collections) |
| Custom function | A web address of your own that a voice agent may call during a call to look something up or do something |
| Website call button | A button on your website that lets a visitor talk to your AI voice agent from the browser |
| Voice agent / published version | The AI that answers or places calls on a WhatsApp number / the saved version new calls use |
| Acting user | The staff member an AI voice agent acts as; their permissions decide what it may do |
| Read-back | The agent repeating the details of an action and waiting for the caller to agree before doing it |
| Variable | A `{{name}}`-style placeholder filled per call from the contact or a batch file |
| Calling window | The hours AI calls may be placed: within 09:00–21:00 India time |
| AI call batch | A list of people the voice agent calls on a schedule, with retries |
| After-call analysis | The summary, sentiment, goal result and values worked out from a call’s transcript |

## Screenshot production checklist

Use the screenshot register accompanying this manual. Capture the correct role, workspace, language and screen size. Use sample records and crop to the controls described. Highlight the action with a clear arrow/callout, include important validation or confirmation wording, and never expose credentials, customer identifiers or private links. Include empty/error-state captures where they help explain a common mistake. Replace a placeholder only after checking the image matches the current released UI.

## Document scope and maintenance

This edition was prepared from the application’s routes, page templates, navigation/access rules, shared UI components, localised English labels and confirmation workflows. It documents source-visible behavior; subscriptions, provider permissions, service configuration and future releases can change which actions are available. It does not certify that every external payment, message, voice call, ERP sync or statutory submission has been accepted in production. Edition 1.1 adds the AI voice agent features built on 27 October 2026 (actions during calls, knowledge and memory, outbound calls and batches, after-call analysis, AI conversations and test calls); these were checked by automated tests, not yet on live calls. Edition 1.2 (6 November 2026) covers the changes from 28 October to 6 November 2026: the regrouped menu, breadcrumbs and right-hand rail; windows turned into pages; accounts, sales, purchasing and quotation changes; task and meeting links and reminders; voice compliance, functions, tools, playbooks, the website call button and the AI impact report; the public ROI and industry pages; and host payment gateways. The website call button, playbooks and helpdesk/shop tools have not yet been tried on live calls, and e-way bill and IRN numbers are still generated inside MNI Assist.

When the application changes, review the relevant procedure, screenshot brief and coverage register together. Keep the manual free of live credentials and customer data.
