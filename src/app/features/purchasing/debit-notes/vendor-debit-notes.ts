import { PermissionService } from '@abp/ng.core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import { checkPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import {
  SupplierScope,
  readSupplierScope,
  supplierScopeParams,
} from '../../../core/util/supplier-scope';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import { issueConfirm, settleConfirm } from './debit-note-detail-page';
import { ArSupplierScopeBar } from '../supplier-scope-bar';
import {
  CreateVendorDebitNoteLineDto,
  VendorDebitNoteDto,
  VendorDebitNoteStatus,
  VendorDebitNoteService,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ChipTone } from '../../../ui';
import { ArGrid } from '../../../ui/grid';

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
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ArTopbar,
    ArButton,
    ArChip,
    ArSupplierScopeBar,
    ArGrid,
    GridModule,
  ],
  template: `
    <ar-topbar
      title="Vendor Debit Notes"
      subtitle="Purchase return, QC rejection credit & supplier price adjustment notes"
    >
      @if (can().create) {
        <button ar-button variant="primary" icon="plus" (click)="openCreatePage()">
          New debit note
        </button>
      }
    </ar-topbar>

    <div class="page-content ar-scroll ar-scroll--bare">
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
        <ejs-grid
          arGrid="vendor-debit-notes"
          [dataSource]="filteredDebitNotes()"
          aria-label="Vendor Debit Notes"
        >
          <e-columns>
            <e-column field="debitNoteNumber" headerText="Debit Note #" width="160">
              <ng-template #template let-dn>
                <div class="cell-main">
                  <a
                    class="code-link"
                    [routerLink]="['/purchasing/debit-notes', dn.id]"
                    [queryParams]="scopeParams()"
                    >{{ dn.debitNoteNumber }}</a
                  >
                  <span class="sub-text">{{ dn.issueDateUtc | date: 'mediumDate' }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="supplierName" headerText="Supplier" width="220">
              <ng-template #template let-dn>
                <div class="cell-main">
                  <strong>{{ dn.supplierName }}</strong>
                  <span class="badge-interstate font-mono">{{
                    dn.isInterState ? 'IGST (Inter-State)' : 'CGST+SGST (Intra-State)'
                  }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="vendorBillNumber" headerText="Linked Bill / GRN" width="180">
              <ng-template #template let-dn>
                <div class="cell-main">
                  <span class="sub-text" *ngIf="dn.vendorBillNumber"
                    >Bill: <strong>{{ dn.vendorBillNumber }}</strong></span
                  >
                  <span class="sub-text" *ngIf="dn.goodsReceiptNoteNumber"
                    >GRN: {{ dn.goodsReceiptNoteNumber }}</span
                  >
                </div>
              </ng-template>
            </e-column>
            <e-column field="reason" headerText="Reason & Justification" width="220">
              <ng-template #template let-dn>
                <span class="reason-text" [title]="dn.reason">{{ dn.reason }}</span>
              </ng-template>
            </e-column>
            <e-column field="taxableAmountInPaise" headerText="Taxable" textAlign="Right" width="130">
              <ng-template #template let-dn>
                <span class="font-mono">₹{{ dn.taxableAmountInPaise / 100 | number: '1.2-2' }}</span>
              </ng-template>
            </e-column>
            <e-column headerText="GST Total" textAlign="Right" width="130">
              <ng-template #template let-dn>
                <span class="font-mono">
                  ₹{{ (dn.grandTotalInPaise - dn.taxableAmountInPaise) / 100 | number: '1.2-2' }}
                </span>
              </ng-template>
            </e-column>
            <e-column field="grandTotalInPaise" headerText="Grand Total" textAlign="Right" width="140">
              <ng-template #template let-dn>
                <strong class="text-good font-mono"
                  >₹{{ dn.grandTotalInPaise / 100 | number: '1.2-2' }}</strong
                >
              </ng-template>
            </e-column>
            <e-column field="status" headerText="Status" width="130">
              <ng-template #template let-dn>
                <ar-chip [tone]="statusTone(dn.status)">
                  {{ statusLabel(dn.status) }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column headerText="Actions" width="220" freeze="Right">
              <ng-template #template let-dn>
                <div class="action-buttons">
                  <button
                    ar-button
                    variant="primary"
                    *ngIf="can().issue && dn.status === VendorDebitNoteStatus.Draft"
                    [disabled]="issuing() === dn.id"
                    (click)="issueDebitNote(dn)"
                  >
                    Issue
                  </button>
                  <button
                    ar-button
                    variant="primary"
                    *ngIf="dn.status === VendorDebitNoteStatus.Issued"
                    (click)="settleDebitNote(dn)"
                  >
                    Settle
                  </button>
                  <a
                    ar-button
                    variant="quiet"
                    [routerLink]="['/purchasing/debit-notes', dn.id]"
                    [queryParams]="scopeParams()"
                    >View</a
                  >
                </div>
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
      </section>
    </div>

    <!-- View Debit Note Dialog -->
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
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly debitNoteService = inject(VendorDebitNoteService);

  /** What this role may do here besides reading (each action's API permission). */
  protected readonly can = computed(() => {
    const has = (p: string) => checkPolicy(p, this.permissions);
    return {
      create: has(PURCHASING_PERMISSIONS.createDebitNote),
      issue: has(PURCHASING_PERMISSIONS.issueDebitNote),
    };
  });

  readonly VendorDebitNoteStatus = VendorDebitNoteStatus;

  /** Opened from Vendor 360 for one supplier: only theirs, and new records are for them. */
  protected readonly scope = signal<SupplierScope | null>(readSupplierScope());
  protected readonly loadError = signal<string | null>(null);
  readonly allDebitNotes = signal<VendorDebitNoteDto[]>(
    environment.useMockData ? MOCK_DEBIT_NOTES : [],
  );
  readonly filterQuery = signal<string>('');
  readonly selectedStatus = signal<VendorDebitNoteStatus | null>(null);

  /** The draft being issued, while the call is out. */
  protected readonly issuing = signal<string | null>(null);

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

  /** `?open=<id>` (from Vendor 360 and older links) opens that debit note's own page. */
  private openRequested(): void {
    const id = this.route.snapshot.queryParamMap.get('open');
    if (id) {
      void this.router.navigate(['/purchasing/debit-notes', id], {
        queryParams: this.scopeParams(),
        replaceUrl: true,
      });
    }
  }

  loadData() {
    if (!environment.useMockData) {
      this.debitNoteService
        .getList({ maxResultCount: 50, supplierId: this.scope()?.supplierId ?? undefined })
        .subscribe({
          next: (res) => {
            this.allDebitNotes.set(res?.items ?? []);
            this.loadError.set(null);
          },
          error: () => this.loadError.set('Debit notes could not be loaded.'),
        });
    }
  }

  /** Older links (`?new=1`, `?grnId=`) open the Issue debit note page. */
  private checkQueryParams() {
    const q = this.route.snapshot.queryParamMap;
    const grn = q.get('grnId');
    if (!q.get('new') && !grn) return;
    const sc = this.scope();
    void this.router.navigate(['/purchasing/debit-notes/new'], {
      queryParams: grn ? { grn } : sc ? supplierScopeParams(sc) : {},
      replaceUrl: true,
    });
  }

  /** Settling closes an issued note: asked first, shown only once the API agrees. */
  async settleDebitNote(dn: VendorDebitNoteDto) {
    if (!dn.id || !(await this.confirm.confirm(settleConfirm(dn)))) return;
    if (environment.useMockData) {
      this.updateInState({ ...dn, status: VendorDebitNoteStatus.Settled });
      return;
    }
    this.issuing.set(dn.id);
    try {
      const saved = await firstValueFrom(
        this.debitNoteService.settle(dn.id, { skipHandleError: true }),
      );
      this.updateInState(saved);
      this.toasts.success(`${saved.debitNoteNumber} settled.`);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The debit note could not be settled.'), 'Not settled');
    } finally {
      this.issuing.set(null);
    }
  }

  /** A new debit note has its own page; opened for the supplier in scope, if any. */
  openCreatePage() {
    const sc = this.scope();
    void this.router.navigate(['/purchasing/debit-notes/new'], {
      queryParams: sc ? supplierScopeParams(sc) : {},
    });
  }

  /** Issues a draft to the supplier: shown as issued only once the API agrees. */
  async issueDebitNote(dn: VendorDebitNoteDto) {
    if (!dn.id || !(await this.confirm.confirm(issueConfirm(dn)))) return;
    if (environment.useMockData) {
      this.updateInState({ ...dn, status: VendorDebitNoteStatus.Issued });
      return;
    }
    this.issuing.set(dn.id);
    try {
      const saved = await firstValueFrom(
        this.debitNoteService.issue(dn.id, { skipHandleError: true }),
      );
      this.updateInState(saved);
      this.toasts.success(`${saved.debitNoteNumber} issued to ${saved.supplierName}.`);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The debit note could not be issued.'), 'Not issued');
    } finally {
      this.issuing.set(null);
    }
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
