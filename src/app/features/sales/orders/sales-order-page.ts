import { PermissionService } from '@abp/ng.core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { filter } from 'rxjs';

import { grantedPolicy } from '../../../core/auth/permission';
import { inr } from '../../../core/util/format';
import { ArTopbar } from '../../../layout/topbar';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { SalesExportFormat, SalesOrderStatus } from '../../../proxy/sales/sales-enums';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { SalesOrderDto } from '../../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';
import { ArButton, ArIcon } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { ArAcceptanceTestsPanel } from '../../project-billing/acceptance-tests-panel';
import { ArBillingPlanPanel } from '../../project-billing/billing-plan-panel';
import { ArGuaranteesPanel } from '../../project-billing/guarantees-panel';
import { ChainState, orderChain } from '../sales-chain.logic';
import { ArSalesExport } from '../sales-export';
import { SalesRecordPage } from '../sales-record-page';
import {
  canCancelOrder,
  canConfirmOrder,
  canDeleteOrder,
  canFulfilOrder,
  orderStatusLabel,
  orderStatusTone,
} from '../sales-records.logic';

const STATE_TEXT: Record<ChainState, string> = {
  done: 'Completed',
  partly: 'Partly done',
  current: 'In Progress',
  todo: 'Pending',
  skipped: 'Not used',
};

/**
 * Enterprise Sales Order Details Page (/sales/orders/<id>):
 * - Commercial customer overview with live metrics and terms
 * - Horizontal order lifecycle progress tracker (Quotation → Sales Order → Delivery → Invoice)
 * - Order items table with part numbers, quantities, dispatch/invoice status and grand totals
 * - Integrated Billing Plan, Tests & Sign-off, and Bank Guarantees management cards
 * - Sticky bottom action bar for quick document conversions, approvals, exports and lifecycle actions.
 */
@Component({
  selector: 'ar-sales-order-page',
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    ArTopbar,
    ArButton,
    ArIcon,
    ArSalesExport,
    ArGrid,
    GridModule,
    ArBillingPlanPanel,
    ArAcceptanceTestsPanel,
    ArGuaranteesPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-order-page.html',
  styleUrl: './sales-order-page.scss',
})
export class ArSalesOrderPage extends SalesRecordPage<SalesOrderDto> {
  private readonly api = inject(SalesOrderService);
  private readonly challans = inject(DeliveryChallanService);
  private readonly invoices = inject(SalesInvoiceService);
  private readonly permissions = inject(PermissionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly list = '/sales/orders';
  protected readonly noun = 'This sales order';

  /** Where this document sits in the sale, with what to do next. */
  protected readonly chain = computed(() => {
    const r = this.record();
    return r ? orderChain(r) : null;
  });

  /** Customer initials for the overview avatar */
  protected readonly customerInitials = computed(() => {
    const name = this.record()?.customerName?.trim() || '';
    if (!name) return 'SO';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  /** The record as its printed PDF or an Excel workbook. */
  protected readonly download = (format: SalesExportFormat) =>
    this.api.download(this.record()!.id!, format, { skipHandleError: true });

  protected readonly inr = inr;
  protected readonly label = orderStatusLabel;
  protected readonly tone = orderStatusTone;
  protected readonly canConfirm = canConfirmOrder;
  protected readonly canFulfil = canFulfilOrder;
  protected readonly canCancelOrder = canCancelOrder;
  protected readonly canDeleteOrder = canDeleteOrder;

  protected readonly mayConfirm = grantedPolicy('AutoReach.SalesOrders.Confirm', this.permissions);
  protected readonly mayCancel = grantedPolicy('AutoReach.SalesOrders.Cancel', this.permissions);
  protected readonly mayDelete = grantedPolicy('AutoReach.SalesOrders.Delete', this.permissions);
  protected readonly mayEdit = grantedPolicy('AutoReach.SalesOrders.Update', this.permissions);

  constructor() {
    super();
    void this.load();

    // Close any floating popovers/menus on route navigation
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.closeFloatingMenus());
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.e-dropdown-popup, .e-popup, .e-dialog, .e-split-btn')) {
      this.closeFloatingMenus();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeFloatingMenus();
  }

  protected closeFloatingMenus(): void {
    // Closes any floating Syncfusion or custom menus that might linger
    if (typeof document !== 'undefined') {
      const popups = document.querySelectorAll<HTMLElement>('.e-popup-open');
      popups.forEach((p) => {
        if (!p.closest('.e-dialog')) {
          p.style.display = 'none';
        }
      });
    }
  }

  protected stateText(state: ChainState): string {
    return STATE_TEXT[state] || state;
  }

  protected getStatusClass(status: SalesOrderStatus): string {
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

  protected editOrder(o: SalesOrderDto): void {
    void this.router.navigate(['/sales/orders', o.id, 'edit']);
  }

  protected cancelOrder(o: SalesOrderDto): void {
    void this.cancelRecord(
      `Sales order ${o.orderNumber}`,
      'It stays on record as cancelled, with its number. Nothing has been dispatched or invoiced against it.',
      () => this.api.cancel(o.id!, { skipHandleError: true }),
    );
  }

  protected deleteOrder(o: SalesOrderDto): void {
    void this.deleteRecord(`Draft order ${o.orderNumber}`, () =>
      this.api.delete(o.id!, { skipHandleError: true }),
    );
  }

  protected fetch(id: string) {
    return this.api.get(id, { skipHandleError: true });
  }

  protected confirm(o: SalesOrderDto): void {
    void this.run(
      () => this.api.confirm(o.id!, { skipHandleError: true }),
      (saved) => `Sales order ${saved.orderNumber} confirmed.`,
      `${o.orderNumber} could not be confirmed.`,
    );
  }

  protected createChallan(o: SalesOrderDto): void {
    void this.open(
      () => this.challans.createFromSalesOrder(o.id!, { skipHandleError: true }),
      '/sales/challans',
      `A challan could not be raised for ${o.orderNumber}.`,
    );
  }

  protected createInvoice(o: SalesOrderDto): void {
    void this.open(
      () => this.invoices.createFromSalesOrder(o.id!, { skipHandleError: true }),
      '/sales/invoices',
      `An invoice could not be raised for ${o.orderNumber}.`,
    );
  }
}
