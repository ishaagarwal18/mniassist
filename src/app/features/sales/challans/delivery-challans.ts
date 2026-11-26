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
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { GridComponent, GridModule, RecordClickEventArgs } from '@syncfusion/ej2-angular-grids';
import { filter } from 'rxjs';

import { grantedPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { CustomerScope, readCustomerScope } from '../../../core/util/customer-scope';
import { ArTopbar } from '../../../layout/topbar';
import { DeliveryChallanDto } from '../../../proxy/sales/delivery-challan.models';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { DeliveryChallanStatus, SalesExportFormat } from '../../../proxy/sales/sales-enums';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { ArButton, ArIcon } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { errorMessage } from '../../activities/activity-logic';
import { ArSalesExport } from '../sales-export';
import {
  canCancelChallan,
  canDeliverChallan,
  canDispatchChallan,
  canInvoiceChallan,
  challanStatusLabel,
  challanStatusTone,
  challanTypeLabel,
  listQuery,
  newRecordQuery,
} from '../sales-records.logic';

@Component({
  selector: 'ar-delivery-challans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ArTopbar,
    ArButton,
    ArIcon,
    ArSalesExport,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delivery-challans.html',
  styleUrl: './delivery-challans.scss',
})
export class ArDeliveryChallans {
  @ViewChild('grid') protected grid?: GridComponent;

  private readonly challanService = inject(DeliveryChallanService);
  private readonly invoiceService = inject(SalesInvoiceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly permissionGate = inject(PermissionService);

  /** Opened from Customer 360 for one customer or account: only their challans. */
  protected readonly scope = signal<CustomerScope | null>(readCustomerScope());

  readonly DeliveryChallanStatus = DeliveryChallanStatus;
  readonly SalesExportFormat = SalesExportFormat;

  // Permission policies
  protected readonly canCreate = grantedPolicy(
    'AutoReach.DeliveryChallans.Create',
    this.permissionGate,
  );
  protected readonly canUpdate = grantedPolicy(
    'AutoReach.DeliveryChallans.Update',
    this.permissionGate,
  );
  protected readonly canDispatchPolicy = grantedPolicy(
    'AutoReach.DeliveryChallans.Dispatch',
    this.permissionGate,
  );
  protected readonly canDeliverPolicy = grantedPolicy(
    'AutoReach.DeliveryChallans.Deliver',
    this.permissionGate,
  );
  protected readonly canCancelPolicy = grantedPolicy(
    'AutoReach.DeliveryChallans.Cancel',
    this.permissionGate,
  );
  protected readonly canInvoicePolicy = grantedPolicy(
    'AutoReach.SalesInvoices.Create',
    this.permissionGate,
  );

  challans = signal<DeliveryChallanDto[]>([]);
  loadError = signal<string | null>(null);
  searchQuery = signal<string>('');
  selectedStatus = signal<DeliveryChallanStatus | null>(null);

  /** Active action menu ID: only one open menu allowed at a time */
  protected readonly activeActionMenuId = signal<string | null>(null);

  // Dynamic KPI counts computed from actual loaded dataset
  readonly totalCount = computed(() => this.challans().length);
  readonly draftCount = computed(
    () => this.challans().filter((c) => c.status === DeliveryChallanStatus.Draft).length,
  );
  readonly dispatchedCount = computed(
    () => this.challans().filter((c) => c.status === DeliveryChallanStatus.Dispatched).length,
  );
  readonly deliveredCount = computed(
    () => this.challans().filter((c) => c.status === DeliveryChallanStatus.Delivered).length,
  );
  readonly invoicedCount = computed(
    () => this.challans().filter((c) => c.status === DeliveryChallanStatus.Invoiced).length,
  );
  readonly cancelledCount = computed(
    () => this.challans().filter((c) => c.status === DeliveryChallanStatus.Cancelled).length,
  );

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
          (c.customerAccountName && c.customerAccountName.toLowerCase().includes(q)) ||
          (c.salesOrderNumber && c.salesOrderNumber.toLowerCase().includes(q)) ||
          (c.lrNumber && c.lrNumber.toLowerCase().includes(q)) ||
          (c.vehicleNumber && c.vehicleNumber.toLowerCase().includes(q)) ||
          (c.eWayBillNumber && c.eWayBillNumber.toLowerCase().includes(q)) ||
          (c.transporterName && c.transporterName.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  /** Every challan matching list filters, exported to PDF or Excel register */
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
    // Handle ?open=<id> direct routing
    const openId = this.route.snapshot.queryParamMap.get('open');
    if (openId) {
      void this.router.navigate(['/sales/challans', openId], {
        queryParams: listQuery(this.scope()),
        replaceUrl: true,
      });
    } else {
      this.loadChallans();
    }

    // Auto-close any open action menus on route change
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
    if (!target?.closest('.dc-action-dropdown, .row-btn-more')) {
      this.closeAllMenus();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeAllMenus();
  }

  protected toggleActionMenu(event: MouseEvent, dc: DeliveryChallanDto): void {
    event.stopPropagation();
    this.activeActionMenuId.update((current) => (current === dc.id ? null : (dc.id ?? null)));
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

  protected setStatusFilter(status: DeliveryChallanStatus | null): void {
    this.selectedStatus.set(status);
    this.closeAllMenus();
    this.resetGridPage();
  }

  private resetGridPage(): void {
    try {
      this.grid?.goToPage(1);
    } catch {
      // Grid might not be ready yet
    }
  }

  protected clearScope(): void {
    this.scope.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.loadChallans();
  }

  loadChallans(): void {
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

  onChallanClick(e: RecordClickEventArgs): void {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.row-actions-wrap, button, a, .order-ref-badge')) return;
    const row = e.rowData as DeliveryChallanDto | undefined;
    if (row) this.openChallan(row);
  }

  /** The challan's own page (with dispatch dialog open when `dispatch`), keeping scope for Back */
  openChallan(dc: DeliveryChallanDto, dispatch = false): void {
    if (dc.id) {
      void this.router.navigate(['/sales/challans', dc.id], {
        queryParams: { ...listQuery(this.scope()), dispatch: dispatch ? 1 : undefined },
      });
    }
  }

  newChallan(): void {
    void this.router.navigate(['/sales/challans/new'], {
      queryParams: newRecordQuery(this.scope()),
    });
  }

  viewLinkedOrder(event: MouseEvent, salesOrderId: string): void {
    event.stopPropagation();
    void this.router.navigate(['/sales/orders', salesOrderId]);
  }

  markDelivered(dc: DeliveryChallanDto): void {
    if (!dc.id) return;

    this.challanService.markDelivered(dc.id).subscribe({
      next: (updated) => {
        this.toasts.success(`Challan ${dc.challanNumber} has been marked as delivered.`);
        this.updateChallanInList(updated);
      },
      error: (e: unknown) =>
        this.toasts.error(errorMessage(e, `${dc.challanNumber} could not be marked delivered.`)),
    });
  }

  createInvoiceFromChallan(dc: DeliveryChallanDto): void {
    if (!dc.id) return;

    this.invoiceService.createFromChallan(dc.id).subscribe({
      next: (invoice) => {
        this.toasts.success(`Tax invoice created for challan ${dc.challanNumber}.`);
        void this.router.navigate(['/sales/invoices', invoice.id]);
      },
      error: (e: unknown) =>
        this.toasts.error(
          errorMessage(e, `An invoice could not be raised for ${dc.challanNumber}.`),
        ),
    });
  }

  downloadChallan(dc: DeliveryChallanDto, format: SalesExportFormat): void {
    if (!dc.id) return;

    this.challanService.download(dc.id, format, { skipHandleError: true }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === SalesExportFormat.Pdf ? 'pdf' : 'xlsx';
        a.download = `${dc.challanNumber || 'Delivery-Challan'}.${ext}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (e: unknown) => {
        this.toasts.error(errorMessage(e, `Could not download ${dc.challanNumber}.`));
      },
    });
  }

  async cancelChallan(dc: DeliveryChallanDto): Promise<void> {
    if (!dc.id) return;

    const confirmed = await this.dialogs.confirm({
      title: 'Cancel delivery challan?',
      message: `Are you sure you want to cancel delivery challan ${dc.challanNumber}? This action cannot be undone.`,
      confirmText: 'Cancel challan',
      tone: 'danger',
    });

    if (!confirmed) return;

    this.challanService.cancel(dc.id).subscribe({
      next: (updated) => {
        this.toasts.success(`Delivery challan ${dc.challanNumber} has been cancelled.`);
        this.updateChallanInList(updated);
      },
      error: (e: unknown) => {
        this.toasts.error(errorMessage(e, `Could not cancel ${dc.challanNumber}.`));
      },
    });
  }

  private updateChallanInList(updated: DeliveryChallanDto): void {
    this.challans.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
  }

  protected getStatusClass(status: DeliveryChallanStatus): string {
    switch (status) {
      case DeliveryChallanStatus.Draft:
        return 'draft';
      case DeliveryChallanStatus.Dispatched:
        return 'dispatched';
      case DeliveryChallanStatus.Delivered:
        return 'delivered';
      case DeliveryChallanStatus.Invoiced:
        return 'invoiced';
      case DeliveryChallanStatus.Cancelled:
        return 'cancelled';
      default:
        return 'draft';
    }
  }

  // Row action permission & business rule guards
  canDispatch(dc: DeliveryChallanDto): boolean {
    return canDispatchChallan(dc) && this.canDispatchPolicy();
  }

  canDeliver(dc: DeliveryChallanDto): boolean {
    return canDeliverChallan(dc) && this.canDeliverPolicy();
  }

  canInvoice(dc: DeliveryChallanDto): boolean {
    return canInvoiceChallan(dc) && this.canInvoicePolicy();
  }

  canCancel(dc: DeliveryChallanDto): boolean {
    return canCancelChallan(dc) && this.canCancelPolicy();
  }

  canEdit(dc: DeliveryChallanDto): boolean {
    return dc.status === DeliveryChallanStatus.Draft && this.canUpdate();
  }

  readonly getChallanTypeLabel = challanTypeLabel;
  readonly getStatusLabel = challanStatusLabel;
  readonly getStatusTone = challanStatusTone;
}
