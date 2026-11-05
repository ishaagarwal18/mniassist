import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PickerOption } from '../../core/services/pipeline.service';
import { ToastService } from '../../core/ui/toast.service';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ArTopbar } from '../../layout/topbar';
import { DeliveryChallanDto } from '../../proxy/sales/delivery-challan.models';
import { SalesInvoiceDto } from '../../proxy/sales/sales-invoice.models';
import { SalesOrderDto } from '../../proxy/sales/sales-order.models';
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
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
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
