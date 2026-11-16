import { grantedPolicy } from '../../../core/auth/permission';
import { PermissionService } from '@abp/ng.core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GridModule, RecordClickEventArgs } from '@syncfusion/ej2-angular-grids';
import { ArTopbar } from '../../../layout/topbar';
import { SalesOrderDto } from '../../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';
import { SalesExportFormat, SalesOrderStatus } from '../../../proxy/sales/sales-enums';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { ArButton, ArChip } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { ToastService } from '../../../core/ui/toast.service';
import { CustomerScope, readCustomerScope } from '../../../core/util/customer-scope';
import { errorMessage } from '../../activities/activity-logic';
import {
  canConfirmOrder,
  canFulfilOrder,
  listQuery,
  newRecordQuery,
  orderStatusLabel,
  orderStatusTone,
} from '../sales-records.logic';
import { ArSalesExport } from '../sales-export';

@Component({
  selector: 'ar-sales-orders',
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
      title="Sales orders"
      subtitle="Commercial sales orders received from customers with order acknowledgment, dispatch milestones and billing tracking."
      help="Sales Orders capture confirmed customer PO numbers, delivery terms, and line items. From here you can issue GST Delivery Challans or Commercial Invoices directly."
    >
      <div actions class="actions-row">
        <ar-sales-export
          [fetch]="exportAll"
          [fileName]="exportName()"
          label="Export "
          hint="Every order the filters show"
        />
        <button ar-button variant="primary" (click)="newOrder()">+ New Sales order</button>
      </div>
    </ar-topbar>

    <div class="orders-shell">
      @if (scope(); as sc) {
        <p class="scope-bar" role="status">
          Showing only {{ sc.name || 'this customer' }}'s orders.
          <button type="button" class="scope-bar__all" (click)="clearScope()">
            Show all orders
          </button>
        </p>
      }
      @if (loadError(); as e) {
        <p class="load-error" role="alert">
          {{ e }}
          <button ar-button variant="ghost" (click)="loadOrders()">Try again</button>
        </p>
      }
      <!-- Search & Filters -->
      <div class="filters-bar">
        <div class="search-input-wrap">
          <input
            type="text"
            class="ar-input"
            placeholder="Search by order #, PO # or customer..."
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
            All ({{ orders().length }})
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesOrderStatus.Draft"
            (click)="selectedStatus.set(SalesOrderStatus.Draft)"
          >
            Draft
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesOrderStatus.Confirmed"
            (click)="selectedStatus.set(SalesOrderStatus.Confirmed)"
          >
            Confirmed
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesOrderStatus.PartiallyDispatched"
            (click)="selectedStatus.set(SalesOrderStatus.PartiallyDispatched)"
          >
            Partially dispatched
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesOrderStatus.Dispatched"
            (click)="selectedStatus.set(SalesOrderStatus.Dispatched)"
          >
            Dispatched
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesOrderStatus.Completed"
            (click)="selectedStatus.set(SalesOrderStatus.Completed)"
          >
            Completed
          </button>
        </div>
      </div>

      <!-- Orders List Table -->
      <div class="table-card">
        <ejs-grid
          arGrid="sales-orders"
          [dataSource]="filteredOrders()"
          (recordClick)="onOrderClick($event)"
          aria-label="Sales orders"
        >
          <e-columns>
            <e-column field="orderNumber" headerText="Order #" width="150">
              <ng-template #template let-order>
                <span class="font-mono font-bold text-primary">{{ order.orderNumber }}</span>
              </ng-template>
            </e-column>
            <e-column field="customerName" headerText="Customer / Account" width="220">
              <ng-template #template let-order>
                <div class="cust-title">{{ order.customerName }}</div>
                @if (order.customerAccountName) {
                  <div class="cust-sub">{{ order.customerAccountName }}</div>
                }
              </ng-template>
            </e-column>
            <e-column field="customerPoNumber" headerText="Customer PO" width="160">
              <ng-template #template let-order>
                @if (order.customerPoNumber) {
                  <span class="po-badge font-mono">{{ order.customerPoNumber }}</span>
                  @if (order.customerPoDate) {
                    <span class="po-date">{{ order.customerPoDate | date: 'dd MMM yyyy' }}</span>
                  }
                } @else {
                  <span class="text-muted">—</span>
                }
              </ng-template>
            </e-column>
            <e-column field="orderDateUtc" headerText="Order Date" width="130">
              <ng-template #template let-order>
                {{ order.orderDateUtc | date: 'dd MMM yyyy' }}
              </ng-template>
            </e-column>
            <e-column field="deliveryTerms" headerText="Delivery terms" width="140">
              <ng-template #template let-order>
                {{ order.deliveryTerms || 'Standard' }}
              </ng-template>
            </e-column>
            <e-column
              field="grandTotalInPaise"
              headerText="Grand total"
              textAlign="Right"
              width="140"
            >
              <ng-template #template let-order>
                <span class="num-col font-bold">
                  ₹{{ order.grandTotalInPaise / 100 | number: '1.2-2' }}
                </span>
              </ng-template>
            </e-column>
            <e-column field="status" headerText="Status" width="140">
              <ng-template #template let-order>
                <ar-chip [tone]="getStatusTone(order.status)">
                  {{ getStatusLabel(order.status) }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column headerText="Actions" width="240">
              <ng-template #template let-order>
                <div class="row-actions">
                  <button class="action-btn" title="View details" (click)="openOrder(order)">
                    View
                  </button>
                  @if (mayConfirm() && canConfirm(order)) {
                    <button class="action-btn primary" (click)="confirmOrder(order)">
                      Confirm
                    </button>
                  }
                  @if (canFulfil(order)) {
                    <button
                      class="action-btn success"
                      title="Create Delivery Challan"
                      (click)="createChallan(order)"
                    >
                      Challan
                    </button>
                    <button
                      class="action-btn primary"
                      title="Generate GST Invoice"
                      (click)="createInvoice(order)"
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
      .orders-shell {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .actions-row {
        display: flex;
        gap: 0.5rem;
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
      .order-row {
        cursor: pointer;
        transition: background-color 0.1s ease;
      }
      .order-row:hover {
        background-color: var(--ar-surface-hover, #f8fafc);
      }
      .cust-title {
        font-weight: 600;
      }
      .cust-sub {
        font-size: 0.75rem;
        color: var(--ar-ink-muted, #64748b);
      }
      .po-badge {
        background: var(--ar-surface-sunken, #e2e8f0);
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        font-size: 0.75rem;
      }
      .po-date {
        display: block;
        font-size: 0.7rem;
        color: var(--ar-ink-muted, #64748b);
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
    `,
  ],
})
export class ArSalesOrders {
  private readonly permissionGate = inject(PermissionService);
  protected readonly mayConfirm = grantedPolicy(
    'AutoReach.SalesOrders.Confirm',
    this.permissionGate,
  );
  private readonly orderService = inject(SalesOrderService);
  private readonly challanService = inject(DeliveryChallanService);
  private readonly invoiceService = inject(SalesInvoiceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  /** Opened from Customer 360 for one customer or account: only their orders. */
  protected readonly scope = signal<CustomerScope | null>(readCustomerScope());

  readonly SalesOrderStatus = SalesOrderStatus;

  private readonly toasts = inject(ToastService);

  orders = signal<SalesOrderDto[]>([]);
  loadError = signal<string | null>(null);
  searchQuery = signal<string>('');
  selectedStatus = signal<SalesOrderStatus | null>(null);

  filteredOrders = computed(() => {
    let list = this.orders();
    const st = this.selectedStatus();
    if (st !== null) {
      list = list.filter((o) => o.status === st);
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.customerPoNumber && o.customerPoNumber.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  /** Every order the list's customer, status and search match, not only the rows loaded. */
  protected readonly exportAll = (format: SalesExportFormat) =>
    this.orderService.export(
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
    ['Sales orders', this.scope()?.name, new Date().toISOString().slice(0, 10)]
      .filter(Boolean)
      .join(' ');

  constructor() {
    // Older links: ?new=1 (with &customer=<contact id>&customerName=…) and ?open=<id> now have their own pages.
    const query = this.route.snapshot.queryParamMap;
    const openId = query.get('open');
    if (query.get('new')) {
      void this.router.navigate(['/sales/orders/new'], {
        queryParams: {
          customer: query.get('customer') || undefined,
          customerName: query.get('customerName') || undefined,
        },
        replaceUrl: true,
      });
    } else if (openId) {
      void this.router.navigate(['/sales/orders', openId], {
        queryParams: listQuery(this.scope()),
        replaceUrl: true,
      });
    } else {
      this.loadOrders();
    }
  }

  protected clearScope(): void {
    this.scope.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.loadOrders();
  }

  loadOrders() {
    this.orderService
      .getList({
        maxResultCount: 100,
        customerId: this.scope()?.customerId ?? undefined,
        customerAccountId: this.scope()?.accountId ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.orders.set(res?.items ?? []);
          this.loadError.set(null);
        },
        error: (e: unknown) => {
          this.loadError.set(errorMessage(e, 'Sales orders could not be loaded.'));
        },
      });
  }

  onOrderClick(e: RecordClickEventArgs): void {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.row-actions, button, a')) return;
    const row = e.rowData as SalesOrderDto | undefined;
    if (row) this.openOrder(row);
  }

  /** The order's own page, keeping this list's customer so Back returns here. */
  openOrder(order: SalesOrderDto) {
    if (order.id)
      void this.router.navigate(['/sales/orders', order.id], {
        queryParams: listQuery(this.scope()),
      });
  }

  newOrder() {
    void this.router.navigate(['/sales/orders/new'], {
      queryParams: newRecordQuery(this.scope()),
    });
  }

  confirmOrder(order: SalesOrderDto) {
    if (!order.id) return;

    this.orderService.confirm(order.id).subscribe({
      next: (updated) => {
        this.updateOrderInList(updated);
      },
      error: (e: unknown) =>
        this.toasts.error(errorMessage(e, `${order.orderNumber} could not be confirmed.`)),
    });
  }

  createChallan(order: SalesOrderDto) {
    if (!order.id) return;

    this.challanService.createFromSalesOrder(order.id).subscribe({
      next: (challan) => {
        this.router.navigate(['/sales/challans', challan.id]);
      },
      error: (e: unknown) =>
        this.toasts.error(
          errorMessage(e, `A challan could not be raised for ${order.orderNumber}.`),
        ),
    });
  }

  createInvoice(order: SalesOrderDto) {
    if (!order.id) return;

    this.invoiceService.createFromSalesOrder(order.id).subscribe({
      next: (invoice) => {
        this.router.navigate(['/sales/invoices', invoice.id]);
      },
      error: (e: unknown) =>
        this.toasts.error(
          errorMessage(e, `An invoice could not be raised for ${order.orderNumber}.`),
        ),
    });
  }

  private updateOrderInList(updated: SalesOrderDto) {
    this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
  }

  readonly getStatusLabel = orderStatusLabel;
  readonly getStatusTone = orderStatusTone;
  readonly canConfirm = canConfirmOrder;
  readonly canFulfil = canFulfilOrder;
}
