import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  Gstr2bMatchStatus,
  MsmeClassification,
  QcInspectionStatus,
  ThreeWayMatchStatus,
  VendorBillStatus,
  VendorDebitNoteStatus,
  Vendor360Dto,
  Vendor360Service,
  GrnStatus,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ChipTone } from '../../../ui';

const MOCK_VENDORS_360: Vendor360Dto[] = [
  {
    id: 'sup-1',
    name: 'Bharat Precision Gears Pvt Ltd',
    gstin: '27AABCB1234F1Z5',
    pan: 'AABCB1234F',
    phone: '+91 20 2712 9901',
    email: 'accounts@bharatprecisiongears.com',
    address: 'Plot 45, Sector 10, MIDC Bhosari',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411026',
    msmeCategory: MsmeClassification.Small,
    udyamRegistrationNumber: 'UDYAM-MH-26-0019283',
    bankName: 'HDFC Bank Ltd',
    bankAccountNumber: '50200081729381',
    bankIfscCode: 'HDFC0001092',
    totalPurchasesInPaise: 12_850_000_00,
    totalPaidInPaise: 9_254_050_00,
    outstandingPayableInPaise: 3_595_950_00,
    msmeOverdueInPaise: 0,
    leadDays: 14,
    qualityAcceptancePercent: 98.6,
    recentPurchaseOrders: [
      {
        id: 'po-101',
        reference: 'PO-2026-089',
        state: 'Delivered',
        creationTime: new Date(Date.now() - 10 * 86_400_000).toISOString(),
        expectedOn: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        subtotalInPaise: 305_000_00,
        lineCount: 2,
      },
      {
        id: 'po-077',
        reference: 'PO-2026-065',
        state: 'Closed',
        creationTime: new Date(Date.now() - 40 * 86_400_000).toISOString(),
        expectedOn: new Date(Date.now() - 25 * 86_400_000).toISOString(),
        subtotalInPaise: 540_000_00,
        lineCount: 4,
      },
    ],
    recentGoodsReceiptNotes: [
      {
        id: 'grn-1',
        grnNumber: 'GRN-2026-0104',
        purchaseOrderId: 'po-101',
        purchaseOrderReference: 'PO-2026-089',
        supplierId: 'sup-1',
        supplierName: 'Bharat Precision Gears Pvt Ltd',
        challanNumber: 'DC-BPG-4402',
        challanDateUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        vehicleNumber: 'MH 14 HG 8921',
        transporterName: 'VRL Logistics',
        gateEntryNumber: 'GE-2026-0412',
        gateInTimeUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        status: GrnStatus.Approved,
        qcStatus: QcInspectionStatus.Passed,
        creationTime: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        lines: [
          {
            id: 'l1',
            goodsReceiptNoteId: 'grn-1',
            lineNumber: 1,
            partNumber: 'GR-HEL-120',
            description: 'Helical Gear 120mm OD',
            orderedQuantity: 50,
            challanQuantity: 50,
            receivedQuantity: 50,
            acceptedQuantity: 50,
            rejectedQuantity: 0,
            unitOfMeasure: 'NOS',
            storageBin: 'BIN-RACK-A3',
          },
        ],
      },
    ],
    recentVendorBills: [
      {
        id: 'vb-1',
        billNumber: 'VB-2026-0089',
        vendorInvoiceNumber: 'INV-BPG-8912',
        vendorInvoiceDateUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        supplierId: 'sup-1',
        supplierName: 'Bharat Precision Gears Pvt Ltd',
        supplierGstin: '27AABCB1234F1Z5',
        status: VendorBillStatus.Approved,
        threeWayMatchStatus: ThreeWayMatchStatus.Matched,
        dueDateUtc: new Date(Date.now() + 27 * 86_400_000).toISOString(),
        subtotalInPaise: 305_000_00,
        discountInPaise: 0,
        cgstInPaise: 27_450_00,
        sgstInPaise: 27_450_00,
        igstInPaise: 0,
        totalTaxInPaise: 54_900_00,
        tdsRateBasisPoints: 10,
        tdsDeductedInPaise: 305_00,
        grandTotalInPaise: 359_900_00,
        netPayableInPaise: 359_595_00,
        paidAmountInPaise: 0,
        balanceDueInPaise: 359_595_00,
        gstr2bMatchStatus: Gstr2bMatchStatus.MatchedIn2B,
        isReverseCharge: false,
        creationTime: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        lines: [],
        payments: [],
      },
    ],
    recentDebitNotes: [
      {
        id: 'vdn-2',
        debitNoteNumber: 'DN-2026-0009',
        supplierId: 'sup-1',
        supplierName: 'Bharat Precision Gears Pvt Ltd',
        status: VendorDebitNoteStatus.Settled,
        issueDateUtc: new Date(Date.now() - 25 * 86_400_000).toISOString(),
        reason: 'Rate revision adjustment per indexation clause',
        isInterState: false,
        taxableAmountInPaise: 12_000_00,
        cgstInPaise: 1080_00,
        sgstInPaise: 1080_00,
        igstInPaise: 0,
        grandTotalInPaise: 14_160_00,
        creationTime: new Date(Date.now() - 25 * 86_400_000).toISOString(),
        lines: [],
      },
    ],
  },
  {
    id: 'sup-3',
    name: 'Sundram Fasteners Automotive',
    gstin: '33AABCS9821L1ZM',
    pan: 'AABCS9821L',
    phone: '+91 44 2852 1100',
    email: 'oem.sales@sundramfasteners.co.in',
    address: '98-A, Mount Road, Guindy',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600032',
    msmeCategory: MsmeClassification.Medium,
    udyamRegistrationNumber: 'UDYAM-TN-02-0048191',
    bankName: 'State Bank of India',
    bankAccountNumber: '30091823901',
    bankIfscCode: 'SBIN0001099',
    totalPurchasesInPaise: 6_450_000_00,
    totalPaidInPaise: 4_215_240_00,
    outstandingPayableInPaise: 2_234_760_00,
    msmeOverdueInPaise: 420_000_00, // Overdue > 45 days
    leadDays: 7,
    qualityAcceptancePercent: 92.5,
    recentPurchaseOrders: [
      {
        id: 'po-099',
        reference: 'PO-2026-081',
        state: 'Delivered',
        creationTime: new Date(Date.now() - 15 * 86_400_000).toISOString(),
        expectedOn: new Date(Date.now() - 7 * 86_400_000).toISOString(),
        subtotalInPaise: 44_400_00,
        lineCount: 1,
      },
    ],
    recentGoodsReceiptNotes: [
      {
        id: 'grn-3',
        grnNumber: 'GRN-2026-0103',
        purchaseOrderId: 'po-099',
        purchaseOrderReference: 'PO-2026-081',
        supplierId: 'sup-3',
        supplierName: 'Sundram Fasteners Automotive',
        challanNumber: 'SF-INV-00912',
        challanDateUtc: new Date(Date.now() - 6 * 86_400_000).toISOString(),
        vehicleNumber: 'TN 09 BX 2209',
        transporterName: 'TCI Freight',
        status: GrnStatus.Approved,
        qcStatus: QcInspectionStatus.PartiallyPassed,
        creationTime: new Date(Date.now() - 6 * 86_400_000).toISOString(),
        lines: [],
      },
    ],
    recentVendorBills: [
      {
        id: 'vb-2',
        billNumber: 'VB-2026-0082',
        vendorInvoiceNumber: 'INV-SF-2026-77',
        vendorInvoiceDateUtc: new Date(Date.now() - 50 * 86_400_000).toISOString(),
        supplierId: 'sup-3',
        supplierName: 'Sundram Fasteners Automotive',
        supplierGstin: '33AABCS9821L1ZM',
        status: VendorBillStatus.PartiallyPaid,
        threeWayMatchStatus: ThreeWayMatchStatus.PriceVariance,
        dueDateUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
        subtotalInPaise: 44_400_00,
        discountInPaise: 0,
        cgstInPaise: 0,
        sgstInPaise: 0,
        igstInPaise: 7_992_00,
        totalTaxInPaise: 7_992_00,
        tdsRateBasisPoints: 10,
        tdsDeductedInPaise: 44_40,
        grandTotalInPaise: 52_392_00,
        netPayableInPaise: 52_347_60,
        paidAmountInPaise: 30_000_00,
        balanceDueInPaise: 22_347_60,
        gstr2bMatchStatus: Gstr2bMatchStatus.MatchedIn2B,
        isReverseCharge: false,
        creationTime: new Date(Date.now() - 50 * 86_400_000).toISOString(),
        lines: [],
        payments: [],
      },
    ],
    recentDebitNotes: [
      {
        id: 'vdn-1',
        debitNoteNumber: 'DN-2026-0012',
        supplierId: 'sup-3',
        supplierName: 'Sundram Fasteners Automotive',
        status: VendorDebitNoteStatus.Issued,
        issueDateUtc: new Date(Date.now() - 4 * 86_400_000).toISOString(),
        reason: 'QC Rejection: 15 PCS flange bolts failed pitch gauge',
        isInterState: true,
        taxableAmountInPaise: 3600_00,
        cgstInPaise: 0,
        sgstInPaise: 0,
        igstInPaise: 648_00,
        grandTotalInPaise: 4248_00,
        creationTime: new Date(Date.now() - 4 * 86_400_000).toISOString(),
        lines: [],
      },
    ],
  },
];

@Component({
  standalone: true,
  selector: 'ar-vendor-360',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArChip],
  template: `
    <ar-topbar title="Vendor 360 Cockpit" subtitle="Procure-to-Pay supplier dossier, MSME Section 15 compliance, QC scores & ledgers">
      <div class="topbar-actions">
        <select
          class="supplier-selector"
          [ngModel]="currentVendorId()"
          (ngModelChange)="onVendorChange($event)"
        >
          <option *ngFor="let v of allVendors()" [value]="v.id">
            {{ v.name }} ({{ v.city }}, {{ v.state }})
          </option>
        </select>
        <button ar-button="primary" (click)="goToInwardGate()">+ Inward GRN</button>
      </div>
    </ar-topbar>

    <div class="page-content" *ngIf="vendor() as v">
      <!-- Supplier Profile Header -->
      <section class="vendor-profile-card">
        <div class="vendor-identity">
          <div class="avatar-box">
            {{ v.name.substring(0, 2).toUpperCase() }}
          </div>
          <div class="identity-details">
            <div class="name-row">
              <h2>{{ v.name }}</h2>
              <ar-chip [tone]="msmeTone(v.msmeCategory)">
                {{ msmeLabel(v.msmeCategory) }}
              </ar-chip>
            </div>
            <div class="statutory-badges">
              <span class="badge-tag">GSTIN: <strong class="font-mono">{{ v.gstin || 'Unregistered' }}</strong></span>
              <span class="badge-tag">PAN: <strong class="font-mono">{{ v.pan || 'N/A' }}</strong></span>
              <span class="badge-tag" *ngIf="v.udyamRegistrationNumber">Udyam: <strong class="font-mono">{{ v.udyamRegistrationNumber }}</strong></span>
            </div>
            <div class="contact-line">
              <span>📍 {{ v.address }}, {{ v.city }}, {{ v.state }} - {{ v.pincode }}</span>
              <span>📞 {{ v.phone || 'No phone' }}</span>
              <span>✉️ {{ v.email || 'No email' }}</span>
            </div>
          </div>
        </div>

        <div class="banking-box">
          <span class="box-label">Disbursement Bank Account</span>
          <strong>{{ v.bankName || 'HDFC Bank Ltd' }}</strong>
          <span class="font-mono">A/C: {{ v.bankAccountNumber || '50200081729381' }}</span>
          <span class="font-mono">IFSC: {{ v.bankIfscCode || 'HDFC0001092' }}</span>
          <span class="lead-time">Avg Lead Time: <strong>{{ v.leadDays }} days</strong></span>
        </div>
      </section>

      <!-- MSME Statutory Warning Banner if Overdue -->
      <section class="msme-alert-banner" *ngIf="v.msmeOverdueInPaise > 0">
        <div class="alert-icon">⚠️</div>
        <div class="alert-text">
          <strong>MSME Section 15 Statutory Overdue Alert:</strong>
          <span>
            Bills totaling <strong>₹{{ (v.msmeOverdueInPaise / 100) | number:'1.2-2' }}</strong> have exceeded the mandatory 45-day statutory payment window.
            Compounded interest at 3x RBI repo rate is applicable under Section 16 of the MSMED Act.
          </span>
        </div>
        <button ar-button="danger" (click)="goToBills()">Clear Overdue Bills</button>
      </section>

      <!-- KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Lifetime Purchases</span>
          <strong class="value">₹{{ (v.totalPurchasesInPaise / 100) | number:'1.2-2' }}</strong>
          <span class="sub">Total gross order value</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Total Disbursed</span>
          <strong class="value">₹{{ (v.totalPaidInPaise / 100) | number:'1.2-2' }}</strong>
          <span class="sub">Paid via Bank NEFT / RTGS</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Outstanding Payable</span>
          <strong class="value">₹{{ (v.outstandingPayableInPaise / 100) | number:'1.2-2' }}</strong>
          <span class="sub">Net of TDS deductions</span>
        </div>
        <div class="kpi-card" [class.good]="v.qualityAcceptancePercent >= 95" [class.amber]="v.qualityAcceptancePercent < 95">
          <span class="label">Quality Acceptance Rate</span>
          <strong class="value">{{ v.qualityAcceptancePercent }}%</strong>
          <span class="sub">Accepted vs Rejected across GRNs</span>
        </div>
      </section>

      <!-- Tabs Row -->
      <section class="tabs-nav">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'bills'"
          (click)="activeTab.set('bills')"
        >
          Vendor Bills ({{ v.recentVendorBills.length }})
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'grn'"
          (click)="activeTab.set('grn')"
        >
          Inward GRNs ({{ v.recentGoodsReceiptNotes.length }})
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'po'"
          (click)="activeTab.set('po')"
        >
          Purchase Orders ({{ v.recentPurchaseOrders.length }})
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'debit'"
          (click)="activeTab.set('debit')"
        >
          Debit Notes ({{ v.recentDebitNotes.length }})
        </button>
      </section>

      <!-- Tab Content 1: Bills -->
      <section class="table-card" *ngIf="activeTab() === 'bills'">
        <table class="data-table">
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Invoice # & Date</th>
              <th>3-Way Match</th>
              <th>GSTR-2B ITC</th>
              <th class="text-right">Grand Total</th>
              <th class="text-right">Balance Due</th>
              <th>Status</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of v.recentVendorBills">
              <td class="font-mono"><strong>{{ b.billNumber }}</strong></td>
              <td>
                <div class="cell-main">
                  <span>{{ b.vendorInvoiceNumber }}</span>
                  <span class="sub-text">{{ b.vendorInvoiceDateUtc | date:'mediumDate' }}</span>
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
              <td class="text-right font-mono">₹{{ (b.grandTotalInPaise / 100) | number:'1.2-2' }}</td>
              <td class="text-right font-mono">
                <span [class.text-danger]="b.balanceDueInPaise > 0" [class.text-good]="b.balanceDueInPaise === 0">
                  ₹{{ (b.balanceDueInPaise / 100) | number:'1.2-2' }}
                </span>
              </td>
              <td>
                <ar-chip [tone]="billTone(b.status)">{{ billLabel(b.status) }}</ar-chip>
              </td>
              <td class="actions-col">
                <button ar-button="ghost" (click)="goToBills()">View in Bills</button>
              </td>
            </tr>
            <tr *ngIf="v.recentVendorBills.length === 0">
              <td colspan="8" class="empty-state">No vendor bills recorded for this supplier.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Tab Content 2: GRNs -->
      <section class="table-card" *ngIf="activeTab() === 'grn'">
        <table class="data-table">
          <thead>
            <tr>
              <th>GRN #</th>
              <th>Gate Entry</th>
              <th>PO Reference</th>
              <th>Challan #</th>
              <th>Vehicle / Logistics</th>
              <th>QC Status</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let g of v.recentGoodsReceiptNotes">
              <td class="font-mono"><strong>{{ g.grnNumber }}</strong></td>
              <td>
                <div class="cell-main">
                  <span>{{ g.gateEntryNumber || 'N/A' }}</span>
                  <span class="sub-text">{{ g.gateInTimeUtc | date:'mediumDate' }}</span>
                </div>
              </td>
              <td>{{ g.purchaseOrderReference || 'Direct' }}</td>
              <td>{{ g.challanNumber }}</td>
              <td>
                <span class="font-mono">{{ g.vehicleNumber || 'Self Delivery' }}</span>
              </td>
              <td>
                <ar-chip [tone]="qcTone(g.qcStatus)">{{ qcLabel(g.qcStatus) }}</ar-chip>
              </td>
              <td>
                <ar-chip [tone]="grnTone(g.status)">{{ grnLabel(g.status) }}</ar-chip>
              </td>
            </tr>
            <tr *ngIf="v.recentGoodsReceiptNotes.length === 0">
              <td colspan="7" class="empty-state">No goods receipt notes recorded for this supplier.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Tab Content 3: POs -->
      <section class="table-card" *ngIf="activeTab() === 'po'">
        <table class="data-table">
          <thead>
            <tr>
              <th>PO Reference #</th>
              <th>Order Date</th>
              <th>Expected Delivery</th>
              <th>Items</th>
              <th class="text-right">Order Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of v.recentPurchaseOrders">
              <td class="font-mono"><strong>{{ p.reference }}</strong></td>
              <td>{{ p.creationTime | date:'mediumDate' }}</td>
              <td>{{ p.expectedOn ? (p.expectedOn | date:'mediumDate') : 'Immediate' }}</td>
              <td>{{ p.lineCount }} line items</td>
              <td class="text-right font-mono"><strong>₹{{ (p.subtotalInPaise / 100) | number:'1.2-2' }}</strong></td>
              <td>
                <ar-chip tone="neutral">{{ p.state }}</ar-chip>
              </td>
            </tr>
            <tr *ngIf="v.recentPurchaseOrders.length === 0">
              <td colspan="6" class="empty-state">No purchase orders found for this supplier.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Tab Content 4: Debit Notes -->
      <section class="table-card" *ngIf="activeTab() === 'debit'">
        <table class="data-table">
          <thead>
            <tr>
              <th>Debit Note #</th>
              <th>Issue Date</th>
              <th>Reason</th>
              <th class="text-right">Adjusted Amount</th>
              <th>Status</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let dn of v.recentDebitNotes">
              <td class="font-mono"><strong>{{ dn.debitNoteNumber }}</strong></td>
              <td>{{ dn.issueDateUtc | date:'mediumDate' }}</td>
              <td>{{ dn.reason }}</td>
              <td class="text-right font-mono text-good"><strong>₹{{ (dn.grandTotalInPaise / 100) | number:'1.2-2' }}</strong></td>
              <td>
                <ar-chip [tone]="dn.status === VendorDebitNoteStatus.Settled ? 'good' : 'amber'">
                  {{ dn.status === VendorDebitNoteStatus.Settled ? 'Settled' : 'Issued' }}
                </ar-chip>
              </td>
              <td class="actions-col">
                <button ar-button="ghost" (click)="goToDebitNotes()">Manage</button>
              </td>
            </tr>
            <tr *ngIf="v.recentDebitNotes.length === 0">
              <td colspan="6" class="empty-state">No debit notes recorded for this supplier.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
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

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .supplier-selector {
        padding: 0.45rem 0.75rem;
        border-radius: 6px;
        border: 1px solid var(--ar-border, #cbd5e1);
        font-size: 0.85rem;
        font-weight: 500;
        background: #ffffff;
      }

      .vendor-profile-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        padding: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      }

      .vendor-identity {
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }

      .avatar-box {
        width: 60px;
        height: 60px;
        background: #e0e7ff;
        color: #3730a3;
        font-size: 1.4rem;
        font-weight: 700;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .identity-details {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        .name-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;

          h2 {
            margin: 0;
            font-size: 1.35rem;
            color: var(--ar-text-primary, #0f172a);
          }
        }
      }

      .statutory-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;

        .badge-tag {
          font-size: 0.75rem;
          background: #f1f5f9;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          color: #475569;
        }
      }

      .contact-line {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.8rem;
        color: #64748b;
      }

      .banking-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 0.85rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 240px;

        .box-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 600;
          color: #64748b;
        }

        .lead-time {
          font-size: 0.75rem;
          color: #0369a1;
          margin-top: 0.25rem;
        }
      }

      .msme-alert-banner {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 1rem 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;

        .alert-icon { font-size: 1.5rem; }

        .alert-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          font-size: 0.85rem;
          color: #991b1b;
        }
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

        &.amber { border-left: 4px solid #f59e0b; }
        &.teal, &.good { border-left: 4px solid #0d9488; }
        &.red { border-left: 4px solid #ef4444; }

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

      .tabs-nav {
        display: flex;
        gap: 0.5rem;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 0.25rem;

        .tab-btn {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          border-bottom: 2px solid transparent;

          &.active {
            color: #2563eb;
            border-bottom-color: #2563eb;
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
      }

      .cell-main {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;

        .sub-text {
          font-size: 0.74rem;
          color: #64748b;
        }
      }

      .text-right { text-align: right; }
      .text-good { color: #15803d; }
      .text-danger { color: #b91c1c; }
      .font-mono { font-family: ui-monospace, monospace; }

      .actions-col {
        text-align: right;
      }

      .empty-state {
        text-align: center;
        padding: 2.5rem;
        color: #94a3b8;
      }
    `,
  ],
})
export class Vendor360Component {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly vendor360Service = inject(Vendor360Service);

  readonly MsmeClassification = MsmeClassification;
  readonly VendorDebitNoteStatus = VendorDebitNoteStatus;

  readonly allVendors = signal<Vendor360Dto[]>(MOCK_VENDORS_360);
  readonly currentVendorId = signal<string>('sup-1');
  readonly activeTab = signal<'bills' | 'grn' | 'po' | 'debit'>('bills');

  readonly vendor = computed(() =>
    this.allVendors().find((v) => v.id === this.currentVendorId()) || this.allVendors()[0],
  );

  constructor() {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.currentVendorId.set(params['id']);
        this.loadVendor(params['id']);
      }
    });
  }

  onVendorChange(id: string) {
    this.currentVendorId.set(id);
    this.loadVendor(id);
  }

  private loadVendor(id: string) {
    if (!environment.useMockData) {
      this.vendor360Service.get(id).subscribe({
        next: (dto) => {
          this.allVendors.update((list) => {
            const idx = list.findIndex((x) => x.id === dto.id);
            if (idx >= 0) {
              const copy = [...list];
              copy[idx] = dto;
              return copy;
            }
            return [dto, ...list];
          });
        },
        error: (err) => console.warn('Could not load live vendor 360, staying with fallback:', err),
      });
    }
  }

  goToInwardGate() {
    this.router.navigate(['/purchasing/grn']);
  }

  goToBills() {
    this.router.navigate(['/purchasing/bills']);
  }

  goToDebitNotes() {
    this.router.navigate(['/purchasing/debit-notes']);
  }

  msmeTone(cat: MsmeClassification): ChipTone {
    switch (cat) {
      case MsmeClassification.Micro: return 'teal';
      case MsmeClassification.Small: return 'good';
      case MsmeClassification.Medium: return 'amber';
      default: return 'neutral';
    }
  }

  msmeLabel(cat: MsmeClassification): string {
    switch (cat) {
      case MsmeClassification.Micro: return 'MSME (Micro)';
      case MsmeClassification.Small: return 'MSME (Small)';
      case MsmeClassification.Medium: return 'MSME (Medium)';
      default: return 'Large Enterprise';
    }
  }

  matchTone(status: ThreeWayMatchStatus): ChipTone {
    switch (status) {
      case ThreeWayMatchStatus.Matched: return 'good';
      case ThreeWayMatchStatus.PriceVariance:
      case ThreeWayMatchStatus.QuantityVariance: return 'bad';
      default: return 'neutral';
    }
  }

  matchLabel(status: ThreeWayMatchStatus): string {
    switch (status) {
      case ThreeWayMatchStatus.Matched: return 'Matched';
      case ThreeWayMatchStatus.PriceVariance: return 'Rate Discrepancy';
      case ThreeWayMatchStatus.QuantityVariance: return 'Qty Discrepancy';
      default: return 'Pending';
    }
  }

  itcTone(status: Gstr2bMatchStatus): ChipTone {
    switch (status) {
      case Gstr2bMatchStatus.MatchedIn2B: return 'good';
      case Gstr2bMatchStatus.MissingIn2B: return 'bad';
      default: return 'neutral';
    }
  }

  itcLabel(status: Gstr2bMatchStatus): string {
    switch (status) {
      case Gstr2bMatchStatus.MatchedIn2B: return 'GSTR-2B ITC OK';
      default: return 'Pending ITC';
    }
  }

  billTone(status: VendorBillStatus): ChipTone {
    switch (status) {
      case VendorBillStatus.Paid: return 'good';
      case VendorBillStatus.PartiallyPaid: return 'amber';
      case VendorBillStatus.Approved: return 'teal';
      default: return 'neutral';
    }
  }

  billLabel(status: VendorBillStatus): string {
    switch (status) {
      case VendorBillStatus.Paid: return 'Fully Paid';
      case VendorBillStatus.PartiallyPaid: return 'Partially Paid';
      case VendorBillStatus.Approved: return 'Approved';
      default: return 'Pending';
    }
  }

  qcTone(status: QcInspectionStatus): ChipTone {
    switch (status) {
      case QcInspectionStatus.Passed: return 'good';
      case QcInspectionStatus.PartiallyPassed: return 'warn';
      case QcInspectionStatus.Failed: return 'bad';
      default: return 'neutral';
    }
  }

  qcLabel(status: QcInspectionStatus): string {
    switch (status) {
      case QcInspectionStatus.Passed: return 'Passed';
      case QcInspectionStatus.PartiallyPassed: return 'Partial';
      case QcInspectionStatus.Failed: return 'Failed';
      default: return 'Pending';
    }
  }

  grnTone(status: GrnStatus): ChipTone {
    switch (status) {
      case GrnStatus.Approved: return 'good';
      case GrnStatus.Billed: return 'teal';
      default: return 'neutral';
    }
  }

  grnLabel(status: GrnStatus): string {
    switch (status) {
      case GrnStatus.Approved: return 'Approved';
      case GrnStatus.Billed: return 'Billed';
      default: return 'Inwarded';
    }
  }
}
