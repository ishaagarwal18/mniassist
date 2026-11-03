import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import { SupplierScope, readSupplierScope } from '../../../core/util/supplier-scope';
import { ArSupplierScopeBar } from '../supplier-scope-bar';
import {
  CompleteQcInspectionDto,
  CreateGoodsReceiptNoteDto,
  CreateGoodsReceiptNoteLineDto,
  GoodsReceiptNoteDto,
  GrnStatus,
  QcInspectionStatus,
  GoodsReceiptNoteService,
  VendorBillService,
  VendorDebitNoteService,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

const MOCK_GRNS: GoodsReceiptNoteDto[] = [
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
    inspectedAtUtc: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    inspectorNotes:
      '100% dimensions checked per drawing Rev C. No burrs or surface defects detected.',
    remarks: 'Gate verified with security seal intact.',
    creationTime: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'grnl-1',
        goodsReceiptNoteId: 'grn-1',
        lineNumber: 1,
        purchaseOrderLineId: 'pol-1',
        partNumber: 'GR-HEL-120',
        description: 'Hardened Helical Gear 120mm OD Module 3',
        orderedQuantity: 50,
        challanQuantity: 50,
        receivedQuantity: 50,
        acceptedQuantity: 50,
        rejectedQuantity: 0,
        unitOfMeasure: 'NOS',
        storageBin: 'BIN-RACK-A3',
      },
      {
        id: 'grnl-2',
        goodsReceiptNoteId: 'grn-1',
        lineNumber: 2,
        purchaseOrderLineId: 'pol-2',
        partNumber: 'PN-SH-040',
        description: 'EN24 Pinion Shaft Induction Hardened',
        orderedQuantity: 25,
        challanQuantity: 25,
        receivedQuantity: 25,
        acceptedQuantity: 25,
        rejectedQuantity: 0,
        unitOfMeasure: 'NOS',
        storageBin: 'BIN-RACK-A4',
      },
    ],
  },
  {
    id: 'grn-2',
    grnNumber: 'GRN-2026-0105',
    purchaseOrderId: 'po-102',
    purchaseOrderReference: 'PO-2026-092',
    supplierId: 'sup-2',
    supplierName: 'Kirloskar Pneumatics Ltd',
    challanNumber: 'KPL-CH-778',
    challanDateUtc: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    vehicleNumber: 'MH 12 RN 4501',
    transporterName: 'GATI KWE',
    gateEntryNumber: 'GE-2026-0418',
    gateInTimeUtc: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    status: GrnStatus.UnderInspection,
    qcStatus: QcInspectionStatus.Pending,
    remarks: 'Unloaded at Bay 2. Awaiting visual and hardness check.',
    creationTime: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'grnl-3',
        goodsReceiptNoteId: 'grn-2',
        lineNumber: 1,
        purchaseOrderLineId: 'pol-3',
        partNumber: 'VLV-SOL-24',
        description: 'High Pressure 24V DC Hydraulic Solenoid Valve',
        orderedQuantity: 30,
        challanQuantity: 30,
        receivedQuantity: 30,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        unitOfMeasure: 'NOS',
        storageBin: 'QC-STAGE-BAY2',
      },
    ],
  },
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
    gateEntryNumber: 'GE-2026-0399',
    gateInTimeUtc: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    status: GrnStatus.Approved,
    qcStatus: QcInspectionStatus.PartiallyPassed,
    inspectedAtUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    inspectorNotes: '15 pieces failed pitch gauge thread inspection. Raised rejection report.',
    remarks: 'Fastener crates received.',
    creationTime: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'grnl-4',
        goodsReceiptNoteId: 'grn-3',
        lineNumber: 1,
        purchaseOrderLineId: 'pol-4',
        partNumber: 'BLT-M16-109',
        description: 'Grade 10.9 Flange Head Bolt M16x90mm Zn-Ni Coated',
        orderedQuantity: 200,
        challanQuantity: 200,
        receivedQuantity: 200,
        acceptedQuantity: 185,
        rejectedQuantity: 15,
        unitOfMeasure: 'NOS',
        storageBin: 'BIN-FAST-B1',
        rejectionReason: 'Thread diameter out of tolerance (0.15mm pitch mismatch)',
      },
    ],
  },
];

@Component({
  standalone: true,
  selector: 'ar-goods-receipt-notes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArChip, ArDialog, ArSupplierScopeBar],
  template: `
    <ar-topbar
      title="Goods Receipt Notes (GRN)"
      subtitle="Inward warehouse gate entry, QC inspection & put-away management"
    >
      <button ar-button="primary" (click)="openCreateModal()">+ Inward Gate Entry (GRN)</button>
    </ar-topbar>

    <div class="page-content">
      @if (scope(); as sc) {
        <ar-supplier-scope-bar [name]="sc.name" what="goods receipts" (showAll)="clearScope()" />
      }
      @if (loadError(); as e) {
        <p class="load-error" role="alert">{{ e }}</p>
      }
      <!-- KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Total Inward GRNs</span>
          <strong class="value">{{ allGrns().length }}</strong>
          <span class="sub">Across all suppliers</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Awaiting QC Inspection</span>
          <strong class="value">{{ pendingQcCount() }}</strong>
          <span class="sub">Pending quality clearance</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">QC Passed & Billed</span>
          <strong class="value">{{ approvedCount() }}</strong>
          <span class="sub">Ready for 3-Way Matching</span>
        </div>
        <div class="kpi-card red">
          <span class="label">Rejected / Debit Due</span>
          <strong class="value">{{ rejectedCount() }}</strong>
          <span class="sub">Requires Vendor Debit Note</span>
        </div>
      </section>

      <!-- Filter bar -->
      <section class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="input-search"
            placeholder="Search GRN #, PO #, Gate Entry, Supplier..."
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
            All GRNs ({{ allGrns().length }})
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === GrnStatus.UnderInspection"
            (click)="selectedStatus.set(GrnStatus.UnderInspection)"
          >
            Under QC
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === GrnStatus.Approved"
            (click)="selectedStatus.set(GrnStatus.Approved)"
          >
            Approved
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === GrnStatus.Billed"
            (click)="selectedStatus.set(GrnStatus.Billed)"
          >
            Billed
          </button>
        </div>
      </section>

      <!-- GRN Table -->
      <section class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>GRN & Gate Details</th>
              <th>Supplier & PO</th>
              <th>Transport & Vehicle</th>
              <th>Items & Qty</th>
              <th>QC Status</th>
              <th>Status</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let g of filteredGrns()" [class.selected]="selectedGrn()?.id === g.id">
              <td>
                <div class="cell-main">
                  <a class="code-link" (click)="viewGrn(g)">{{ g.grnNumber }}</a>
                  <span class="sub-text">Gate: {{ g.gateEntryNumber || 'N/A' }}</span>
                  <span class="sub-text">{{ g.gateInTimeUtc | date: 'mediumDate' }}</span>
                </div>
              </td>
              <td>
                <div class="cell-main">
                  <strong>{{ g.supplierName }}</strong>
                  <span class="sub-text">PO: {{ g.purchaseOrderReference || 'Direct' }}</span>
                  <span class="sub-text">Challan: {{ g.challanNumber }}</span>
                </div>
              </td>
              <td>
                <div class="cell-main">
                  <span class="badge-transport">{{ g.vehicleNumber || 'Self/Courier' }}</span>
                  <span class="sub-text">{{ g.transporterName || 'Direct Delivery' }}</span>
                </div>
              </td>
              <td>
                <div class="cell-main">
                  <span>{{ g.lines.length }} line items</span>
                  <span class="qty-accepted font-mono">
                    Recv: {{ totalReceived(g) }} | Acc: {{ totalAccepted(g) }}
                  </span>
                  <span class="qty-rejected font-mono" *ngIf="totalRejected(g) > 0">
                    Rej: {{ totalRejected(g) }}
                  </span>
                </div>
              </td>
              <td>
                <ar-chip [tone]="qcTone(g.qcStatus)">
                  {{ qcLabel(g.qcStatus) }}
                </ar-chip>
              </td>
              <td>
                <ar-chip [tone]="grnTone(g.status)">
                  {{ grnLabel(g.status) }}
                </ar-chip>
              </td>
              <td class="actions-col">
                <div class="action-buttons">
                  <button
                    ar-button="ghost"
                    *ngIf="
                      g.status === GrnStatus.UnderInspection ||
                      g.qcStatus === QcInspectionStatus.Pending
                    "
                    (click)="openInspectionDialog(g)"
                  >
                    Inspect
                  </button>
                  <button
                    ar-button="quiet"
                    *ngIf="g.status === GrnStatus.Approved"
                    (click)="createVendorBill(g)"
                  >
                    Convert to Bill
                  </button>
                  <button
                    ar-button="danger"
                    *ngIf="totalRejected(g) > 0 && g.status !== GrnStatus.Cancelled"
                    (click)="createDebitNote(g)"
                    title="Generate Vendor Debit Note for rejected items"
                  >
                    Debit Note
                  </button>
                  <button ar-button="ghost" (click)="viewGrn(g)">View</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="filteredGrns().length === 0">
              <td colspan="7" class="empty-state">
                <p>No Goods Receipt Notes found matching the criteria.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- GRN Detail Drawer / Modal -->
    <ar-dialog
      *ngIf="selectedGrn()"
      [title]="'GRN Dossier: ' + selectedGrn()!.grnNumber"
      (dismiss)="selectedGrn.set(null)"
    >
      <div class="dialog-body" *ngIf="selectedGrn() as g">
        <div class="meta-row">
          <div>
            <span class="meta-label">Supplier</span>
            <h4>{{ g.supplierName }}</h4>
            <p class="sub-text">
              Challan Ref: {{ g.challanNumber }} | PO: {{ g.purchaseOrderReference || 'N/A' }}
            </p>
          </div>
          <div class="meta-status">
            <ar-chip [tone]="grnTone(g.status)">{{ grnLabel(g.status) }}</ar-chip>
            <ar-chip [tone]="qcTone(g.qcStatus)">{{ qcLabel(g.qcStatus) }}</ar-chip>
          </div>
        </div>

        <div class="grid-details">
          <div class="info-card">
            <h5>Gate Inward Information</h5>
            <p><strong>Gate Entry #:</strong> {{ g.gateEntryNumber || 'N/A' }}</p>
            <p><strong>Vehicle Number:</strong> {{ g.vehicleNumber || 'N/A' }}</p>
            <p><strong>Transporter:</strong> {{ g.transporterName || 'Direct Delivery' }}</p>
          </div>
          <div class="info-card">
            <h5>QC & Put-Away Inspection</h5>
            <p>
              <strong>Inspection Date:</strong>
              {{ g.inspectedAtUtc ? (g.inspectedAtUtc | date: 'medium') : 'Pending' }}
            </p>
            <p><strong>QC Findings:</strong> {{ g.inspectorNotes || 'No remarks recorded.' }}</p>
          </div>
        </div>

        <h5 class="mt-4 mb-2">Received Line Items & Bin Allocation</h5>
        <div class="lines-table-wrapper">
          <table class="dialog-table">
            <thead>
              <tr>
                <th>Part No</th>
                <th>Description</th>
                <th class="text-right">Received</th>
                <th class="text-right">Accepted</th>
                <th class="text-right">Rejected</th>
                <th>Storage Bin</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of g.lines">
                <td class="font-mono">
                  <strong>{{ line.partNumber }}</strong>
                </td>
                <td>{{ line.description }}</td>
                <td class="text-right">{{ line.receivedQuantity }} {{ line.unitOfMeasure }}</td>
                <td class="text-right text-good">
                  <strong>{{ line.acceptedQuantity }}</strong>
                </td>
                <td class="text-right text-danger">{{ line.rejectedQuantity }}</td>
                <td>
                  <span class="badge-bin">{{ line.storageBin || 'Unassigned' }}</span>
                </td>
                <td class="sub-text">{{ line.rejectionReason || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="dialog-actions mt-4">
          <button
            ar-button="ghost"
            *ngIf="g.status === GrnStatus.UnderInspection"
            (click)="openInspectionDialog(g)"
          >
            Record QC Decision
          </button>
          <button
            ar-button="primary"
            *ngIf="g.status === GrnStatus.Approved"
            (click)="createVendorBill(g)"
          >
            Create Vendor Bill
          </button>
          <button ar-button="danger" *ngIf="totalRejected(g) > 0" (click)="createDebitNote(g)">
            Issue Debit Note for Rejections
          </button>
          <button ar-button="quiet" (click)="selectedGrn.set(null)">Close</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Complete Inspection Dialog -->
    <ar-dialog
      *ngIf="inspectingGrn()"
      title="Complete Material QC Inspection"
      (dismiss)="inspectingGrn.set(null)"
    >
      <div class="dialog-body" *ngIf="inspectingGrn() as g">
        <p class="dialog-intro">
          Verify and record accepted vs rejected items for <strong>{{ g.grnNumber }}</strong> from
          <strong>{{ g.supplierName }}</strong
          >.
        </p>

        <div class="form-group mb-3">
          <label>Quality Inspector Name *</label>
          <input
            type="text"
            class="form-control"
            [(ngModel)]="qcInspectionModel.inspectorName"
            placeholder="e.g. Ramesh Pawar (QC Head)"
          />
        </div>

        <div class="inspection-lines mb-3">
          <table class="dialog-table">
            <thead>
              <tr>
                <th>Part</th>
                <th>Recv Qty</th>
                <th>Accepted Qty</th>
                <th>Rejected Qty</th>
                <th>Storage Bin</th>
                <th>Rejection Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of qcInspectionModel.lines">
                <td>
                  <strong>{{ line.partNumber }}</strong>
                </td>
                <td>{{ line.receivedQuantity }}</td>
                <td>
                  <input
                    type="number"
                    class="form-control input-sm"
                    [(ngModel)]="line.acceptedQuantity"
                    (change)="onAcceptedChange(line)"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    class="form-control input-sm"
                    [(ngModel)]="line.rejectedQuantity"
                    (change)="onRejectedChange(line)"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    class="form-control input-sm"
                    [(ngModel)]="line.storageLocation"
                    placeholder="BIN-A1"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    class="form-control input-sm"
                    [(ngModel)]="line.rejectionReason"
                    placeholder="Reason if rejected"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="form-group mb-3">
          <label>Inspection Summary / Quality Certificate Remarks</label>
          <textarea
            class="form-control"
            rows="2"
            [(ngModel)]="qcInspectionModel.qcRemarks"
            placeholder="e.g. Surface roughness verified. Passed per ISO 9001 sampling standard."
          ></textarea>
        </div>

        <div class="dialog-actions">
          <button ar-button="primary" (click)="saveQcInspection()">
            Confirm & Approve Put-Away
          </button>
          <button ar-button="ghost" (click)="inspectingGrn.set(null)">Cancel</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Inward Gate Entry Modal -->
    <ar-dialog
      *ngIf="showCreateModal()"
      title="Record Inward Gate Entry (GRN)"
      (dismiss)="showCreateModal.set(false)"
    >
      <div class="dialog-body">
        <div class="form-grid mb-3">
          <div class="form-group">
            <label>Supplier Name *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newGrn.supplierName"
              placeholder="e.g. Bharat Precision Gears Pvt Ltd"
            />
          </div>
          <div class="form-group">
            <label>Purchase Order Ref</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newGrn.purchaseOrderReference"
              placeholder="PO-2026-0091"
            />
          </div>
          <div class="form-group">
            <label>Vendor Delivery Challan # *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newGrn.challanNumber"
              placeholder="DC-9921"
            />
          </div>
          <div class="form-group">
            <label>Gate Entry # *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newGrn.gateEntryNumber"
              placeholder="GE-2026-0422"
            />
          </div>
          <div class="form-group">
            <label>Vehicle Number</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newGrn.vehicleNumber"
              placeholder="MH 12 AB 1234"
            />
          </div>
          <div class="form-group">
            <label>Transporter Name</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newGrn.transporterName"
              placeholder="VRL Logistics"
            />
          </div>
        </div>

        <h5 class="mb-2">Line Items Received at Gate</h5>
        <table class="dialog-table mb-3">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>UOM</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of newGrn.lines; let i = index">
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
                  type="number"
                  class="form-control text-right"
                  [(ngModel)]="item.receivedQuantity"
                />
              </td>
              <td>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="item.unitOfMeasure"
                  placeholder="NOS"
                />
              </td>
              <td>
                <button ar-button="ghost" (click)="removeNewGrnLine(i)">x</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button ar-button="ghost" class="mb-3" (click)="addNewGrnLine()">+ Add Item</button>

        <div class="dialog-actions">
          <button ar-button="primary" (click)="saveNewGrn()">Save & Move to QC Inspection</button>
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

      .badge-transport {
        font-family: ui-monospace, monospace;
        background: #f1f5f9;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.75rem;
        width: fit-content;
      }

      .badge-bin {
        font-family: ui-monospace, monospace;
        background: #e0f2fe;
        color: #0369a1;
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .qty-accepted {
        color: #15803d;
        font-size: 0.75rem;
      }

      .qty-rejected {
        color: #b91c1c;
        font-size: 0.75rem;
        font-weight: 600;
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

      .input-sm {
        padding: 0.3rem 0.5rem;
        font-size: 0.8rem;
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
export class GoodsReceiptNotesComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly grnService = inject(GoodsReceiptNoteService);
  private readonly billService = inject(VendorBillService);
  private readonly debitNoteService = inject(VendorDebitNoteService);

  readonly GrnStatus = GrnStatus;
  readonly QcInspectionStatus = QcInspectionStatus;

  /** Opened from Vendor 360 for one supplier: only theirs, and new records are for them. */
  protected readonly scope = signal<SupplierScope | null>(readSupplierScope());
  protected readonly loadError = signal<string | null>(null);
  readonly allGrns = signal<GoodsReceiptNoteDto[]>(environment.useMockData ? MOCK_GRNS : []);
  readonly filterQuery = signal<string>('');
  readonly selectedStatus = signal<GrnStatus | null>(null);

  readonly selectedGrn = signal<GoodsReceiptNoteDto | null>(null);
  readonly inspectingGrn = signal<GoodsReceiptNoteDto | null>(null);
  readonly showCreateModal = signal<boolean>(false);

  // Inspection form
  qcInspectionModel: {
    inspectorName: string;
    qcRemarks: string;
    lines: Array<{
      goodsReceiptNoteLineId: string;
      partNumber: string;
      receivedQuantity: number;
      acceptedQuantity: number;
      rejectedQuantity: number;
      storageLocation: string;
      rejectionReason: string;
    }>;
  } = { inspectorName: '', qcRemarks: '', lines: [] };

  // New GRN form
  newGrn: {
    /** The real supplier, when the form was opened for one (from Vendor 360). */
    supplierId: string;
    supplierName: string;
    purchaseOrderReference: string;
    challanNumber: string;
    gateEntryNumber: string;
    vehicleNumber: string;
    transporterName: string;
    lines: Array<{
      partNumber: string;
      description: string;
      receivedQuantity: number;
      unitOfMeasure: string;
      unitPriceInPaise: number;
    }>;
  } = {
    supplierId: '',
    supplierName: '',
    purchaseOrderReference: '',
    challanNumber: '',
    gateEntryNumber: '',
    vehicleNumber: '',
    transporterName: '',
    lines: [
      {
        partNumber: '',
        description: '',
        receivedQuantity: 10,
        unitOfMeasure: 'NOS',
        unitPriceInPaise: 1000_00,
      },
    ],
  };

  readonly filteredGrns = computed(() => {
    let list = this.allGrns();
    const q = this.filterQuery().toLowerCase().trim();
    const s = this.selectedStatus();

    if (s !== null) {
      list = list.filter((x) => x.status === s);
    }

    if (q) {
      list = list.filter(
        (x) =>
          x.grnNumber.toLowerCase().includes(q) ||
          x.supplierName.toLowerCase().includes(q) ||
          x.challanNumber.toLowerCase().includes(q) ||
          (x.purchaseOrderReference && x.purchaseOrderReference.toLowerCase().includes(q)) ||
          (x.gateEntryNumber && x.gateEntryNumber.toLowerCase().includes(q)),
      );
    }

    return list;
  });

  readonly pendingQcCount = computed(
    () => this.allGrns().filter((x) => x.qcStatus === QcInspectionStatus.Pending).length,
  );

  readonly approvedCount = computed(
    () =>
      this.allGrns().filter((x) => x.status === GrnStatus.Approved || x.status === GrnStatus.Billed)
        .length,
  );

  readonly rejectedCount = computed(
    () => this.allGrns().filter((x) => this.totalRejected(x) > 0).length,
  );

  constructor() {
    this.loadData();
    // From Vendor 360: a new goods receipt for the supplier in scope.
    if (this.route.snapshot.queryParamMap.get('new')) this.openCreateModal();
  }

  protected clearScope(): void {
    this.scope.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.loadData();
  }

  /** `?open=<id>` (from Vendor 360) opens that record once the list is in. */
  private openRequest = this.route.snapshot.queryParamMap.get('open');
  private openRequested(): void {
    const id = this.openRequest;
    this.openRequest = null;
    const found = id ? this.allGrns().find((x) => x.id === id) : undefined;
    if (found) this.viewGrn(found);
  }

  loadData() {
    if (!environment.useMockData) {
      this.grnService
        .getList({ maxResultCount: 50, supplierId: this.scope()?.supplierId ?? undefined })
        .subscribe({
          next: (res) => {
            this.allGrns.set(res?.items ?? []);
            this.loadError.set(null);
            this.openRequested();
          },
          error: () => this.loadError.set('Goods receipts could not be loaded.'),
        });
    }
  }

  viewGrn(g: GoodsReceiptNoteDto) {
    this.selectedGrn.set(g);
  }

  openInspectionDialog(g: GoodsReceiptNoteDto) {
    this.inspectingGrn.set(g);
    this.qcInspectionModel = {
      inspectorName: 'QC Inspector',
      qcRemarks: 'Inspected dimensions, finish, and test certs per standard.',
      lines: g.lines.map((l) => ({
        goodsReceiptNoteLineId: l.id || '',
        partNumber: l.partNumber,
        receivedQuantity: l.receivedQuantity,
        acceptedQuantity: l.receivedQuantity,
        rejectedQuantity: 0,
        storageLocation: l.storageBin || 'BIN-A1',
        rejectionReason: '',
      })),
    };
  }

  onAcceptedChange(line: any) {
    line.rejectedQuantity = Math.max(0, line.receivedQuantity - line.acceptedQuantity);
  }

  onRejectedChange(line: any) {
    line.acceptedQuantity = Math.max(0, line.receivedQuantity - line.rejectedQuantity);
  }

  saveQcInspection() {
    const g = this.inspectingGrn();
    if (!g) return;

    const allPassed = this.qcInspectionModel.lines.every((l) => l.rejectedQuantity === 0);
    const somePassed = this.qcInspectionModel.lines.some((l) => l.acceptedQuantity > 0);
    const newQcStatus = allPassed
      ? QcInspectionStatus.Passed
      : somePassed
        ? QcInspectionStatus.PartiallyPassed
        : QcInspectionStatus.Failed;

    const updatedLines = g.lines.map((orig) => {
      const match = this.qcInspectionModel.lines.find((l) => l.goodsReceiptNoteLineId === orig.id);
      if (match) {
        return {
          ...orig,
          acceptedQuantity: match.acceptedQuantity,
          rejectedQuantity: match.rejectedQuantity,
          storageBin: match.storageLocation,
          rejectionReason: match.rejectionReason,
        };
      }
      return orig;
    });

    const updated: GoodsReceiptNoteDto = {
      ...g,
      status: GrnStatus.Approved,
      qcStatus: newQcStatus,
      inspectorNotes: `${this.qcInspectionModel.inspectorName}: ${this.qcInspectionModel.qcRemarks}`,
      inspectedAtUtc: new Date().toISOString(),
      lines: updatedLines,
    };

    if (!environment.useMockData && g.id) {
      const dto: CompleteQcInspectionDto = {
        qcStatus: newQcStatus,
        inspectorNotes: `${this.qcInspectionModel.inspectorName}: ${this.qcInspectionModel.qcRemarks}`,
        lineInspections: this.qcInspectionModel.lines.map((l) => ({
          lineId: l.goodsReceiptNoteLineId,
          acceptedQuantity: l.acceptedQuantity,
          rejectedQuantity: l.rejectedQuantity,
          storageBin: l.storageLocation,
          rejectionReason: l.rejectionReason,
        })),
      };
      this.grnService.completeInspection(g.id, dto).subscribe({
        next: (saved) => {
          this.updateGrnInState(saved);
        },
        error: (err) => console.error(err),
      });
    }

    this.updateGrnInState(updated);
    this.inspectingGrn.set(null);
    if (this.selectedGrn()?.id === g.id) {
      this.selectedGrn.set(updated);
    }
  }

  createVendorBill(g: GoodsReceiptNoteDto) {
    this.router.navigate(['/purchasing/bills'], {
      queryParams: { grnId: g.id, supplierName: g.supplierName },
    });
  }

  createDebitNote(g: GoodsReceiptNoteDto) {
    this.router.navigate(['/purchasing/debit-notes'], {
      queryParams: { grnId: g.id, supplierName: g.supplierName },
    });
  }

  openCreateModal() {
    this.newGrn = {
      supplierId: this.scope()?.supplierId ?? '',
      supplierName: this.scope()?.name ?? '',
      purchaseOrderReference: '',
      challanNumber: '',
      gateEntryNumber: `GE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleNumber: '',
      transporterName: '',
      lines: [
        {
          partNumber: '',
          description: '',
          receivedQuantity: 10,
          unitOfMeasure: 'NOS',
          unitPriceInPaise: 1500_00,
        },
      ],
    };
    this.showCreateModal.set(true);
  }

  addNewGrnLine() {
    this.newGrn.lines.push({
      partNumber: '',
      description: '',
      receivedQuantity: 5,
      unitOfMeasure: 'NOS',
      unitPriceInPaise: 1000_00,
    });
  }

  removeNewGrnLine(i: number) {
    if (this.newGrn.lines.length > 1) {
      this.newGrn.lines.splice(i, 1);
    }
  }

  saveNewGrn() {
    if (!this.newGrn.supplierName || !this.newGrn.challanNumber) {
      alert('Supplier name and Challan number are required.');
      return;
    }

    const created: GoodsReceiptNoteDto = {
      id: `grn-${Date.now()}`,
      grnNumber: `GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      purchaseOrderId: 'po-adhoc',
      purchaseOrderReference: this.newGrn.purchaseOrderReference || 'PO-2026-ADHOC',
      supplierId: this.newGrn.supplierId || `sup-${Date.now()}`,
      supplierName: this.newGrn.supplierName,
      challanNumber: this.newGrn.challanNumber,
      challanDateUtc: new Date().toISOString(),
      vehicleNumber: this.newGrn.vehicleNumber,
      transporterName: this.newGrn.transporterName,
      gateEntryNumber: this.newGrn.gateEntryNumber,
      gateInTimeUtc: new Date().toISOString(),
      status: GrnStatus.UnderInspection,
      qcStatus: QcInspectionStatus.Pending,
      creationTime: new Date().toISOString(),
      lines: this.newGrn.lines.map((l, idx) => ({
        id: `grnl-${Date.now()}-${idx}`,
        goodsReceiptNoteId: `grn-${Date.now()}`,
        lineNumber: idx + 1,
        partNumber: l.partNumber || `PART-${idx + 1}`,
        description: l.description || 'Inward raw stock',
        orderedQuantity: l.receivedQuantity,
        challanQuantity: l.receivedQuantity,
        receivedQuantity: l.receivedQuantity,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        unitOfMeasure: l.unitOfMeasure,
        storageBin: 'BAY-1',
      })),
    };

    if (!environment.useMockData) {
      const dto: CreateGoodsReceiptNoteDto = {
        purchaseOrderId: undefined,
        purchaseOrderReference: this.newGrn.purchaseOrderReference,
        supplierId: created.supplierId,
        supplierName: this.newGrn.supplierName,
        challanNumber: this.newGrn.challanNumber,
        challanDateUtc: new Date().toISOString(),
        vehicleNumber: this.newGrn.vehicleNumber,
        transporterName: this.newGrn.transporterName,
        gateEntryNumber: this.newGrn.gateEntryNumber,
        gateInTimeUtc: new Date().toISOString(),
        lines: this.newGrn.lines.map((l) => ({
          partNumber: l.partNumber,
          description: l.description,
          orderedQuantity: l.receivedQuantity,
          challanQuantity: l.receivedQuantity,
          receivedQuantity: l.receivedQuantity,
          unitOfMeasure: l.unitOfMeasure,
          storageBin: 'BAY-1',
        })),
      };
      this.grnService.create(dto).subscribe({
        next: (saved) => this.allGrns.update((list) => [saved, ...list]),
        error: (err) => console.error(err),
      });
    }

    this.allGrns.update((list) => [created, ...list]);
    this.showCreateModal.set(false);
  }

  private updateGrnInState(updated: GoodsReceiptNoteDto) {
    this.allGrns.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
  }

  totalReceived(g: GoodsReceiptNoteDto): number {
    return g.lines.reduce((acc, x) => acc + x.receivedQuantity, 0);
  }

  totalAccepted(g: GoodsReceiptNoteDto): number {
    return g.lines.reduce((acc, x) => acc + x.acceptedQuantity, 0);
  }

  totalRejected(g: GoodsReceiptNoteDto): number {
    return g.lines.reduce((acc, x) => acc + x.rejectedQuantity, 0);
  }

  qcTone(status: QcInspectionStatus): ChipTone {
    switch (status) {
      case QcInspectionStatus.Passed:
        return 'good';
      case QcInspectionStatus.PartiallyPassed:
        return 'warn';
      case QcInspectionStatus.Failed:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  qcLabel(status: QcInspectionStatus): string {
    switch (status) {
      case QcInspectionStatus.Passed:
        return 'QC Passed';
      case QcInspectionStatus.PartiallyPassed:
        return 'Partially Passed';
      case QcInspectionStatus.Failed:
        return 'QC Failed';
      default:
        return 'Awaiting QC';
    }
  }

  grnTone(status: GrnStatus): ChipTone {
    switch (status) {
      case GrnStatus.Approved:
        return 'good';
      case GrnStatus.Billed:
        return 'teal';
      case GrnStatus.UnderInspection:
        return 'amber';
      case GrnStatus.Rejected:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  grnLabel(status: GrnStatus): string {
    switch (status) {
      case GrnStatus.Approved:
        return 'Approved';
      case GrnStatus.Billed:
        return 'Billed';
      case GrnStatus.UnderInspection:
        return 'Under QC';
      case GrnStatus.Rejected:
        return 'Rejected';
      case GrnStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Draft';
    }
  }
}
