import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GridModule, RecordClickEventArgs } from '@syncfusion/ej2-angular-grids';
import { ToastService } from '../../../core/ui/toast.service';
import { CustomerScope, readCustomerScope } from '../../../core/util/customer-scope';
import { errorMessage } from '../../activities/activity-logic';
import { ArTopbar } from '../../../layout/topbar';
import { DeliveryChallanDto } from '../../../proxy/sales/delivery-challan.models';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { DeliveryChallanStatus, SalesExportFormat } from '../../../proxy/sales/sales-enums';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { ArButton, ArChip } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../../core/auth/permission';
import {
  canDeliverChallan,
  canDispatchChallan,
  canInvoiceChallan,
  challanStatusLabel,
  challanStatusTone,
  challanTypeLabel,
  listQuery,
  newRecordQuery,
} from '../sales-records.logic';
import { ArSalesExport } from '../sales-export';

@Component({
  selector: 'ar-delivery-challans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ArTopbar,
    ArButton,
    ArChip,
    ArSalesExport,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Delivery challans"
      subtitle="Statutory delivery documents under GST Rule 55 for dispatch against sales orders, job work, and goods transit."
      help="In India, goods cannot move without an invoice or a Delivery Challan. Challans track vehicle numbers, Lorry Receipts (LR/AWB), and statutory 12-digit e-Way Bills before invoice generation."
    >
      @if (canCreate()) {
        <ar-sales-export
          [fetch]="exportAll"
          [fileName]="exportName()"
          label="Export "
          hint="Every challan the filters show"
        />
        <button ar-button type="button" variant="primary" icon="plus" (click)="newChallan()">
          New challan
        </button>
      }
    </ar-topbar>

    <div class="challans-shell">
      @if (scope(); as sc) {
        <p class="scope-bar" role="status">
          Showing only {{ sc.name || 'this customer' }}'s challans.
          <button type="button" class="scope-bar__all" (click)="clearScope()">
            Show all challans
          </button>
        </p>
      }
      @if (loadError(); as e) {
        <p class="load-error" role="alert">
          {{ e }}
          <button ar-button variant="ghost" (click)="loadChallans()">Try again</button>
        </p>
      }
      <!-- Filter Bar -->
      <div class="filters-bar">
        <div class="search-input-wrap">
          <input
            type="text"
            class="ar-input"
            placeholder="Search by challan #, LR #, vehicle # or customer..."
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
            All ({{ challans().length }})
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === DeliveryChallanStatus.Draft"
            (click)="selectedStatus.set(DeliveryChallanStatus.Draft)"
          >
            Draft
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === DeliveryChallanStatus.Dispatched"
            (click)="selectedStatus.set(DeliveryChallanStatus.Dispatched)"
          >
            Dispatched
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === DeliveryChallanStatus.Delivered"
            (click)="selectedStatus.set(DeliveryChallanStatus.Delivered)"
          >
            Delivered
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === DeliveryChallanStatus.Invoiced"
            (click)="selectedStatus.set(DeliveryChallanStatus.Invoiced)"
          >
            Invoiced
          </button>
        </div>
      </div>

      <!-- Challans Table -->
      <div class="table-card">
        <ejs-grid
          arGrid="delivery-challans"
          [dataSource]="filteredChallans()"
          (recordClick)="onChallanClick($event)"
          aria-label="Delivery challans"
        >
          <e-columns>
            <e-column field="challanNumber" headerText="Challan #" width="160">
              <ng-template #template let-dc>
                <span class="font-mono font-bold text-primary">{{ dc.challanNumber }}</span>
              </ng-template>
            </e-column>
            <e-column field="customerName" headerText="Customer" width="220">
              <ng-template #template let-dc>
                <div class="font-semibold">{{ dc.customerName }}</div>
                @if (dc.customerAccountName) {
                  <div class="text-xs text-muted">{{ dc.customerAccountName }}</div>
                }
              </ng-template>
            </e-column>
            <e-column field="salesOrderNumber" headerText="Order Ref" width="140">
              <ng-template #template let-dc>
                <span class="font-mono text-xs">
                  {{ dc.salesOrderNumber || 'Direct' }}
                </span>
              </ng-template>
            </e-column>
            <e-column field="type" headerText="Purpose (GST Rule 55)" width="180">
              <ng-template #template let-dc>
                <span class="type-tag">{{ getChallanTypeLabel(dc.type) }}</span>
              </ng-template>
            </e-column>
            <e-column field="challanDateUtc" headerText="Dispatch Date" width="130">
              <ng-template #template let-dc>
                {{
                  dc.dispatchedAtUtc
                    ? (dc.dispatchedAtUtc | date: 'dd MMM yyyy')
                    : (dc.challanDateUtc | date: 'dd MMM yyyy')
                }}
              </ng-template>
            </e-column>
            <e-column headerText="Logistics (LR & Vehicle)" width="180">
              <ng-template #template let-dc>
                @if (dc.vehicleNumber || dc.lrNumber) {
                  <div class="font-mono text-xs">{{ dc.vehicleNumber || '—' }}</div>
                  <div class="text-muted text-xs">LR: {{ dc.lrNumber || '—' }}</div>
                } @else {
                  <span class="text-muted text-xs">Pending dispatch</span>
                }
              </ng-template>
            </e-column>
            <e-column field="status" headerText="Status" width="130">
              <ng-template #template let-dc>
                <ar-chip [tone]="getStatusTone(dc.status)">
                  {{ getStatusLabel(dc.status) }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column headerText="Actions" width="220">
              <ng-template #template let-dc>
                <div class="row-actions">
                  <button class="action-btn" (click)="openChallan(dc)">View</button>
                  @if (canDispatch(dc)) {
                    <button class="action-btn primary" (click)="openChallan(dc, true)">
                      Dispatch
                    </button>
                  }
                  @if (canDeliver(dc)) {
                    <button class="action-btn success" (click)="markDelivered(dc)">
                      Delivered
                    </button>
                  }
                  @if (canInvoice(dc)) {
                    <button
                      class="action-btn primary"
                      title="Generate GST Invoice"
                      (click)="createInvoiceFromChallan(dc)"
                    >
                      Invoice
                    </button>
                  }
                </div>
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
      </div>
    </div>
  `,
  styles: [
    `
      .scope-bar {
        margin: 0;
        padding: 0.6rem 0.9rem;
        border: 1px solid var(--ar-line-200);
        border-radius: 8px;
        background: var(--ar-blue-100, #eff6ff);
        font-size: 0.8125rem;
      }
      .scope-bar__all {
        margin-left: 0.5rem;
        background: none;
        border: 0;
        padding: 0;
        color: var(--ar-primary, #0284c7);
        font-weight: 600;
        cursor: pointer;
      }
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
      .challans-shell {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
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
      .challan-row {
        cursor: pointer;
        transition: background-color 0.1s ease;
      }
      .challan-row:hover {
        background-color: var(--ar-surface-hover, #f8fafc);
      }
      .type-tag {
        font-size: 0.75rem;
        background: var(--ar-surface-sunken, #f1f5f9);
        padding: 0.125rem 0.5rem;
        border-radius: 4px;
        font-weight: 500;
      }
      .actions-col {
        text-align: right;
        width: 160px;
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
    `,
  ],
})
export class ArDeliveryChallans {
  private readonly challanService = inject(DeliveryChallanService);
  private readonly invoiceService = inject(SalesInvoiceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  /** Opened from Customer 360 for one customer or account: only their challans. */
  protected readonly scope = signal<CustomerScope | null>(readCustomerScope());

  readonly DeliveryChallanStatus = DeliveryChallanStatus;

  private readonly toasts = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly canCreate = grantedPolicy(
    'AutoReach.DeliveryChallans.Create',
    this.permissions,
  );

  challans = signal<DeliveryChallanDto[]>([]);
  loadError = signal<string | null>(null);
  searchQuery = signal<string>('');
  selectedStatus = signal<DeliveryChallanStatus | null>(null);

  filteredChallans = computed(() => {
    let list = this.challans();
    const st = this.selectedStatus();
    if (st !== null) {
      list = list.filter((c) => c.status === st);
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.challanNumber.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          (c.lrNumber && c.lrNumber.toLowerCase().includes(q)) ||
          (c.vehicleNumber && c.vehicleNumber.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  /** Every challan the list's customer, status and search match, not only the rows loaded. */
  protected readonly exportAll = (format: SalesExportFormat) =>
    this.challanService.export(
      {
        filter: this.searchQuery().trim() || undefined,
        status: this.selectedStatus() ?? undefined,
        customerId: this.scope()?.customerId ?? undefined,
        customerAccountId: this.scope()?.accountId ?? undefined,
      },
      format,
      { skipHandleError: true },
    );
  protected readonly exportName = () =>
    ['Delivery challans', this.scope()?.name, new Date().toISOString().slice(0, 10)]
      .filter(Boolean)
      .join(' ');

  constructor() {
    // ?open=<id> (older links) now opens the challan's own page.
    const openId = this.route.snapshot.queryParamMap.get('open');
    if (openId) {
      void this.router.navigate(['/sales/challans', openId], {
        queryParams: listQuery(this.scope()),
        replaceUrl: true,
      });
    } else {
      this.loadChallans();
    }
  }

  onChallanClick(e: RecordClickEventArgs): void {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.row-actions, button, a')) return;
    const row = e.rowData as DeliveryChallanDto | undefined;
    if (row) this.openChallan(row);
  }

  /** The challan's own page (with the dispatch form open when `dispatch`), keeping this list's customer for Back. */
  openChallan(dc: DeliveryChallanDto, dispatch = false) {
    if (dc.id)
      void this.router.navigate(['/sales/challans', dc.id], {
        queryParams: { ...listQuery(this.scope()), dispatch: dispatch ? 1 : undefined },
      });
  }

  newChallan() {
    void this.router.navigate(['/sales/challans/new'], {
      queryParams: newRecordQuery(this.scope()),
    });
  }

  protected clearScope(): void {
    this.scope.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.loadChallans();
  }

  loadChallans() {
    this.challanService
      .getList({
        maxResultCount: 100,
        customerId: this.scope()?.customerId ?? undefined,
        customerAccountId: this.scope()?.accountId ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.challans.set(res?.items ?? []);
          this.loadError.set(null);
        },
        error: (e: unknown) => {
          this.loadError.set(errorMessage(e, 'Delivery challans could not be loaded.'));
        },
      });
  }

  markDelivered(dc: DeliveryChallanDto) {
    if (!dc.id) return;

    this.challanService.markDelivered(dc.id).subscribe({
      next: (updated) => {
        this.updateChallanInList(updated);
      },
      error: (e: unknown) =>
        this.toasts.error(errorMessage(e, `${dc.challanNumber} could not be marked delivered.`)),
    });
  }

  createInvoiceFromChallan(dc: DeliveryChallanDto) {
    if (!dc.id) return;

    this.invoiceService.createFromChallan(dc.id).subscribe({
      next: (invoice) => {
        this.router.navigate(['/sales/invoices', invoice.id]);
      },
      error: (e: unknown) =>
        this.toasts.error(
          errorMessage(e, `An invoice could not be raised for ${dc.challanNumber}.`),
        ),
    });
  }

  private updateChallanInList(updated: DeliveryChallanDto) {
    this.challans.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
  }

  readonly getChallanTypeLabel = challanTypeLabel;
  readonly getStatusLabel = challanStatusLabel;
  readonly getStatusTone = challanStatusTone;
  readonly canDispatch = canDispatchChallan;
  readonly canDeliver = canDeliverChallan;
  readonly canInvoice = canInvoiceChallan;
}
