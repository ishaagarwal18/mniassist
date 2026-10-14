import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  CreateVendorBillDto,
  CreateVendorBillLineDto,
  Gstr2bMatchStatus,
  RecordVendorBillPaymentDto,
  ThreeWayMatchStatus,
  VendorBillDto,
  VendorBillStatus,
  VendorPaymentMode,
  VendorBillService,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

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
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArChip, ArDialog],
  template: `
    <ar-topbar
      title="Vendor Bills & 3-Way Matching"
      subtitle="Purchase invoices, 3-way reconciliation (PO-GRN-Bill), GST ITC & TDS"
    >
      <button ar-button="primary" (click)="openCreateModal()">+ Record Vendor Bill</button>
    </ar-topbar>

    <div class="page-content">
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
            <tr *ngFor="let b of filteredBills()" [class.selected]="selectedBill()?.id === b.id">
              <td>
                <div class="cell-main">
                  <a class="code-link" (click)="viewBill(b)">{{ b.billNumber }}</a>
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
                    ar-button="ghost"
                    *ngIf="b.status === VendorBillStatus.PendingApproval"
                    (click)="approveBill(b)"
                  >
                    Approve
                  </button>
                  <button
                    ar-button="primary"
                    *ngIf="b.balanceDueInPaise > 0 && b.status !== VendorBillStatus.Cancelled"
                    (click)="openPaymentDialog(b)"
                  >
                    Pay
                  </button>
                  <button ar-button="quiet" (click)="viewBill(b)">View</button>
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

    <!-- Bill Details Dossier Dialog -->
    <ar-dialog
      *ngIf="selectedBill()"
      [title]="
        'Vendor Bill: ' +
        selectedBill()!.billNumber +
        ' (' +
        selectedBill()!.vendorInvoiceNumber +
        ')'
      "
      (dismiss)="selectedBill.set(null)"
    >
      <div class="dialog-body" *ngIf="selectedBill() as b">
        <div class="meta-row">
          <div>
            <span class="meta-label">Vendor / Supplier</span>
            <h4>{{ b.supplierName }}</h4>
            <p class="sub-text">
              GSTIN: <span class="font-mono">{{ b.supplierGstin || 'Not provided' }}</span>
            </p>
          </div>
          <div class="meta-status">
            <ar-chip [tone]="billTone(b.status)">{{ billLabel(b.status) }}</ar-chip>
            <ar-chip [tone]="matchTone(b.threeWayMatchStatus)"
              >3-Way: {{ matchLabel(b.threeWayMatchStatus) }}</ar-chip
            >
            <ar-chip [tone]="itcTone(b.gstr2bMatchStatus)"
              >ITC: {{ itcLabel(b.gstr2bMatchStatus) }}</ar-chip
            >
          </div>
        </div>

        <div class="grid-details">
          <div class="info-card">
            <h5>P2P Linkage & Dates</h5>
            <p>
              <strong>Vendor Invoice Date:</strong>
              {{ b.vendorInvoiceDateUtc | date: 'mediumDate' }}
            </p>
            <p><strong>Payment Due Date:</strong> {{ b.dueDateUtc | date: 'mediumDate' }}</p>
            <p>
              <strong>Purchase Order Ref:</strong>
              {{ b.purchaseOrderReference || 'Direct Booking' }}
            </p>
            <p><strong>Goods Receipt Note:</strong> {{ b.goodsReceiptNoteNumber || 'Direct' }}</p>
          </div>
          <div class="info-card">
            <h5>Tax Withholding & Compliance</h5>
            <p>
              <strong>TDS Section:</strong> {{ b.tdsSection || 'N/A' }} ({{
                b.tdsRateBasisPoints / 100
              }}%)
            </p>
            <p>
              <strong>TDS Deducted:</strong> ₹{{ b.tdsDeductedInPaise / 100 | number: '1.2-2' }}
            </p>
            <p>
              <strong>Net Payable to Vendor:</strong>
              <strong>₹{{ b.netPayableInPaise / 100 | number: '1.2-2' }}</strong>
            </p>
            <p><strong>Reverse Charge (RCM):</strong> {{ b.isReverseCharge ? 'Yes' : 'No' }}</p>
          </div>
        </div>

        <h5 class="mt-4 mb-2">Billed Line Items (HSN & GST Breakdown)</h5>
        <div class="lines-table-wrapper">
          <table class="dialog-table">
            <thead>
              <tr>
                <th>Part No</th>
                <th>Description</th>
                <th>HSN</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Taxable</th>
                <th class="text-right">GST</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of b.lines">
                <td class="font-mono">
                  <strong>{{ line.partNumber }}</strong>
                </td>
                <td>{{ line.description }}</td>
                <td class="font-mono">{{ line.hsnCode || '—' }}</td>
                <td class="text-right font-mono">{{ line.billedQuantity }}</td>
                <td class="text-right font-mono">
                  ₹{{ line.unitPriceInPaise / 100 | number: '1.2-2' }}
                </td>
                <td class="text-right font-mono">
                  ₹{{ line.taxableAmountInPaise / 100 | number: '1.2-2' }}
                </td>
                <td class="text-right font-mono">{{ line.taxRateBasisPoints / 100 }}%</td>
                <td class="text-right font-mono">
                  <strong>₹{{ line.lineTotalInPaise / 100 | number: '1.2-2' }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Payment History if any -->
        <h5 class="mt-4 mb-2" *ngIf="b.payments.length > 0">Disbursement & Settlement History</h5>
        <div class="lines-table-wrapper" *ngIf="b.payments.length > 0">
          <table class="dialog-table">
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Mode</th>
                <th>Bank UTR / Reference</th>
                <th>TDS Cert Ref</th>
                <th class="text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of b.payments">
                <td>{{ p.paymentDateUtc | date: 'mediumDate' }}</td>
                <td>
                  <span class="font-mono">{{ paymentModeLabel(p.paymentMode) }}</span>
                </td>
                <td class="font-mono">{{ p.referenceNumber || '—' }}</td>
                <td>{{ p.tdsCertificateNumber || 'Form 16A Pending' }}</td>
                <td class="text-right font-mono text-good">
                  <strong>₹{{ p.amountInPaise / 100 | number: '1.2-2' }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="dialog-actions mt-4">
          <button
            ar-button="primary"
            *ngIf="b.balanceDueInPaise > 0"
            (click)="openPaymentDialog(b)"
          >
            Disburse Payment (₹{{ b.balanceDueInPaise / 100 | number: '1.2-2' }})
          </button>
          <button
            ar-button="ghost"
            *ngIf="b.gstr2bMatchStatus !== Gstr2bMatchStatus.MatchedIn2B"
            (click)="reconcileItc(b)"
          >
            Mark GSTR-2B Reconciled
          </button>
          <button ar-button="quiet" (click)="selectedBill.set(null)">Close</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Record Payment Dialog -->
    <ar-dialog
      *ngIf="payingBill()"
      title="Disburse Vendor Payment"
      (dismiss)="payingBill.set(null)"
    >
      <div class="dialog-body" *ngIf="payingBill() as b">
        <p class="dialog-intro">
          Record bank payment for <strong>{{ b.billNumber }}</strong> to
          <strong>{{ b.supplierName }}</strong
          >.
        </p>

        <div class="payment-highlight">
          <div>
            <span>Net Balance Due:</span>
            <h3>₹{{ b.balanceDueInPaise / 100 | number: '1.2-2' }}</h3>
          </div>
          <div>
            <span>Statutory TDS Withheld:</span>
            <h4>₹{{ b.tdsDeductedInPaise / 100 | number: '1.2-2' }}</h4>
          </div>
        </div>

        <div class="form-grid mb-3">
          <div class="form-group">
            <label>Payment Amount (₹) *</label>
            <input type="number" class="form-control" [(ngModel)]="paymentModel.amountRupees" />
          </div>
          <div class="form-group">
            <label>Disbursement Mode *</label>
            <select class="form-control" [(ngModel)]="paymentModel.paymentMode">
              <option [ngValue]="VendorPaymentMode.NeftRtgs">NEFT / RTGS Bank Transfer</option>
              <option [ngValue]="VendorPaymentMode.Upi">Corporate UPI</option>
              <option [ngValue]="VendorPaymentMode.Cheque">Cheque</option>
              <option [ngValue]="VendorPaymentMode.Cash">Petty Cash</option>
            </select>
          </div>
          <div class="form-group">
            <label>Bank UTR / Transaction Reference *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="paymentModel.referenceNumber"
              placeholder="e.g. HDFCR52026100912"
            />
          </div>
          <div class="form-group">
            <label>TDS Certificate (Form 16A / Challan Ref)</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="paymentModel.tdsCertificateNumber"
              placeholder="e.g. TDS-CH-2026-Q3-019"
            />
          </div>
        </div>

        <div class="form-group mb-3">
          <label>Payment Remarks</label>
          <input
            type="text"
            class="form-control"
            [(ngModel)]="paymentModel.remarks"
            placeholder="e.g. Account payee transfer via HDFC NetBanking"
          />
        </div>

        <div class="dialog-actions">
          <button ar-button="primary" (click)="savePayment()">Confirm & Record Disbursement</button>
          <button ar-button="ghost" (click)="payingBill.set(null)">Cancel</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Create Vendor Bill Modal -->
    <ar-dialog
      *ngIf="showCreateModal()"
      title="Record Vendor Bill (Purchase Invoice)"
      (dismiss)="showCreateModal.set(false)"
    >
      <div class="dialog-body">
        <div class="form-grid mb-3">
          <div class="form-group">
            <label>Supplier Name *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newBill.supplierName"
              placeholder="Bharat Precision Gears Pvt Ltd"
            />
          </div>
          <div class="form-group">
            <label>Supplier GSTIN</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newBill.supplierGstin"
              placeholder="27AABCB1234F1Z5"
            />
          </div>
          <div class="form-group">
            <label>Vendor Invoice Number *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newBill.vendorInvoiceNumber"
              placeholder="INV-2026-4412"
            />
          </div>
          <div class="form-group">
            <label>PO Reference</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newBill.purchaseOrderReference"
              placeholder="PO-2026-089"
            />
          </div>
          <div class="form-group">
            <label>GRN Number</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newBill.goodsReceiptNoteNumber"
              placeholder="GRN-2026-0104"
            />
          </div>
          <div class="form-group">
            <label>TDS Withholding Section</label>
            <select class="form-control" [(ngModel)]="newBill.tdsSection">
              <option value="194Q">Sec 194Q - Purchase of Goods (0.1%)</option>
              <option value="194C">Sec 194C - Contractor/Fabrication (1% / 2%)</option>
              <option value="194J">Sec 194J - Technical Fees (2% / 10%)</option>
              <option value="None">None (Exempt / Threshold not reached)</option>
            </select>
          </div>
        </div>

        <h5 class="mb-2">Billed Line Items</h5>
        <table class="dialog-table mb-3">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Description</th>
              <th>HSN</th>
              <th>Qty</th>
              <th>Rate (₹)</th>
              <th>GST %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of newBill.lines; let i = index">
              <td>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="item.partNumber"
                  placeholder="Part #"
                />
              </td>
              <td>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="item.description"
                  placeholder="Description"
                />
              </td>
              <td>
                <input
                  type="text"
                  class="form-control font-mono"
                  [(ngModel)]="item.hsnCode"
                  placeholder="84834000"
                />
              </td>
              <td>
                <input
                  type="number"
                  class="form-control text-right"
                  [(ngModel)]="item.billedQuantity"
                />
              </td>
              <td>
                <input
                  type="number"
                  class="form-control text-right"
                  [(ngModel)]="item.unitPriceRupees"
                />
              </td>
              <td>
                <select class="form-control" [(ngModel)]="item.taxRateBasisPoints">
                  <option [ngValue]="1800">18%</option>
                  <option [ngValue]="1200">12%</option>
                  <option [ngValue]="2800">28%</option>
                  <option [ngValue]="500">5%</option>
                  <option [ngValue]="0">0%</option>
                </select>
              </td>
              <td>
                <button ar-button="ghost" (click)="removeNewBillLine(i)">x</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button ar-button="ghost" class="mb-3" (click)="addNewBillLine()">+ Add Line</button>

        <div class="dialog-actions">
          <button ar-button="primary" (click)="saveNewBill()">Save & Perform 3-Way Match</button>
          <button ar-button="ghost" (click)="showCreateModal.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>
  `,
  styles: [
    `
      :host {
        display: block;
        padding-bottom: 3rem;
      }

      .page-content {
        padding: 1.5rem 2rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
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
  private readonly billService = inject(VendorBillService);

  readonly VendorBillStatus = VendorBillStatus;
  readonly ThreeWayMatchStatus = ThreeWayMatchStatus;
  readonly Gstr2bMatchStatus = Gstr2bMatchStatus;
  readonly VendorPaymentMode = VendorPaymentMode;

  readonly allBills = signal<VendorBillDto[]>(MOCK_BILLS);
  readonly filterQuery = signal<string>('');
  readonly selectedStatus = signal<VendorBillStatus | null>(null);

  readonly selectedBill = signal<VendorBillDto | null>(null);
  readonly payingBill = signal<VendorBillDto | null>(null);
  readonly showCreateModal = signal<boolean>(false);

  // Payment form
  paymentModel: {
    amountRupees: number;
    paymentMode: VendorPaymentMode;
    referenceNumber: string;
    tdsCertificateNumber: string;
    remarks: string;
  } = {
    amountRupees: 0,
    paymentMode: VendorPaymentMode.NeftRtgs,
    referenceNumber: '',
    tdsCertificateNumber: '',
    remarks: '',
  };

  // Create bill form
  newBill: {
    supplierName: string;
    supplierGstin: string;
    vendorInvoiceNumber: string;
    purchaseOrderReference: string;
    goodsReceiptNoteNumber: string;
    tdsSection: string;
    lines: Array<{
      partNumber: string;
      description: string;
      hsnCode: string;
      billedQuantity: number;
      unitPriceRupees: number;
      taxRateBasisPoints: number;
    }>;
  } = {
    supplierName: '',
    supplierGstin: '',
    vendorInvoiceNumber: '',
    purchaseOrderReference: '',
    goodsReceiptNoteNumber: '',
    tdsSection: '194Q',
    lines: [
      {
        partNumber: '',
        description: '',
        hsnCode: '84834000',
        billedQuantity: 10,
        unitPriceRupees: 2500,
        taxRateBasisPoints: 1800,
      },
    ],
  };

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
    this.loadData();
    this.checkQueryParams();
  }

  loadData() {
    if (!environment.useMockData) {
      this.billService.getList({ maxResultCount: 50 }).subscribe({
        next: (res) => {
          if (res && res.items && res.items.length > 0) {
            this.allBills.set(res.items);
          }
        },
        error: (err) => console.warn('Loading live Vendor Bills failed, keeping fallback:', err),
      });
    }
  }

  private checkQueryParams() {
    this.route.queryParams.subscribe((params) => {
      if (params['grnId']) {
        this.openCreateModal();
        if (params['supplierName']) {
          this.newBill.supplierName = params['supplierName'];
        }
        this.newBill.goodsReceiptNoteNumber = `GRN-${params['grnId'].substring(0, 6)}`;
      }
    });
  }

  viewBill(b: VendorBillDto) {
    this.selectedBill.set(b);
  }

  approveBill(b: VendorBillDto) {
    const updated: VendorBillDto = {
      ...b,
      status: VendorBillStatus.Approved,
    };
    if (!environment.useMockData && b.id) {
      this.billService.approve(b.id).subscribe({
        next: (saved) => this.updateBillInState(saved),
        error: (err) => console.error(err),
      });
    }
    this.updateBillInState(updated);
  }

  reconcileItc(b: VendorBillDto) {
    const updated: VendorBillDto = {
      ...b,
      gstr2bMatchStatus: Gstr2bMatchStatus.MatchedIn2B,
    };
    if (!environment.useMockData && b.id) {
      this.billService.reconcileGstr2b(b.id, Gstr2bMatchStatus.MatchedIn2B).subscribe({
        next: (saved) => this.updateBillInState(saved),
        error: (err) => console.error(err),
      });
    }
    this.updateBillInState(updated);
    if (this.selectedBill()?.id === b.id) {
      this.selectedBill.set(updated);
    }
  }

  openPaymentDialog(b: VendorBillDto) {
    this.payingBill.set(b);
    this.paymentModel = {
      amountRupees: b.balanceDueInPaise / 100,
      paymentMode: VendorPaymentMode.NeftRtgs,
      referenceNumber: `UTR-${Math.floor(10000000 + Math.random() * 90000000)}`,
      tdsCertificateNumber: `TDS-${Date.now().toString().slice(-6)}`,
      remarks: 'Settlement via Corporate NEFT',
    };
  }

  savePayment() {
    const b = this.payingBill();
    if (!b) return;

    const amountInPaise = Math.round(this.paymentModel.amountRupees * 100);
    const newPaidTotal = b.paidAmountInPaise + amountInPaise;
    const newBalance = Math.max(0, b.netPayableInPaise - newPaidTotal);
    const newStatus = newBalance === 0 ? VendorBillStatus.Paid : VendorBillStatus.PartiallyPaid;

    const newPayment = {
      id: `vbp-${Date.now()}`,
      vendorBillId: b.id || '',
      paymentDateUtc: new Date().toISOString(),
      amountInPaise,
      paymentMode: this.paymentModel.paymentMode,
      referenceNumber: this.paymentModel.referenceNumber,
      tdsCertificateNumber: this.paymentModel.tdsCertificateNumber,
      remarks: this.paymentModel.remarks,
    };

    const updated: VendorBillDto = {
      ...b,
      paidAmountInPaise: newPaidTotal,
      balanceDueInPaise: newBalance,
      status: newStatus,
      payments: [...b.payments, newPayment],
    };

    if (!environment.useMockData && b.id) {
      const dto: RecordVendorBillPaymentDto = {
        amountInPaise,
        paymentMode: this.paymentModel.paymentMode,
        referenceNumber: this.paymentModel.referenceNumber,
        tdsCertificateNumber: this.paymentModel.tdsCertificateNumber,
        remarks: this.paymentModel.remarks,
      };
      this.billService.recordPayment(b.id, dto).subscribe({
        next: (saved) => this.updateBillInState(saved),
        error: (err) => console.error(err),
      });
    }

    this.updateBillInState(updated);
    this.payingBill.set(null);
    if (this.selectedBill()?.id === b.id) {
      this.selectedBill.set(updated);
    }
  }

  openCreateModal() {
    this.newBill = {
      supplierName: '',
      supplierGstin: '',
      vendorInvoiceNumber: '',
      purchaseOrderReference: '',
      goodsReceiptNoteNumber: '',
      tdsSection: '194Q',
      lines: [
        {
          partNumber: '',
          description: '',
          hsnCode: '84834000',
          billedQuantity: 10,
          unitPriceRupees: 2500,
          taxRateBasisPoints: 1800,
        },
      ],
    };
    this.showCreateModal.set(true);
  }

  addNewBillLine() {
    this.newBill.lines.push({
      partNumber: '',
      description: '',
      hsnCode: '84834000',
      billedQuantity: 5,
      unitPriceRupees: 1500,
      taxRateBasisPoints: 1800,
    });
  }

  removeNewBillLine(i: number) {
    if (this.newBill.lines.length > 1) {
      this.newBill.lines.splice(i, 1);
    }
  }

  saveNewBill() {
    if (!this.newBill.supplierName || !this.newBill.vendorInvoiceNumber) {
      alert('Supplier name and Vendor Invoice number are required.');
      return;
    }

    let subtotalPaise = 0;
    let totalTaxPaise = 0;

    const mappedLines = this.newBill.lines.map((l, idx) => {
      const taxable = Math.round(l.billedQuantity * l.unitPriceRupees * 100);
      const tax = Math.round(taxable * (l.taxRateBasisPoints / 10000));
      subtotalPaise += taxable;
      totalTaxPaise += tax;
      return {
        id: `vbl-${Date.now()}-${idx}`,
        vendorBillId: `vb-${Date.now()}`,
        lineNumber: idx + 1,
        partNumber: l.partNumber || `PART-${idx + 1}`,
        description: l.description || 'Raw material item',
        hsnCode: l.hsnCode,
        billedQuantity: l.billedQuantity,
        unitPriceInPaise: Math.round(l.unitPriceRupees * 100),
        discountPercent: 0,
        taxableAmountInPaise: taxable,
        taxRateBasisPoints: l.taxRateBasisPoints,
        cgstAmountInPaise: Math.round(tax / 2),
        sgstAmountInPaise: Math.round(tax / 2),
        igstAmountInPaise: 0,
        lineTotalInPaise: taxable + tax,
      };
    });

    const tdsRateBps =
      this.newBill.tdsSection === '194Q' ? 10 : this.newBill.tdsSection === '194C' ? 100 : 0;
    const tdsDeducted = Math.round(subtotalPaise * (tdsRateBps / 10000));
    const grandTotal = subtotalPaise + totalTaxPaise;
    const netPayable = grandTotal - tdsDeducted;

    const created: VendorBillDto = {
      id: `vb-${Date.now()}`,
      billNumber: `VB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorInvoiceNumber: this.newBill.vendorInvoiceNumber,
      vendorInvoiceDateUtc: new Date().toISOString(),
      supplierId: `sup-${Date.now()}`,
      supplierName: this.newBill.supplierName,
      supplierGstin: this.newBill.supplierGstin || '27AAACG0912K1Z9',
      purchaseOrderReference: this.newBill.purchaseOrderReference,
      goodsReceiptNoteNumber: this.newBill.goodsReceiptNoteNumber,
      status: VendorBillStatus.Approved,
      threeWayMatchStatus: ThreeWayMatchStatus.Matched,
      dueDateUtc: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      subtotalInPaise: subtotalPaise,
      discountInPaise: 0,
      cgstInPaise: Math.round(totalTaxPaise / 2),
      sgstInPaise: Math.round(totalTaxPaise / 2),
      igstInPaise: 0,
      totalTaxInPaise: totalTaxPaise,
      tdsSection: this.newBill.tdsSection !== 'None' ? this.newBill.tdsSection : undefined,
      tdsRateBasisPoints: tdsRateBps,
      tdsDeductedInPaise: tdsDeducted,
      grandTotalInPaise: grandTotal,
      netPayableInPaise: netPayable,
      paidAmountInPaise: 0,
      balanceDueInPaise: netPayable,
      gstr2bMatchStatus: Gstr2bMatchStatus.MatchedIn2B,
      isReverseCharge: false,
      creationTime: new Date().toISOString(),
      lines: mappedLines,
      payments: [],
    };

    if (!environment.useMockData) {
      const dto: CreateVendorBillDto = {
        vendorInvoiceNumber: this.newBill.vendorInvoiceNumber,
        vendorInvoiceDateUtc: new Date().toISOString(),
        supplierId: created.supplierId,
        supplierName: this.newBill.supplierName,
        supplierGstin: this.newBill.supplierGstin,
        dueDateUtc: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        isInterState: false,
        purchaseOrderReference: this.newBill.purchaseOrderReference,
        goodsReceiptNoteNumber: this.newBill.goodsReceiptNoteNumber,
        tdsSection: this.newBill.tdsSection !== 'None' ? this.newBill.tdsSection : undefined,
        tdsRateBasisPoints: tdsRateBps,
        isReverseCharge: false,
        discountInPaise: 0,
        lines: this.newBill.lines.map((l) => ({
          partNumber: l.partNumber,
          description: l.description,
          hsnCode: l.hsnCode,
          billedQuantity: l.billedQuantity,
          unitPriceInPaise: Math.round(l.unitPriceRupees * 100),
          discountPercent: 0,
          taxRateBasisPoints: l.taxRateBasisPoints,
        })),
      };
      this.billService.create(dto).subscribe({
        next: (saved) => this.allBills.update((list) => [saved, ...list]),
        error: (err) => console.error(err),
      });
    }

    this.allBills.update((list) => [created, ...list]);
    this.showCreateModal.set(false);
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
