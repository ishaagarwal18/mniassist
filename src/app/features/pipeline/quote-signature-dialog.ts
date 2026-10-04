import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { TemplateService } from '../../core/services/template.service';

import {
  QuotationSignatureService,
  SignatureRequestDto,
  SignatureRequestStatus,
  SigningDeliveryDto,
} from '../../proxy/pipeline';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ChipTone } from '../../ui/chip';
import {
  SIGNATURE_STATUS_LABEL,
  apiMessage,
  mailtoShareLink,
  shareText,
  signingUrl,
  whatsappShareLink,
} from '../signing/signing-logic';

const TONE: Record<SignatureRequestStatus, ChipTone> = {
  [SignatureRequestStatus.Pending]: 'amber',
  [SignatureRequestStatus.Signed]: 'good',
  [SignatureRequestStatus.Declined]: 'bad',
  [SignatureRequestStatus.Expired]: 'warn',
  [SignatureRequestStatus.Voided]: 'neutral',
};

/**
 * Asking a customer to sign a quotation. Makes a link (shown once, since only its hash is kept), offers to send it by WhatsApp or
 * email from the person's own apps, and lists every request made on the quotation with where it stands.
 */
@Component({
  selector: 'ar-quote-signature-dialog',
  imports: [ArDialog, ArButton, ArChip, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog [title]="'Signature · ' + reference()" (dismiss)="closed.emit()">
      @if (canRequest()) {
        <p class="qs__note">
          Send the customer a link to read this quotation and sign it. Signing accepts it and marks
          it won. If you change the quotation afterwards, the link stops working.
        </p>

        <label class="ar-field">
          <span class="ar-field__label">Who signs</span>
          <input
            id="sig-name"
            class="ar-field__input"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
          />
        </label>
        <div class="ar-field-row">
          <label class="ar-field">
            <span class="ar-field__label"
              >WhatsApp number <span class="ar-field__opt">optional</span></span
            >
            <input
              id="sig-phone"
              class="ar-field__input"
              inputmode="tel"
              [value]="phone()"
              (input)="phone.set($any($event.target).value)"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Email <span class="ar-field__opt">optional</span></span>
            <input
              id="sig-email"
              class="ar-field__input"
              type="email"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
            />
          </label>
        </div>
        <label class="ar-field qs__narrow">
          <span class="ar-field__label">Link works for (days)</span>
          <input
            id="sig-days"
            class="ar-field__input"
            type="number"
            min="1"
            max="90"
            [value]="days()"
            (input)="days.set(+$any($event.target).value)"
          />
        </label>

        <fieldset class="qs__send">
          <legend class="ar-field__label">Send it for me</legend>
          <label class="qs__chk" for="sig-send-mail">
            <input
              id="sig-send-mail"
              type="checkbox"
              [checked]="sendMail()"
              (change)="sendMail.set($any($event.target).checked)"
            />
            <span>Email the link to the address above</span>
          </label>
          <label class="qs__chk" for="sig-send-wa">
            <input
              id="sig-send-wa"
              type="checkbox"
              [checked]="sendWa()"
              (change)="sendWa.set($any($event.target).checked)"
            />
            <span>Send on WhatsApp to the customer's number on file</span>
          </label>
          @if (sendWa()) {
            <label class="ar-field">
              <span class="ar-field__label"
                >Approved template
                <span class="ar-field__opt">3 variables: name, quote reference, link</span></span
              >
              <select
                id="sig-template"
                class="ar-field__input"
                [value]="templateId()"
                (change)="templateId.set($any($event.target).value)"
              >
                <option value="">Send as a plain message (only inside the 24-hour window)</option>
                @for (t of templateChoices(); track t.id) {
                  <option [value]="t.id" [selected]="t.id === templateId()">
                    {{ t.name }} · {{ t.language }}
                  </option>
                }
              </select>
            </label>
          }
          <label class="qs__chk" for="sig-code">
            <input
              id="sig-code"
              type="checkbox"
              [checked]="needCode()"
              (change)="needCode.set($any($event.target).checked)"
            />
            <span>Ask the signer for a one-time code we email them (needs an email address)</span>
          </label>
          <p class="qs__note">
            WhatsApp goes only to a customer who has agreed to be messaged, and outside the 24-hour
            window it needs an approved template. If something cannot be sent, you are told why and
            can still copy the link.
          </p>
        </fieldset>

        @if (delivery(); as d) {
          @if (sendMail()) {
            <p class="qs__res" [class.qs__res--bad]="!d.emailSent">
              {{
                d.emailSent
                  ? 'Emailed to ' + email() + '.'
                  : 'Email not sent: ' + (d.emailNote || 'unknown reason')
              }}
            </p>
          }
          @if (sendWa()) {
            <p class="qs__res" [class.qs__res--bad]="!d.whatsAppSent">
              {{
                d.whatsAppSent
                  ? 'Sent on WhatsApp.'
                  : 'WhatsApp not sent: ' + (d.whatsAppNote || 'unknown reason')
              }}
            </p>
          }
        }

        @if (link(); as url) {
          <div class="qs__link">
            <p class="qs__note">
              <strong>The link.</strong> It is shown once. Copy it now, or send it from here.
            </p>
            <input
              class="ar-field__input ar-mono"
              readonly
              [value]="url"
              (focus)="$any($event.target).select()"
            />
            <div class="qs__row">
              <button ar-button type="button" variant="ghost" (click)="copy(url)">
                {{ copied() ? 'Copied' : 'Copy link' }}
              </button>
              @if (whatsapp(); as href) {
                <button ar-button type="button" variant="ghost" (click)="share(href)">
                  Send on WhatsApp
                </button>
              }
              @if (mail(); as href) {
                <button ar-button type="button" variant="ghost" (click)="share(href)">
                  Send by email
                </button>
              }
            </div>
          </div>
        }
      } @else {
        <p class="qs__note">
          {{ cannotRequestReason() }}
        </p>
      }

      @if (error(); as msg) {
        <p class="qs__err">{{ msg }}</p>
      }

      @if (history().length) {
        <h3 class="qs__h">Requests on this quotation</h3>
        <ul class="qs__list">
          @for (r of history(); track r.id) {
            <li class="qs__item">
              <div class="qs__item-main">
                <ar-chip [tone]="tone(r.status)">{{ label(r.status) }}</ar-chip>
                <span>{{ r.signerName }}</span>
                <span class="qs__sub">rev {{ r.revisionNumber }} · {{ when(r.creationTime) }}</span>
              </div>
              <p class="qs__sub">
                @switch (r.status) {
                  @case (Status.Signed) {
                    Signed by {{ r.signedName }} on {{ when(r.signedAtUtc)
                    }}{{ r.hasDrawnSignature ? ', with a drawn signature' : '' }}.
                  }
                  @case (Status.Declined) {
                    Declined {{ when(r.declinedAtUtc)
                    }}{{ r.declineReason ? ': ' + r.declineReason : '.' }}
                  }
                  @case (Status.Pending) {
                    {{
                      r.viewedAtUtc ? 'Opened ' + when(r.viewedAtUtc) + '. ' : 'Not opened yet. '
                    }}Link works until {{ when(r.expiresAtUtc) }}.
                  }
                  @case (Status.Voided) {
                    Withdrawn, or the quotation changed after it was sent.
                  }
                  @default {
                    The link ran out on {{ when(r.expiresAtUtc) }}.
                  }
                }
              </p>
              @if (r.status === Status.Pending) {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy()"
                  (click)="withdraw(r)"
                >
                  Withdraw
                </button>
              }
            </li>
          }
        </ul>
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">Close</button>
        @if (canRequest()) {
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !name().trim()"
            (click)="request()"
          >
            {{ busy() ? 'Working…' : link() ? 'Make a new link' : 'Create link' }}
          </button>
        }
      </div>
    </ar-dialog>
  `,
  styles: `
    .qs__note {
      margin: 0 0 10px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .qs__narrow {
      max-width: 180px;
    }
    .qs__send {
      margin: 12px 0 0;
      padding: 10px 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .qs__chk {
      display: flex;
      align-items: center;
      gap: 8px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .qs__res {
      margin: 8px 0 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
    .qs__res--bad {
      color: var(--ar-red-600);
    }
    .qs__err {
      margin: 8px 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
    .qs__link {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 12px 0;
      padding: 12px;
      background: var(--ar-bg-100);
      border-radius: var(--ar-radius-control);
    }
    .qs__link .qs__note {
      margin: 0;
    }
    .qs__row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .qs__h {
      margin: 16px 0 6px;
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .qs__list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .qs__item {
      padding: 10px 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
    }
    .qs__item-main {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .qs__sub {
      margin: 4px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .qs__item-main .qs__sub {
      margin: 0;
    }
  `,
})
export class ArQuoteSignatureDialog implements OnInit {
  private readonly api = inject(QuotationSignatureService);
  private readonly templates = inject(TemplateService);

  readonly quotationId = input.required<string>();
  readonly reference = input.required<string>();
  /** The quotation is issued or revised: the only states a customer can sign in. */
  readonly open = input(true);
  /** A name to start the form with, when the customer is known. */
  readonly signerName = input('');
  readonly closed = output<void>();

  protected readonly Status = SignatureRequestStatus;

  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly days = signal(14);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly history = signal<SignatureRequestDto[]>([]);
  protected readonly link = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly sendMail = signal(false);
  protected readonly sendWa = signal(false);
  protected readonly needCode = signal(false);
  protected readonly templateId = signal('');
  protected readonly delivery = signal<SigningDeliveryDto | null>(null);
  /** Only approved templates with the three variables the message fills in. */
  protected readonly templateChoices = computed(() =>
    this.templates.all().filter((t) => t.status === 'approved' && t.variableCount === 3),
  );

  protected readonly canRequest = computed(() => this.open());
  protected readonly cannotRequestReason = computed(() =>
    this.history().some((r) => r.status === SignatureRequestStatus.Signed)
      ? 'This quotation has been signed.'
      : 'Only an issued quotation can be sent for signature. Issue it first.',
  );

  private readonly text = computed(() => {
    const url = this.link();
    return url ? shareText(this.reference(), this.name().trim() || 'there', url) : '';
  });
  protected readonly whatsapp = computed(() =>
    this.link() ? whatsappShareLink(this.phone(), this.text()) : null,
  );
  protected readonly mail = computed(() =>
    this.link()
      ? mailtoShareLink(
          this.email(),
          `Quotation ${this.reference()} for your signature`,
          this.text(),
        )
      : null,
  );

  async ngOnInit(): Promise<void> {
    this.name.set(this.signerName());
    await this.loadHistory();
  }

  private async loadHistory(): Promise<void> {
    try {
      this.history.set(await firstValueFrom(this.api.getForQuotation(this.quotationId())));
    } catch {
      this.history.set([]);
    }
  }

  protected tone(s: SignatureRequestStatus | undefined): ChipTone {
    return TONE[s ?? SignatureRequestStatus.Pending];
  }
  protected label(s: SignatureRequestStatus | undefined): string {
    return SIGNATURE_STATUS_LABEL[s ?? SignatureRequestStatus.Pending];
  }
  protected when(iso: string | null | undefined): string {
    return iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
  }

  protected async request(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.copied.set(false);
    this.delivery.set(null);
    try {
      const made = await firstValueFrom(
        this.api.request(this.quotationId(), {
          signerName: this.name().trim(),
          signerPhone: this.phone().trim() || null,
          signerEmail: this.email().trim() || null,
          validForDays: Math.min(90, Math.max(1, Math.round(this.days()) || 14)),
          sendByEmail: this.sendMail(),
          sendByWhatsApp: this.sendWa(),
          whatsAppTemplateId: this.sendWa() && this.templateId() ? this.templateId() : null,
          requireVerificationCode: this.needCode(),
        }),
      );
      this.delivery.set(made.delivery ?? null);
      this.link.set(made.signingPath ? signingUrl(window.location.origin, made.signingPath) : null);
      await this.loadHistory();
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'The signing link could not be made.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async withdraw(r: SignatureRequestDto): Promise<void> {
    if (!r.id || !window.confirm('Withdraw this request? Its link will stop working.')) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.void(r.id));
      this.link.set(null);
      await this.loadHistory();
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'The request could not be withdrawn.'));
    } finally {
      this.busy.set(false);
    }
  }

  /** Opens the person's own WhatsApp or mail app with the message ready. Nothing is sent from here. */
  protected share(href: string): void {
    if (href.startsWith('mailto:')) window.location.href = href;
    else window.open(href, '_blank', 'noopener');
  }

  protected async copy(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
    } catch {
      this.error.set('Copying was blocked by the browser. Select the link and copy it.');
    }
  }
}
