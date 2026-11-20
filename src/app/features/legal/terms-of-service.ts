import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArBrand } from '../../layout/brand';

/**
 * Public terms of service — no auth guard, linked from sign-up, sign-in, the
 * front page and the public footer. Needed before taking paid customers and
 * for Meta App Review (which asks for a terms URL next to the privacy URL).
 *
 * This is a working draft written from how the product actually behaves
 * (prepaid wallet, plans, consent rules, channel rules). It has not had a
 * legal read-through: get one before relying on it.
 */
@Component({
  selector: 'ar-terms-of-service',
  imports: [RouterLink, ArBrand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './terms-of-service.scss',
  template: `
    <div class="tos">
      <header class="tos__head">
        <ar-brand />
        <a class="tos__back" routerLink="/">← Back to home</a>
      </header>

      <main class="tos__doc">
        <h1>Terms of Service</h1>
        <p class="tos__meta">
          Last updated: <strong>20 November 2026</strong> · These terms are an agreement between
          you and <strong>Emnisoft Pvt Ltd</strong> ("MNI Assist", "we", "us"), the operator of the
          MNI Assist platform.
        </p>

        <h2>1. Who these terms apply to</h2>
        <p>
          These terms apply to the business that signs up for a MNI Assist workspace (the
          "customer", "you") and to every team member the customer invites. By creating a workspace
          or using the platform, you accept these terms on behalf of your business, and you confirm
          you are authorised to do so. Our <a routerLink="/privacy">Privacy Policy</a> explains how
          personal data is handled and forms part of these terms.
        </p>

        <h2>2. The service</h2>
        <p>
          MNI Assist lets your business reach and serve its own customers over WhatsApp, SMS,
          email, voice calls, Instagram and Messenger, and manage the related sales, purchasing,
          service and billing work. Features available to you depend on the plan you choose. We may
          improve or change features over time; we will not remove a core feature of a paid plan
          during a paid period without telling you first.
        </p>

        <h2>3. Your account</h2>
        <ul>
          <li>Keep sign-in details private and turn on two-step sign-in for administrators.</li>
          <li>You are responsible for what your team members do in your workspace.</li>
          <li>
            Give accurate business details (legal name, GST number where applicable). We may ask
            you to verify them.
          </li>
          <li>Tell us promptly at admin&#64;mnisoft.com if you suspect unauthorised access.</li>
        </ul>

        <h2>4. Plans, wallet and payment</h2>
        <ul>
          <li>
            Plan fees are charged in advance for each billing period and are shown, with GST,
            before you pay.
          </li>
          <li>
            Messages, calls and other usage-based items are paid from your prepaid wallet at the
            rates shown in the app. Channel charges set by Meta, telecom operators and other
            providers pass through to you and can change when those providers change them.
          </li>
          <li>
            Wallet balance is not interest-bearing and is not refundable in cash, except where the
            law requires or we close your workspace without cause (see §9).
          </li>
          <li>
            If a payment fails or the wallet runs out, sending may pause until you top up. A free
            trial ends on the date shown in the app.
          </li>
        </ul>

        <h2>5. Consent and messaging rules</h2>
        <p>You are the sender of every message you send through the platform. You agree to:</p>
        <ul>
          <li>
            Message only people who have agreed to hear from you, keep a record of that consent,
            and honour every opt-out straight away. The platform records consent and opt-outs to
            help you, but obtaining consent is your responsibility.
          </li>
          <li>
            Follow the rules of each channel: the WhatsApp Business and Commerce Policies, TRAI's
            DLT rules for SMS and calls (registered headers and templates, no calls to numbers on
            the do-not-disturb register for promotions), and the rules of email providers.
          </li>
          <li>
            Tell people when a call is recorded or answered by an AI agent, as the call settings in
            the app let you do.
          </li>
          <li>Act as the data fiduciary for your contacts under the DPDP Act, 2023.</li>
        </ul>

        <h2>6. What you may not do</h2>
        <ul>
          <li>Send spam, misleading messages, or anything illegal, abusive or fraudulent.</li>
          <li>Upload malware or content you have no right to use.</li>
          <li>
            Try to get into another customer's workspace, probe or overload the platform, or get
            around usage limits or security controls.
          </li>
          <li>Resell the platform unless you have a signed reseller agreement with us.</li>
        </ul>
        <p>
          If a channel provider (for example Meta or an operator) restricts your number or sender
          because of how it was used, we cannot reverse that decision for you.
        </p>

        <h2>7. Your data</h2>
        <p>
          Your contacts, messages, documents and records belong to you. We use them only to run the
          service for you, as the Privacy Policy describes. You can export your data from the app
          at any time. After your workspace closes, we keep data for the retention periods in the
          Privacy Policy and then delete it.
        </p>

        <h2>8. AI features</h2>
        <p>
          Some features draft replies, summarise conversations or answer calls using AI. AI output
          can be wrong. Review what matters before you rely on it, especially prices, legal or
          safety information.
        </p>

        <h2>9. Suspension and closing</h2>
        <ul>
          <li>You can close your workspace at any time from Settings or by writing to us.</li>
          <li>
            We may pause sending or suspend a workspace that breaks §5 or §6, puts the platform or
            other customers at risk, or is unpaid. Where we can, we will warn you first and give
            you a chance to fix the problem.
          </li>
          <li>
            If we close your workspace without cause, we refund the unused wallet balance and any
            plan fee paid for the remaining period.
          </li>
        </ul>

        <h2>10. Availability and support</h2>
        <p>
          We work to keep the platform available all the time and publish its state on the
          <a routerLink="/status">system status</a> page. Planned maintenance is announced in
          advance where possible. The platform depends on channel providers we do not control, so
          we cannot promise that every message is delivered.
        </p>

        <h2>11. Liability</h2>
        <p>
          The platform is provided as it is. To the extent the law allows, we are not liable for
          indirect or consequential loss, such as lost profit or lost business, and our total
          liability for any claim is limited to the fees you paid us in the 12 months before the
          claim. Nothing in these terms limits liability that cannot be limited by law.
        </p>
        <p>
          You will cover our losses from claims made against us because of messages you sent or
          your breach of §5 or §6.
        </p>

        <h2>12. Changes to these terms</h2>
        <p>
          We will update the date at the top of this page when these terms change, and tell
          workspace administrators about a material change at least 15 days before it takes effect.
          Continuing to use the platform after that means you accept the new terms.
        </p>

        <h2>13. Law and disputes</h2>
        <p>
          These terms are governed by the laws of India. Courts in Ahmedabad, Gujarat have
          exclusive jurisdiction over any dispute. Please write to us first, so we can try to
          settle it.
        </p>

        <h2>14. Contact us</h2>
        <p class="tos__callout">
          <strong>Emnisoft Pvt Ltd</strong><br />
          Email: <strong>admin&#64;mnisoft.com</strong><br />
          Post: 708, 7th Floor, Arved Transcube Plaza, 132 Ft Ring Road, Opp. Ranip BRTS, Ranip,
          Ahmedabad, Gujarat 382480, India
        </p>
      </main>
    </div>
  `,
})
export class ArTermsOfService {}
