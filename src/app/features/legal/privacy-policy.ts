import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArBrand } from '../../layout/brand';

/**
 * Public privacy policy — no auth guard, reachable by Meta's App Review team
 * and by anyone before they ever sign up. Required for WhatsApp Business
 * Platform App Review (go-live tracker a2) and DPDP Act, 2023 §5 (a privacy
 * notice with the data-principal rights, retention and grievance-officer
 * disclosures §5(1) requires).
 *
 * Every factual claim below (data classes, retention days, sub-processors,
 * rights and their 30-day SLA) is taken from the actual domain model —
 * `RetentionPolicy.DefaultDaysFor`, `DataRequestKind`, `ConsentSource` — not
 * invented, so this page does not silently drift from what the product
 * actually does. Contact emails point at mniassist.com (the product domain;
 * confirmed available via registry RDAP — see the go-live tracker's a1/a2
 * notes). What this page still cannot supply on its own: the registered
 * business address and the Grievance Officer's actual name, plus a legal
 * read-through — those are marked `[...]` below and are not optional before
 * this goes live for real; a privacy notice that promises a grievance
 * process with no named officer still fails DPDP §5 on its own terms even
 * with a working email address.
 */
@Component({
  selector: 'ar-privacy-policy',
  imports: [RouterLink, ArBrand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pp">
      <header class="pp__head">
        <ar-brand />
        <a class="pp__back" routerLink="/">← Back to home</a>
      </header>

      <main class="pp__doc">
        <h1>Privacy Policy</h1>
        <p class="pp__meta">
          Last updated: <strong>[15 10 2026]</strong> · Applies to the MNI Assist platform operated
          by <strong>Emnisoft Pvt Ltd</strong> ("MNI Assist", "we", "us").
        </p>

        <p>
          MNI Assist is a WhatsApp, SMS, Email, Instagram and Messenger marketing platform built for
          industrial automation businesses in India to reach their own customers. This policy
          explains what personal data we process when a business (a "tenant") uses MNI Assist to
          message <em>its</em> customers ("contacts"), and what data we collect about the tenant's
          own team members who use the product.
        </p>

        <h2>1. What we collect</h2>
        <table class="pp__table">
          <thead>
            <tr>
              <th>Category</th>
              <th>What</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Contact identity</td>
              <td>
                Phone number (WhatsApp/SMS/Voice), email address, Instagram/Messenger identifier,
                display name
              </td>
              <td>
                Entered by the tenant, imported by the tenant, or supplied by the contact when they
                message the tenant first
              </td>
            </tr>
            <tr>
              <td>Message content</td>
              <td>
                The text, media and template content of messages sent and received through the
                platform
              </td>
              <td>The tenant and its contacts, in the course of using the product</td>
            </tr>
            <tr>
              <td>Consent records</td>
              <td>When and how a contact consented to be messaged, and any withdrawal</td>
              <td>
                The tenant's own capture flow (a form, a WhatsApp opt-in, an import, a QR code) or
                an inbound message
              </td>
            </tr>
            <tr>
              <td>Account &amp; billing</td>
              <td>
                Team member names, emails, roles; wallet balance and invoices; GST details where
                applicable
              </td>
              <td>The tenant, at signup and during use</td>
            </tr>
            <tr>
              <td>Technical &amp; usage data</td>
              <td>
                IP address at the point of a consent event; delivery/read status of messages; login
                activity
              </td>
              <td>Automatically, as part of operating the service</td>
            </tr>
          </tbody>
        </table>

        <h2>2. Why we process it</h2>
        <ul>
          <li>
            To deliver the messages a tenant sends through the platform, and to receive replies on
            the tenant's behalf.
          </li>
          <li>
            To maintain the consent and opt-out record every messaging channel we support legally
            requires (WhatsApp, TRAI's DLT regime for SMS, CAN-SPAM-equivalent practice for email).
          </li>
          <li>
            To operate billing, support and fraud/abuse prevention for the tenant's own account.
          </li>
          <li>
            To meet our own legal obligations — tax records, and responding to a lawful request from
            a regulator or court.
          </li>
        </ul>
        <p>
          We do not sell contact data, and we do not use one tenant's contacts or message content to
          build profiles used for any other tenant, or for advertising.
        </p>

        <h2>3. Who we share it with</h2>
        <p>
          Delivering a message means the channel it travels over necessarily sees it. The
          sub-processors below are the platforms and vendors a tenant's data passes through, each
          acting under its own terms with us:
        </p>
        <ul>
          <li>
            <strong>Meta Platforms, Inc.</strong> — WhatsApp Cloud API, Instagram and Messenger
            sends and receives.
          </li>
          <li><strong>MSG91</strong> — SMS delivery.</li>
          <li><strong>Exotel</strong> — voice calling and IVR.</li>
          <li>
            <strong>Razorpay / PayU</strong> — payment processing for wallet top-ups and
            subscription billing.
          </li>
          <li>
            <strong>Amazon Web Services (AWS)</strong> — production cloud hosting, including
            database, cache, message queues, secret storage and file storage, in the Asia Pacific
            (Mumbai) region in India.
          </li>
        </ul>
        <p>
          Some of these are based outside India (Meta Platforms, Inc.). Where personal data
          transfers outside India as a result, it is limited to what is needed to deliver the
          message through that channel.
        </p>

        <h2>4. How long we keep it</h2>
        <p>
          These are the platform's own configured defaults; a tenant's administrator can shorten
          most of them:
        </p>
        <ul>
          <li>Conversation history (messages): <strong>2 years</strong></li>
          <li>Media attachments: <strong>1 year</strong></li>
          <li>
            Raw inbound webhook payloads (a short-lived diagnostic copy): <strong>30 days</strong>
          </li>
          <li>
            Data exports generated on request: <strong>30 days</strong>, then automatically deleted
          </li>
          <li>
            Consent records and audit logs: <strong>7 years</strong> — kept longer deliberately,
            since this is the evidence a consent was ever given or withdrawn
          </li>
        </ul>

        <h2>5. Your rights</h2>
        <p>
          If you are a contact a tenant has messaged, or a member of a tenant's team, you can ask
          the tenant (as the party responsible for your data — see §7) to:
        </p>
        <ul>
          <li><strong>Access</strong> a copy of the personal data held about you.</li>
          <li><strong>Correct</strong> inaccurate personal data.</li>
          <li>
            <strong>Erase</strong> your personal data, subject to what we must keep for legal/tax
            reasons.
          </li>
          <li>
            <strong>Withdraw consent</strong> to marketing messages at any time — every marketing
            message includes a way to opt out.
          </li>
        </ul>
        <p>
          Every request like this is logged and answered within <strong>30 days</strong>. To ask a
          tenant to action one of these on MNI Assist's infrastructure, contact us directly (below)
          and we will route it to the responsible tenant and confirm once it is done.
        </p>

        <h2>6. Security</h2>
        <p>
          Tenant data is isolated per workspace at the database level. Access-control tokens and
          channel credentials are stored in an encrypted secret store, never alongside ordinary
          data. Administrative access to the platform is role-permissioned and logged. No security
          measure is perfect; see §8 for how to report a concern.
        </p>

        <h2>7. Who is responsible for your data</h2>
        <p>
          If you received a message through MNI Assist, the business that messaged you (the
          "tenant") is who asked for your consent and is responsible for deciding what to send you —
          they are the data fiduciary under India's Digital Personal Data Protection Act, 2023. MNI
          Assist (Emnisoft Pvt Ltd) processes that data on the tenant's instructions, as its data
          processor / significant processing platform.
        </p>

        <h2>8. Grievance officer &amp; complaints</h2>
        <p>
          Under the DPDP Act, 2023, you can raise a complaint about how your personal data is
          handled with our Grievance Officer:
        </p>
        <p class="pp__callout">
          <strong>Pushpendra Kumar Sikarwar</strong><br />
          Email: <strong>admin&#64;mnisoft.com</strong><br />
          Address:
          <strong
            >708, 7th Floor, Arved Transcube Plaza, 132 Ft Ring Road, Opp. Ranip BRTS, Ranip,
            Ahmedabad, Gujarat 382480, India</strong
          >
        </p>
        <p>
          We aim to resolve every complaint within 30 days. If you are not satisfied with our
          response, you may escalate it to the <strong>Data Protection Board of India</strong>.
        </p>

        <h2>9. Children</h2>
        <p>
          MNI Assist is a business-to-business messaging tool. It is not directed at children, and
          we do not knowingly process the personal data of anyone under 18 as a contact in their own
          right.
        </p>

        <h2>10. Changes to this policy</h2>
        <p>
          We will update the date at the top of this page when this policy changes, and for a
          material change, tell tenant administrators directly.
        </p>

        <h2>11. Contact us</h2>
        <p>
          Email: <strong>privacy&#64;mnisoft.com</strong><br />
          Post:
          <strong
            >708, 7th Floor, Arved Transcube Plaza, 132 Ft Ring Road, Opp. Ranip BRTS, Ranip,
            Ahmedabad, Gujarat 382480, India</strong
          >
        </p>
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background: var(--ar-bg-50);
    }
    .pp {
      max-width: 760px;
      margin: 0 auto;
      padding: 24px 20px 80px;
    }
    .pp__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
    }
    .pp__back {
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-teal-600);
      text-decoration: none;
    }
    .pp__doc {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 32px 36px 40px;
      font: 400 14px/1.65 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .pp__doc h1 {
      font: 700 24px var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0 0 6px;
    }
    .pp__doc h2 {
      font: 600 16px var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 30px 0 10px;
    }
    .pp__meta {
      color: var(--ar-ink-400);
      font-size: 13px;
      margin: 0 0 24px;
    }
    .pp__doc ul {
      margin: 0 0 12px;
      padding-left: 20px;
    }
    .pp__doc li {
      margin-bottom: 6px;
    }
    .pp__table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 20px;
      font-size: 13.5px;
    }
    .pp__table th,
    .pp__table td {
      text-align: left;
      padding: 8px 10px;
      border: 1px solid var(--ar-line-200);
      vertical-align: top;
    }
    .pp__table th {
      background: var(--ar-bg-100);
      font-weight: 600;
    }
    .pp__callout {
      background: var(--ar-bg-100);
      border-radius: var(--ar-radius-control);
      padding: 12px 16px;
      margin: 12px 0 20px;
    }
  `,
})
export class ArPrivacyPolicy {}
