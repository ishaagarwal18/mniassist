import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ChannelService } from '../../core/services/channel.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { pathOf } from '../../layout/cockpit-origin.logic';
import { ArTopbar } from '../../layout/topbar';
import { ContactService } from '../../proxy/contacts/contact.service';
import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { TemplateService } from '../../proxy/messaging/template.service';
import {
  CustomerCommunicationService,
  CustomerDocumentInput,
} from '../../proxy/sales/customer-communication.service';
import { DeliveryChallanService } from '../../proxy/sales/delivery-challan.service';
import { SalesInvoiceService } from '../../proxy/sales/sales-invoice.service';
import { SalesOrderService } from '../../proxy/sales/sales-order.service';
import { SmsChannelService, SmsTemplateStatus } from '../../proxy/sms/sms-channel.service';
import { ArButton } from '../../ui/button';

/** One of the customer's sales documents, as the picker shows it. */
type DocumentChoice = CustomerDocumentInput & {
  key: string;
  /** "Invoice", "Payment receipt", … */
  type: string;
  number: string;
  date: string;
  amountInPaise?: number;
  /** Set when a colleague on the same account is the buyer. */
  buyer?: string;
};

const DOC_ORDER = ['Invoice', 'Payment receipt', 'Sales order', 'Delivery challan'];
type MessageTemplate = { id: string; name: string; text: string; variables: string[] };

/**
 * Message one customer (/contacts/:id/message): WhatsApp from one of the workspace's numbers, email or SMS, with an approved
 * template or free text, and optionally one of their own sales documents as a secure link. Opened from Customer 360, whose
 * breadcrumb it keeps ("Customer 360 · <name> › Message customer") and where it returns once sent. Sent through the platform,
 * so it is logged in the inbox and the customer's timeline and respects their consent.
 */
@Component({
  selector: 'ar-customer-message',
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, ArTopbar, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Message customer"
      [subtitle]="name()"
      help="Sends from your workspace's WhatsApp number, email or SMS, so the message is logged in the inbox and on the customer's timeline. Outside WhatsApp's 24-hour window only an approved template can be sent."
    />

    <div class="msg ar-scroll">
      @if (loading()) {
        <p role="status">Loading…</p>
      } @else if (!contactId()) {
        <p role="alert">This customer could not be found.</p>
      } @else {
        <form class="msg__card" (submit)="$event.preventDefault(); send()">
          <p class="msg__to">
            To <strong translate="no">{{ name() }}</strong>
            <span translate="no">{{
              channel === 1 ? email() || 'no email address' : phone()
            }}</span>
          </p>
          @if (error()) {
            <p class="msg__error" role="alert">{{ error() }}</p>
          }
          <label class="ar-field"
            ><span class="ar-field__label">Send via</span>
            <select
              class="ar-field__input"
              name="channel"
              [ngModel]="channel"
              (ngModelChange)="setChannel($event)"
              [disabled]="busy()"
            >
              <option [ngValue]="0">WhatsApp</option>
              @if (canChannels()) {
                <option [ngValue]="1">Email</option>
                <option [ngValue]="2">SMS</option>
              }
            </select>
          </label>
          @if (channel === 0) {
            <label class="ar-field"
              ><span class="ar-field__label">WhatsApp number</span>
              <select
                class="ar-field__input"
                name="channelId"
                [ngModel]="channelId"
                (ngModelChange)="chooseChannel($event)"
                [disabled]="busy()"
              >
                @for (c of channels(); track c.id) {
                  <option [value]="c.id" translate="no">
                    {{ c.displayName }} · {{ c.displayPhone }}
                  </option>
                }
              </select>
            </label>
          }
          @if (channel !== 1) {
            <label class="ar-field"
              ><span class="ar-field__label">Approved template</span>
              <select
                class="ar-field__input"
                name="templateId"
                [ngModel]="templateId"
                (ngModelChange)="chooseTemplate($event)"
                [disabled]="busy() || templatesLoading()"
              >
                @if (channel === 0) {
                  <option value="">Free text (open WhatsApp conversation only)</option>
                } @else {
                  <option value="">Choose an approved SMS template</option>
                }
                @for (t of templates(); track t.id) {
                  <option [value]="t.id" translate="no">{{ t.name }}</option>
                }
              </select>
            </label>
            @if (selectedTemplate(); as t) {
              <p class="msg__preview" translate="no">{{ t.text }}</p>
              @for (key of t.variables; track key) {
                <label class="ar-field"
                  ><span class="ar-field__label"
                    >Variable <span translate="no">{{ key }}</span></span
                  >
                  <input
                    class="ar-field__input"
                    [name]="'var-' + key"
                    [(ngModel)]="variables[key]"
                    [disabled]="busy() || (!!docKey() && documentVariable === key)"
                    translate="no"
                  />
                </label>
              }
            }
          }
          @if (channel === 1) {
            <label class="ar-field"
              ><span class="ar-field__label">Subject</span
              ><input
                class="ar-field__input"
                name="subject"
                maxlength="998"
                [(ngModel)]="subject"
                [disabled]="busy()"
                translate="no"
            /></label>
          }
          @if (channel === 1 || (channel === 0 && !templateId)) {
            <label class="ar-field"
              ><span class="ar-field__label">Message</span
              ><textarea
                class="ar-field__input"
                name="text"
                rows="6"
                maxlength="4096"
                [(ngModel)]="text"
                [disabled]="busy()"
                translate="no"
              ></textarea>
            </label>
          }
          @if (channel !== 2) {
            <!-- Attach one sales document (not on SMS) -->
            <fieldset class="docs" [disabled]="busy()">
              <legend class="ar-field__label">
                Attach a sales document <span class="ar-field__opt">optional</span>
              </legend>
              @if (selectedDoc(); as d) {
                <div class="docs__chosen">
                  <span class="docs__type">{{ d.type }}</span>
                  <strong translate="no">{{ d.number }}</strong>
                  <span class="docs__meta">{{ d.date | date: 'dd MMM yyyy' }}</span>
                  @if (d.amountInPaise != null) {
                    <span class="docs__meta">₹{{ d.amountInPaise / 100 | number: '1.2-2' }}</span>
                  }
                  <span class="msg__spacer"></span>
                  <button ar-button type="button" variant="ghost" (click)="previewDocument()">
                    Preview
                  </button>
                  <button ar-button type="button" variant="ghost" (click)="docKey.set('')">
                    Remove
                  </button>
                </div>
                <p class="docs__how">{{ deliveryHint() }}</p>
                @if (channel === 0 && templateId) {
                  <label class="ar-field"
                    ><span class="ar-field__label">Put the document link in</span>
                    <select
                      class="ar-field__input"
                      name="documentVariable"
                      [(ngModel)]="documentVariable"
                    >
                      <option value="">Choose a template variable</option>
                      @for (key of selectedTemplate()?.variables ?? []; track key) {
                        <option [value]="key" translate="no">Variable {{ key }}</option>
                      }
                    </select>
                  </label>
                }
              } @else if (documentsLoading()) {
                <p class="docs__empty">Loading documents…</p>
              } @else if (documents().length === 0) {
                <p class="docs__empty">
                  No orders, challans, invoices or payment receipts for
                  <strong translate="no">{{ documentsOwner() }}</strong> yet.
                  @if (accountId()) {
                    <a [routerLink]="['/contacts/accounts', accountId(), '360']"
                      >Raise one on the account</a
                    >.
                  } @else {
                    They are raised on a company account:
                    <a [routerLink]="['/contacts', contactId(), 'edit']">link this contact to one</a
                    >.
                  }
                </p>
              } @else {
                <input
                  class="ar-field__input"
                  type="search"
                  name="docQuery"
                  placeholder="Search by number"
                  [ngModel]="docQuery()"
                  (ngModelChange)="docQuery.set($event)"
                />
                <div class="docs__list" aria-label="Sales documents">
                  @for (group of docGroups(); track group.type) {
                    <p class="docs__group">{{ group.type }}s</p>
                    @for (d of group.items; track d.key) {
                      <button type="button" class="docs__row" (click)="pickDocument(d.key)">
                        <strong translate="no">{{ d.number }}</strong>
                        <span class="docs__meta">{{ d.date | date: 'dd MMM yyyy' }}</span>
                        @if (d.amountInPaise != null) {
                          <span class="docs__meta"
                            >₹{{ d.amountInPaise / 100 | number: '1.2-2' }}</span
                          >
                        }
                        @if (d.buyer) {
                          <span class="docs__meta" translate="no">· {{ d.buyer }}</span>
                        }
                      </button>
                    }
                  } @empty {
                    <p class="docs__empty">Nothing matches “{{ docQuery() }}”.</p>
                  }
                </div>
              }
            </fieldset>
          }
          <div class="msg__actions">
            <span class="msg__spacer"></span>
            <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="back()">
              Cancel
            </button>
            <button
              ar-button
              type="submit"
              variant="primary"
              [disabled]="busy() || documentsLoading() || templatesLoading() || !canReply()"
            >
              {{ busy() ? 'Sending…' : 'Send message' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: `
    .msg {
      padding: 1.25rem 1.5rem 2rem;
    }
    .msg__card {
      max-width: 720px;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 1.25rem 1.5rem;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
    }
    .msg__card p {
      margin: 0;
    }
    .msg__to {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: baseline;
      font-size: 0.9rem;
      color: var(--ar-ink-700);
    }
    .msg__error {
      color: var(--ar-red-600, #b91c1c);
    }
    .msg__preview {
      white-space: pre-wrap;
      padding: 12px;
      background: var(--ar-bg-50);
      border-radius: 6px;
    }
    .msg__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .msg__spacer {
      flex: 1;
    }
    .docs {
      margin: 0;
      padding: 0;
      border: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .docs__chosen {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--ar-blue-600);
      border-radius: 8px;
      background: var(--ar-blue-100);
    }
    .docs__type,
    .docs__group {
      font: 700 0.7rem var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .docs__group {
      margin: 0.4rem 0 0;
    }
    .docs__meta {
      font-size: 0.8rem;
      color: var(--ar-ink-500);
    }
    .docs__how,
    .docs__empty {
      font-size: 0.82rem;
      color: var(--ar-ink-500);
    }
    .docs__list {
      max-height: 18rem;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 0.25rem 0.5rem 0.5rem;
    }
    .docs__row {
      display: flex;
      gap: 0.6rem;
      align-items: baseline;
      padding: 0.4rem 0.5rem;
      border: 0;
      border-radius: 6px;
      background: none;
      text-align: left;
      cursor: pointer;
      font: inherit;
      color: var(--ar-ink-900);
    }
    .docs__row:hover,
    .docs__row:focus-visible {
      background: var(--ar-blue-100);
      outline: none;
    }
  `,
})
export class ArCustomerMessage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly cockpitOrigin = inject(CockpitOriginService);
  private readonly permissions = inject(PermissionService);
  private readonly contacts = inject(ContactService);
  private readonly accounts = inject(CustomerAccountService);
  private readonly communication = inject(CustomerCommunicationService);
  private readonly orderApi = inject(SalesOrderService);
  private readonly challanApi = inject(DeliveryChallanService);
  private readonly invoiceApi = inject(SalesInvoiceService);
  private readonly smsApi = inject(SmsChannelService);
  private readonly templateApi = inject(TemplateService);

  protected readonly canReply = grantedPolicy('AutoReach.Inbox.Reply', this.permissions);
  protected readonly canChannels = grantedPolicy('AutoReach.Channels', this.permissions);
  private readonly canReadOrders = grantedPolicy('AutoReach.SalesOrders', this.permissions);
  private readonly canReadChallans = grantedPolicy('AutoReach.DeliveryChallans', this.permissions);
  private readonly canReadInvoices = grantedPolicy('AutoReach.SalesInvoices', this.permissions);
  protected readonly channels = inject(ChannelService).channels;

  protected readonly contactId = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly documentsLoading = signal(false);
  protected readonly templatesLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly documents = signal<DocumentChoice[]>([]);
  protected readonly accountId = signal<string | null>(null);
  private readonly accountName = signal<string | null>(null);
  /** The chosen document's key ("i:<id>", "p:<payment id>", …), or ''. */
  protected readonly docKey = signal('');
  protected readonly docQuery = signal('');
  protected readonly selectedDoc = computed(
    () => this.documents().find((d) => d.key === this.docKey()) ?? null,
  );
  /** Whose documents are listed: the company's when the contact is on an account. */
  protected readonly documentsOwner = computed(() => this.accountName() || this.name());
  protected readonly docGroups = computed(() => {
    const q = this.docQuery().trim().toLowerCase();
    const shown = this.documents().filter((d) => !q || d.number.toLowerCase().includes(q));
    return DOC_ORDER.map((type) => ({ type, items: shown.filter((d) => d.type === type) })).filter(
      (g) => g.items.length > 0,
    );
  });
  /** A document the link asked for (?document=i:<id>), chosen once the list has loaded. */
  private requestedDoc = inject(ActivatedRoute).snapshot.queryParamMap.get('document');
  protected readonly templates = signal<MessageTemplate[]>([]);
  protected readonly selectedTemplate = signal<MessageTemplate | null>(null);

  protected channel = 0;
  protected channelId = '';
  protected templateId = '';
  protected documentVariable = '';
  protected subject = '';
  protected text = '';
  protected variables: Record<string, string> = {};
  private templateSequence = 0;

  /** How the chosen document reaches the customer on the channel picked. */
  protected deliveryHint(): string {
    if (this.channel === 1) return 'Attached to the email as a PDF.';
    if (this.templateId)
      return "Sent as a secure link in one of the template's variables; the link expires in 24 hours.";
    return 'Sent as a PDF in the WhatsApp chat. Free messages only reach a customer who wrote to you in the last 24 hours; outside that window, pick an approved template.';
  }

  protected pickDocument(key: string): void {
    this.docKey.set(key);
    this.documentVariable = '';
  }

  /** Where Cancel and a sent message return: the Customer 360 this was opened from, or the contact's own. */
  private readonly returnUrl = computed(() => {
    const origin = this.cockpitOrigin.origin();
    const here = pathOf(this.router.url);
    return origin && origin.targetPath === here
      ? origin.cockpitUrl
      : `/contacts/${this.route.snapshot.paramMap.get('id')}/360`;
  });

  constructor() {
    void this.load(this.route.snapshot.paramMap.get('id'));
    // The workspace's numbers may arrive after the page: pick the first then, and its templates.
    effect(() => {
      const first = this.channels()[0]?.id;
      if (first && !this.channelId && this.contactId()) this.chooseChannel(first);
    });
  }

  private async load(id: string | null): Promise<void> {
    if (!id) {
      this.loading.set(false);
      return;
    }
    try {
      const contact = await firstValueFrom(this.contacts.get(id));
      this.contactId.set(id);
      this.name.set(contact.displayName || contact.companyName || contact.waId || 'Customer');
      this.phone.set(contact.waId ? '+' + contact.waId : '');
      this.email.set(contact.emailAddress ?? '');
      this.accountId.set(contact.accountId ?? null);
      if (contact.accountId) {
        this.accounts
          .get(contact.accountId)
          .subscribe({ next: (a) => this.accountName.set(a.name ?? null), error: () => undefined });
      }
      this.channelId = this.channels()[0]?.id ?? '';
      void this.loadTemplates();
      void this.loadDocuments(id, contact.accountId ?? null);
    } catch (e) {
      this.error.set(readApiError(e, 'This customer could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected back(): void {
    void this.router.navigateByUrl(this.returnUrl());
  }

  protected setChannel(value: number): void {
    this.channel = value;
    // SMS carries no document.
    if (value === 2) this.docKey.set('');
    void this.loadTemplates();
  }

  protected chooseChannel(value: string): void {
    this.channelId = value;
    void this.loadTemplates();
  }

  protected chooseTemplate(value: string): void {
    this.templateId = value;
    this.documentVariable = '';
    this.selectedTemplate.set(this.templates().find((t) => t.id === value) ?? null);
    this.variables = Object.fromEntries(
      (this.selectedTemplate()?.variables ?? []).map((k) => [k, '']),
    );
  }

  private async loadTemplates(): Promise<void> {
    const sequence = ++this.templateSequence;
    this.chooseTemplate('');
    this.templates.set([]);
    this.templatesLoading.set(false);
    if (this.channel === 1 || (this.channel === 0 && !this.channelId)) return;
    this.templatesLoading.set(true);
    try {
      const list: MessageTemplate[] =
        this.channel === 2
          ? (await firstValueFrom(this.smsApi.getTemplates()))
              .filter((t) => t.status === SmsTemplateStatus.Approved)
              .map((t) => ({ id: t.id, name: t.name, text: t.content, variables: t.variableNames }))
          : ((
              await firstValueFrom(
                this.templateApi.getList({
                  channelId: this.channelId,
                  status: TemplateStatus.Approved,
                  maxResultCount: 200,
                }),
              )
            ).items?.map((t) => ({
              id: t.id!,
              name: t.name ?? '',
              text: t.components?.map((c) => c.text ?? '').join('\n') ?? '',
              variables: Array.from(
                { length: t.components?.find((c) => c.kind === 1)?.variableCount ?? 0 },
                (_, i) => String(i + 1),
              ),
            })) ?? []);
      if (sequence === this.templateSequence) this.templates.set(list);
    } catch (e) {
      if (sequence === this.templateSequence)
        this.error.set(readApiError(e, 'Templates could not be loaded.'));
    } finally {
      if (sequence === this.templateSequence) this.templatesLoading.set(false);
    }
  }

  /**
   * The orders, challans, invoices and payment receipts that can go with the message: the company's when the contact is on an
   * account (any colleague's, as the API allows), otherwise the contact's own. Newest first.
   */
  private async loadDocuments(contactId: string, accountId: string | null): Promise<void> {
    this.documentsLoading.set(true);
    try {
      const filter = accountId
        ? { customerAccountId: accountId, maxResultCount: 1000 }
        : { customerId: contactId, maxResultCount: 1000 };
      const [orders, challans, invoices] = await Promise.all([
        this.canReadOrders() ? firstValueFrom(this.orderApi.getList(filter)) : null,
        this.canReadChallans() ? firstValueFrom(this.challanApi.getList(filter)) : null,
        this.canReadInvoices() ? firstValueFrom(this.invoiceApi.getList(filter)) : null,
      ]);
      const buyer = (customerId: string, customerName: string) =>
        customerId === contactId ? undefined : customerName;
      const list: DocumentChoice[] = [
        ...(invoices?.items ?? []).flatMap((i) => [
          {
            kind: 2,
            recordId: i.id!,
            key: 'i:' + i.id,
            type: 'Invoice',
            number: i.invoiceNumber,
            date: i.issueDateUtc,
            amountInPaise: i.grandTotalInPaise,
            buyer: buyer(i.customerId, i.customerName),
          },
          ...i.payments.map((p) => ({
            kind: 3,
            recordId: i.id!,
            paymentId: p.id!,
            key: 'p:' + p.id,
            type: 'Payment receipt',
            number: `${i.invoiceNumber} · ${p.referenceNumber || 'receipt'}`,
            date: p.paymentDateUtc,
            amountInPaise: p.amountInPaise,
            buyer: buyer(i.customerId, i.customerName),
          })),
        ]),
        ...(orders?.items ?? []).map((o) => ({
          kind: 0,
          recordId: o.id!,
          key: 'o:' + o.id,
          type: 'Sales order',
          number: o.orderNumber,
          date: o.orderDateUtc,
          amountInPaise: o.grandTotalInPaise,
          buyer: buyer(o.customerId, o.customerName),
        })),
        ...(challans?.items ?? []).map((c) => ({
          kind: 1,
          recordId: c.id!,
          key: 'c:' + c.id,
          type: 'Delivery challan',
          number: c.challanNumber,
          date: c.challanDateUtc,
          buyer: buyer(c.customerId, c.customerName),
        })),
      ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
      this.documents.set(list);
      if (this.requestedDoc && list.some((d) => d.key === this.requestedDoc)) {
        this.docKey.set(this.requestedDoc);
      }
      this.requestedDoc = null;
    } catch (e) {
      this.error.set(readApiError(e, 'Customer documents could not be loaded.'));
    } finally {
      this.documentsLoading.set(false);
    }
  }

  /** What the API takes for a document: its kind and record, nothing the picker shows. */
  private toInput(d: DocumentChoice | null): CustomerDocumentInput | undefined {
    return d ? { kind: d.kind, recordId: d.recordId, paymentId: d.paymentId } : undefined;
  }

  protected async previewDocument(): Promise<void> {
    const chosen = this.selectedDoc();
    const document = this.toInput(chosen);
    const contactId = this.contactId();
    if (!chosen || !document || !contactId || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const blob = await firstValueFrom(this.communication.getDocument(contactId, document));
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = chosen.number.replace(/[^\p{L}\p{N}_.-]/gu, '_') + '.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.error.set(readApiError(e, 'The document could not be loaded.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async send(): Promise<void> {
    const contactId = this.contactId();
    if (!contactId || this.busy()) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      const document = this.channel === 2 ? undefined : this.toInput(this.selectedDoc());
      if (
        (this.channel === 1 && (!this.subject.trim() || !this.text.trim() || !this.email())) ||
        (this.channel === 0 &&
          (!this.channelId || (!this.templateId && !this.text.trim() && !document))) ||
        (this.channel === 2 && !this.templateId)
      )
        throw new Error('Complete the message details before sending.');
      if (document && this.templateId && !this.documentVariable)
        throw new Error('Choose the template variable for the document link.');
      const variables = { ...this.variables };
      if (document && this.documentVariable) variables[this.documentVariable] = 'document-link';
      if (Object.values(variables).some((v) => !v.trim()))
        throw new Error('Fill every template variable before sending.');
      await firstValueFrom(
        this.communication.send({
          contactId,
          channel: this.channel,
          channelId: this.channel === 0 ? this.channelId : undefined,
          templateId: this.channel !== 1 ? this.templateId || undefined : undefined,
          subject: this.subject,
          text: this.text,
          variables,
          document,
          documentVariable: this.documentVariable || undefined,
        }),
      );
      this.toasts.success(
        this.channel === 0
          ? 'Message queued. Check the inbox for delivery status.'
          : 'Message sent.',
        'Message customer',
      );
      this.back();
    } catch (e) {
      this.error.set(readApiError(e, 'The message could not be sent.'));
    } finally {
      this.busy.set(false);
    }
  }
}
