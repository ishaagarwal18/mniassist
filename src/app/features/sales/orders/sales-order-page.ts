import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { inr } from '../../../core/util/format';
import { ArTopbar } from '../../../layout/topbar';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { SalesExportFormat, SalesOrderStatus } from '../../../proxy/sales/sales-enums';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { SalesOrderDto } from '../../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';
import { ArButton, ArChip, ArIcon } from '../../../ui';
import { SALES_RECORD_STYLES, SalesRecordPage } from '../sales-record-page';
import {
  canConfirmOrder,
  canFulfilOrder,
  orderStatusLabel,
  orderStatusTone,
} from '../sales-records.logic';
import { MOCK_ORDERS } from './orders.mock';
import { ArSalesExport } from '../sales-export';

/**
 * One sales order on its own page (/sales/orders/<id>): the customer PO, terms, site address, items with what has been dispatched
 * and invoiced, the totals, and the next step: confirm a draft, or raise a delivery challan or invoice from a confirmed order (each
 * opens on its own page).
 */
@Component({
  selector: 'ar-sales-order-page',
  imports: [ArTopbar, ArButton, ArChip, ArIcon, ArSalesExport, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="record() ? 'Sales order ' + record()!.orderNumber : 'Sales order'"
      [subtitle]="record()?.customerName ?? ''"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (loading()) {
        <p class="sr-muted">Loading the sales order…</p>
      } @else if (problem(); as p) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="alert" [size]="20" />
          <div>
            <strong>{{ p }}</strong>
          </div>
          <button ar-button variant="ghost" type="button" (click)="back()">Go back</button>
        </section>
      } @else if (record(); as o) {
        <div class="pf__form">
          <section class="pf__card">
            <div class="sr-head">
              <div>
                <span class="sr-label">Customer</span>
                <h2 translate="no">{{ o.customerName }}</h2>
                @if (o.customerAccountName) {
                  <span class="sr-muted" translate="no">{{ o.customerAccountName }}</span>
                }
              </div>
              <ar-chip [tone]="tone(o.status)">{{ label(o.status) }}</ar-chip>
            </div>

            <div class="sr-money">
              <div>
                <span>Order total</span><strong>{{ inr(o.grandTotalInPaise) }}</strong>
              </div>
              <div>
                <span>Order date</span><strong>{{ o.orderDateUtc | date: 'dd MMM yyyy' }}</strong>
              </div>
              <div>
                <span>Expected delivery</span
                ><strong>{{
                  o.expectedDeliveryDateUtc
                    ? (o.expectedDeliveryDateUtc | date: 'dd MMM yyyy')
                    : 'TBD'
                }}</strong>
              </div>
            </div>

            <div class="sr-facts">
              <div class="sr-box">
                <h3>Customer PO & terms</h3>
                <dl>
                  <dt>Customer PO</dt>
                  <dd class="ar-mono">{{ o.customerPoNumber || 'N/A' }}</dd>
                  @if (o.customerPoDate) {
                    <dt>PO date</dt>
                    <dd>{{ o.customerPoDate | date: 'dd MMM yyyy' }}</dd>
                  }
                  <dt>Payment terms</dt>
                  <dd>{{ o.paymentTermsDays ? o.paymentTermsDays + ' days' : 'Advance' }}</dd>
                  <dt>Delivery terms</dt>
                  <dd>{{ o.deliveryTerms || 'Standard' }}</dd>
                </dl>
              </div>
              <div class="sr-box">
                <h3>Addresses</h3>
                <dl>
                  @if (o.billingAddress) {
                    <dt>Billing</dt>
                    <dd>{{ o.billingAddress }}</dd>
                  }
                  <dt>Shipping</dt>
                  <dd>{{ o.shippingAddress || 'Default site address' }}</dd>
                </dl>
              </div>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="so-lines">
            <header class="pf__head">
              <div>
                <h2 id="so-lines">Order items</h2>
                <p>{{ o.lines.length }} item(s), with what has been dispatched and invoiced.</p>
              </div>
            </header>
            <div class="sr-table">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Part number & description</th>
                    <th>HSN</th>
                    <th class="num">Qty</th>
                    <th class="num">Unit price</th>
                    <th class="num">Dispatched</th>
                    <th class="num">Invoiced</th>
                    <th class="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of o.lines; track l.id) {
                    <tr>
                      <td>{{ l.lineNumber }}</td>
                      <td>
                        <strong class="ar-mono">{{ l.partNumber }}</strong>
                        <span class="sr-sub">{{ l.description }}</span>
                      </td>
                      <td class="ar-mono">{{ l.hsnCode || '—' }}</td>
                      <td class="num">
                        <strong>{{ l.quantity }}</strong>
                      </td>
                      <td class="num">{{ inr(l.unitPriceInPaise) }}</td>
                      <td class="num">{{ l.dispatchedQuantity }} / {{ l.quantity }}</td>
                      <td class="num">{{ l.invoicedQuantity }} / {{ l.quantity }}</td>
                      <td class="num">
                        <strong>{{ inr(l.lineTotalInPaise) }}</strong>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <dl class="pf__totals">
              <dt>Subtotal</dt>
              <dd>{{ inr(o.subtotalInPaise) }}</dd>
              <dt>GST</dt>
              <dd>{{ inr(o.taxInPaise) }}</dd>
              @if (o.discountInPaise > 0) {
                <dt>Discount</dt>
                <dd class="sr-good">−{{ inr(o.discountInPaise) }}</dd>
              }
              <dt class="pf__grand">Grand total</dt>
              <dd class="pf__grand">{{ inr(o.grandTotalInPaise) }}</dd>
            </dl>
          </section>

          <footer class="pf__bar">
            <span class="pf__summary"></span>
            <button ar-button variant="ghost" type="button" (click)="back()">Back</button>
            <button ar-button variant="ghost" type="button" (click)="customer360(o.customerId)">
              Customer 360
            </button>
            <ar-sales-export
              [fetch]="download"
              [fileName]="o.orderNumber"
              hint="This sales order"
            />
            @if (canConfirm(o)) {
              <button
                ar-button
                variant="primary"
                type="button"
                icon="check"
                [disabled]="busy()"
                (click)="confirm(o)"
              >
                Confirm sales order
              </button>
            }
            @if (canFulfil(o)) {
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="busy()"
                (click)="createChallan(o)"
              >
                Create delivery challan
              </button>
              <button
                ar-button
                variant="primary"
                type="button"
                [disabled]="busy()"
                (click)="createInvoice(o)"
              >
                Generate sales invoice
              </button>
            }
          </footer>
        </div>
      }
    </div>
  `,
  styles: SALES_RECORD_STYLES,
})
export class ArSalesOrderPage extends SalesRecordPage<SalesOrderDto> {
  private readonly api = inject(SalesOrderService);

  /** The record as its printed PDF or an Excel workbook. */
  protected readonly download = (format: SalesExportFormat) =>
    this.api.download(this.record()!.id!, format, { skipHandleError: true });
  private readonly challans = inject(DeliveryChallanService);
  private readonly invoices = inject(SalesInvoiceService);

  protected readonly list = '/sales/orders';
  protected readonly noun = 'This sales order';
  protected readonly mockRecords = MOCK_ORDERS;

  protected readonly inr = inr;
  protected readonly label = orderStatusLabel;
  protected readonly tone = orderStatusTone;
  protected readonly canConfirm = canConfirmOrder;
  protected readonly canFulfil = canFulfilOrder;

  constructor() {
    super();
    void this.load();
  }

  protected fetch(id: string) {
    return this.api.get(id, { skipHandleError: true });
  }

  protected confirm(o: SalesOrderDto): void {
    void this.run(
      () => this.api.confirm(o.id!, { skipHandleError: true }),
      (cur) => ({
        ...cur,
        status: SalesOrderStatus.Confirmed,
        confirmedAtUtc: new Date().toISOString(),
      }),
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
