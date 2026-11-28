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
import { SalesOrderService } from '../../proxy/sales/sales-order.service';
import { DeliveryChallanService } from '../../proxy/sales/delivery-challan.service';
import { SalesInvoiceService } from '../../proxy/sales/sales-invoice.service';
import { SalesPaymentMode } from '../../proxy/sales/sales-enums';
import { SalesOrderDto } from '../../proxy/sales/sales-order.models';
import { SalesInvoiceDto } from '../../proxy/sales/sales-invoice.models';
import { grantedPolicy } from '../../core/auth/permission';
import { readApiError } from '../../core/util/api-error';
import { ArButton } from '../../ui/button';
import { ArDialog } from '../../ui/dialog';
import { ArIcon } from '../../ui/icon';

@Component({
  selector: 'ar-customer-actions',
  imports: [FormsModule, RouterLink, ArButton, ArDialog, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .customer-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin: 0.25rem 0;
    }
    .ca-btn {
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      height: 38px !important;
      padding: 0 16px !important;
      font: 500 0.8125rem var(--ar-font-sans) !important;
      border-radius: 8px !important;
      transition: all 0.18s ease !important;
      white-space: nowrap !important;
    }
    .ca-btn--primary {
      background: #2563eb !important;
      border-color: #2563eb !important;
      color: #ffffff !important;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25) !important;

      &:hover {
        background: #1d4ed8 !important;
        border-color: #1d4ed8 !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px -1px rgba(37, 99, 235, 0.3) !important;
      }
    }
    .ca-btn--ghost {
      background: #ffffff !important;
      border: 1px solid var(--ar-line-200) !important;
      color: #334155 !important;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;

      ar-icon {
        color: #64748b;
        transition: color 0.16s ease;
      }

      &:hover {
        background: var(--ar-bg-50) !important;
        border-color: var(--ar-line-300) !important;
        color: #0f172a !important;
        transform: translateY(-1px);

        ar-icon {
          color: #0f172a;
        }
      }
    }
    .ca-notice {
      margin: 0;
      font: 500 0.8125rem var(--ar-font-sans);
      color: #0d9488;
    }
  `,
  template: `
    <section class="customer-actions" aria-label="Customer actions">
      @if (contactId()) {
        @if (canReply()) {
          <!-- Its own page (/contacts/:id/message), keeping this cockpit in the breadcrumb -->
          <a
            ar-button
            variant="primary"
            class="ca-btn ca-btn--primary"
            [routerLink]="['/contacts', contactId(), 'message']"
          >
            <ar-icon name="send" [size]="14" />
            <span>Message customer</span>
          </a>
        }
        @if (onAccount() && canOrder()) {
          <a
            ar-button
            variant="ghost"
            class="ca-btn ca-btn--ghost"
            routerLink="/sales/orders/new"
            [queryParams]="{
              customer: contactId(),
              customerName: customer().contactName ?? customer().customerName,
            }"
          >
            <ar-icon name="plus" [size]="14" />
            <span>New Order</span>
          </a>
        }
        @if (onAccount() && canChallan()) {
          <button
            ar-button
            variant="ghost"
            class="ca-btn ca-btn--ghost"
            (click)="openAction('challan')"
          >
            <ar-icon name="delivery-challans" [size]="14" />
            <span>Create delivery challan</span>
          </button>
        }
        @if (onAccount() && canInvoice()) {
          <button
            ar-button
            variant="ghost"
            class="ca-btn ca-btn--ghost"
            (click)="openAction('invoice')"
          >
            <ar-icon name="billing" [size]="14" />
            <span>Create invoice</span>
          </button>
        }
        @if (onAccount() && canPayment()) {
          <button
            ar-button
            variant="ghost"
            class="ca-btn ca-btn--ghost"
            (click)="openAction('payment')"
          >
            <ar-icon name="billing" [size]="14" />
            <span>Record payment</span>
          </button>
        }
      }
      @if (notice()) {
        <p class="ca-notice" role="status">{{ notice() }}</p>
      }
      @if (createdRecord(); as record) {
        <a
          ar-button
          variant="ghost"
          class="ca-btn ca-btn--ghost"
          [routerLink]="[record.path, record.id]"
        >
          <ar-icon name="check" [size]="14" />
          <span>Review created draft</span>
        </a>
      }
    </section>
    @if (dialog()) {
      <ar-dialog
        [title]="
          dialog() === 'payment'
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
        @if (dialog() === 'payment') {
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
            [disabled]="busy() || documentsLoading()"
            (click)="submit()"
          >
            {{ busy() ? 'Saving…' : dialog() === 'payment' ? 'Record payment' : 'Create draft' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
})
export class ArCustomerActions {
  readonly customer = input.required<Customer360Dto>();
  readonly changed = output<void>();
  private readonly permissions = inject(PermissionService);
  readonly canReply = grantedPolicy('AutoReach.Inbox.Reply', this.permissions);
  readonly canOrder = grantedPolicy('AutoReach.SalesOrders.Create', this.permissions);
  readonly canChallan = grantedPolicy('AutoReach.DeliveryChallans.Create', this.permissions);
  readonly canInvoice = grantedPolicy('AutoReach.SalesInvoices.Create', this.permissions);
  readonly canPayment = grantedPolicy('AutoReach.SalesInvoices.RecordPayment', this.permissions);
  private readonly canReadOrders = grantedPolicy('AutoReach.SalesOrders', this.permissions);
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
  private readonly orderApi = inject(SalesOrderService);
  private readonly challanApi = inject(DeliveryChallanService);
  private readonly invoiceApi = inject(SalesInvoiceService);
  readonly dialog = signal<'challan' | 'invoice' | 'payment' | null>(null);
  readonly busy = signal(false);
  readonly documentsLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly createdRecord = signal<{ id: string; path: string } | null>(null);
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
  readonly paymentModes = [
    { label: 'NEFT / RTGS', value: 0 },
    { label: 'UPI', value: 1 },
    { label: 'Cheque', value: 2 },
    { label: 'Cash', value: 3 },
    { label: 'Card', value: 4 },
    { label: 'Other', value: 5 },
  ];
  sourceId = '';
  amount: number | null = null;
  paymentMode = SalesPaymentMode.NeftRtgs;
  reference = '';
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
        this.documentSequence++;
      }
    });
  }
  close(): void {
    if (!this.busy()) {
      this.dialog.set(null);
      this.documentSequence++;
    }
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
  private async loadDocuments(): Promise<void> {
    const contactId = this.contactId();
    if (!contactId) return;
    const sequence = ++this.documentSequence;
    this.documentsLoading.set(true);
    this.orders.set([]);
    this.invoices.set([]);
    try {
      // On an account, everything the account bought (any of its contacts); on a person, theirs.
      const accountId = this.onAccount() ? this.customer().accountId : undefined;
      const filter = accountId
        ? { customerAccountId: accountId, maxResultCount: 1000 }
        : { customerId: contactId, maxResultCount: 1000 };
      const [orders, invoices] = await Promise.all([
        this.canReadOrders()
          ? firstValueFrom(this.orderApi.getList(filter))
          : { items: [] as SalesOrderDto[] },
        this.canReadInvoices()
          ? firstValueFrom(this.invoiceApi.getList(filter))
          : { items: [] as SalesInvoiceDto[] },
      ]);
      if (sequence !== this.documentSequence) return;
      this.orders.set(orders.items ?? []);
      this.invoices.set(invoices.items ?? []);
    } catch (e) {
      if (sequence === this.documentSequence)
        this.error.set(readApiError(e, 'Customer documents could not be loaded.'));
    } finally {
      if (sequence === this.documentSequence) this.documentsLoading.set(false);
    }
  }
  async submit(): Promise<void> {
    const contactId = this.contactId();
    if (!contactId || this.busy()) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      {
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
