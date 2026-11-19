import { PermissionService } from '@abp/ng.core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArTopbar } from '../../../layout/topbar';
import { checkPolicy } from '../../../core/auth/permission';
import {
  SupplierScope,
  readSupplierScope,
  supplierScopeParams,
} from '../../../core/util/supplier-scope';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import { ArSupplierScopeBar } from '../supplier-scope-bar';
import {
  GoodsReceiptNoteDto,
  GrnStatus,
  QcInspectionStatus,
  GoodsReceiptNoteService,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ChipTone } from '../../../ui';
import { ArGrid } from '../../../ui/grid';

@Component({
  standalone: true,
  selector: 'ar-goods-receipt-notes',
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
      help="Every goods receipt: what arrived at the gate against the purchase order, its QC result and where it was stored."
      title="Goods Receipt Notes (GRN)"
      subtitle="Inward warehouse gate entry, QC inspection & put-away management"
    >
      @if (can().create) {
        <button ar-button variant="primary" icon="plus" (click)="openCreatePage()">
          Inward gate entry (GRN)
        </button>
      }
    </ar-topbar>

    <div class="page-content ar-scroll ar-scroll--bare">
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
        <ejs-grid
          arGrid="goods-receipt-notes"
          [dataSource]="filteredGrns()"
          aria-label="Goods Receipt Notes"
        >
          <e-columns>
            <e-column field="grnNumber" headerText="GRN & Gate Details" width="180">
              <ng-template #template let-g>
                <div class="cell-main">
                  <a
                    class="code-link"
                    [routerLink]="['/purchasing/grn', g.id]"
                    [queryParams]="scopeParams()"
                    >{{ g.grnNumber }}</a
                  >
                  <span class="sub-text">Gate: {{ g.gateEntryNumber || 'N/A' }}</span>
                  <span class="sub-text">{{ g.gateInTimeUtc | date: 'mediumDate' }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="supplierName" headerText="Supplier & PO" width="220">
              <ng-template #template let-g>
                <div class="cell-main">
                  <strong>{{ g.supplierName }}</strong>
                  <span class="sub-text">PO: {{ g.purchaseOrderReference || 'Direct' }}</span>
                  <span class="sub-text">Challan: {{ g.challanNumber }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="vehicleNumber" headerText="Transport & Vehicle" width="180">
              <ng-template #template let-g>
                <div class="cell-main">
                  <span class="badge-transport">{{ g.vehicleNumber || 'Self/Courier' }}</span>
                  <span class="sub-text">{{ g.transporterName || 'Direct Delivery' }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column headerText="Items & Qty" width="200">
              <ng-template #template let-g>
                <div class="cell-main">
                  <span>{{ g.lines.length }} line items</span>
                  <span class="qty-accepted font-mono">
                    Recv: {{ totalReceived(g) }} | Acc: {{ totalAccepted(g) }}
                  </span>
                  <span class="qty-rejected font-mono" *ngIf="totalRejected(g) > 0">
                    Rej: {{ totalRejected(g) }}
                  </span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="qcStatus" headerText="QC Status" width="140">
              <ng-template #template let-g>
                <ar-chip [tone]="qcTone(g.qcStatus)">
                  {{ qcLabel(g.qcStatus) }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column field="status" headerText="Status" width="130">
              <ng-template #template let-g>
                <ar-chip [tone]="grnTone(g.status)">
                  {{ grnLabel(g.status) }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column headerText="Actions" width="260">
              <ng-template #template let-g>
                <div class="action-buttons">
                  <button
                    ar-button
                    variant="ghost"
                    *ngIf="
                      can().inspect &&
                      (g.status === GrnStatus.UnderInspection ||
                        g.qcStatus === QcInspectionStatus.Pending)
                    "
                    (click)="inspectPage(g)"
                  >
                    Inspect
                  </button>
                  <button
                    ar-button
                    variant="quiet"
                    *ngIf="can().bill && g.status === GrnStatus.Approved"
                    (click)="createVendorBill(g)"
                  >
                    Convert to Bill
                  </button>
                  <button
                    ar-button
                    variant="danger"
                    *ngIf="
                      can().debitNote && totalRejected(g) > 0 && g.status !== GrnStatus.Cancelled
                    "
                    (click)="createDebitNote(g)"
                    title="Generate Vendor Debit Note for rejected items"
                  >
                    Debit Note
                  </button>
                  <a
                    ar-button
                    variant="ghost"
                    [routerLink]="['/purchasing/grn', g.id]"
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
  private readonly permissions = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly grnService = inject(GoodsReceiptNoteService);

  /** What this role may do here besides reading (each action's API permission). */
  protected readonly can = computed(() => {
    const has = (p: string) => checkPolicy(p, this.permissions);
    return {
      create: has(PURCHASING_PERMISSIONS.createGrn),
      inspect: has(PURCHASING_PERMISSIONS.inspectGrn),
      bill: has(PURCHASING_PERMISSIONS.createBill),
      debitNote: has(PURCHASING_PERMISSIONS.createDebitNote),
    };
  });

  readonly GrnStatus = GrnStatus;
  readonly QcInspectionStatus = QcInspectionStatus;

  /** Opened from Vendor 360 for one supplier: only theirs, and new records are for them. */
  protected readonly scope = signal<SupplierScope | null>(readSupplierScope());
  protected readonly loadError = signal<string | null>(null);
  readonly allGrns = signal<GoodsReceiptNoteDto[]>([]);
  readonly filterQuery = signal<string>('');
  readonly selectedStatus = signal<GrnStatus | null>(null);

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
    this.openRequested();
    this.loadData();
    // Older links (`?new=1`) open the inward gate entry page, for the supplier in scope.
    if (this.route.snapshot.queryParamMap.get('new')) {
      const sc = this.scope();
      void this.router.navigate(['/purchasing/grn/new'], {
        queryParams: sc ? supplierScopeParams(sc) : {},
        replaceUrl: true,
      });
    }
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

  /** `?open=<id>` (from Vendor 360 and older links) opens that receipt's own page. */
  private openRequested(): void {
    const id = this.route.snapshot.queryParamMap.get('open');
    if (id) {
      void this.router.navigate(['/purchasing/grn', id], {
        queryParams: this.scopeParams(),
        replaceUrl: true,
      });
    }
  }

  loadData() {
    this.grnService
      .getList({ maxResultCount: 50, supplierId: this.scope()?.supplierId ?? undefined })
      .subscribe({
        next: (res) => {
          this.allGrns.set(res?.items ?? []);
          this.loadError.set(null);
        },
        error: () => this.loadError.set('Goods receipts could not be loaded.'),
      });
  }

  /** QC inspection has its own page. */
  inspectPage(g: GoodsReceiptNoteDto) {
    void this.router.navigate(['/purchasing/grn', g.id, 'inspect'], {
      queryParams: this.scopeParams(),
    });
  }

  /** Bills this receipt's accepted goods, on the Record vendor bill page. */
  createVendorBill(g: GoodsReceiptNoteDto) {
    void this.router.navigate(['/purchasing/bills/new'], { queryParams: { grn: g.id } });
  }

  /** Debits this receipt's rejections, on the Issue debit note page. */
  createDebitNote(g: GoodsReceiptNoteDto) {
    void this.router.navigate(['/purchasing/debit-notes/new'], { queryParams: { grn: g.id } });
  }

  /** Inward gate entry has its own page; opened for the supplier in scope, if any. */
  openCreatePage() {
    const sc = this.scope();
    void this.router.navigate(['/purchasing/grn/new'], {
      queryParams: sc ? supplierScopeParams(sc) : {},
    });
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
