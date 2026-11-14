import { PermissionService } from '@abp/ng.core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';
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
  Gstr2bMatchStatus,
  ThreeWayMatchStatus,
  VendorBillDto,
  VendorBillStatus,
  VendorPaymentMode,
  VendorBillService,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ChipTone } from '../../../ui';
import { ArGrid } from '../../../ui/grid';

@Component({
  standalone: true,
  selector: 'ar-vendor-bills',
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
        <ejs-grid arGrid="vendor-bills" [dataSource]="filteredBills()" aria-label="Vendor Bills">
          <e-columns>
            <e-column field="billNumber" headerText="Bill & Invoice #" width="180">
              <ng-template #template let-b>
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
              </ng-template>
            </e-column>
            <e-column field="supplierName" headerText="Supplier & GSTIN" width="220">
              <ng-template #template let-b>
                <div class="cell-main">
                  <strong>{{ b.supplierName }}</strong>
                  <span class="gstin-badge font-mono">{{ b.supplierGstin || 'Unregistered' }}</span>
                  <span class="sub-text">Due: {{ b.dueDateUtc | date: 'mediumDate' }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="purchaseOrderReference" headerText="PO & GRN Matching" width="180">
              <ng-template #template let-b>
                <div class="cell-main">
                  <span class="sub-text">PO: {{ b.purchaseOrderReference || 'Direct' }}</span>
                  <span class="sub-text">GRN: {{ b.goodsReceiptNoteNumber || 'Direct' }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="threeWayMatchStatus" headerText="3-Way Match" width="140">
              <ng-template #template let-b>
                <ar-chip [tone]="matchTone(b.threeWayMatchStatus)">
                  {{ matchLabel(b.threeWayMatchStatus) }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column field="gstr2bMatchStatus" headerText="GSTR-2B ITC" width="180">
              <ng-template #template let-b>
                @if (can().approve && b.status !== VendorBillStatus.Cancelled) {
                  <select
                    aria-label="GSTR-2B match status"
                    [ngModel]="b.gstr2bMatchStatus"
                    (ngModelChange)="reconcileGstr2b(b, $event)"
                    [disabled]="reconcilingBill() !== null"
                  >
                    <option [ngValue]="Gstr2bMatchStatus.Pending">Pending</option>
                    <option [ngValue]="Gstr2bMatchStatus.MatchedIn2B">Matched in GSTR-2B</option>
                    <option [ngValue]="Gstr2bMatchStatus.MissingIn2B">Missing in GSTR-2B</option>
                    <option [ngValue]="Gstr2bMatchStatus.TaxMismatch">Tax mismatch</option>
                  </select>
                } @else {
                  <ar-chip [tone]="itcTone(b.gstr2bMatchStatus)">
                    {{ itcLabel(b.gstr2bMatchStatus) }}
                  </ar-chip>
                }
              </ng-template>
            </e-column>
            <e-column
              field="grandTotalInPaise"
              headerText="Total (Inc Tax)"
              textAlign="Right"
              width="160"
            >
              <ng-template #template let-b>
                <div class="font-mono">
                  <strong>₹{{ b.grandTotalInPaise / 100 | number: '1.2-2' }}</strong>
                  <div class="tax-sub text-muted" *ngIf="b.totalTaxInPaise > 0">
                    Tax: ₹{{ b.totalTaxInPaise / 100 | number: '1.2-2' }}
                  </div>
                  <div class="tax-sub text-danger" *ngIf="b.tdsDeductedInPaise > 0">
                    TDS: -₹{{ b.tdsDeductedInPaise / 100 | number: '1.2-2' }}
                  </div>
                </div>
              </ng-template>
            </e-column>
            <e-column
              field="balanceDueInPaise"
              headerText="Balance Due"
              textAlign="Right"
              width="150"
            >
              <ng-template #template let-b>
                <span
                  class="font-mono"
                  [class.text-danger]="b.balanceDueInPaise > 0"
                  [class.text-good]="b.balanceDueInPaise === 0"
                >
                  ₹{{ b.balanceDueInPaise / 100 | number: '1.2-2' }}
                </span>
              </ng-template>
            </e-column>
            <e-column field="status" headerText="Status" width="130">
              <ng-template #template let-b>
                <ar-chip [tone]="billTone(b.status)">
                  {{ billLabel(b.status) }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column headerText="Actions" width="200">
              <ng-template #template let-b>
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
  readonly allBills = signal<VendorBillDto[]>([]);
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

  readonly reconcilingBill = signal<string | null>(null);

  async reconcileGstr2b(bill: VendorBillDto, status: Gstr2bMatchStatus): Promise<void> {
    if (!bill.id || this.reconcilingBill()) return;
    this.reconcilingBill.set(bill.id);
    try {
      const updated = await firstValueFrom(this.billService.reconcileGstr2b(bill.id, status));
      this.updateBillInState(updated);
    } catch {
      this.updateBillInState({ ...bill });
      this.toasts.error('Could not save the GSTR-2B match status.');
    } finally {
      this.reconcilingBill.set(null);
    }
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
