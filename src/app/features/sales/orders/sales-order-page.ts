import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../../core/auth/permission';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { inr } from '../../../core/util/format';
import { ArTopbar } from '../../../layout/topbar';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { SalesExportFormat } from '../../../proxy/sales/sales-enums';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { SalesOrderDto } from '../../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';
import { ArButton, ArChip, ArIcon } from '../../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../../ui/grid';
import { SALES_RECORD_STYLES, SalesRecordPage } from '../sales-record-page';
import {
  canConfirmOrder,
  canFulfilOrder,
  orderStatusLabel,
  orderStatusTone,
  canCancelOrder,
  canDeleteOrder,
} from '../sales-records.logic';
import { ArSalesExport } from '../sales-export';
import { ArBillingPlanPanel } from '../../project-billing/billing-plan-panel';
import { ArAcceptanceTestsPanel } from '../../project-billing/acceptance-tests-panel';
import { ArGuaranteesPanel } from '../../project-billing/guarantees-panel';

/**
 * One sales order on its own page (/sales/orders/<id>): the customer PO, terms, site address, items with what has been dispatched
 * and invoiced, the totals, and the next step: confirm a draft, or raise a delivery challan or invoice from a confirmed order (each
 * opens on its own page).
 */
@Component({
  selector: 'ar-sales-order-page',
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArIcon,
    ArSalesExport,
    DatePipe,
    ArGrid,
    GridModule,
    ArBillingPlanPanel,
    ArAcceptanceTestsPanel,
    ArGuaranteesPanel,
  ],
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
              @if (o.notes || o.internalNotes) {
                <div class="sr-box">
                  <h3>Notes</h3>
                  <dl>
                    @if (o.notes) {
                      <dt>On the order</dt>
                      <dd>{{ o.notes }}</dd>
                    }
                    @if (o.internalNotes) {
                      <dt>Internal</dt>
                      <dd>{{ o.internalNotes }}</dd>
                    }
                  </dl>
                </div>
              }
            </div>
          </section>

          <section class="pf__card" aria-labelledby="so-lines">
            <header class="pf__head">
              <div>
                <h2 id="so-lines">Order items</h2>
                <p>{{ o.lines.length }} item(s), with what has been dispatched and invoiced.</p>
              </div>
            </header>
            <ejs-grid arGrid="sales-order-lines" [dataSource]="o.lines" aria-label="Order items">
              <e-columns>
                <e-column
                  field="lineNumber"
                  headerText="#"
                  width="60"
                  [textAlign]="'Right'"
                ></e-column>
                <e-column field="partNumber" headerText="Part number & description" width="260">
                  <ng-template #template let-l>
                    <div>
                      <strong class="ar-mono">{{ l.partNumber }}</strong>
                      <span class="sr-sub block">{{ l.description }}</span>
                    </div>
                  </ng-template>
                </e-column>
                <e-column field="hsnCode" headerText="HSN" width="110">
                  <ng-template #template let-l>
                    <span class="ar-mono">{{ l.hsnCode || '—' }}</span>
                  </ng-template>
                </e-column>
                <e-column field="quantity" headerText="Qty" width="90" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    <strong>{{ l.quantity }}</strong>
                  </ng-template>
                </e-column>
                <e-column
                  field="unitPriceInPaise"
                  headerText="Unit price"
                  width="130"
                  [textAlign]="'Right'"
                >
                  <ng-template #template let-l>
                    {{ inr(l.unitPriceInPaise) }}
                  </ng-template>
                </e-column>
                <e-column headerText="Dispatched" width="120" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    {{ l.dispatchedQuantity }} / {{ l.quantity }}
                  </ng-template>
                </e-column>
                <e-column headerText="Invoiced" width="120" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    {{ l.invoicedQuantity }} / {{ l.quantity }}
                  </ng-template>
                </e-column>
                <e-column
                  field="lineTotalInPaise"
                  headerText="Total"
                  width="140"
                  [textAlign]="'Right'"
                >
                  <ng-template #template let-l>
                    <strong>{{ inr(l.lineTotalInPaise) }}</strong>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
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

          @if (o.id) {
            <ar-billing-plan-panel
              [orderId]="o.id"
              [orderValue]="o.subtotalInPaise - o.discountInPaise"
            />
            <ar-acceptance-tests-panel [orderId]="o.id" />
            <ar-guarantees-panel [orderId]="o.id" />
          }

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
            @if (mayConfirm() && canConfirm(o)) {
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
            @if (mayEdit() && canDeleteOrder(o)) {
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="busy()"
                (click)="editOrder(o)"
              >
                Edit draft
              </button>
            }
            @if (mayDelete() && canDeleteOrder(o)) {
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="busy()"
                (click)="deleteOrder(o)"
              >
                Delete draft
              </button>
            }
            @if (mayCancel() && canCancelOrder(o)) {
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="busy()"
                (click)="cancelOrder(o)"
              >
                Cancel order
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

  protected readonly inr = inr;
  protected readonly label = orderStatusLabel;
  protected readonly tone = orderStatusTone;
  protected readonly canConfirm = canConfirmOrder;
  protected readonly canFulfil = canFulfilOrder;
  protected readonly canCancelOrder = canCancelOrder;
  protected readonly canDeleteOrder = canDeleteOrder;
  private readonly permissions = inject(PermissionService);
  protected readonly mayConfirm = grantedPolicy('AutoReach.SalesOrders.Confirm', this.permissions);
  protected readonly mayCancel = grantedPolicy('AutoReach.SalesOrders.Cancel', this.permissions);
  protected readonly mayDelete = grantedPolicy('AutoReach.SalesOrders.Delete', this.permissions);
  protected readonly mayEdit = grantedPolicy('AutoReach.SalesOrders.Update', this.permissions);

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
