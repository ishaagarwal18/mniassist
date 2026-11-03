import { PermissionService } from '@abp/ng.core';
import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  input,
  output,
  signal,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Customer360Dto } from '../../proxy/sales/customer-360.models';
import {
  CustomerCommunicationService,
  CustomerDocumentInput,
} from '../../proxy/sales/customer-communication.service';
import { SalesOrderService } from '../../proxy/sales/sales-order.service';
import { DeliveryChallanService } from '../../proxy/sales/delivery-challan.service';
import { SalesInvoiceService } from '../../proxy/sales/sales-invoice.service';
import { SalesPaymentMode } from '../../proxy/sales/sales-enums';
import { SalesOrderDto } from '../../proxy/sales/sales-order.models';
import { DeliveryChallanDto } from '../../proxy/sales/delivery-challan.models';
import { SalesInvoiceDto } from '../../proxy/sales/sales-invoice.models';
import { TemplateService } from '../../proxy/messaging/template.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { SmsChannelService, SmsTemplateStatus } from '../../proxy/sms/sms-channel.service';
import { ChannelService } from '../../core/services/channel.service';
import { grantedPolicy } from '../../core/auth/permission';
import { readApiError } from '../../core/util/api-error';
import { ArButton } from '../../ui/button';
import { ArDialog } from '../../ui/dialog';

type DocumentChoice = CustomerDocumentInput & { key: string; label: string };
type MessageTemplate = { id: string; name: string; text: string; variables: string[] };

@Component({
  selector: 'ar-customer-actions',
  imports: [FormsModule, RouterLink, ArButton, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="customer-actions" aria-label="Customer actions">
      @if (contactId()) {
        @if (canReply()) {
          <button ar-button variant="primary" (click)="openMessage()">Message customer</button>
        }
        @if (onAccount() && canOrder()) {
          <a
            ar-button
            variant="ghost"
            routerLink="/sales/orders"
            [queryParams]="{
              new: 1,
              customer: contactId(),
              customerName: customer().contactName ?? customer().customerName,
            }"
            >+ New Order</a
          >
        }
        @if (onAccount() && canChallan()) {
          <button ar-button variant="ghost" (click)="openAction('challan')">
            Create delivery challan
          </button>
        }
        @if (onAccount() && canInvoice()) {
          <button ar-button variant="ghost" (click)="openAction('invoice')">Create invoice</button>
        }
        @if (onAccount() && canPayment()) {
          <button ar-button variant="ghost" (click)="openAction('payment')">Record payment</button>
        }
      }
      @if (notice()) {
        <p role="status">{{ notice() }}</p>
      }
      @if (createdRecord(); as record) {
        <a ar-button variant="ghost" [routerLink]="record.path" [queryParams]="{ open: record.id }"
          >Review created draft</a
        >
      }
    </section>
    @if (dialog()) {
      <ar-dialog
        [title]="
          dialog() === 'message'
            ? 'Message customer'
            : dialog() === 'payment'
              ? 'Record payment'
              : dialog() === 'challan'
                ? 'Create delivery challan'
                : 'Create invoice'
        "
        (dismiss)="close()"
      >
        <p translate="no">{{ customer().contactName ?? customer().customerName }}</p>
        @if (error()) {
          <p role="alert">{{ error() }}</p>
        }
        @if (dialog() === 'message') {
          <label class="ar-field"
            ><span class="ar-field__label">Send via</span>
            <select
              class="ar-field__input"
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
          <p translate="no">{{ channel === 1 ? customer().email : customer().phone }}</p>
          @if (channel === 0) {
            <label class="ar-field"
              ><span class="ar-field__label">WhatsApp number</span>
              <select
                class="ar-field__input"
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
              <p class="template-preview" translate="no">{{ t.text }}</p>
              @for (key of t.variables; track key) {
                <label class="ar-field"
                  ><span class="ar-field__label"
                    >Variable <span translate="no">{{ key }}</span></span
                  >
                  <input
                    class="ar-field__input"
                    [(ngModel)]="variables[key]"
                    [disabled]="busy() || (!!documentKey && documentVariable === key)"
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
                rows="5"
                maxlength="4096"
                [(ngModel)]="text"
                [disabled]="busy()"
                translate="no"
              ></textarea>
            </label>
          }
          <label class="ar-field"
            ><span class="ar-field__label">Optional sales document</span>
            <select
              class="ar-field__input"
              [(ngModel)]="documentKey"
              [disabled]="busy() || documentsLoading()"
            >
              <option value="">No attachment</option>
              @for (d of documents(); track d.key) {
                <option [value]="d.key" translate="no">{{ d.label }}</option>
              }
            </select>
          </label>
          @if (documentKey && (channel === 2 || (channel === 0 && templateId))) {
            <p>
              The document is shared as a secure link that expires in 24 hours. Choose the template
              variable for this link.
            </p>
            <select
              class="ar-field__input"
              aria-label="Document link variable"
              [(ngModel)]="documentVariable"
              [disabled]="busy()"
            >
              <option value="">Choose a variable for the document link</option>
              @for (key of selectedTemplate()?.variables ?? []; track key) {
                <option [value]="key" translate="no">{{ key }}</option>
              }
            </select>
          }
          @if (documentKey) {
            <button ar-button variant="ghost" [disabled]="busy()" (click)="previewDocument()">
              Preview document
            </button>
          }
        } @else if (dialog() === 'payment') {
          <label class="ar-field"
            ><span class="ar-field__label">Invoice</span>
            <select class="ar-field__input" [(ngModel)]="sourceId" [disabled]="busy()">
              <option value="">Choose an invoice</option>
              @for (inv of invoices(); track inv.id) {
                @if (inv.balanceDueInPaise > 0 && (inv.status === 1 || inv.status === 2)) {
                  <option [value]="inv.id" translate="no">
                    {{ inv.invoiceNumber }} · INR {{ inv.balanceDueInPaise / 100 }}
                  </option>
                }
              }
            </select>
          </label>
          <label class="ar-field"
            ><span class="ar-field__label">Amount received (INR)</span
            ><input
              class="ar-field__input"
              type="number"
              min="0.01"
              step="0.01"
              [(ngModel)]="amount"
              [disabled]="busy()"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">Payment mode</span
            ><select class="ar-field__input" [(ngModel)]="paymentMode" [disabled]="busy()">
              @for (mode of paymentModes; track mode.value) {
                <option [ngValue]="mode.value">{{ mode.label }}</option>
              }
            </select></label
          >
          <label class="ar-field"
            ><span class="ar-field__label">Reference number</span
            ><input
              class="ar-field__input"
              [(ngModel)]="reference"
              [disabled]="busy()"
              translate="no"
          /></label>
        } @else {
          <label class="ar-field"
            ><span class="ar-field__label">Sales order</span>
            <select class="ar-field__input" [(ngModel)]="sourceId" [disabled]="busy()">
              <option value="">Choose a confirmed sales order</option>
              @for (o of eligibleOrders(); track o.id) {
                <option [value]="o.id" translate="no">{{ o.orderNumber }}</option>
              }
            </select>
          </label>
          <p>
            Creates a draft from the remaining items on the selected sales order. Review the draft
            before issuing or dispatching it.
          </p>
        }
        <div dialogActions>
          <button ar-button variant="ghost" [disabled]="busy()" (click)="close()">Cancel</button>
          <button
            ar-button
            variant="primary"
            [disabled]="busy() || documentsLoading() || templatesLoading()"
            (click)="submit()"
          >
            {{
              busy()
                ? 'Saving…'
                : dialog() === 'message'
                  ? 'Send message'
                  : dialog() === 'payment'
                    ? 'Record payment'
                    : 'Create draft'
            }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    .customer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: 12px 0;
    }
    .customer-actions p {
      flex-basis: 100%;
      margin: 0;
    }
    .template-preview {
      white-space: pre-wrap;
      padding: 12px;
      background: var(--ar-surface-subtle, #f4f5f6);
      border-radius: 6px;
    }
  `,
})
export class ArCustomerActions {
  readonly customer = input.required<Customer360Dto>();
  readonly changed = output<void>();
  private readonly permissions = inject(PermissionService);
  readonly canReply = grantedPolicy('AutoReach.Inbox.Reply', this.permissions);
  readonly canChannels = grantedPolicy('AutoReach.Channels', this.permissions);
  readonly canOrder = grantedPolicy('AutoReach.SalesOrders.Create', this.permissions);
  readonly canChallan = grantedPolicy('AutoReach.DeliveryChallans.Create', this.permissions);
  readonly canInvoice = grantedPolicy('AutoReach.SalesInvoices.Create', this.permissions);
  readonly canPayment = grantedPolicy('AutoReach.SalesInvoices.RecordPayment', this.permissions);
  private readonly canReadOrders = grantedPolicy('AutoReach.SalesOrders', this.permissions);
  private readonly canReadChallans = grantedPolicy('AutoReach.DeliveryChallans', this.permissions);
  private readonly canReadInvoices = grantedPolicy('AutoReach.SalesInvoices', this.permissions);
  /**
   * Orders, challans, invoices and payments are raised on the account: offered on an account's view only. A new order picks the
   * account's newest contact as the buyer, which the order form lets you change; the account follows from the buyer.
   */
  readonly onAccount = computed(() => !!this.customer().isAccountView);
  readonly contactId = computed(() =>
    this.customer().isAccountView
      ? this.customer().contactId
      : (this.customer().contactId ?? this.customer().id),
  );
  readonly channels = inject(ChannelService).channels;
  private readonly communication = inject(CustomerCommunicationService);
  private readonly orderApi = inject(SalesOrderService);
  private readonly challanApi = inject(DeliveryChallanService);
  private readonly invoiceApi = inject(SalesInvoiceService);
  private readonly smsApi = inject(SmsChannelService);
  private readonly templateApi = inject(TemplateService);
  readonly dialog = signal<'message' | 'challan' | 'invoice' | 'payment' | null>(null);
  readonly busy = signal(false);
  readonly documentsLoading = signal(false);
  readonly templatesLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly createdRecord = signal<{ id: string; path: string } | null>(null);
  readonly documents = signal<DocumentChoice[]>([]);
  readonly orders = signal<Customer360Dto['recentOrders']>([]);
  readonly eligibleOrders = computed(() =>
    this.orders().filter(
      (o) =>
        o.status > 0 &&
        o.status < 5 &&
        o.lines.some((l) =>
          this.dialog() === 'challan' ? l.outstandingDispatch > 0 : l.outstandingInvoice > 0,
        ),
    ),
  );
  readonly invoices = signal<Customer360Dto['recentInvoices']>([]);
  readonly templates = signal<MessageTemplate[]>([]);
  readonly selectedTemplate = signal<MessageTemplate | null>(null);
  readonly paymentModes = [
    { label: 'NEFT / RTGS', value: 0 },
    { label: 'UPI', value: 1 },
    { label: 'Cheque', value: 2 },
    { label: 'Cash', value: 3 },
    { label: 'Card', value: 4 },
    { label: 'Other', value: 5 },
  ];
  channel = 0;
  channelId = '';
  templateId = '';
  documentKey = '';
  documentVariable = '';
  subject = '';
  text = '';
  variables: Record<string, string> = {};
  sourceId = '';
  amount: number | null = null;
  paymentMode = SalesPaymentMode.NeftRtgs;
  reference = '';
  private templateSequence = 0;
  private documentSequence = 0;
  private previousContactId: string | undefined;

  constructor() {
    effect(() => {
      const id = this.contactId();
      if (id !== this.previousContactId) {
        this.previousContactId = id;
        this.dialog.set(null);
        this.notice.set(null);
        this.createdRecord.set(null);
        this.templateSequence++;
        this.documentSequence++;
      }
    });
  }
  close(): void {
    if (!this.busy()) {
      this.dialog.set(null);
      this.templateSequence++;
      this.documentSequence++;
    }
  }
  openMessage(): void {
    this.createdRecord.set(null);
    this.channel = 0;
    this.channelId = this.channels()[0]?.id ?? '';
    this.templateId = '';
    this.documentKey = '';
    this.documentVariable = '';
    this.subject = '';
    this.text = '';
    this.variables = {};
    this.error.set(null);
    this.notice.set(null);
    this.dialog.set('message');
    void this.loadDocuments();
    void this.loadTemplates();
  }
  openAction(action: 'challan' | 'invoice' | 'payment'): void {
    this.createdRecord.set(null);
    this.sourceId = '';
    this.amount = null;
    this.reference = '';
    this.error.set(null);
    this.notice.set(null);
    this.dialog.set(action);
    void this.loadDocuments();
  }
  setChannel(value: number): void {
    this.channel = value;
    void this.loadTemplates();
  }
  chooseChannel(value: string): void {
    this.channelId = value;
    void this.loadTemplates();
  }
  chooseTemplate(value: string): void {
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
  private async loadDocuments(): Promise<void> {
    const contactId = this.contactId();
    if (!contactId) return;
    const sequence = ++this.documentSequence;
    this.documentsLoading.set(true);
    this.documents.set([]);
    this.orders.set([]);
    this.invoices.set([]);
    try {
      // On an account, everything the account bought (any of its contacts); on a person, theirs.
      const accountId = this.onAccount() ? this.customer().accountId : undefined;
      const filter = accountId
        ? { customerAccountId: accountId, maxResultCount: 1000 }
        : { customerId: contactId, maxResultCount: 1000 };
      const [orders, challans, invoices] = await Promise.all([
        this.canReadOrders()
          ? firstValueFrom(this.orderApi.getList(filter))
          : { items: [] as SalesOrderDto[] },
        this.canReadChallans()
          ? firstValueFrom(this.challanApi.getList(filter))
          : { items: [] as DeliveryChallanDto[] },
        this.canReadInvoices()
          ? firstValueFrom(this.invoiceApi.getList(filter))
          : { items: [] as SalesInvoiceDto[] },
      ]);
      if (sequence !== this.documentSequence) return;
      this.orders.set(orders.items ?? []);
      this.invoices.set(invoices.items ?? []);
      // A document sent in a message is the recipient's own.
      const own = <T extends { customerId: string }>(items: T[] | undefined) =>
        (items ?? []).filter((d) => d.customerId === contactId);
      this.documents.set([
        ...own(orders.items).map((o) => ({
          kind: 0,
          recordId: o.id!,
          key: 'o:' + o.id,
          label: o.orderNumber,
        })),
        ...own(challans.items).map((c) => ({
          kind: 1,
          recordId: c.id!,
          key: 'c:' + c.id,
          label: c.challanNumber,
        })),
        ...own(invoices.items).flatMap((i) => [
          { kind: 2, recordId: i.id!, key: 'i:' + i.id, label: i.invoiceNumber },
          ...i.payments.map((p) => ({
            kind: 3,
            recordId: i.id!,
            paymentId: p.id!,
            key: 'p:' + p.id,
            label: `${i.invoiceNumber} · ${p.paymentDateUtc.slice(0, 10)} · INR ${p.amountInPaise / 100}`,
          })),
        ]),
      ]);
    } catch (e) {
      if (sequence === this.documentSequence)
        this.error.set(readApiError(e, 'Customer documents could not be loaded.'));
    } finally {
      if (sequence === this.documentSequence) this.documentsLoading.set(false);
    }
  }
  async previewDocument(): Promise<void> {
    const document = this.documents().find((d) => d.key === this.documentKey);
    const contactId = this.contactId();
    if (!document || !contactId || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const blob = await firstValueFrom(this.communication.getDocument(contactId, document));
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.label.replace(/[^\p{L}\p{N}_.-]/gu, '_') + '.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.error.set(readApiError(e, 'The document could not be loaded.'));
    } finally {
      this.busy.set(false);
    }
  }
  async submit(): Promise<void> {
    const contactId = this.contactId();
    if (!contactId || this.busy()) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      if (this.dialog() === 'message') {
        const document = this.documents().find((d) => d.key === this.documentKey);
        if (
          (this.channel === 1 &&
            (!this.subject.trim() || !this.text.trim() || !this.customer().email)) ||
          (this.channel === 0 &&
            (!this.channelId || (!this.templateId && !this.text.trim() && !document))) ||
          (this.channel === 2 && !this.templateId)
        )
          throw new Error('Complete the message details before sending.');
        if (document && (this.channel === 2 || this.templateId) && !this.documentVariable)
          throw new Error('Choose a variable for the document link.');
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
        this.notice.set(
          this.channel === 0
            ? 'Message queued. Check the inbox for delivery status.'
            : 'Message sent.',
        );
      } else {
        if (!this.sourceId) throw new Error('Choose a sales record first.');
        if (this.dialog() === 'payment') {
          const invoice = this.invoices().find((i) => i.id === this.sourceId);
          const amount = Math.round(Number(this.amount) * 100);
          if (
            !invoice ||
            !Number.isSafeInteger(amount) ||
            amount <= 0 ||
            amount > invoice.balanceDueInPaise
          )
            throw new Error('Enter a payment amount within the outstanding balance.');
          await firstValueFrom(
            this.invoiceApi.recordPayment(this.sourceId, {
              amountInPaise: amount,
              paymentMode: this.paymentMode,
              referenceNumber: this.reference,
            }),
          );
          this.notice.set('Payment recorded.');
        } else {
          const record =
            this.dialog() === 'challan'
              ? await firstValueFrom(this.challanApi.createFromSalesOrder(this.sourceId))
              : await firstValueFrom(this.invoiceApi.createFromSalesOrder(this.sourceId));
          this.notice.set('Draft created. Open the record to review it.');
          this.createdRecord.set({
            id: record.id!,
            path: this.dialog() === 'challan' ? '/sales/challans' : '/sales/invoices',
          });
        }
      }
      this.dialog.set(null);
      this.changed.emit();
    } catch (e) {
      this.error.set(readApiError(e, 'The customer action could not be completed.'));
    } finally {
      this.busy.set(false);
    }
  }
}
