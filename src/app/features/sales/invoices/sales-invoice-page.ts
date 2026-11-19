import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArInvoiceSpaPanel } from '../../oem/invoice-spa-panel';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { inr } from '../../../core/util/format';
import { ArTopbar } from '../../../layout/topbar';
import { SalesExportFormat, SalesInvoiceStatus } from '../../../proxy/sales/sales-enums';
import { SalesInvoiceDto } from '../../../proxy/sales/sales-invoice.models';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { ArButton, ArChip, ArIcon } from '../../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../../ui/grid';
import { SALES_RECORD_STYLES, SalesRecordPage } from '../sales-record-page';
import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../../core/auth/permission';
import {
  SALES_PAYMENT_MODES,
  SalesPaymentForm,
  canCancelInvoice,
  canIssueInvoice,
  canPayInvoice,
  invoiceStatusLabel,
  invoiceStatusTone,
  isInvoiceOverdue,
  paymentFormFor,
  paymentModeLabel,
  toSalesPaymentDto,
  validateSalesPayment,
} from '../sales-records.logic';
import { ArSalesExport } from '../sales-export';

/**
 * One sales invoice on its own page (/sales/invoices/<id>): billed-to and GSTIN, the lines with CGST + SGST or IGST, totals, what
 * has been paid, and the next step: issue a draft, or record a payment against the balance (the form opens on the page; `?pay=1`
 * opens it at once).
 */
@Component({
  selector: 'ar-sales-invoice-page',
  imports: [
    RouterLink,
    ArTopbar,
    ArButton,
    ArChip,
    ArIcon,
    ArSalesExport,
    DatePipe,
    ArGrid,
    GridModule,
    ArInvoiceSpaPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="One tax invoice: GSTIN, lines with CGST and SGST or IGST, totals, e-invoice details and payments."
      [title]="record() ? 'Tax invoice ' + record()!.invoiceNumber : 'Tax invoice'"
      [subtitle]="record()?.customerName ?? ''"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (loading()) {
        <p class="sr-muted">Loading the invoice…</p>
      } @else if (problem(); as p) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="alert" [size]="20" />
          <div>
            <strong>{{ p }}</strong>
          </div>
          <button ar-button variant="ghost" type="button" (click)="back()">Go back</button>
        </section>
      } @else if (record(); as inv) {
        <div class="pf__form">
          <section class="pf__card">
            <div class="sr-head">
              <div>
                <span class="sr-label">Billed to</span>
                <h2 translate="no">{{ inv.customerName }}</h2>
                <span class="sr-muted"
                  >GSTIN
                  <span class="ar-mono">{{ inv.customerGstin || 'Unregistered' }}</span></span
                >
              </div>
              <ar-chip [tone]="tone(inv.status)">{{ label(inv.status) }}</ar-chip>
            </div>

            <div class="sr-money">
              <div>
                <span>Invoice total</span><strong>{{ inr(inv.grandTotalInPaise) }}</strong>
              </div>
              <div class="sr-paid">
                <span>Paid</span><strong>{{ inr(inv.paidAmountInPaise) }}</strong>
              </div>
              <div [class.sr-due]="inv.balanceDueInPaise > 0">
                <span>Balance due</span><strong>{{ inr(inv.balanceDueInPaise) }}</strong>
              </div>
            </div>

            <div class="sr-facts">
              <div class="sr-box">
                <h3>Invoice</h3>
                <dl>
                  <dt>Invoice date</dt>
                  <dd>{{ inv.issueDateUtc | date: 'dd MMM yyyy' }}</dd>
                  <dt>Due date</dt>
                  <dd [class.sr-bad]="overdue(inv)">
                    {{ inv.dueDateUtc | date: 'dd MMM yyyy' }}{{ overdue(inv) ? ' · overdue' : '' }}
                  </dd>
                  @if (inv.salesOrderNumber) {
                    <dt>Sales order</dt>
                    <dd class="ar-mono">{{ inv.salesOrderNumber }}</dd>
                  }
                  @if (inv.deliveryChallanNumber) {
                    <dt>Delivery challan</dt>
                    <dd class="ar-mono">{{ inv.deliveryChallanNumber }}</dd>
                  }
                  @if (inv.irn) {
                    <dt>IRN</dt>
                    <dd class="ar-mono" [title]="inv.irn">{{ inv.irn.substring(0, 16) }}…</dd>
                  }
                  @if (inv.eWayBillNumber) {
                    <dt>e-Way Bill</dt>
                    <dd class="ar-mono">{{ inv.eWayBillNumber }}</dd>
                  }
                </dl>
              </div>
              <div class="sr-box">
                <h3>Addresses</h3>
                <dl>
                  <dt>Billing</dt>
                  <dd>{{ inv.billingAddress || 'Standard Address' }}</dd>
                  @if (inv.shippingAddress) {
                    <dt>Shipping</dt>
                    <dd>{{ inv.shippingAddress }}</dd>
                  }
                  <dt>Supply</dt>
                  <dd>
                    {{ inv.isInterState ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)' }}
                  </dd>
                </dl>
              </div>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="si-lines">
            <header class="pf__head">
              <div>
                <h2 id="si-lines">Line items & GST</h2>
                <p>{{ inv.lines.length }} item(s), HSN and GST per line.</p>
              </div>
            </header>
            <ejs-grid
              arGrid="sales-invoice-lines"
              [dataSource]="inv.lines"
              aria-label="Line items & GST"
            >
              <e-columns>
                <e-column
                  field="lineNumber"
                  headerText="#"
                  width="60"
                  [textAlign]="'Right'"
                ></e-column>
                <e-column field="partNumber" headerText="Part number & description" width="260">
                  <ng-template #template let-l>
                    <div>
                      <strong class="ar-mono">{{ l.partNumber }}</strong>
                      <span class="sr-sub block">{{ l.description }}</span>
                    </div>
                  </ng-template>
                </e-column>
                <e-column field="hsnCode" headerText="HSN" width="110">
                  <ng-template #template let-l>
                    <span class="ar-mono">{{ l.hsnCode || '—' }}</span>
                  </ng-template>
                </e-column>
                <e-column field="quantity" headerText="Qty" width="90" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    <strong>{{ l.quantity }}</strong>
                  </ng-template>
                </e-column>
                <e-column
                  field="unitPriceInPaise"
                  headerText="Rate"
                  width="130"
                  [textAlign]="'Right'"
                >
                  <ng-template #template let-l>
                    {{ inr(l.unitPriceInPaise) }}
                  </ng-template>
                </e-column>
                <e-column
                  field="taxableAmountInPaise"
                  headerText="Taxable"
                  width="130"
                  [textAlign]="'Right'"
                >
                  <ng-template #template let-l>
                    {{ inr(l.taxableAmountInPaise) }}
                  </ng-template>
                </e-column>
                <e-column headerText="GST" width="180" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    @if (inv.isInterState) {
                      IGST {{ l.igstRateBasisPoints / 100 }}%: {{ inr(l.igstAmountInPaise) }}
                    } @else {
                      CGST {{ l.cgstRateBasisPoints / 100 }}% + SGST
                      {{ l.sgstRateBasisPoints / 100 }}%:
                      {{ inr(l.cgstAmountInPaise + l.sgstAmountInPaise) }}
                    }
                  </ng-template>
                </e-column>
                <e-column
                  field="lineTotalInPaise"
                  headerText="Total"
                  width="140"
                  [textAlign]="'Right'"
                >
                  <ng-template #template let-l>
                    <strong>{{ inr(l.lineTotalInPaise) }}</strong>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
            <dl class="pf__totals">
              <dt>Taxable subtotal</dt>
              <dd>{{ inr(inv.subtotalInPaise) }}</dd>
              @if (inv.isInterState) {
                <dt>IGST</dt>
                <dd>{{ inr(inv.igstInPaise) }}</dd>
              } @else {
                <dt>CGST</dt>
                <dd>{{ inr(inv.cgstInPaise) }}</dd>
                <dt>SGST</dt>
                <dd>{{ inr(inv.sgstInPaise) }}</dd>
              }
              <dt class="pf__grand">Invoice total</dt>
              <dd class="pf__grand">{{ inr(inv.grandTotalInPaise) }}</dd>
              @if (inv.advanceAdjustedInPaise) {
                <dt>Less: advance received</dt>
                <dd>−{{ inr(inv.advanceAdjustedInPaise) }}</dd>
              }
              @if (inv.retentionHeldInPaise) {
                <dt>Less: retention</dt>
                <dd>−{{ inr(inv.retentionHeldInPaise) }}</dd>
              }
              @if (inv.advanceAdjustedInPaise || inv.retentionHeldInPaise) {
                <dt class="pf__grand">Payable now</dt>
                <dd class="pf__grand">{{ inr(inv.netPayableInPaise ?? inv.grandTotalInPaise) }}</dd>
              }
            </dl>
            @if (inv.billingMilestoneId) {
              <p class="si-milestone">
                Milestone invoice: <b>{{ inv.billingMilestoneName }}</b>
                @if (inv.billingPlanOrderId) {
                  · <a [routerLink]="['/sales/orders', inv.billingPlanOrderId]">billing plan</a>
                }
                . Retention and the advance change only what is payable now, not the taxable value
                or the GST.
              </p>
            }
          </section>

          @if (inv.id) {
            <ar-invoice-spa-panel [invoiceId]="inv.id" [version]="inv.status" />
          }

          @if (inv.payments.length) {
            <section class="pf__card" aria-labelledby="si-pay">
              <header class="pf__head">
                <div>
                  <h2 id="si-pay">Payments received</h2>
                  <p>{{ inv.payments.length }} payment(s) recorded.</p>
                </div>
              </header>
              <ejs-grid
                arGrid="sales-invoice-payments"
                [dataSource]="inv.payments"
                aria-label="Payments received"
              >
                <e-columns>
                  <e-column field="paymentDateUtc" headerText="Date" width="130">
                    <ng-template #template let-p>
                      {{ p.paymentDateUtc | date: 'dd MMM yyyy' }}
                    </ng-template>
                  </e-column>
                  <e-column headerText="Mode" width="130">
                    <ng-template #template let-p>
                      {{ modeLabel(p.paymentMode) }}
                    </ng-template>
                  </e-column>
                  <e-column field="referenceNumber" headerText="Reference" width="150">
                    <ng-template #template let-p>
                      <span class="ar-mono">{{ p.referenceNumber || '—' }}</span>
                    </ng-template>
                  </e-column>
                  <e-column
                    field="amountInPaise"
                    headerText="Amount"
                    width="140"
                    [textAlign]="'Right'"
                  >
                    <ng-template #template let-p>
                      <strong class="sr-good">{{ inr(p.amountInPaise) }}</strong>
                    </ng-template>
                  </e-column>
                  <e-column field="remarks" headerText="Remarks" width="200">
                    <ng-template #template let-p>
                      {{ p.remarks || '—' }}
                    </ng-template>
                  </e-column>
                </e-columns>
              </ejs-grid>
            </section>
          }

          @if (paying()) {
            <section class="pf__card sr-form" aria-labelledby="si-new-pay">
              <header class="pf__head">
                <span class="pf__step"><ar-icon name="billing" [size]="13" /></span>
                <div>
                  <h2 id="si-new-pay">Record a payment</h2>
                  <p>Balance due {{ inr(inv.balanceDueInPaise) }}.</p>
                </div>
              </header>
              <div class="pf__grid">
                <div class="ar-field">
                  <label class="ar-field__label" for="si-amt"
                    >Amount ₹ <span class="pf__req">*</span></label
                  >
                  <input
                    id="si-amt"
                    class="ar-field__input pf__num"
                    inputmode="decimal"
                    [attr.aria-invalid]="!!payErr('amount')"
                    [value]="pay().amount"
                    (input)="patchPay({ amount: $any($event.target).value })"
                  />
                  @if (payErr('amount'); as e) {
                    <span class="pf__err">{{ e }}</span>
                  }
                </div>
                <div class="ar-field">
                  <label class="ar-field__label" for="si-mode">Mode</label>
                  <select
                    id="si-mode"
                    class="ar-field__input"
                    (change)="patchPay({ mode: +$any($event.target).value })"
                  >
                    @for (m of modes; track m.value) {
                      <option [value]="m.value" [selected]="m.value === pay().mode">
                        {{ m.label }}
                      </option>
                    }
                  </select>
                </div>
                <div class="ar-field pf__span2">
                  <label class="ar-field__label" for="si-ref"
                    >UTR / transaction reference <span class="ar-field__opt">optional</span></label
                  >
                  <input
                    id="si-ref"
                    class="ar-field__input ar-mono"
                    placeholder="e.g. UTR-9821034"
                    [value]="pay().reference"
                    (input)="patchPay({ reference: $any($event.target).value })"
                  />
                </div>
                <div class="ar-field pf__span4">
                  <label class="ar-field__label" for="si-rem"
                    >Remarks <span class="ar-field__opt">optional</span></label
                  >
                  <input
                    id="si-rem"
                    class="ar-field__input"
                    placeholder="Bank ledger notes"
                    [value]="pay().remarks"
                    (input)="patchPay({ remarks: $any($event.target).value })"
                  />
                </div>
              </div>
              <div class="sr-actions">
                <button ar-button variant="ghost" type="button" (click)="paying.set(false)">
                  Cancel
                </button>
                <button
                  ar-button
                  variant="primary"
                  type="button"
                  icon="check"
                  [disabled]="busy()"
                  (click)="recordPayment(inv)"
                >
                  Confirm payment
                </button>
              </div>
            </section>
          }

          <footer class="pf__bar">
            <span class="pf__summary"></span>
            <button ar-button variant="ghost" type="button" (click)="back()">Back</button>
            <button ar-button variant="ghost" type="button" (click)="customer360(inv.customerId)">
              Customer 360
            </button>
            <ar-sales-export
              [fetch]="download"
              [fileName]="inv.invoiceNumber"
              hint="This invoice"
            />
            @if (mayCancel() && canCancel(inv)) {
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="busy()"
                (click)="cancelInvoice(inv)"
              >
                Cancel invoice
              </button>
            }
            @if (mayIssue() && canIssue(inv)) {
              <button
                ar-button
                variant="primary"
                type="button"
                icon="check"
                [disabled]="busy()"
                (click)="issue(inv)"
              >
                Issue tax invoice
              </button>
            }
            @if (canPay(inv) && !paying()) {
              <button
                ar-button
                variant="primary"
                type="button"
                icon="billing"
                (click)="openPayment(inv)"
              >
                Record payment
              </button>
            }
          </footer>
        </div>
      }
    </div>
  `,
  styles: SALES_RECORD_STYLES,
})
export class ArSalesInvoicePage extends SalesRecordPage<SalesInvoiceDto> {
  private readonly permissionGate = inject(PermissionService);
  protected readonly mayIssue = grantedPolicy('AutoReach.SalesInvoices.Issue', this.permissionGate);
  private readonly api = inject(SalesInvoiceService);

  /** The record as its printed PDF or an Excel workbook. */
  protected readonly download = (format: SalesExportFormat) =>
    this.api.download(this.record()!.id!, format, { skipHandleError: true });

  protected readonly list = '/sales/invoices';
  protected readonly canCancel = canCancelInvoice;
  protected readonly mayCancel = grantedPolicy(
    'AutoReach.SalesInvoices.Cancel',
    inject(PermissionService),
  );

  protected cancelInvoice(inv: SalesInvoiceDto): void {
    void this.cancelRecord(
      `Invoice ${inv.invoiceNumber}`,
      inv.status === SalesInvoiceStatus.Draft
        ? 'The draft is kept as cancelled and will never be issued.'
        : 'An issued invoice keeps its number and stays on record as cancelled. If it was reported for GST or an e-invoice was generated, cancel it on the portal too.',
      () => this.api.cancel(inv.id!, { skipHandleError: true }),
    );
  }
  protected readonly noun = 'This invoice';

  protected readonly inr = inr;
  protected readonly modes = SALES_PAYMENT_MODES;
  protected readonly label = invoiceStatusLabel;
  protected readonly tone = invoiceStatusTone;
  protected readonly modeLabel = paymentModeLabel;
  protected readonly canIssue = canIssueInvoice;
  protected readonly canPay = canPayInvoice;
  protected readonly overdue = (inv: SalesInvoiceDto) => isInvoiceOverdue(inv);

  protected readonly paying = signal(false);
  protected readonly pay = signal<SalesPaymentForm>({
    amount: '',
    mode: SALES_PAYMENT_MODES[0].value,
    reference: '',
    remarks: '',
  });
  private readonly paySubmitted = signal(false);
  private readonly payErrors = computed(() =>
    this.paySubmitted() && this.record()
      ? validateSalesPayment(this.pay(), this.record()!.balanceDueInPaise)
      : {},
  );

  constructor() {
    super();
    void this.load();
  }

  protected fetch(id: string) {
    return this.api.get(id, { skipHandleError: true });
  }

  protected override loaded(inv: SalesInvoiceDto): void {
    if (this.route.snapshot.queryParamMap.get('pay') && canPayInvoice(inv)) this.openPayment(inv);
  }

  protected payErr(key: string): string | null {
    return this.payErrors()[key] ?? null;
  }

  protected patchPay(p: Partial<SalesPaymentForm>): void {
    this.pay.update((f) => ({ ...f, ...p }));
  }

  protected openPayment(inv: SalesInvoiceDto): void {
    this.paySubmitted.set(false);
    this.pay.set(paymentFormFor(inv));
    this.paying.set(true);
    setTimeout(() => document.getElementById('si-amt')?.focus());
  }

  protected issue(inv: SalesInvoiceDto): void {
    void this.run(
      () => this.api.issue(inv.id!, { skipHandleError: true }),
      (s) => `Invoice ${s.invoiceNumber} issued.`,
      `${inv.invoiceNumber} could not be issued.`,
    );
  }

  protected async recordPayment(inv: SalesInvoiceDto): Promise<void> {
    this.paySubmitted.set(true);
    if (Object.keys(validateSalesPayment(this.pay(), inv.balanceDueInPaise)).length) return;
    const input = toSalesPaymentDto(this.pay());
    // A failed payment is never shown as recorded: the money would look received when it is not.
    const saved = await this.run(
      () => this.api.recordPayment(inv.id!, input, { skipHandleError: true }),
      () => `${inr(input.amountInPaise)} recorded against ${inv.invoiceNumber}.`,
      'The payment could not be recorded.',
    );
    if (saved) this.paying.set(false);
  }
}
