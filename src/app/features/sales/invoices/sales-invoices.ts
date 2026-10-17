import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../core/ui/toast.service';
import { errorMessage } from '../../activities/activity-logic';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  RecordSalesInvoicePaymentDto,
  SalesInvoiceDto,
} from '../../../proxy/sales/sales-invoice.models';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import {
  SalesInvoiceKind,
  SalesInvoiceStatus,
  SalesPaymentMode,
} from '../../../proxy/sales/sales-enums';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

const MOCK_INVOICES: SalesInvoiceDto[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0081',
    kind: SalesInvoiceKind.TaxInvoice,
    status: SalesInvoiceStatus.Issued,
    salesOrderId: 'so-1',
    salesOrderNumber: 'SO-2026-0041',
    deliveryChallanId: 'dc-1',
    deliveryChallanNumber: 'DC-2026-0019',
    customerId: 'c1',
    customerName: 'Kalyani Forge Ltd',
    customerAccountId: 'acc1',
    customerAccountName: 'Kalyani Group Pune',
    customerGstin: '27AABCK1928F1Z8',
    billingAddress: 'Gat No 12, Chakan MIDC, Pune 410501',
    shippingAddress: 'Plant II, Chakan MIDC, Pune 410501',
    placeOfSupplyStateCode: '27',
    isInterState: false,
    issueDateUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    dueDateUtc: new Date(Date.now() + 28 * 86_400_000).toISOString(),
    subtotalInPaise: 420_000_00,
    discountInPaise: 0,
    cgstInPaise: 37_800_00,
    sgstInPaise: 37_800_00,
    igstInPaise: 0,
    totalTaxInPaise: 75_600_00,
    grandTotalInPaise: 495_600_00,
    paidAmountInPaise: 0,
    balanceDueInPaise: 495_600_00,
    irn: '8f7a29e18b6c4e09f58a7192bc58a0e194857201bc9384729103847592837482',
    ewayBillNumber: '281982736412',
    creationTime: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'sil-1',
        salesInvoiceId: 'inv-1',
        lineNumber: 1,
        partNumber: 'HV-400-P',
        description: 'Proportional Directional Hydraulic Valve 350 Bar',
        hsnCode: '84812000',
        quantity: 4,
        unitPriceInPaise: 85_000_00,
        discountPercent: 0,
        taxableAmountInPaise: 340_000_00,
        taxRateBasisPoints: 1800,
        cgstRateBasisPoints: 900,
        sgstRateBasisPoints: 900,
        igstRateBasisPoints: 0,
        cgstAmountInPaise: 30_600_00,
        sgstAmountInPaise: 30_600_00,
        igstAmountInPaise: 0,
        lineTotalInPaise: 401_200_00,
      },
      {
        id: 'sil-2',
        salesInvoiceId: 'inv-1',
        lineNumber: 2,
        partNumber: 'FK-HD-04',
        description: 'High-pressure Filter Kit 10 Micron',
        hsnCode: '84212900',
        quantity: 8,
        unitPriceInPaise: 10_000_00,
        discountPercent: 0,
        taxableAmountInPaise: 80_000_00,
        taxRateBasisPoints: 1800,
        cgstRateBasisPoints: 900,
        sgstRateBasisPoints: 900,
        igstRateBasisPoints: 0,
        cgstAmountInPaise: 7_200_00,
        sgstAmountInPaise: 7_200_00,
        igstAmountInPaise: 0,
        lineTotalInPaise: 94_400_00,
      },
    ],
    payments: [],
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-0074',
    kind: SalesInvoiceKind.TaxInvoice,
    status: SalesInvoiceStatus.Paid,
    salesOrderId: 'so-2',
    salesOrderNumber: 'SO-2026-0038',
    customerId: 'c2',
    customerName: 'Thermax Babcock Boiler Works',
    customerGstin: '27AAACT4410H1ZZ',
    isInterState: false,
    issueDateUtc: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    dueDateUtc: new Date(Date.now() + 20 * 86_400_000).toISOString(),
    subtotalInPaise: 180_000_00,
    discountInPaise: 5_000_00,
    cgstInPaise: 15_750_00,
    sgstInPaise: 15_750_00,
    igstInPaise: 0,
    totalTaxInPaise: 31_500_00,
    grandTotalInPaise: 206_500_00,
    paidAmountInPaise: 206_500_00,
    balanceDueInPaise: 0,
    creationTime: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'sil-3',
        salesInvoiceId: 'inv-2',
        lineNumber: 1,
        partNumber: 'ST-BRG-22',
        description: 'Heavy duty ceramic bearing housing unit',
        hsnCode: '84832000',
        quantity: 10,
        unitPriceInPaise: 18_000_00,
        discountPercent: 2.78,
        taxableAmountInPaise: 175_000_00,
        taxRateBasisPoints: 1800,
        cgstRateBasisPoints: 900,
        sgstRateBasisPoints: 900,
        igstRateBasisPoints: 0,
        cgstAmountInPaise: 15_750_00,
        sgstAmountInPaise: 15_750_00,
        igstAmountInPaise: 0,
        lineTotalInPaise: 206_500_00,
      },
    ],
    payments: [
      {
        id: 'pmt-1',
        salesInvoiceId: 'inv-2',
        paymentDateUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        amountInPaise: 206_500_00,
        paymentMode: SalesPaymentMode.NeftRtgs,
        referenceNumber: 'HDFC-N881923019',
        remarks: 'Payment cleared via RTGS',
      },
    ],
  },
];

@Component({
  selector: 'ar-sales-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Commercial sales invoices"
      subtitle="Statutory GST commercial tax invoices, credit notes and debit notes with itemized tax breakdowns and payment receipts."
      help="Issue GST invoices against orders or delivery challans. Compute statutory CGST+SGST or IGST automatically, track outstanding customer balances, and record payments received."
    >
    </ar-topbar>

    <div class="invoices-shell">
      @if (loadError(); as e) {
        <p class="load-error" role="alert">
          {{ e }}
          <button ar-button variant="ghost" (click)="loadInvoices()">Try again</button>
        </p>
      }
      <!-- Summary metrics cards -->
      <div class="metrics-row">
        <div class="metric-card">
          <span class="m-lbl">Total billed</span>
          <span class="m-val">₹{{ totalBilled() / 100 | number: '1.2-2' }}</span>
        </div>
        <div class="metric-card">
          <span class="m-lbl">Collections received</span>
          <span class="m-val text-success">₹{{ totalCollected() / 100 | number: '1.2-2' }}</span>
        </div>
        <div class="metric-card">
          <span class="m-lbl">Outstanding balance</span>
          <span class="m-val text-danger">₹{{ totalOutstanding() / 100 | number: '1.2-2' }}</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-input-wrap">
          <input
            type="text"
            class="ar-input"
            placeholder="Search invoice #, customer or GSTIN..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>
        <div class="status-pills">
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === null"
            (click)="selectedStatus.set(null)"
          >
            All ({{ invoices().length }})
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesInvoiceStatus.Draft"
            (click)="selectedStatus.set(SalesInvoiceStatus.Draft)"
          >
            Draft
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesInvoiceStatus.Issued"
            (click)="selectedStatus.set(SalesInvoiceStatus.Issued)"
          >
            Issued
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesInvoiceStatus.PartiallyPaid"
            (click)="selectedStatus.set(SalesInvoiceStatus.PartiallyPaid)"
          >
            Partially Paid
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesInvoiceStatus.Paid"
            (click)="selectedStatus.set(SalesInvoiceStatus.Paid)"
          >
            Paid
          </button>
        </div>
      </div>

      <!-- Invoices Table -->
      <div class="table-card">
        <table class="ar-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th class="num-col">Subtotal</th>
              <th class="num-col">GST</th>
              <th class="num-col">Grand Total</th>
              <th class="num-col">Balance Due</th>
              <th>Status</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (inv of filteredInvoices(); track inv.id) {
              <tr class="inv-row" (click)="selectedInvoice.set(inv)">
                <td class="font-mono font-bold text-primary">{{ inv.invoiceNumber }}</td>
                <td>
                  <div class="font-semibold">{{ inv.customerName }}</div>
                  @if (inv.customerGstin) {
                    <div class="font-mono text-xs text-muted">{{ inv.customerGstin }}</div>
                  }
                </td>
                <td>{{ inv.issueDateUtc | date: 'dd MMM yyyy' }}</td>
                <td>
                  <span [class.text-danger]="isOverdue(inv)">
                    {{ inv.dueDateUtc | date: 'dd MMM yyyy' }}
                  </span>
                </td>
                <td class="num-col">₹{{ inv.subtotalInPaise / 100 | number: '1.2-2' }}</td>
                <td class="num-col">₹{{ inv.totalTaxInPaise / 100 | number: '1.2-2' }}</td>
                <td class="num-col font-bold">
                  ₹{{ inv.grandTotalInPaise / 100 | number: '1.2-2' }}
                </td>
                <td class="num-col font-bold" [class.text-danger]="inv.balanceDueInPaise > 0">
                  ₹{{ inv.balanceDueInPaise / 100 | number: '1.2-2' }}
                </td>
                <td>
                  <ar-chip [tone]="getStatusTone(inv.status)">
                    {{ getStatusLabel(inv.status) }}
                  </ar-chip>
                </td>
                <td class="actions-col" (click)="$event.stopPropagation()">
                  <div class="row-actions">
                    <button class="action-btn" (click)="selectedInvoice.set(inv)">View</button>
                    @if (inv.status === SalesInvoiceStatus.Draft) {
                      <button class="action-btn primary" (click)="issueInvoice(inv)">Issue</button>
                    }
                    @if (inv.balanceDueInPaise > 0 && inv.status !== SalesInvoiceStatus.Draft) {
                      <button class="action-btn success" (click)="openPaymentDialog(inv)">
                        Pay
                      </button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="10" class="empty-state">No commercial invoices found.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Invoice Details & Printable View Drawer -->
    @if (selectedInvoice(); as inv) {
      <ar-dialog
        [title]="'Tax Invoice: ' + inv.invoiceNumber + ' (' + inv.customerName + ')'"
        (dismiss)="selectedInvoice.set(null)"
      >
        <div class="detail-body">
          <div class="inv-header-box">
            <div class="inv-col">
              <span class="meta-lbl">Billed To</span>
              <div class="font-bold">{{ inv.customerName }}</div>
              <div class="text-xs text-muted">{{ inv.billingAddress || 'Standard Address' }}</div>
              <div class="text-xs font-mono">GSTIN: {{ inv.customerGstin || 'Unregistered' }}</div>
            </div>
            <div class="inv-col text-right">
              <span class="meta-lbl">Invoice Details</span>
              <div class="font-mono font-bold">{{ inv.invoiceNumber }}</div>
              <div class="text-xs">Date: {{ inv.issueDateUtc | date: 'dd MMM yyyy' }}</div>
              <div class="text-xs">Due: {{ inv.dueDateUtc | date: 'dd MMM yyyy' }}</div>
              @if (inv.irn) {
                <div class="text-xs font-mono text-muted" title="{{ inv.irn }}">
                  IRN: {{ inv.irn.substring(0, 16) }}...
                </div>
              }
            </div>
          </div>

          <h4 class="section-title">Line Items & GST Breakdown</h4>
          <table class="ar-table inner-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Part Number & Description</th>
                <th>HSN</th>
                <th class="num-col">Qty</th>
                <th class="num-col">Rate</th>
                <th class="num-col">Taxable</th>
                <th class="num-col">GST</th>
                <th class="num-col">Total</th>
              </tr>
            </thead>
            <tbody>
              @for (l of inv.lines; track l.id) {
                <tr>
                  <td>{{ l.lineNumber }}</td>
                  <td>
                    <div class="font-bold">{{ l.partNumber }}</div>
                    <div class="text-muted text-xs">{{ l.description }}</div>
                  </td>
                  <td class="font-mono text-xs">{{ l.hsnCode || '—' }}</td>
                  <td class="num-col font-bold">{{ l.quantity }}</td>
                  <td class="num-col">₹{{ l.unitPriceInPaise / 100 | number: '1.2-2' }}</td>
                  <td class="num-col">₹{{ l.taxableAmountInPaise / 100 | number: '1.2-2' }}</td>
                  <td class="num-col text-xs">
                    @if (inv.isInterState) {
                      IGST {{ l.igstRateBasisPoints / 100 }}%: ₹{{
                        l.igstAmountInPaise / 100 | number: '1.2-2'
                      }}
                    } @else {
                      CGST {{ l.cgstRateBasisPoints / 100 }}% + SGST
                      {{ l.sgstRateBasisPoints / 100 }}%: ₹{{
                        (l.cgstAmountInPaise + l.sgstAmountInPaise) / 100 | number: '1.2-2'
                      }}
                    }
                  </td>
                  <td class="num-col font-bold">
                    ₹{{ l.lineTotalInPaise / 100 | number: '1.2-2' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <div class="totals-summary">
            <div class="tot-row">
              <span>Taxable Subtotal:</span>
              <span>₹{{ inv.subtotalInPaise / 100 | number: '1.2-2' }}</span>
            </div>
            @if (!inv.isInterState) {
              <div class="tot-row">
                <span>CGST:</span>
                <span>₹{{ inv.cgstInPaise / 100 | number: '1.2-2' }}</span>
              </div>
              <div class="tot-row">
                <span>SGST:</span>
                <span>₹{{ inv.sgstInPaise / 100 | number: '1.2-2' }}</span>
              </div>
            } @else {
              <div class="tot-row">
                <span>IGST:</span>
                <span>₹{{ inv.igstInPaise / 100 | number: '1.2-2' }}</span>
              </div>
            }
            <div class="tot-row grand">
              <span>Invoice Total:</span>
              <span class="font-bold">₹{{ inv.grandTotalInPaise / 100 | number: '1.2-2' }}</span>
            </div>
            <div class="tot-row text-success">
              <span>Paid:</span>
              <span>₹{{ inv.paidAmountInPaise / 100 | number: '1.2-2' }}</span>
            </div>
            <div class="tot-row text-danger font-bold">
              <span>Balance Due:</span>
              <span>₹{{ inv.balanceDueInPaise / 100 | number: '1.2-2' }}</span>
            </div>
          </div>

          @if (inv.payments.length > 0) {
            <h4 class="section-title">Payments Received</h4>
            <table class="ar-table inner-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Ref #</th>
                  <th class="num-col">Amount</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                @for (p of inv.payments; track p.id) {
                  <tr>
                    <td>{{ p.paymentDateUtc | date: 'dd MMM yyyy' }}</td>
                    <td>{{ getPaymentModeLabel(p.paymentMode) }}</td>
                    <td class="font-mono text-xs">{{ p.referenceNumber || '—' }}</td>
                    <td class="num-col font-bold text-success">
                      ₹{{ p.amountInPaise / 100 | number: '1.2-2' }}
                    </td>
                    <td class="text-xs">{{ p.remarks || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }

          <div class="drawer-actions">
            @if (inv.status === SalesInvoiceStatus.Draft) {
              <button ar-button variant="primary" (click)="issueInvoice(inv)">
                Issue Tax Invoice
              </button>
            }
            @if (inv.balanceDueInPaise > 0 && inv.status !== SalesInvoiceStatus.Draft) {
              <button ar-button variant="primary" (click)="openPaymentDialog(inv)">
                Record Payment
              </button>
            }
            <button ar-button variant="ghost" (click)="viewCustomer360(inv.customerId)">
              Customer 360 Dossier
            </button>
          </div>
        </div>
      </ar-dialog>
    }

    <!-- Record Payment Dialog -->
    @if (paymentDialogInvoice(); as inv) {
      <ar-dialog
        [title]="'Record Payment for ' + inv.invoiceNumber"
        (dismiss)="paymentDialogInvoice.set(null)"
      >
        <div class="payment-form">
          <div class="form-group">
            <label>Payment Amount (₹) *</label>
            <input type="number" class="ar-input font-bold" [(ngModel)]="paymentAmountRupees" />
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>Payment Mode *</label>
              <select class="ar-input" [(ngModel)]="paymentMode">
                <option [value]="SalesPaymentMode.NeftRtgs">NEFT / RTGS</option>
                <option [value]="SalesPaymentMode.Upi">UPI</option>
                <option [value]="SalesPaymentMode.Cheque">Cheque</option>
                <option [value]="SalesPaymentMode.Cash">Cash</option>
                <option [value]="SalesPaymentMode.Card">Credit/Debit Card</option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label>UTR / Transaction Ref #</label>
              <input
                type="text"
                class="ar-input font-mono"
                [(ngModel)]="paymentRef"
                placeholder="e.g. UTR-9821034"
              />
            </div>
          </div>
          <div class="form-group">
            <label>Remarks</label>
            <input
              type="text"
              class="ar-input"
              [(ngModel)]="paymentRemarks"
              placeholder="Bank ledger notes"
            />
          </div>

          <div class="dialog-foot">
            <button ar-button variant="ghost" (click)="paymentDialogInvoice.set(null)">
              Cancel
            </button>
            <button ar-button variant="primary" (click)="submitPayment(inv)">
              Confirm Payment
            </button>
          </div>
        </div>
      </ar-dialog>
    }
  `,
  styles: [
    `
      .load-error {
        margin: 0;
        padding: 0.75rem 1rem;
        border: 1px solid var(--ar-bad-200, #fecaca);
        border-radius: 8px;
        background: var(--ar-bad-50, #fef2f2);
        color: var(--ar-bad-700, #b91c1c);
      }
      .load-error button {
        margin-left: 0.5rem;
      }
      .invoices-shell {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .metrics-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }
      .metric-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-line, #e2e8f0);
        padding: 1rem 1.25rem;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .m-lbl {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--ar-ink-muted, #64748b);
      }
      .m-val {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--ar-ink-heavy, #0f172a);
      }
      .text-success {
        color: #059669;
      }
      .text-danger {
        color: #dc2626;
      }
      .text-right {
        text-align: right;
      }
      .filters-bar {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
      }
      .search-input-wrap {
        flex: 1;
        min-width: 280px;
        max-width: 450px;
      }
      .ar-input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        border: 1px solid var(--ar-line-strong, #cbd5e1);
        background: var(--ar-surface, #ffffff);
        color: var(--ar-ink-heavy, #0f172a);
        font-size: 0.875rem;
      }
      .status-pills {
        display: flex;
        gap: 0.375rem;
        flex-wrap: wrap;
      }
      .pill-btn {
        padding: 0.375rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
        background: var(--ar-surface-sunken, #f1f5f9);
        border: 1px solid var(--ar-line, #e2e8f0);
        color: var(--ar-ink-muted, #64748b);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pill-btn.active {
        background: var(--ar-primary, #0284c7);
        color: #ffffff;
        border-color: var(--ar-primary, #0284c7);
      }
      .table-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-line, #e2e8f0);
        border-radius: 8px;
        overflow-x: auto;
      }
      .ar-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
        text-align: left;
      }
      .ar-table th {
        background: var(--ar-surface-sunken, #f8fafc);
        color: var(--ar-ink-muted, #64748b);
        font-weight: 600;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--ar-line, #e2e8f0);
      }
      .ar-table td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--ar-line-weak, #f1f5f9);
        color: var(--ar-ink-heavy, #0f172a);
      }
      .inv-row {
        cursor: pointer;
        transition: background-color 0.1s ease;
      }
      .inv-row:hover {
        background-color: var(--ar-surface-hover, #f8fafc);
      }
      .num-col {
        text-align: right;
      }
      .actions-col {
        text-align: right;
        width: 140px;
      }
      .row-actions {
        display: flex;
        gap: 0.25rem;
        justify-content: flex-end;
      }
      .action-btn {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        border-radius: 4px;
        border: 1px solid var(--ar-line-strong, #cbd5e1);
        background: var(--ar-surface, #ffffff);
        color: var(--ar-ink-heavy, #0f172a);
        cursor: pointer;
      }
      .action-btn.primary {
        background: var(--ar-primary, #0284c7);
        color: #ffffff;
        border-color: var(--ar-primary, #0284c7);
      }
      .action-btn.success {
        background: #059669;
        color: #ffffff;
        border-color: #059669;
      }
      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--ar-ink-muted, #64748b);
      }
      /* Detail */
      .detail-body {
        padding: 1rem 0;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .inv-header-box {
        display: flex;
        justify-content: space-between;
        background: var(--ar-surface-sunken, #f8fafc);
        padding: 1rem;
        border-radius: 6px;
      }
      .meta-lbl {
        display: block;
        font-size: 0.75rem;
        color: var(--ar-ink-muted, #64748b);
        margin-bottom: 0.25rem;
      }
      .section-title {
        font-size: 0.875rem;
        font-weight: 700;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-muted, #64748b);
      }
      .inner-table {
        border: 1px solid var(--ar-line, #e2e8f0);
      }
      .totals-summary {
        margin-left: auto;
        width: 280px;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        padding: 0.75rem 0;
      }
      .tot-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
      }
      .tot-row.grand {
        font-size: 1.125rem;
        border-top: 1px solid var(--ar-line, #e2e8f0);
        padding-top: 0.5rem;
        color: var(--ar-primary, #0284c7);
      }
      .drawer-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line, #e2e8f0);
      }
      /* Payment form */
      .payment-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem 0;
      }
      .form-row {
        display: flex;
        gap: 1rem;
      }
      .flex-1 {
        flex: 1;
      }
      .dialog-foot {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line, #e2e8f0);
      }
    `,
  ],
})
export class ArSalesInvoices {
  private readonly invoiceService = inject(SalesInvoiceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly SalesInvoiceStatus = SalesInvoiceStatus;
  readonly SalesInvoiceKind = SalesInvoiceKind;
  readonly SalesPaymentMode = SalesPaymentMode;

  private readonly toasts = inject(ToastService);

  /** Demo rows only in mock mode; a real workspace sees its own invoices or none. */
  invoices = signal<SalesInvoiceDto[]>(environment.useMockData ? MOCK_INVOICES : []);
  loadError = signal<string | null>(null);
  searchQuery = signal<string>('');
  selectedStatus = signal<SalesInvoiceStatus | null>(null);
  selectedInvoice = signal<SalesInvoiceDto | null>(null);
  paymentDialogInvoice = signal<SalesInvoiceDto | null>(null);

  paymentAmountRupees: number = 0;
  paymentMode: SalesPaymentMode = SalesPaymentMode.NeftRtgs;
  paymentRef: string = '';
  paymentRemarks: string = '';

  totalBilled = computed(() => this.invoices().reduce((acc, i) => acc + i.grandTotalInPaise, 0));
  totalCollected = computed(() => this.invoices().reduce((acc, i) => acc + i.paidAmountInPaise, 0));
  totalOutstanding = computed(() =>
    this.invoices().reduce((acc, i) => acc + i.balanceDueInPaise, 0),
  );

  filteredInvoices = computed(() => {
    let list = this.invoices();
    const st = this.selectedStatus();
    if (st !== null) {
      list = list.filter((i) => i.status === st);
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q) ||
          (i.customerGstin && i.customerGstin.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  constructor() {
    this.loadInvoices();
    // ?open=<id> (from Customer 360 and other links) opens that record's panel.
    const openId = this.route.snapshot.queryParamMap.get('open');
    if (openId && !environment.useMockData) {
      this.invoiceService.get(openId).subscribe({
        next: (record) => {
          if (record) this.selectedInvoice.set(record);
        },
      });
    }
  }

  loadInvoices() {
    if (!environment.useMockData) {
      this.invoiceService.getList({ maxResultCount: 100 }).subscribe({
        next: (res) => {
          this.invoices.set(res?.items ?? []);
          this.loadError.set(null);
        },
        error: (e: unknown) => {
          this.loadError.set(errorMessage(e, 'Invoices could not be loaded.'));
        },
      });
    }
  }

  issueInvoice(inv: SalesInvoiceDto) {
    if (!inv.id) return;
    if (!environment.useMockData) {
      this.invoiceService.issue(inv.id).subscribe({
        next: (updated) => this.updateInvoiceInList(updated),
        error: (e: unknown) =>
          this.toasts.error(errorMessage(e, `${inv.invoiceNumber} could not be issued.`)),
      });
    } else {
      const updated = { ...inv, status: SalesInvoiceStatus.Issued };
      this.updateInvoiceInList(updated);
    }
  }

  openPaymentDialog(inv: SalesInvoiceDto) {
    this.paymentAmountRupees = inv.balanceDueInPaise / 100;
    this.paymentMode = SalesPaymentMode.NeftRtgs;
    this.paymentRef = '';
    this.paymentRemarks = '';
    this.paymentDialogInvoice.set(inv);
  }

  submitPayment(inv: SalesInvoiceDto) {
    if (!inv.id) return;
    const amountInPaise = Math.round(this.paymentAmountRupees * 100);
    const input: RecordSalesInvoicePaymentDto = {
      amountInPaise,
      paymentMode: this.paymentMode,
      referenceNumber: this.paymentRef,
      remarks: this.paymentRemarks,
    };

    if (!environment.useMockData) {
      this.invoiceService.recordPayment(inv.id, input).subscribe({
        next: (updated) => {
          this.updateInvoiceInList(updated);
          this.paymentDialogInvoice.set(null);
        },
        // A failed payment is never shown as recorded: the money would look received when it is not.
        error: (e: unknown) =>
          this.toasts.error(errorMessage(e, 'The payment could not be recorded.')),
      });
    } else {
      this.mockPayment(inv, amountInPaise);
    }
  }

  private mockPayment(inv: SalesInvoiceDto, amountInPaise: number) {
    const newPaid = inv.paidAmountInPaise + amountInPaise;
    const newBal = Math.max(0, inv.grandTotalInPaise - newPaid);
    const newStatus = newBal === 0 ? SalesInvoiceStatus.Paid : SalesInvoiceStatus.PartiallyPaid;

    const payment = {
      id: `pmt-${Date.now()}`,
      salesInvoiceId: inv.id!,
      paymentDateUtc: new Date().toISOString(),
      amountInPaise,
      paymentMode: this.paymentMode,
      referenceNumber: this.paymentRef,
      remarks: this.paymentRemarks,
    };

    const updated: SalesInvoiceDto = {
      ...inv,
      paidAmountInPaise: newPaid,
      balanceDueInPaise: newBal,
      status: newStatus,
      payments: [payment, ...inv.payments],
    };

    this.updateInvoiceInList(updated);
    this.paymentDialogInvoice.set(null);
  }

  viewCustomer360(customerId: string) {
    this.router.navigate(['/contacts', customerId, '360']);
  }

  private updateInvoiceInList(updated: SalesInvoiceDto) {
    this.invoices.update((list) => list.map((i) => (i.id === updated.id ? updated : i)));
    if (this.selectedInvoice()?.id === updated.id) {
      this.selectedInvoice.set(updated);
    }
  }

  isOverdue(inv: SalesInvoiceDto): boolean {
    return inv.balanceDueInPaise > 0 && new Date(inv.dueDateUtc) < new Date();
  }

  getPaymentModeLabel(mode: SalesPaymentMode): string {
    switch (mode) {
      case SalesPaymentMode.NeftRtgs:
        return 'NEFT / RTGS';
      case SalesPaymentMode.Upi:
        return 'UPI';
      case SalesPaymentMode.Cheque:
        return 'Cheque';
      case SalesPaymentMode.Cash:
        return 'Cash';
      case SalesPaymentMode.Card:
        return 'Card';
      default:
        return 'Other';
    }
  }

  getStatusLabel(status: SalesInvoiceStatus): string {
    switch (status) {
      case SalesInvoiceStatus.Draft:
        return 'Draft';
      case SalesInvoiceStatus.Issued:
        return 'Issued';
      case SalesInvoiceStatus.PartiallyPaid:
        return 'Partially Paid';
      case SalesInvoiceStatus.Paid:
        return 'Paid';
      case SalesInvoiceStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getStatusTone(status: SalesInvoiceStatus): ChipTone {
    switch (status) {
      case SalesInvoiceStatus.Draft:
        return 'neutral';
      case SalesInvoiceStatus.Issued:
        return 'teal';
      case SalesInvoiceStatus.PartiallyPaid:
        return 'amber';
      case SalesInvoiceStatus.Paid:
        return 'good';
      case SalesInvoiceStatus.Cancelled:
        return 'bad';
      default:
        return 'neutral';
    }
  }
}
