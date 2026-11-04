import { PermissionService } from '@abp/ng.core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import { checkPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { inr } from '../../../core/util/format';
import {
  SupplierScope,
  readSupplierScope,
  supplierScopeParams,
} from '../../../core/util/supplier-scope';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import { ArSupplierScopeBar } from '../supplier-scope-bar';
import {
  CreateVendorBillLineDto,
  Gstr2bMatchStatus,
  ThreeWayMatchStatus,
  VendorBillDto,
  VendorBillStatus,
  VendorPaymentMode,
  VendorBillService,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ChipTone } from '../../../ui';

const MOCK_BILLS: VendorBillDto[] = [
  {
    id: 'vb-1',
    billNumber: 'VB-2026-0089',
    vendorInvoiceNumber: 'INV-BPG-8912',
    vendorInvoiceDateUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    supplierId: 'sup-1',
    supplierName: 'Bharat Precision Gears Pvt Ltd',
    supplierGstin: '27AABCB1234F1Z5',
    purchaseOrderId: 'po-101',
    purchaseOrderReference: 'PO-2026-089',
    goodsReceiptNoteId: 'grn-1',
    goodsReceiptNoteNumber: 'GRN-2026-0104',
    status: VendorBillStatus.Approved,
    threeWayMatchStatus: ThreeWayMatchStatus.Matched,
    dueDateUtc: new Date(Date.now() + 27 * 86_400_000).toISOString(),
    subtotalInPaise: 305_000_00,
    discountInPaise: 0,
    cgstInPaise: 27_450_00,
    sgstInPaise: 27_450_00,
    igstInPaise: 0,
    totalTaxInPaise: 54_900_00,
    tdsSection: '194Q',
    tdsRateBasisPoints: 10, // 0.1% TDS
    tdsDeductedInPaise: 305_00,
    grandTotalInPaise: 359_900_00,
    netPayableInPaise: 359_595_00,
    paidAmountInPaise: 0,
    balanceDueInPaise: 359_595_00,
    gstr2bMatchStatus: Gstr2bMatchStatus.MatchedIn2B,
    isReverseCharge: false,
    remarks: 'P2P 3-way matched against GRN-2026-0104 and PO-2026-089.',
    creationTime: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'vbl-1',
        vendorBillId: 'vb-1',
        lineNumber: 1,
        partNumber: 'GR-HEL-120',
        description: 'Hardened Helical Gear 120mm OD Module 3',
        hsnCode: '84834000',
        billedQuantity: 50,
        unitPriceInPaise: 4200_00,
        discountPercent: 0,
        taxableAmountInPaise: 210_000_00,
        taxRateBasisPoints: 1800,
        cgstAmountInPaise: 18_900_00,
        sgstAmountInPaise: 18_900_00,
        igstAmountInPaise: 0,
        lineTotalInPaise: 247_800_00,
      },
      {
        id: 'vbl-2',
        vendorBillId: 'vb-1',
        lineNumber: 2,
        partNumber: 'PN-SH-040',
        description: 'EN24 Pinion Shaft Induction Hardened',
        hsnCode: '84831099',
        billedQuantity: 25,
        unitPriceInPaise: 3800_00,
        discountPercent: 0,
        taxableAmountInPaise: 95_000_00,
        taxRateBasisPoints: 1800,
        cgstAmountInPaise: 8_550_00,
        sgstAmountInPaise: 8_550_00,
        igstAmountInPaise: 0,
        lineTotalInPaise: 112_100_00,
      },
    ],
    payments: [],
  },
  {
    id: 'vb-2',
    billNumber: 'VB-2026-0082',
    vendorInvoiceNumber: 'INV-SF-2026-77',
    vendorInvoiceDateUtc: new Date(Date.now() - 12 * 86_400_000).toISOString(),
    supplierId: 'sup-3',
    supplierName: 'Sundram Fasteners Automotive',
    supplierGstin: '33AABCS9821L1ZM',
    purchaseOrderId: 'po-099',
    purchaseOrderReference: 'PO-2026-081',
    goodsReceiptNoteId: 'grn-3',
    goodsReceiptNoteNumber: 'GRN-2026-0103',
    status: VendorBillStatus.PartiallyPaid,
    threeWayMatchStatus: ThreeWayMatchStatus.PriceVariance,
    dueDateUtc: new Date(Date.now() + 18 * 86_400_000).toISOString(),
    subtotalInPaise: 44_400_00,
    discountInPaise: 0,
    cgstInPaise: 0,
    sgstInPaise: 0,
    igstInPaise: 7_992_00,
    totalTaxInPaise: 7_992_00,
    tdsSection: '194Q',
    tdsRateBasisPoints: 10,
    tdsDeductedInPaise: 44_40,
    grandTotalInPaise: 52_392_00,
    netPayableInPaise: 52_347_60,
    paidAmountInPaise: 30_000_00,
    balanceDueInPaise: 22_347_60,
    gstr2bMatchStatus: Gstr2bMatchStatus.MatchedIn2B,
    isReverseCharge: false,
    remarks: 'Discrepancy: PO unit rate was Rs.235, invoice billed at Rs.240. Debit note pending.',
    creationTime: new Date(Date.now() - 12 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'vbl-3',
        vendorBillId: 'vb-2',
        lineNumber: 1,
        partNumber: 'BLT-M16-109',
        description: 'Grade 10.9 Flange Head Bolt M16x90mm Zn-Ni Coated',
        hsnCode: '73181500',
        billedQuantity: 185,
        unitPriceInPaise: 240_00,
        discountPercent: 0,
        taxableAmountInPaise: 44_400_00,
        taxRateBasisPoints: 1800,
        cgstAmountInPaise: 0,
        sgstAmountInPaise: 0,
        igstAmountInPaise: 7_992_00,
        lineTotalInPaise: 52_392_00,
      },
    ],
    payments: [
      {
        id: 'vbp-1',
        vendorBillId: 'vb-2',
        paymentDateUtc: new Date(Date.now() - 4 * 86_400_000).toISOString(),
        amountInPaise: 30_000_00,
        paymentMode: VendorPaymentMode.NeftRtgs,
        referenceNumber: 'CMS/RTGS/HDFC998231',
        tdsCertificateNumber: 'TDS-Q4-2026-99',
        remarks: 'Part payment released on approval.',
      },
    ],
  },
];

@Component({
  standalone: true,
  selector: 'ar-vendor-bills',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, ArTopbar, ArButton, ArChip, ArSupplierScopeBar],
  template: `
    <ar-topbar
      title="Vendor Bills & 3-Way Matching"
      subtitle="Purchase invoices, 3-way reconciliation (PO-GRN-Bill), GST ITC & TDS"
    >
      @if (can().create) {
        <button ar-button variant="ai" icon="upload" (click)="openCreatePage(true)">
          Upload bill
        </button>
        <button ar-button variant="primary" icon="plus" (click)="openCreatePage()">
          Record vendor bill
        </button>
      }
    </ar-topbar>

    <div class="page-content ar-scroll ar-scroll--bare">
      @if (scope(); as sc) {
        <ar-supplier-scope-bar [name]="sc.name" what="vendor bills" (showAll)="clearScope()" />
      }
      @if (loadError(); as e) {
        <p class="load-error" role="alert">{{ e }}</p>
      }
      <!-- Financial KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Total Invoiced</span>
          <strong class="value">₹{{ totalInvoiced() / 100 | number: '1.2-2' }}</strong>
          <span class="sub">{{ allBills().length }} bills booked</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Total Paid</span>
          <strong class="value">₹{{ totalPaid() / 100 | number: '1.2-2' }}</strong>
          <span class="sub">Disbursed via NEFT / RTGS</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Outstanding Payable</span>
          <strong class="value">₹{{ outstandingPayable() / 100 | number: '1.2-2' }}</strong>
          <span class="sub">Net of TDS deductions</span>
        </div>
        <div class="kpi-card red" *ngIf="varianceCount() > 0">
          <span class="label">3-Way Variance</span>
          <strong class="value">{{ varianceCount() }}</strong>
          <span class="sub">Requires buyer review / debit note</span>
        </div>
        <div class="kpi-card teal" *ngIf="varianceCount() === 0">
          <span class="label">3-Way Match</span>
          <strong class="value">100%</strong>
          <span class="sub">All bills aligned with PO & GRN</span>
        </div>
      </section>

      <!-- Filter bar -->
      <section class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="input-search"
            placeholder="Search Bill #, Vendor Invoice #, Supplier, PO #, GRN #..."
            [ngModel]="filterQuery()"
            (ngModelChange)="filterQuery.set($event)"
          />
        </div>
        <div class="filter-chips">
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === null"
            (click)="selectedStatus.set(null)"
          >
            All Bills ({{ allBills().length }})
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === VendorBillStatus.PendingApproval"
            (click)="selectedStatus.set(VendorBillStatus.PendingApproval)"
          >
            Pending Approval
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === VendorBillStatus.Approved"
            (click)="selectedStatus.set(VendorBillStatus.Approved)"
          >
            Approved
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === VendorBillStatus.PartiallyPaid"
            (click)="selectedStatus.set(VendorBillStatus.PartiallyPaid)"
          >
            Partially Paid
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === VendorBillStatus.Paid"
            (click)="selectedStatus.set(VendorBillStatus.Paid)"
          >
            Fully Paid
          </button>
        </div>
      </section>

      <!-- Bills Table -->
      <section class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Bill & Invoice #</th>
              <th>Supplier & GSTIN</th>
              <th>PO & GRN Matching</th>
              <th>3-Way Match</th>
              <th>GSTR-2B ITC</th>
              <th class="text-right">Total (Inc Tax)</th>
              <th class="text-right">Balance Due</th>
              <th>Status</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of filteredBills()">
              <td>
                <div class="cell-main">
                  <a
                    class="code-link"
                    [routerLink]="['/purchasing/bills', b.id]"
                    [queryParams]="scopeParams()"
                    >{{ b.billNumber }}</a
                  >
                  <span class="sub-text"
                    >Inv: <strong>{{ b.vendorInvoiceNumber }}</strong></span
                  >
                  <span class="sub-text"
                    >Dated: {{ b.vendorInvoiceDateUtc | date: 'mediumDate' }}</span
                  >
                </div>
              </td>
              <td>
                <div class="cell-main">
                  <strong>{{ b.supplierName }}</strong>
                  <span class="gstin-badge font-mono">{{ b.supplierGstin || 'Unregistered' }}</span>
                  <span class="sub-text">Due: {{ b.dueDateUtc | date: 'mediumDate' }}</span>
                </div>
              </td>
              <td>
                <div class="cell-main">
                  <span class="sub-text">PO: {{ b.purchaseOrderReference || 'Direct' }}</span>
                  <span class="sub-text">GRN: {{ b.goodsReceiptNoteNumber || 'Direct' }}</span>
                </div>
              </td>
              <td>
                <ar-chip [tone]="matchTone(b.threeWayMatchStatus)">
                  {{ matchLabel(b.threeWayMatchStatus) }}
                </ar-chip>
              </td>
              <td>
                <ar-chip [tone]="itcTone(b.gstr2bMatchStatus)">
                  {{ itcLabel(b.gstr2bMatchStatus) }}
                </ar-chip>
              </td>
              <td class="text-right font-mono">
                <strong>₹{{ b.grandTotalInPaise / 100 | number: '1.2-2' }}</strong>
                <div class="tax-sub text-muted" *ngIf="b.totalTaxInPaise > 0">
                  Tax: ₹{{ b.totalTaxInPaise / 100 | number: '1.2-2' }}
                </div>
                <div class="tax-sub text-danger" *ngIf="b.tdsDeductedInPaise > 0">
                  TDS: -₹{{ b.tdsDeductedInPaise / 100 | number: '1.2-2' }}
                </div>
              </td>
              <td class="text-right font-mono">
                <span
                  [class.text-danger]="b.balanceDueInPaise > 0"
                  [class.text-good]="b.balanceDueInPaise === 0"
                >
                  ₹{{ b.balanceDueInPaise / 100 | number: '1.2-2' }}
                </span>
              </td>
              <td>
                <ar-chip [tone]="billTone(b.status)">
                  {{ billLabel(b.status) }}
                </ar-chip>
              </td>
              <td class="actions-col">
                <div class="action-buttons">
                  <button
                    ar-button
                    variant="ghost"
                    *ngIf="can().approve && canApprove(b)"
                    (click)="approveBill(b)"
                  >
                    Approve
                  </button>
                  <button
                    ar-button
                    variant="primary"
                    *ngIf="can().pay && canPay(b)"
                    (click)="payPage(b)"
                  >
                    Pay
                  </button>
                  <a
                    ar-button
                    variant="quiet"
                    [routerLink]="['/purchasing/bills', b.id]"
                    [queryParams]="scopeParams()"
                    >View</a
                  >
                </div>
              </td>
            </tr>
            <tr *ngIf="filteredBills().length === 0">
              <td colspan="9" class="empty-state">
                <p>No vendor bills found matching your filter criteria.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      }

      .load-error {
        margin: 0;
        padding: 0.75rem 1rem;
        border: 1px solid #fecaca;
        border-radius: 8px;
        background: #fef2f2;
        color: #991b1b;
        font-size: 0.85rem;
      }

      .page-content {
        flex: 1;
        min-height: 0;
        padding: 1.5rem 2rem 3rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .page-content > * {
        flex-shrink: 0;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 1rem;
      }

      .kpi-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        padding: 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);

        &.amber {
          border-left: 4px solid #f59e0b;
        }
        &.teal {
          border-left: 4px solid #0d9488;
        }
        &.red {
          border-left: 4px solid #ef4444;
        }

        .label {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--ar-text-muted, #64748b);
          font-weight: 600;
        }

        .value {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--ar-text-primary, #0f172a);
        }

        .sub {
          font-size: 0.75rem;
          color: var(--ar-text-secondary, #94a3b8);
        }
      }

      .filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .search-box {
        flex: 1;
        min-width: 280px;

        .input-search {
          width: 100%;
          padding: 0.5rem 0.85rem;
          border: 1px solid var(--ar-border, #cbd5e1);
          border-radius: 6px;
          font-size: 0.875rem;
          background: var(--ar-surface, #ffffff);
        }
      }

      .filter-chips {
        display: flex;
        gap: 0.5rem;

        .chip-filter {
          padding: 0.35rem 0.85rem;
          font-size: 0.8rem;
          border-radius: 20px;
          border: 1px solid var(--ar-border, #cbd5e1);
          background: var(--ar-surface, #ffffff);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.15s ease;

          &.active {
            background: var(--ar-primary, #1e293b);
            color: #ffffff;
            border-color: var(--ar-primary, #1e293b);
          }
        }
      }

      .table-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        overflow-x: auto;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.85rem;

        th {
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          font-size: 0.72rem;
          letter-spacing: 0.05em;
        }

        td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #f8fafc;
        }

        tbody tr.selected {
          background: #f1f5f9;
        }
      }

      .cell-main {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;

        .code-link {
          font-family: ui-monospace, monospace;
          font-weight: 600;
          color: #2563eb;
          cursor: pointer;
          text-decoration: underline;
        }

        .sub-text {
          font-size: 0.74rem;
          color: #64748b;
        }
      }

      .gstin-badge {
        font-size: 0.75rem;
        color: #475569;
        background: #f1f5f9;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        width: fit-content;
      }

      .tax-sub {
        font-size: 0.72rem;
      }

      .actions-col {
        text-align: right;
      }

      .action-buttons {
        display: flex;
        gap: 0.35rem;
        justify-content: flex-end;
      }

      .dialog-body {
        padding: 1rem 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .meta-status {
        display: flex;
        gap: 0.5rem;
      }

      .grid-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .info-card {
        background: #f8fafc;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        border: 1px solid #e2e8f0;

        h5 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
          text-transform: uppercase;
          color: #64748b;
        }

        p {
          margin: 0.2rem 0;
          font-size: 0.82rem;
        }
      }

      .lines-table-wrapper {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow-x: auto;
      }

      .dialog-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;

        th {
          background: #f8fafc;
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }

        td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
        }
      }

      .payment-highlight {
        display: flex;
        justify-content: space-between;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        padding: 0.85rem 1.25rem;
        border-radius: 6px;

        span {
          font-size: 0.75rem;
          color: #166534;
          text-transform: uppercase;
        }

        h3,
        h4 {
          margin: 0.2rem 0 0 0;
          color: #14532d;
        }
      }

      .text-right {
        text-align: right;
      }
      .text-good {
        color: #15803d;
      }
      .text-danger {
        color: #b91c1c;
      }
      .font-mono {
        font-family: ui-monospace, monospace;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
        }

        .form-control {
          padding: 0.45rem 0.65rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.82rem;
        }
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      .dialog-intro {
        font-size: 0.85rem;
        color: #475569;
        margin: 0;
      }

      .empty-state {
        text-align: center;
        padding: 2.5rem;
        color: #94a3b8;
      }
    `,
  ],
})
export class VendorBillsComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly permissions = inject(PermissionService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly billService = inject(VendorBillService);

  readonly VendorBillStatus = VendorBillStatus;
  /** What this role may do here besides reading (each action's API permission). */
  protected readonly can = computed(() => {
    const has = (p: string) => checkPolicy(p, this.permissions);
    return {
      create: has(PURCHASING_PERMISSIONS.createBill),
      approve: has(PURCHASING_PERMISSIONS.approveBill),
      pay: has(PURCHASING_PERMISSIONS.payBill),
    };
  });

  readonly ThreeWayMatchStatus = ThreeWayMatchStatus;
  readonly Gstr2bMatchStatus = Gstr2bMatchStatus;
  readonly VendorPaymentMode = VendorPaymentMode;

  /** Opened from Vendor 360 for one supplier: only theirs, and new records are for them. */
  protected readonly scope = signal<SupplierScope | null>(readSupplierScope());
  protected readonly loadError = signal<string | null>(null);
  readonly allBills = signal<VendorBillDto[]>(environment.useMockData ? MOCK_BILLS : []);
  readonly filterQuery = signal<string>('');
  readonly selectedStatus = signal<VendorBillStatus | null>(null);

  readonly filteredBills = computed(() => {
    let list = this.allBills();
    const q = this.filterQuery().toLowerCase().trim();
    const s = this.selectedStatus();

    if (s !== null) {
      list = list.filter((x) => x.status === s);
    }

    if (q) {
      list = list.filter(
        (x) =>
          x.billNumber.toLowerCase().includes(q) ||
          x.vendorInvoiceNumber.toLowerCase().includes(q) ||
          x.supplierName.toLowerCase().includes(q) ||
          (x.purchaseOrderReference && x.purchaseOrderReference.toLowerCase().includes(q)) ||
          (x.goodsReceiptNoteNumber && x.goodsReceiptNoteNumber.toLowerCase().includes(q)),
      );
    }

    return list;
  });

  readonly totalInvoiced = computed(() =>
    this.allBills().reduce((acc, b) => acc + b.grandTotalInPaise, 0),
  );

  readonly totalPaid = computed(() =>
    this.allBills().reduce((acc, b) => acc + b.paidAmountInPaise, 0),
  );

  readonly outstandingPayable = computed(() =>
    this.allBills().reduce((acc, b) => acc + b.balanceDueInPaise, 0),
  );

  readonly varianceCount = computed(
    () =>
      this.allBills().filter(
        (b) =>
          b.threeWayMatchStatus === ThreeWayMatchStatus.PriceVariance ||
          b.threeWayMatchStatus === ThreeWayMatchStatus.QuantityVariance,
      ).length,
  );

  constructor() {
    this.openRequested();
    this.loadData();
    this.checkQueryParams();
  }

  protected clearScope(): void {
    this.scope.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.loadData();
  }

  /** List links keep the supplier scope, so the way back returns to it. */
  protected readonly scopeParams = computed(() => {
    const sc = this.scope();
    return sc ? supplierScopeParams(sc) : {};
  });

  /** `?open=<id>` (from Vendor 360 and older links) opens that bill's own page. */
  private openRequested(): void {
    const id = this.route.snapshot.queryParamMap.get('open');
    if (id) {
      void this.router.navigate(['/purchasing/bills', id], {
        queryParams: this.scopeParams(),
        replaceUrl: true,
      });
    }
  }

  loadData() {
    if (!environment.useMockData) {
      this.billService
        .getList({ maxResultCount: 50, supplierId: this.scope()?.supplierId ?? undefined })
        .subscribe({
          next: (res) => {
            this.allBills.set(res?.items ?? []);
            this.loadError.set(null);
          },
          error: () => this.loadError.set('Vendor bills could not be loaded.'),
        });
    }
  }

  /** Older links (`?new=1`, `?grnId=`) open the Record vendor bill page. */
  private checkQueryParams() {
    const q = this.route.snapshot.queryParamMap;
    const grn = q.get('grnId');
    if (!q.get('new') && !grn) return;
    const sc = this.scope();
    void this.router.navigate(['/purchasing/bills/new'], {
      queryParams: grn ? { grn } : sc ? supplierScopeParams(sc) : {},
      replaceUrl: true,
    });
  }

  async approveBill(b: VendorBillDto) {
    if (!b.id) return;
    const ok = await this.confirm.confirm({
      title: `Approve ${b.billNumber}?`,
      message: `Approved, it can be paid. ${inr(b.netPayableInPaise)} becomes payable to ${b.supplierName}.`,
      details: [`Invoice ${b.vendorInvoiceNumber}`],
      confirmText: 'Approve',
      tone: 'primary',
    });
    if (!ok) return;
    if (environment.useMockData) {
      this.updateBillInState({ ...b, status: VendorBillStatus.Approved });
      return;
    }
    try {
      const saved = await firstValueFrom(this.billService.approve(b.id, { skipHandleError: true }));
      this.updateBillInState(saved);
      this.toasts.success(`${saved.billNumber} approved.`);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The bill could not be approved.'), 'Not approved');
    }
  }

  /** Paying opens the bill's page with the payment form ready. */
  payPage(b: VendorBillDto) {
    void this.router.navigate(['/purchasing/bills', b.id], {
      queryParams: { ...this.scopeParams(), pay: 1 },
    });
  }

  /** Recording a bill has its own page; opened for the supplier in scope, if any. */
  openCreatePage(upload = false) {
    const sc = this.scope();
    void this.router.navigate(['/purchasing/bills/new'], {
      queryParams: { ...(sc ? supplierScopeParams(sc) : {}), ...(upload ? { upload: 1 } : {}) },
    });
  }

  /** Draft and pending bills can be approved (the API's rule). */
  canApprove(b: VendorBillDto): boolean {
    return b.status === VendorBillStatus.Draft || b.status === VendorBillStatus.PendingApproval;
  }

  /** Approved bills with something left to pay. */
  canPay(b: VendorBillDto): boolean {
    return (
      b.balanceDueInPaise > 0 &&
      (b.status === VendorBillStatus.Approved || b.status === VendorBillStatus.PartiallyPaid)
    );
  }

  private updateBillInState(updated: VendorBillDto) {
    this.allBills.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
  }

  paymentModeLabel(mode: VendorPaymentMode): string {
    switch (mode) {
      case VendorPaymentMode.NeftRtgs:
        return 'NEFT / RTGS';
      case VendorPaymentMode.Cheque:
        return 'Cheque';
      case VendorPaymentMode.Upi:
        return 'UPI';
      case VendorPaymentMode.Cash:
        return 'Cash';
      default:
        return 'Bank';
    }
  }

  matchTone(status: ThreeWayMatchStatus): ChipTone {
    switch (status) {
      case ThreeWayMatchStatus.Matched:
        return 'good';
      case ThreeWayMatchStatus.PriceVariance:
      case ThreeWayMatchStatus.QuantityVariance:
        return 'bad';
      case ThreeWayMatchStatus.ManualOverride:
        return 'teal';
      default:
        return 'neutral';
    }
  }

  matchLabel(status: ThreeWayMatchStatus): string {
    switch (status) {
      case ThreeWayMatchStatus.Matched:
        return 'Matched (3-Way)';
      case ThreeWayMatchStatus.PriceVariance:
        return 'Price Discrepancy';
      case ThreeWayMatchStatus.QuantityVariance:
        return 'Qty Discrepancy';
      case ThreeWayMatchStatus.ManualOverride:
        return 'Overridden';
      default:
        return 'Pending Match';
    }
  }

  itcTone(status: Gstr2bMatchStatus): ChipTone {
    switch (status) {
      case Gstr2bMatchStatus.MatchedIn2B:
        return 'good';
      case Gstr2bMatchStatus.MissingIn2B:
        return 'bad';
      case Gstr2bMatchStatus.TaxMismatch:
        return 'warn';
      default:
        return 'neutral';
    }
  }

  itcLabel(status: Gstr2bMatchStatus): string {
    switch (status) {
      case Gstr2bMatchStatus.MatchedIn2B:
        return 'GSTR-2B ITC OK';
      case Gstr2bMatchStatus.MissingIn2B:
        return 'Missing in 2B';
      case Gstr2bMatchStatus.TaxMismatch:
        return 'Tax Mismatch';
      default:
        return 'ITC Pending';
    }
  }

  billTone(status: VendorBillStatus): ChipTone {
    switch (status) {
      case VendorBillStatus.Paid:
        return 'good';
      case VendorBillStatus.PartiallyPaid:
        return 'amber';
      case VendorBillStatus.Approved:
        return 'teal';
      case VendorBillStatus.Cancelled:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  billLabel(status: VendorBillStatus): string {
    switch (status) {
      case VendorBillStatus.Paid:
        return 'Fully Paid';
      case VendorBillStatus.PartiallyPaid:
        return 'Partially Paid';
      case VendorBillStatus.Approved:
        return 'Approved';
      case VendorBillStatus.Cancelled:
        return 'Cancelled';
      case VendorBillStatus.PendingApproval:
        return 'Pending Approval';
      default:
        return 'Draft';
    }
  }
}
