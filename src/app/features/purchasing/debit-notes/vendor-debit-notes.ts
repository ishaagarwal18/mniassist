import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import { SupplierScope, readSupplierScope } from '../../../core/util/supplier-scope';
import { ArSupplierScopeBar } from '../supplier-scope-bar';
import {
  CreateVendorDebitNoteDto,
  CreateVendorDebitNoteLineDto,
  VendorDebitNoteDto,
  VendorDebitNoteStatus,
  VendorDebitNoteService,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

const MOCK_DEBIT_NOTES: VendorDebitNoteDto[] = [
  {
    id: 'vdn-1',
    debitNoteNumber: 'DN-2026-0012',
    supplierId: 'sup-3',
    supplierName: 'Sundram Fasteners Automotive',
    vendorBillId: 'vb-2',
    vendorBillNumber: 'VB-2026-0082',
    goodsReceiptNoteId: 'grn-3',
    goodsReceiptNoteNumber: 'GRN-2026-0103',
    status: VendorDebitNoteStatus.Issued,
    issueDateUtc: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    reason: 'QC Rejection: 15 PCS flange bolts failed pitch gauge thread tolerance (GRN-2026-0103)',
    isInterState: true,
    taxableAmountInPaise: 3600_00,
    cgstInPaise: 0,
    sgstInPaise: 0,
    igstInPaise: 648_00,
    grandTotalInPaise: 4248_00,
    remarks: 'Dispatched rejection report to supplier QA desk.',
    creationTime: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'vdnl-1',
        vendorDebitNoteId: 'vdn-1',
        lineNumber: 1,
        partNumber: 'BLT-M16-109',
        description: 'Grade 10.9 Flange Head Bolt M16x90mm Zn-Ni Coated',
        quantity: 15,
        unitPriceInPaise: 240_00,
        taxableAmountInPaise: 3600_00,
        taxRateBasisPoints: 1800,
        cgstAmountInPaise: 0,
        sgstAmountInPaise: 0,
        igstAmountInPaise: 648_00,
        lineTotalInPaise: 4248_00,
      },
    ],
  },
  {
    id: 'vdn-2',
    debitNoteNumber: 'DN-2026-0009',
    supplierId: 'sup-1',
    supplierName: 'Bharat Precision Gears Pvt Ltd',
    vendorBillId: 'vb-prev',
    vendorBillNumber: 'VB-2026-0044',
    goodsReceiptNoteId: 'grn-prev',
    goodsReceiptNoteNumber: 'GRN-2026-0051',
    status: VendorDebitNoteStatus.Settled,
    issueDateUtc: new Date(Date.now() - 25 * 86_400_000).toISOString(),
    reason: 'Rate revision adjustment per Master Service Agreement price indexation clause.',
    isInterState: false,
    taxableAmountInPaise: 12_000_00,
    cgstInPaise: 1080_00,
    sgstInPaise: 1080_00,
    igstInPaise: 0,
    grandTotalInPaise: 14_160_00,
    remarks: 'Settled against payment voucher CMS-HDFC-8819.',
    creationTime: new Date(Date.now() - 25 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'vdnl-2',
        vendorDebitNoteId: 'vdn-2',
        lineNumber: 1,
        partNumber: 'GR-HEL-120',
        description: 'Helical Gear Volume Discount / Rate Correction',
        quantity: 1,
        unitPriceInPaise: 12_000_00,
        taxableAmountInPaise: 12_000_00,
        taxRateBasisPoints: 1800,
        cgstAmountInPaise: 1080_00,
        sgstAmountInPaise: 1080_00,
        igstAmountInPaise: 0,
        lineTotalInPaise: 14_160_00,
      },
    ],
  },
];

@Component({
  standalone: true,
  selector: 'ar-vendor-debit-notes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArChip, ArDialog, ArSupplierScopeBar],
  template: `
    <ar-topbar
      title="Vendor Debit Notes"
      subtitle="Purchase return, QC rejection credit & supplier price adjustment notes"
    >
      <button ar-button="primary" (click)="openCreateModal()">+ Issue Debit Note</button>
    </ar-topbar>

    <div class="page-content">
      @if (scope(); as sc) {
        <ar-supplier-scope-bar [name]="sc.name" what="debit notes" (showAll)="clearScope()" />
      }
      @if (loadError(); as e) {
        <p class="load-error" role="alert">{{ e }}</p>
      }
      <!-- Financial Summary Cards -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Total Debit Notes</span>
          <strong class="value">₹{{ totalDebitValue() / 100 | number: '1.2-2' }}</strong>
          <span class="sub">{{ allDebitNotes().length }} notes recorded</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Issued & Pending Settlement</span>
          <strong class="value">₹{{ pendingSettlementValue() / 100 | number: '1.2-2' }}</strong>
          <span class="sub">To be adjusted against future bills</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Settled / Recovered</span>
          <strong class="value">₹{{ settledValue() / 100 | number: '1.2-2' }}</strong>
          <span class="sub">Fully deducted from vendor payouts</span>
        </div>
      </section>

      <!-- Filter bar -->
      <section class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="input-search"
            placeholder="Search Debit Note #, Supplier, Bill #, Reason..."
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
            All ({{ allDebitNotes().length }})
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === VendorDebitNoteStatus.Issued"
            (click)="selectedStatus.set(VendorDebitNoteStatus.Issued)"
          >
            Issued / Open
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === VendorDebitNoteStatus.Settled"
            (click)="selectedStatus.set(VendorDebitNoteStatus.Settled)"
          >
            Settled
          </button>
        </div>
      </section>

      <!-- Debit Note Table -->
      <section class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Debit Note #</th>
              <th>Supplier</th>
              <th>Linked Bill / GRN</th>
              <th>Reason & Justification</th>
              <th class="text-right">Taxable</th>
              <th class="text-right">GST Total</th>
              <th class="text-right">Grand Total</th>
              <th>Status</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let dn of filteredDebitNotes()"
              [class.selected]="selectedDebitNote()?.id === dn.id"
            >
              <td>
                <div class="cell-main">
                  <a class="code-link" (click)="viewDebitNote(dn)">{{ dn.debitNoteNumber }}</a>
                  <span class="sub-text">{{ dn.issueDateUtc | date: 'mediumDate' }}</span>
                </div>
              </td>
              <td>
                <div class="cell-main">
                  <strong>{{ dn.supplierName }}</strong>
                  <span class="badge-interstate font-mono">{{
                    dn.isInterState ? 'IGST (Inter-State)' : 'CGST+SGST (Intra-State)'
                  }}</span>
                </div>
              </td>
              <td>
                <div class="cell-main">
                  <span class="sub-text" *ngIf="dn.vendorBillNumber"
                    >Bill: <strong>{{ dn.vendorBillNumber }}</strong></span
                  >
                  <span class="sub-text" *ngIf="dn.goodsReceiptNoteNumber"
                    >GRN: {{ dn.goodsReceiptNoteNumber }}</span
                  >
                </div>
              </td>
              <td>
                <span class="reason-text" [title]="dn.reason">{{ dn.reason }}</span>
              </td>
              <td class="text-right font-mono">
                ₹{{ dn.taxableAmountInPaise / 100 | number: '1.2-2' }}
              </td>
              <td class="text-right font-mono">
                ₹{{ (dn.grandTotalInPaise - dn.taxableAmountInPaise) / 100 | number: '1.2-2' }}
              </td>
              <td class="text-right font-mono">
                <strong class="text-good"
                  >₹{{ dn.grandTotalInPaise / 100 | number: '1.2-2' }}</strong
                >
              </td>
              <td>
                <ar-chip [tone]="statusTone(dn.status)">
                  {{ statusLabel(dn.status) }}
                </ar-chip>
              </td>
              <td class="actions-col">
                <div class="action-buttons">
                  <button
                    ar-button="primary"
                    *ngIf="dn.status === VendorDebitNoteStatus.Issued"
                    (click)="settleDebitNote(dn)"
                  >
                    Settle
                  </button>
                  <button ar-button="quiet" (click)="viewDebitNote(dn)">View</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="filteredDebitNotes().length === 0">
              <td colspan="9" class="empty-state">
                <p>No vendor debit notes found matching criteria.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- View Debit Note Dialog -->
    <ar-dialog
      *ngIf="selectedDebitNote()"
      [title]="'Vendor Debit Note: ' + selectedDebitNote()!.debitNoteNumber"
      (dismiss)="selectedDebitNote.set(null)"
    >
      <div class="dialog-body" *ngIf="selectedDebitNote() as dn">
        <div class="meta-row">
          <div>
            <span class="meta-label">Supplier Creditor</span>
            <h4>{{ dn.supplierName }}</h4>
            <p class="sub-text">Reason: {{ dn.reason }}</p>
          </div>
          <div class="meta-status">
            <ar-chip [tone]="statusTone(dn.status)">{{ statusLabel(dn.status) }}</ar-chip>
          </div>
        </div>

        <div class="grid-details">
          <div class="info-card">
            <h5>Document References</h5>
            <p><strong>Issue Date:</strong> {{ dn.issueDateUtc | date: 'mediumDate' }}</p>
            <p>
              <strong>Bill Reference:</strong>
              {{ dn.vendorBillNumber || 'Open Balance Adjustment' }}
            </p>
            <p><strong>GRN Reference:</strong> {{ dn.goodsReceiptNoteNumber || 'Direct' }}</p>
          </div>
          <div class="info-card">
            <h5>Financial Recovery</h5>
            <p>
              <strong>Taxable Adjustment:</strong> ₹{{
                dn.taxableAmountInPaise / 100 | number: '1.2-2'
              }}
            </p>
            <p>
              <strong>GST Adjustment:</strong> ₹{{
                (dn.grandTotalInPaise - dn.taxableAmountInPaise) / 100 | number: '1.2-2'
              }}
            </p>
            <p>
              <strong>Total Recoverable:</strong>
              <strong class="text-good">₹{{ dn.grandTotalInPaise / 100 | number: '1.2-2' }}</strong>
            </p>
          </div>
        </div>

        <h5 class="mt-4 mb-2">Debit Item Breakdown</h5>
        <div class="lines-table-wrapper">
          <table class="dialog-table">
            <thead>
              <tr>
                <th>Part No</th>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Rate</th>
                <th class="text-right">Taxable</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of dn.lines">
                <td class="font-mono">
                  <strong>{{ line.partNumber }}</strong>
                </td>
                <td>{{ line.description }}</td>
                <td class="text-right font-mono">{{ line.quantity }}</td>
                <td class="text-right font-mono">
                  ₹{{ line.unitPriceInPaise / 100 | number: '1.2-2' }}
                </td>
                <td class="text-right font-mono">
                  ₹{{ line.taxableAmountInPaise / 100 | number: '1.2-2' }}
                </td>
                <td class="text-right font-mono">
                  <strong>₹{{ line.lineTotalInPaise / 100 | number: '1.2-2' }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="dialog-actions mt-4">
          <button
            ar-button="primary"
            *ngIf="dn.status === VendorDebitNoteStatus.Issued"
            (click)="settleDebitNote(dn)"
          >
            Mark as Settled / Deducted
          </button>
          <button ar-button="quiet" (click)="selectedDebitNote.set(null)">Close</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Create Debit Note Modal -->
    <ar-dialog
      *ngIf="showCreateModal()"
      title="Create Vendor Debit Note"
      (dismiss)="showCreateModal.set(false)"
    >
      <div class="dialog-body">
        <div class="form-grid mb-3">
          <div class="form-group">
            <label>Supplier Name *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newDebitNote.supplierName"
              placeholder="Sundram Fasteners Automotive"
            />
          </div>
          <div class="form-group">
            <label>Vendor Bill #</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newDebitNote.vendorBillNumber"
              placeholder="VB-2026-0082"
            />
          </div>
          <div class="form-group">
            <label>Goods Receipt Note (GRN) #</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newDebitNote.goodsReceiptNoteNumber"
              placeholder="GRN-2026-0103"
            />
          </div>
          <div class="form-group">
            <label>GST Supply Type</label>
            <select class="form-control" [(ngModel)]="newDebitNote.isInterState">
              <option [ngValue]="false">Intra-State (CGST + SGST)</option>
              <option [ngValue]="true">Inter-State (IGST)</option>
            </select>
          </div>
        </div>

        <div class="form-group mb-3">
          <label>Reason for Debit Note *</label>
          <input
            type="text"
            class="form-control"
            [(ngModel)]="newDebitNote.reason"
            placeholder="e.g. QC Rejection: Material out of tolerance / short supply"
          />
        </div>

        <h5 class="mb-2">Items to Debit</h5>
        <table class="dialog-table mb-3">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate (₹)</th>
              <th>GST %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of newDebitNote.lines; let i = index">
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
                <input type="number" class="form-control text-right" [(ngModel)]="item.quantity" />
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
                <button ar-button="ghost" (click)="removeLine(i)">x</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button ar-button="ghost" class="mb-3" (click)="addLine()">+ Add Item</button>

        <div class="dialog-actions">
          <button ar-button="primary" (click)="saveNewDebitNote()">Issue Debit Note</button>
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

      .badge-interstate {
        font-size: 0.72rem;
        background: #f1f5f9;
        color: #475569;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        width: fit-content;
      }

      .reason-text {
        display: block;
        max-width: 260px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.82rem;
        color: #334155;
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

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      .empty-state {
        text-align: center;
        padding: 2.5rem;
        color: #94a3b8;
      }
    `,
  ],
})
export class VendorDebitNotesComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly debitNoteService = inject(VendorDebitNoteService);

  readonly VendorDebitNoteStatus = VendorDebitNoteStatus;

  /** Opened from Vendor 360 for one supplier: only theirs, and new records are for them. */
  protected readonly scope = signal<SupplierScope | null>(readSupplierScope());
  protected readonly loadError = signal<string | null>(null);
  readonly allDebitNotes = signal<VendorDebitNoteDto[]>(
    environment.useMockData ? MOCK_DEBIT_NOTES : [],
  );
  readonly filterQuery = signal<string>('');
  readonly selectedStatus = signal<VendorDebitNoteStatus | null>(null);

  readonly selectedDebitNote = signal<VendorDebitNoteDto | null>(null);
  readonly showCreateModal = signal<boolean>(false);

  // New Debit Note model
  newDebitNote: {
    /** The real supplier, when the form was opened for one (from Vendor 360). */
    supplierId: string;
    supplierName: string;
    vendorBillNumber: string;
    goodsReceiptNoteNumber: string;
    reason: string;
    isInterState: boolean;
    lines: Array<{
      partNumber: string;
      description: string;
      quantity: number;
      unitPriceRupees: number;
      taxRateBasisPoints: number;
    }>;
  } = {
    supplierId: '',
    supplierName: '',
    vendorBillNumber: '',
    goodsReceiptNoteNumber: '',
    reason: '',
    isInterState: false,
    lines: [
      {
        partNumber: '',
        description: '',
        quantity: 1,
        unitPriceRupees: 1000,
        taxRateBasisPoints: 1800,
      },
    ],
  };

  readonly filteredDebitNotes = computed(() => {
    let list = this.allDebitNotes();
    const q = this.filterQuery().toLowerCase().trim();
    const s = this.selectedStatus();

    if (s !== null) {
      list = list.filter((x) => x.status === s);
    }

    if (q) {
      list = list.filter(
        (x) =>
          x.debitNoteNumber.toLowerCase().includes(q) ||
          x.supplierName.toLowerCase().includes(q) ||
          x.reason.toLowerCase().includes(q) ||
          (x.vendorBillNumber && x.vendorBillNumber.toLowerCase().includes(q)) ||
          (x.goodsReceiptNoteNumber && x.goodsReceiptNoteNumber.toLowerCase().includes(q)),
      );
    }

    return list;
  });

  readonly totalDebitValue = computed(() =>
    this.allDebitNotes().reduce((acc, x) => acc + x.grandTotalInPaise, 0),
  );

  readonly pendingSettlementValue = computed(() =>
    this.allDebitNotes()
      .filter((x) => x.status === VendorDebitNoteStatus.Issued)
      .reduce((acc, x) => acc + x.grandTotalInPaise, 0),
  );

  readonly settledValue = computed(() =>
    this.allDebitNotes()
      .filter((x) => x.status === VendorDebitNoteStatus.Settled)
      .reduce((acc, x) => acc + x.grandTotalInPaise, 0),
  );

  constructor() {
    this.loadData();
    this.checkQueryParams();
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
    const found = id ? this.allDebitNotes().find((x) => x.id === id) : undefined;
    if (found) this.viewDebitNote(found);
  }

  loadData() {
    if (!environment.useMockData) {
      this.debitNoteService
        .getList({ maxResultCount: 50, supplierId: this.scope()?.supplierId ?? undefined })
        .subscribe({
          next: (res) => {
            this.allDebitNotes.set(res?.items ?? []);
            this.loadError.set(null);
            this.openRequested();
          },
          error: () => this.loadError.set('Debit notes could not be loaded.'),
        });
    }
  }

  private checkQueryParams() {
    this.route.queryParams.subscribe((params) => {
      // From Vendor 360: a new record for the supplier in scope.
      if (params['new'] && !params['grnId']) this.openCreateModal();
      if (params['grnId']) {
        this.openCreateModal();
        if (params['supplierName']) {
          this.newDebitNote.supplierName = params['supplierName'];
        }
        this.newDebitNote.goodsReceiptNoteNumber = `GRN-${params['grnId'].substring(0, 6)}`;
        this.newDebitNote.reason = `QC Rejection deduction for GRN ${this.newDebitNote.goodsReceiptNoteNumber}`;
      }
    });
  }

  viewDebitNote(dn: VendorDebitNoteDto) {
    this.selectedDebitNote.set(dn);
  }

  settleDebitNote(dn: VendorDebitNoteDto) {
    const updated: VendorDebitNoteDto = {
      ...dn,
      status: VendorDebitNoteStatus.Settled,
    };
    if (!environment.useMockData && dn.id) {
      this.debitNoteService.settle(dn.id).subscribe({
        next: (saved) => this.updateInState(saved),
        error: (err) => console.error(err),
      });
    }
    this.updateInState(updated);
    if (this.selectedDebitNote()?.id === dn.id) {
      this.selectedDebitNote.set(updated);
    }
  }

  openCreateModal() {
    this.newDebitNote = {
      supplierId: this.scope()?.supplierId ?? '',
      supplierName: this.scope()?.name ?? '',
      vendorBillNumber: '',
      goodsReceiptNoteNumber: '',
      reason: '',
      isInterState: false,
      lines: [
        {
          partNumber: '',
          description: '',
          quantity: 1,
          unitPriceRupees: 1000,
          taxRateBasisPoints: 1800,
        },
      ],
    };
    this.showCreateModal.set(true);
  }

  addLine() {
    this.newDebitNote.lines.push({
      partNumber: '',
      description: '',
      quantity: 1,
      unitPriceRupees: 500,
      taxRateBasisPoints: 1800,
    });
  }

  removeLine(i: number) {
    if (this.newDebitNote.lines.length > 1) {
      this.newDebitNote.lines.splice(i, 1);
    }
  }

  saveNewDebitNote() {
    if (!this.newDebitNote.supplierName || !this.newDebitNote.reason) {
      alert('Supplier name and reason are required.');
      return;
    }

    let taxablePaise = 0;
    let totalTaxPaise = 0;

    const mappedLines = this.newDebitNote.lines.map((l, idx) => {
      const taxable = Math.round(l.quantity * l.unitPriceRupees * 100);
      const tax = Math.round(taxable * (l.taxRateBasisPoints / 10000));
      taxablePaise += taxable;
      totalTaxPaise += tax;
      return {
        id: `vdnl-${Date.now()}-${idx}`,
        vendorDebitNoteId: `vdn-${Date.now()}`,
        lineNumber: idx + 1,
        partNumber: l.partNumber || `PART-${idx + 1}`,
        description: l.description || 'Rejected or adjusted item',
        quantity: l.quantity,
        unitPriceInPaise: Math.round(l.unitPriceRupees * 100),
        taxableAmountInPaise: taxable,
        taxRateBasisPoints: l.taxRateBasisPoints,
        cgstAmountInPaise: this.newDebitNote.isInterState ? 0 : Math.round(tax / 2),
        sgstAmountInPaise: this.newDebitNote.isInterState ? 0 : Math.round(tax / 2),
        igstAmountInPaise: this.newDebitNote.isInterState ? tax : 0,
        lineTotalInPaise: taxable + tax,
      };
    });

    const grandTotal = taxablePaise + totalTaxPaise;

    const created: VendorDebitNoteDto = {
      id: `vdn-${Date.now()}`,
      debitNoteNumber: `DN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: this.newDebitNote.supplierId || `sup-${Date.now()}`,
      supplierName: this.newDebitNote.supplierName,
      vendorBillNumber: this.newDebitNote.vendorBillNumber,
      goodsReceiptNoteNumber: this.newDebitNote.goodsReceiptNoteNumber,
      status: VendorDebitNoteStatus.Issued,
      issueDateUtc: new Date().toISOString(),
      reason: this.newDebitNote.reason,
      isInterState: this.newDebitNote.isInterState,
      taxableAmountInPaise: taxablePaise,
      cgstInPaise: this.newDebitNote.isInterState ? 0 : Math.round(totalTaxPaise / 2),
      sgstInPaise: this.newDebitNote.isInterState ? 0 : Math.round(totalTaxPaise / 2),
      igstInPaise: this.newDebitNote.isInterState ? totalTaxPaise : 0,
      grandTotalInPaise: grandTotal,
      creationTime: new Date().toISOString(),
      lines: mappedLines,
    };

    if (!environment.useMockData) {
      const dto: CreateVendorDebitNoteDto = {
        supplierId: created.supplierId,
        supplierName: this.newDebitNote.supplierName,
        reason: this.newDebitNote.reason,
        isInterState: this.newDebitNote.isInterState,
        vendorBillNumber: this.newDebitNote.vendorBillNumber,
        goodsReceiptNoteNumber: this.newDebitNote.goodsReceiptNoteNumber,
        lines: this.newDebitNote.lines.map((l) => ({
          partNumber: l.partNumber,
          description: l.description,
          quantity: l.quantity,
          unitPriceInPaise: Math.round(l.unitPriceRupees * 100),
          taxRateBasisPoints: l.taxRateBasisPoints,
        })),
      };
      this.debitNoteService.create(dto).subscribe({
        next: (saved) => this.allDebitNotes.update((list) => [saved, ...list]),
        error: (err) => console.error(err),
      });
    }

    this.allDebitNotes.update((list) => [created, ...list]);
    this.showCreateModal.set(false);
  }

  private updateInState(updated: VendorDebitNoteDto) {
    this.allDebitNotes.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
  }

  statusTone(status: VendorDebitNoteStatus): ChipTone {
    switch (status) {
      case VendorDebitNoteStatus.Settled:
        return 'good';
      case VendorDebitNoteStatus.Issued:
        return 'amber';
      case VendorDebitNoteStatus.Cancelled:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  statusLabel(status: VendorDebitNoteStatus): string {
    switch (status) {
      case VendorDebitNoteStatus.Settled:
        return 'Settled / Deducted';
      case VendorDebitNoteStatus.Issued:
        return 'Issued / Open';
      case VendorDebitNoteStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Draft';
    }
  }
}
