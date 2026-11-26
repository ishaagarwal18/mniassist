import { PermissionService } from '@abp/ng.core';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationStart, Router, RouterLink } from '@angular/router';
import { GridComponent, GridModule, RecordClickEventArgs } from '@syncfusion/ej2-angular-grids';
import { filter, firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { CustomerScope, readCustomerScope } from '../../../core/util/customer-scope';
import { inr } from '../../../core/util/format';
import { ArTopbar } from '../../../layout/topbar';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { SalesExportFormat, SalesOrderStatus } from '../../../proxy/sales/sales-enums';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { SalesOrderDto } from '../../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';
import { ArButton, ArIcon } from '../../../ui';
import type { IconName } from '../../../ui/icon';
import { ArGrid } from '../../../ui/grid';
import { errorMessage } from '../../activities/activity-logic';
import { ArSalesExport } from '../sales-export';
import {
  canCancelOrder,
  canConfirmOrder,
  canDeleteOrder,
  canFulfilOrder,
  listQuery,
  newRecordQuery,
  orderStatusLabel,
  orderStatusTone,
} from '../sales-records.logic';

export interface SalesNavTab {
  readonly label: string;
  readonly route: string;
  readonly icon: IconName;
}

@Component({
  selector: 'ar-sales-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ArTopbar,
    ArButton,
    ArIcon,
    ArSalesExport,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class ArSalesOrders {
  @ViewChild('grid') protected grid?: GridComponent;

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
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  /** Opened from Customer 360 for one customer or account: only their orders. */
  protected readonly scope = signal<CustomerScope | null>(readCustomerScope());

  readonly SalesOrderStatus = SalesOrderStatus;

  readonly navTabs: readonly SalesNavTab[] = [
    { label: 'Sales Orders', route: '/sales/orders', icon: 'sales-orders' },
    { label: 'Delivery Challans', route: '/sales/challans', icon: 'delivery-challans' },
    { label: 'Sales Invoices', route: '/sales/invoices', icon: 'sales-invoices' },
    { label: 'Milestones Due', route: '/billing/due', icon: 'clock' },
    { label: 'Retention', route: '/billing/retention', icon: 'retention' },
    { label: 'Re-Orders', route: '/reorders', icon: 'reorders' },
    { label: 'Collections', route: '/collections', icon: 'collections' },
  ];

  orders = signal<SalesOrderDto[]>([]);
  loadError = signal<string | null>(null);
  searchQuery = signal<string>('');
  selectedStatus = signal<SalesOrderStatus | null>(null);

  /** Active action menu ID: only one open menu allowed at a time */
  protected readonly activeActionMenuId = signal<string | null>(null);

  // Computed status counts
  readonly draftCount = computed(
    () => this.orders().filter((o) => o.status === SalesOrderStatus.Draft).length,
  );
  readonly confirmedCount = computed(
    () => this.orders().filter((o) => o.status === SalesOrderStatus.Confirmed).length,
  );
  readonly partiallyDispatchedCount = computed(
    () => this.orders().filter((o) => o.status === SalesOrderStatus.PartiallyDispatched).length,
  );
  readonly dispatchedCount = computed(
    () => this.orders().filter((o) => o.status === SalesOrderStatus.Dispatched).length,
  );
  readonly completedCount = computed(
    () => this.orders().filter((o) => o.status === SalesOrderStatus.Completed).length,
  );
  readonly cancelledCount = computed(
    () => this.orders().filter((o) => o.status === SalesOrderStatus.Cancelled).length,
  );

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
          (o.customerAccountName && o.customerAccountName.toLowerCase().includes(q)) ||
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

    // Close any open menus on route navigation
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.closeAllMenus());
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.order-action-dropdown, .row-btn-more')) {
      this.closeAllMenus();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeAllMenus();
  }

  protected toggleActionMenu(event: MouseEvent, order: SalesOrderDto): void {
    event.stopPropagation();
    this.activeActionMenuId.update((current) => (current === order.id ? null : (order.id ?? null)));
  }

  protected closeAllMenus(): void {
    this.activeActionMenuId.set(null);
  }

  protected onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.closeAllMenus();
    this.resetGridPage();
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.closeAllMenus();
    this.resetGridPage();
  }

  protected setStatusFilter(status: SalesOrderStatus | null): void {
    this.selectedStatus.set(status);
    this.closeAllMenus();
    this.resetGridPage();
  }

  private resetGridPage(): void {
    try {
      this.grid?.goToPage(1);
    } catch {
      // Grid might not be initialized yet
    }
  }

  protected clearScope(): void {
    this.scope.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.loadOrders();
  }

  loadOrders(): void {
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
    if (target?.closest('.row-actions-wrap, button, a')) return;
    const row = e.rowData as SalesOrderDto | undefined;
    if (row) this.openOrder(row);
  }

  /** The order's own page, keeping this list's customer so Back returns here. */
  openOrder(order: SalesOrderDto): void {
    if (order.id)
      void this.router.navigate(['/sales/orders', order.id], {
        queryParams: listQuery(this.scope()),
      });
  }

  newOrder(): void {
    void this.router.navigate(['/sales/orders/new'], {
      queryParams: newRecordQuery(this.scope()),
    });
  }

  confirmOrder(order: SalesOrderDto): void {
    if (!order.id) return;

    this.orderService.confirm(order.id).subscribe({
      next: (updated) => {
        this.updateOrderInList(updated);
        this.toasts.success(`${order.orderNumber} confirmed.`);
      },
      error: (e: unknown) =>
        this.toasts.error(errorMessage(e, `${order.orderNumber} could not be confirmed.`)),
    });
  }

  createChallan(order: SalesOrderDto): void {
    if (!order.id) return;

    this.challanService.createFromSalesOrder(order.id).subscribe({
      next: (challan) => {
        void this.router.navigate(['/sales/challans', challan.id]);
      },
      error: (e: unknown) =>
        this.toasts.error(
          errorMessage(e, `A challan could not be raised for ${order.orderNumber}.`),
        ),
    });
  }

  createInvoice(order: SalesOrderDto): void {
    if (!order.id) return;

    this.invoiceService.createFromSalesOrder(order.id).subscribe({
      next: (invoice) => {
        void this.router.navigate(['/sales/invoices', invoice.id]);
      },
      error: (e: unknown) =>
        this.toasts.error(
          errorMessage(e, `An invoice could not be raised for ${order.orderNumber}.`),
        ),
    });
  }

  async downloadOrderPdf(order: SalesOrderDto): Promise<void> {
    if (!order.id) return;
    try {
      const blob = await firstValueFrom(this.orderService.download(order.id, SalesExportFormat.Pdf));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.orderNumber || 'SalesOrder'}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.toasts.success(`Downloaded ${order.orderNumber} PDF.`);
    } catch (e: unknown) {
      this.toasts.error(errorMessage(e, `Could not download ${order.orderNumber} PDF.`));
    }
  }

  async downloadOrderExcel(order: SalesOrderDto): Promise<void> {
    if (!order.id) return;
    try {
      const blob = await firstValueFrom(
        this.orderService.download(order.id, SalesExportFormat.Excel),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.orderNumber || 'SalesOrder'}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.toasts.success(`Downloaded ${order.orderNumber} Excel.`);
    } catch (e: unknown) {
      this.toasts.error(errorMessage(e, `Could not download ${order.orderNumber} Excel.`));
    }
  }

  async deleteOrder(order: SalesOrderDto): Promise<void> {
    if (!order.id) return;
    const ok = await this.dialogs.delete('draft order', order.orderNumber);
    if (!ok) return;

    this.orderService.delete(order.id).subscribe({
      next: () => {
        this.orders.update((list) => list.filter((o) => o.id !== order.id));
        this.toasts.success(`Draft order ${order.orderNumber} deleted.`);
      },
      error: (e: unknown) =>
        this.toasts.error(errorMessage(e, `${order.orderNumber} could not be deleted.`)),
    });
  }

  async cancelOrder(order: SalesOrderDto): Promise<void> {
    if (!order.id) return;
    const ok = await this.dialogs.confirm({
      title: `Cancel ${order.orderNumber}?`,
      message:
        'Once cancelled, this sales order cannot be fulfilled or billed. This action cannot be undone.',
      confirmText: 'Cancel order',
      cancelText: 'Keep order',
      tone: 'danger',
    });
    if (!ok) return;

    this.orderService.cancel(order.id).subscribe({
      next: (updated) => {
        this.updateOrderInList(updated);
        this.toasts.success(`${order.orderNumber} cancelled.`);
      },
      error: (e: unknown) =>
        this.toasts.error(errorMessage(e, `${order.orderNumber} could not be cancelled.`)),
    });
  }

  private updateOrderInList(updated: SalesOrderDto): void {
    this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
  }

  getStatusClass(status: SalesOrderStatus): string {
    switch (status) {
      case SalesOrderStatus.Draft:
        return 'draft';
      case SalesOrderStatus.Confirmed:
        return 'confirmed';
      case SalesOrderStatus.InProduction:
      case SalesOrderStatus.PartiallyDispatched:
        return 'partial';
      case SalesOrderStatus.Dispatched:
        return 'dispatched';
      case SalesOrderStatus.Completed:
        return 'completed';
      case SalesOrderStatus.Cancelled:
        return 'cancelled';
      default:
        return 'draft';
    }
  }

  readonly inr = inr;
  readonly getStatusLabel = orderStatusLabel;
  readonly getStatusTone = orderStatusTone;
  readonly canConfirm = canConfirmOrder;
  readonly canFulfil = canFulfilOrder;
  readonly canCancel = canCancelOrder;
  readonly canDelete = canDeleteOrder;
}
