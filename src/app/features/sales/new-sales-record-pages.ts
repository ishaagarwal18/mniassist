import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PickerOption } from '../../core/services/pipeline.service';
import { ToastService } from '../../core/ui/toast.service';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ArTopbar } from '../../layout/topbar';
import { DeliveryChallanDto } from '../../proxy/sales/delivery-challan.models';
import { SalesInvoiceDto } from '../../proxy/sales/sales-invoice.models';
import { DeliveryChallanStatus, SalesOrderStatus } from '../../proxy/sales/sales-enums';
import { DeliveryChallanService } from '../../proxy/sales/delivery-challan.service';
import { SalesOrderDto } from '../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../proxy/sales/sales-order.service';
import { AR_DIALOG_INLINE } from '../../ui';
import { ArNewDeliveryChallan } from './challans/new-delivery-challan';
import { ArNewSalesInvoice } from './invoices/new-sales-invoice';
import { ArNewSalesOrder } from './orders/new-sales-order';

/**
 * The New sales order / delivery challan / invoice pages (/sales/orders/new, /sales/challans/new, /sales/invoices/new): each
 * form is written as a dialog and shown as the page (AR_DIALOG_INLINE). `?customer=<contact id>&customerName=…` picks the
 * customer, as an account's Customer 360 and a list showing one customer do. Saved or cancelled, it returns to the Customer 360
 * it was opened from (its breadcrumb leads there too); otherwise a saved record opens on its own page, a cancelled one returns
 * to the list.
 */
abstract class NewSalesRecordPage {
  protected readonly router = inject(Router);
  protected readonly toasts = inject(ToastService);
  private readonly origin = inject(CockpitOriginService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly customer: PickerOption | null = this.query.get('customer')
    ? { id: this.query.get('customer')!, label: this.query.get('customerName') || 'Customer' }
    : null;

  /** The list this record lives on, e.g. /sales/orders. */
  protected abstract readonly list: string;

  protected finish(created: { id?: string } | null, message: string): void {
    if (created?.id) this.toasts.success(message);
    const fallback = created?.id ? `${this.list}/${created.id}` : this.list;
    void this.router.navigateByUrl(this.origin.returnUrl(fallback));
  }
}

@Component({
  selector: 'ar-new-sales-order-page',
  imports: [ArTopbar, ArNewSalesOrder],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="New sales order" [subtitle]="customer?.label ?? ''" />
    <div class="new-record ar-scroll">
      <ar-new-sales-order [initialCustomer]="customer" (closed)="done($event)" />
    </div>
  `,
  styleUrl: './new-sales-record-pages.scss',
})
export class ArNewSalesOrderPage extends NewSalesRecordPage {
  protected readonly list = '/sales/orders';

  protected done(order: SalesOrderDto | null): void {
    this.finish(order, `Sales order ${order?.orderNumber} created.`);
  }
}

/** /sales/orders/:id/edit — a draft order in the same form it was made in. */
@Component({
  selector: 'ar-edit-sales-order-page',
  imports: [ArTopbar, ArNewSalesOrder],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="Edit sales order" [subtitle]="order()?.orderNumber ?? ''" />
    <div class="new-record ar-scroll">
      @if (problem(); as p) {
        <p role="alert">{{ p }}</p>
      } @else if (order(); as o) {
        <ar-new-sales-order [editing]="o" (closed)="done($event)" />
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styleUrl: './new-sales-record-pages.scss',
})
export class ArEditSalesOrderPage extends NewSalesRecordPage {
  protected readonly list = '/sales/orders';
  private readonly orders = inject(SalesOrderService);
  private readonly orderId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly order = signal<SalesOrderDto | null>(null);
  protected readonly problem = signal<string | null>(null);

  constructor() {
    super();
    this.orders.get(this.orderId, { skipHandleError: true }).subscribe({
      next: (o) =>
        o.status === SalesOrderStatus.Draft
          ? this.order.set(o)
          : this.problem.set('Only a draft order can be edited. Cancel it and raise a new one.'),
      error: () => this.problem.set('The sales order could not be loaded.'),
    });
  }

  protected done(order: SalesOrderDto | null): void {
    if (order?.id) this.toasts.success(`Sales order ${order.orderNumber} saved.`);
    void this.router.navigate(['/sales/orders', this.orderId]);
  }
}

@Component({
  selector: 'ar-new-delivery-challan-page',
  imports: [ArTopbar, ArNewDeliveryChallan],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="New delivery challan" [subtitle]="customer?.label ?? ''" />
    <div class="new-record ar-scroll">
      <ar-new-delivery-challan [initialCustomer]="customer" (closed)="done($event)" />
    </div>
  `,
  styleUrl: './new-sales-record-pages.scss',
})
export class ArNewDeliveryChallanPage extends NewSalesRecordPage {
  protected readonly list = '/sales/challans';

  protected done(challan: DeliveryChallanDto | null): void {
    this.finish(challan, `Challan ${challan?.challanNumber} saved as a draft.`);
  }
}

/** /sales/challans/:id/edit — a draft challan in the same form it was made in. */
@Component({
  selector: 'ar-edit-delivery-challan-page',
  imports: [ArTopbar, ArNewDeliveryChallan],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="Edit delivery challan" [subtitle]="challan()?.challanNumber ?? ''" />
    <div class="new-record ar-scroll">
      @if (problem(); as p) {
        <p role="alert">{{ p }}</p>
      } @else if (challan(); as c) {
        <ar-new-delivery-challan [editing]="c" (closed)="done($event)" />
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styleUrl: './new-sales-record-pages.scss',
})
export class ArEditDeliveryChallanPage extends NewSalesRecordPage {
  protected readonly list = '/sales/challans';
  private readonly challans = inject(DeliveryChallanService);
  private readonly challanId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly challan = signal<DeliveryChallanDto | null>(null);
  protected readonly problem = signal<string | null>(null);

  constructor() {
    super();
    this.challans.get(this.challanId, { skipHandleError: true }).subscribe({
      next: (c) =>
        c.status === DeliveryChallanStatus.Draft
          ? this.challan.set(c)
          : this.problem.set('Only a draft challan can be edited. Once dispatched it is fixed.'),
      error: () => this.problem.set('The challan could not be loaded.'),
    });
  }

  protected done(challan: DeliveryChallanDto | null): void {
    if (challan?.id) this.toasts.success(`Challan ${challan.challanNumber} saved.`);
    void this.router.navigateByUrl(`${this.list}/${this.challanId}`);
  }
}

@Component({
  selector: 'ar-new-sales-invoice-page',
  imports: [ArTopbar, ArNewSalesInvoice],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="New invoice" [subtitle]="customer?.label ?? ''" />
    <div class="new-record ar-scroll">
      <ar-new-sales-invoice [initialCustomer]="customer" (closed)="done($event)" />
    </div>
  `,
  styleUrl: './new-sales-record-pages.scss',
})
export class ArNewSalesInvoicePage extends NewSalesRecordPage {
  protected readonly list = '/sales/invoices';

  protected done(invoice: SalesInvoiceDto | null): void {
    this.finish(
      invoice,
      `Invoice ${invoice?.invoiceNumber} saved as a draft. Issue it when it is checked.`,
    );
  }
}
