import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  CreateSalesOrderDto,
  CreateSalesOrderLineDto,
  SalesOrderDto,
} from '../../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';
import { SalesOrderStatus } from '../../../proxy/sales/sales-enums';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

const MOCK_ORDERS: SalesOrderDto[] = [
  {
    id: 'so-1',
    orderNumber: 'SO-2026-0041',
    customerId: 'c1',
    customerName: 'Kalyani Forge Ltd',
    customerAccountId: 'acc1',
    customerAccountName: 'Kalyani Group Pune',
    customerPoNumber: 'PO-KF-9982',
    customerPoDate: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    status: SalesOrderStatus.Confirmed,
    paymentTermsDays: 30,
    deliveryTerms: 'FOR Chakan Plant',
    billingAddress: 'Gat No 12, Chakan MIDC, Pune 410501',
    shippingAddress: 'Plant II, Chakan MIDC, Pune 410501',
    orderDateUtc: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    expectedDeliveryDateUtc: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    confirmedAtUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    subtotalInPaise: 420_000_00,
    discountInPaise: 0,
    taxInPaise: 75_600_00,
    grandTotalInPaise: 495_600_00,
    notes: 'Urgent hydraulic valve assembly for line 4 upgrade.',
    creationTime: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'sol-1',
        salesOrderId: 'so-1',
        lineNumber: 1,
        partNumber: 'HV-400-P',
        description: 'Proportional Directional Hydraulic Valve 350 Bar',
        hsnCode: '84812000',
        quantity: 4,
        unitPriceInPaise: 85_000_00,
        discountPercent: 0,
        taxRateBasisPoints: 1800,
        lineTotalInPaise: 340_000_00,
        dispatchedQuantity: 0,
        invoicedQuantity: 0,
        outstandingDispatch: 4,
        outstandingInvoice: 4,
      },
      {
        id: 'sol-2',
        salesOrderId: 'so-1',
        lineNumber: 2,
        partNumber: 'FK-HD-04',
        description: 'High-pressure Filter Kit 10 Micron',
        hsnCode: '84212900',
        quantity: 8,
        unitPriceInPaise: 10_000_00,
        discountPercent: 0,
        taxRateBasisPoints: 1800,
        lineTotalInPaise: 80_000_00,
        dispatchedQuantity: 0,
        invoicedQuantity: 0,
        outstandingDispatch: 8,
        outstandingInvoice: 8,
      },
    ],
  },
  {
    id: 'so-2',
    orderNumber: 'SO-2026-0038',
    customerId: 'c2',
    customerName: 'Thermax Babcock Boiler Works',
    customerAccountId: 'acc2',
    customerAccountName: 'Thermax Industrial',
    customerPoNumber: 'TB-PO-4411',
    status: SalesOrderStatus.PartiallyDispatched,
    paymentTermsDays: 45,
    deliveryTerms: 'Ex-Works Bhosari',
    orderDateUtc: new Date(Date.now() - 14 * 86_400_000).toISOString(),
    expectedDeliveryDateUtc: new Date(Date.now() + 4 * 86_400_000).toISOString(),
    confirmedAtUtc: new Date(Date.now() - 13 * 86_400_000).toISOString(),
    subtotalInPaise: 180_000_00,
    discountInPaise: 5_000_00,
    taxInPaise: 31_500_00,
    grandTotalInPaise: 206_500_00,
    creationTime: new Date(Date.now() - 14 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'sol-3',
        salesOrderId: 'so-2',
        lineNumber: 1,
        partNumber: 'ST-BRG-22',
        description: 'Heavy duty ceramic bearing housing unit',
        hsnCode: '84832000',
        quantity: 10,
        unitPriceInPaise: 18_000_00,
        discountPercent: 2.78,
        taxRateBasisPoints: 1800,
        lineTotalInPaise: 175_000_00,
        dispatchedQuantity: 5,
        invoicedQuantity: 5,
        outstandingDispatch: 5,
        outstandingInvoice: 5,
      },
    ],
  },
  {
    id: 'so-3',
    orderNumber: 'SO-2026-0035',
    customerId: 'c3',
    customerName: 'Deccan Pumps & Compressors',
    customerPoNumber: 'DPC-991',
    status: SalesOrderStatus.Draft,
    paymentTermsDays: 15,
    deliveryTerms: 'Ex-Works',
    orderDateUtc: new Date().toISOString(),
    subtotalInPaise: 95_000_00,
    discountInPaise: 0,
    taxInPaise: 17_100_00,
    grandTotalInPaise: 112_100_00,
    creationTime: new Date().toISOString(),
    lines: [
      {
        id: 'sol-4',
        salesOrderId: 'so-3',
        lineNumber: 1,
        partNumber: 'CS-SEAL-90',
        description: 'Mechanical Seal Cartridge SiC/SiC/Viton',
        hsnCode: '84841000',
        quantity: 5,
        unitPriceInPaise: 19_000_00,
        discountPercent: 0,
        taxRateBasisPoints: 1800,
        lineTotalInPaise: 95_000_00,
        dispatchedQuantity: 0,
        invoicedQuantity: 0,
        outstandingDispatch: 5,
        outstandingInvoice: 5,
      },
    ],
  },
];

@Component({
  selector: 'ar-sales-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Sales orders"
      subtitle="Commercial sales orders received from customers with order acknowledgment, dispatch milestones and billing tracking."
      help="Sales Orders capture confirmed customer PO numbers, delivery terms, and line items. From here you can issue GST Delivery Challans or Commercial Invoices directly."
    >
      <div actions class="actions-row">
        <button ar-button variant="primary" (click)="openCreateModal()">+ New Sales order</button>
      </div>
    </ar-topbar>

    <div class="orders-shell">
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
        <table class="ar-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer / Account</th>
              <th>Customer PO</th>
              <th>Order Date</th>
              <th>Delivery terms</th>
              <th class="num-col">Grand total</th>
              <th>Status</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (order of filteredOrders(); track order.id) {
              <tr class="order-row" (click)="selectOrder(order)">
                <td class="font-mono font-bold text-primary">{{ order.orderNumber }}</td>
                <td>
                  <div class="cust-title">{{ order.customerName }}</div>
                  @if (order.customerAccountName) {
                    <div class="cust-sub">{{ order.customerAccountName }}</div>
                  }
                </td>
                <td>
                  @if (order.customerPoNumber) {
                    <span class="po-badge font-mono">{{ order.customerPoNumber }}</span>
                    @if (order.customerPoDate) {
                      <span class="po-date">{{ order.customerPoDate | date: 'dd MMM yyyy' }}</span>
                    }
                  } @else {
                    <span class="text-muted">—</span>
                  }
                </td>
                <td>{{ order.orderDateUtc | date: 'dd MMM yyyy' }}</td>
                <td>{{ order.deliveryTerms || 'Standard' }}</td>
                <td class="num-col font-bold">
                  ₹{{ order.grandTotalInPaise / 100 | number: '1.2-2' }}
                </td>
                <td>
                  <ar-chip [tone]="getStatusTone(order.status)">
                    {{ getStatusLabel(order.status) }}
                  </ar-chip>
                </td>
                <td class="actions-col" (click)="$event.stopPropagation()">
                  <div class="row-actions">
                    <button class="action-btn" title="View details" (click)="selectOrder(order)">
                      View
                    </button>
                    @if (order.status === SalesOrderStatus.Draft) {
                      <button class="action-btn primary" (click)="confirmOrder(order)">
                        Confirm
                      </button>
                    }
                    @if (
                      order.status === SalesOrderStatus.Confirmed ||
                      order.status === SalesOrderStatus.PartiallyDispatched
                    ) {
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
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="empty-state">
                  No sales orders found matching your criteria.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Order Detail Drawer / Modal -->
    @if (selectedOrder(); as ord) {
      <ar-dialog
        [title]="'Sales Order: ' + ord.orderNumber + ' (' + ord.customerName + ')'"
        (dismiss)="selectedOrder.set(null)"
      >
        <div class="detail-body">
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-lbl">Status</span>
              <ar-chip [tone]="getStatusTone(ord.status)">{{ getStatusLabel(ord.status) }}</ar-chip>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">Customer PO</span>
              <span class="meta-val font-mono">{{ ord.customerPoNumber || 'N/A' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">Payment Terms</span>
              <span class="meta-val">{{
                ord.paymentTermsDays ? ord.paymentTermsDays + ' days' : 'Advance'
              }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">Expected Delivery</span>
              <span class="meta-val">{{
                ord.expectedDeliveryDateUtc
                  ? (ord.expectedDeliveryDateUtc | date: 'dd MMM yyyy')
                  : 'TBD'
              }}</span>
            </div>
            <div class="meta-item full">
              <span class="meta-lbl">Shipping Address</span>
              <span class="meta-val">{{ ord.shippingAddress || 'Default site address' }}</span>
            </div>
          </div>

          <h4 class="section-title">Order Line Items</h4>
          <table class="ar-table inner-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Part Number & Description</th>
                <th>HSN</th>
                <th class="num-col">Qty</th>
                <th class="num-col">Unit Price</th>
                <th class="num-col">Dispatched</th>
                <th class="num-col">Invoiced</th>
                <th class="num-col">Total</th>
              </tr>
            </thead>
            <tbody>
              @for (l of ord.lines; track l.id) {
                <tr>
                  <td>{{ l.lineNumber }}</td>
                  <td>
                    <div class="font-bold">{{ l.partNumber }}</div>
                    <div class="text-muted text-xs">{{ l.description }}</div>
                  </td>
                  <td class="font-mono text-xs">{{ l.hsnCode || '—' }}</td>
                  <td class="num-col font-bold">{{ l.quantity }}</td>
                  <td class="num-col">₹{{ l.unitPriceInPaise / 100 | number: '1.2-2' }}</td>
                  <td class="num-col">{{ l.dispatchedQuantity }} / {{ l.quantity }}</td>
                  <td class="num-col">{{ l.invoicedQuantity }} / {{ l.quantity }}</td>
                  <td class="num-col font-bold">
                    ₹{{ l.lineTotalInPaise / 100 | number: '1.2-2' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <div class="totals-summary">
            <div class="tot-row">
              <span>Subtotal:</span>
              <span>₹{{ ord.subtotalInPaise / 100 | number: '1.2-2' }}</span>
            </div>
            <div class="tot-row">
              <span>GST Tax:</span>
              <span>₹{{ ord.taxInPaise / 100 | number: '1.2-2' }}</span>
            </div>
            @if (ord.discountInPaise > 0) {
              <div class="tot-row text-success">
                <span>Discount:</span>
                <span>-₹{{ ord.discountInPaise / 100 | number: '1.2-2' }}</span>
              </div>
            }
            <div class="tot-row grand">
              <span>Grand Total:</span>
              <span class="font-bold">₹{{ ord.grandTotalInPaise / 100 | number: '1.2-2' }}</span>
            </div>
          </div>

          <div class="drawer-actions">
            @if (ord.status === SalesOrderStatus.Draft) {
              <button ar-button variant="primary" (click)="confirmOrder(ord)">
                Confirm Sales Order
              </button>
            }
            @if (
              ord.status === SalesOrderStatus.Confirmed ||
              ord.status === SalesOrderStatus.PartiallyDispatched
            ) {
              <button ar-button variant="ghost" (click)="createChallan(ord)">
                Create Delivery Challan
              </button>
              <button ar-button variant="primary" (click)="createInvoice(ord)">
                Generate Sales Invoice
              </button>
            }
            <button ar-button variant="ghost" (click)="viewCustomer360(ord.customerId)">
              Customer 360 Dossier
            </button>
          </div>
        </div>
      </ar-dialog>
    }

    <!-- Create Order Dialog -->
    @if (showCreateDialog()) {
      <ar-dialog title="Create New Sales Order" (dismiss)="showCreateDialog.set(false)">
        <div class="create-form">
          <div class="form-row">
            <div class="form-group flex-1">
              <label>Customer Name *</label>
              <input
                type="text"
                class="ar-input"
                [(ngModel)]="newOrder.customerName"
                placeholder="e.g. Kalyani Forge Ltd"
              />
            </div>
            <div class="form-group flex-1">
              <label>Customer PO Number *</label>
              <input
                type="text"
                class="ar-input"
                [(ngModel)]="newOrder.customerPoNumber"
                placeholder="e.g. PO-KF-1029"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>Payment Terms (Days)</label>
              <input
                type="number"
                class="ar-input"
                [(ngModel)]="newOrder.paymentTermsDays"
                placeholder="30"
              />
            </div>
            <div class="form-group flex-1">
              <label>Delivery Terms</label>
              <input
                type="text"
                class="ar-input"
                [(ngModel)]="newOrder.deliveryTerms"
                placeholder="Ex-Works / FOR Destination"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Shipping / Site Address</label>
            <input
              type="text"
              class="ar-input"
              [(ngModel)]="newOrder.shippingAddress"
              placeholder="Site delivery address"
            />
          </div>

          <h4 class="section-title">Order Items</h4>
          @for (item of newOrderLines; track $index) {
            <div class="item-edit-row">
              <input
                type="text"
                class="ar-input flex-2"
                placeholder="Part Number"
                [(ngModel)]="item.partNumber"
              />
              <input
                type="text"
                class="ar-input flex-3"
                placeholder="Description"
                [(ngModel)]="item.description"
              />
              <input
                type="number"
                class="ar-input flex-1"
                placeholder="Qty"
                [(ngModel)]="item.quantity"
              />
              <input
                type="number"
                class="ar-input flex-2"
                placeholder="Price (₹)"
                [(ngModel)]="item.unitPrice"
              />
              <button class="remove-btn" (click)="removeItemLine($index)">✕</button>
            </div>
          }

          <div class="add-line-wrap">
            <button class="add-line-btn" (click)="addItemLine()">+ Add line item</button>
          </div>

          <div class="dialog-foot">
            <button ar-button variant="ghost" (click)="showCreateDialog.set(false)">Cancel</button>
            <button ar-button variant="primary" (click)="submitCreateOrder()">
              Create Sales Order
            </button>
          </div>
        </div>
      </ar-dialog>
    }
  `,
  styles: [
    `
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
      /* Detail drawer */
      .detail-body {
        padding: 1rem 0;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        background: var(--ar-surface-sunken, #f8fafc);
        padding: 1rem;
        border-radius: 6px;
      }
      .meta-item.full {
        grid-column: span 2;
      }
      .meta-lbl {
        display: block;
        font-size: 0.75rem;
        color: var(--ar-ink-muted, #64748b);
        margin-bottom: 0.25rem;
      }
      .meta-val {
        font-size: 0.875rem;
        font-weight: 500;
      }
      .section-title {
        font-size: 0.875rem;
        font-weight: 700;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-muted, #64748b);
      }
      .inner-table {
        border: 1px solid var(--ar-line, #e2e8f0);
      }
      .totals-summary {
        margin-left: auto;
        width: 260px;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        padding: 0.75rem 0;
      }
      .tot-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
      }
      .tot-row.grand {
        font-size: 1.125rem;
        border-top: 1px solid var(--ar-line, #e2e8f0);
        padding-top: 0.5rem;
        color: var(--ar-primary, #0284c7);
      }
      .drawer-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line, #e2e8f0);
      }
      /* Create Form */
      .create-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem 0;
      }
      .form-row {
        display: flex;
        gap: 1rem;
      }
      .flex-1 {
        flex: 1;
      }
      .flex-2 {
        flex: 2;
      }
      .flex-3 {
        flex: 3;
      }
      .form-group label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: var(--ar-ink-muted, #64748b);
      }
      .item-edit-row {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .remove-btn {
        background: transparent;
        border: none;
        color: #ef4444;
        font-size: 1rem;
        cursor: pointer;
        padding: 0 0.5rem;
      }
      .add-line-btn {
        background: transparent;
        border: 1px dashed var(--ar-primary, #0284c7);
        color: var(--ar-primary, #0284c7);
        padding: 0.5rem;
        border-radius: 6px;
        width: 100%;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.8125rem;
      }
      .dialog-foot {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line, #e2e8f0);
      }
    `,
  ],
})
export class ArSalesOrders {
  private readonly orderService = inject(SalesOrderService);
  private readonly challanService = inject(DeliveryChallanService);
  private readonly invoiceService = inject(SalesInvoiceService);
  private readonly router = inject(Router);

  readonly SalesOrderStatus = SalesOrderStatus;

  orders = signal<SalesOrderDto[]>(MOCK_ORDERS);
  searchQuery = signal<string>('');
  selectedStatus = signal<SalesOrderStatus | null>(null);
  selectedOrder = signal<SalesOrderDto | null>(null);
  showCreateDialog = signal<boolean>(false);

  newOrder = {
    customerName: '',
    customerPoNumber: '',
    paymentTermsDays: 30,
    deliveryTerms: 'Ex-Works',
    shippingAddress: '',
  };

  newOrderLines = [{ partNumber: '', description: '', quantity: 1, unitPrice: 0 }];

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

  constructor() {
    this.loadOrders();
  }

  loadOrders() {
    if (!environment.useMockData) {
      this.orderService.getList({ maxResultCount: 100 }).subscribe({
        next: (res) => {
          if (res && res.items && res.items.length > 0) {
            this.orders.set(res.items);
          }
        },
        error: () => {
          // fallback to rich mock data
        },
      });
    }
  }

  selectOrder(order: SalesOrderDto) {
    this.selectedOrder.set(order);
  }

  openCreateModal() {
    this.newOrderLines = [{ partNumber: '', description: '', quantity: 1, unitPrice: 0 }];
    this.showCreateDialog.set(true);
  }

  addItemLine() {
    this.newOrderLines.push({ partNumber: '', description: '', quantity: 1, unitPrice: 0 });
  }

  removeItemLine(index: number) {
    if (this.newOrderLines.length > 1) {
      this.newOrderLines.splice(index, 1);
    }
  }

  submitCreateOrder() {
    if (!this.newOrder.customerName || !this.newOrder.customerPoNumber) {
      return;
    }

    const lines: CreateSalesOrderLineDto[] = this.newOrderLines
      .filter((l) => l.partNumber && l.quantity > 0)
      .map((l) => ({
        partNumber: l.partNumber,
        description: l.description || l.partNumber,
        quantity: l.quantity,
        unitPriceInPaise: Math.round(l.unitPrice * 100),
        discountPercent: 0,
        taxRateBasisPoints: 1800,
      }));

    const input: CreateSalesOrderDto = {
      customerId: '00000000-0000-0000-0000-000000000001',
      customerPoNumber: this.newOrder.customerPoNumber,
      paymentTermsDays: this.newOrder.paymentTermsDays,
      deliveryTerms: this.newOrder.deliveryTerms,
      shippingAddress: this.newOrder.shippingAddress,
      discountInPaise: 0,
      lines,
    };

    if (!environment.useMockData) {
      this.orderService.create(input).subscribe({
        next: (created) => {
          this.orders.update((list) => [created, ...list]);
          this.showCreateDialog.set(false);
        },
        error: () => {
          this.mockCreateOrder(input);
        },
      });
    } else {
      this.mockCreateOrder(input);
    }
  }

  private mockCreateOrder(input: CreateSalesOrderDto) {
    const subtotal = input.lines.reduce((acc, l) => acc + l.quantity * l.unitPriceInPaise, 0);
    const tax = Math.round(subtotal * 0.18);
    const created: SalesOrderDto = {
      id: `so-${Date.now()}`,
      orderNumber: `SO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: input.customerId,
      customerName: this.newOrder.customerName,
      customerPoNumber: input.customerPoNumber,
      status: SalesOrderStatus.Draft,
      paymentTermsDays: input.paymentTermsDays,
      deliveryTerms: input.deliveryTerms,
      shippingAddress: input.shippingAddress,
      orderDateUtc: new Date().toISOString(),
      subtotalInPaise: subtotal,
      discountInPaise: 0,
      taxInPaise: tax,
      grandTotalInPaise: subtotal + tax,
      creationTime: new Date().toISOString(),
      lines: input.lines.map((l, i) => ({
        id: `sol-${i + 1}`,
        salesOrderId: `so-${Date.now()}`,
        lineNumber: i + 1,
        partNumber: l.partNumber,
        description: l.description,
        quantity: l.quantity,
        unitPriceInPaise: l.unitPriceInPaise,
        discountPercent: 0,
        taxRateBasisPoints: 1800,
        lineTotalInPaise: l.quantity * l.unitPriceInPaise,
        dispatchedQuantity: 0,
        invoicedQuantity: 0,
        outstandingDispatch: l.quantity,
        outstandingInvoice: l.quantity,
      })),
    };

    this.orders.update((list) => [created, ...list]);
    this.showCreateDialog.set(false);
  }

  confirmOrder(order: SalesOrderDto) {
    if (!order.id) return;
    this.orderService.confirm(order.id).subscribe({
      next: (updated) => {
        this.updateOrderInList(updated);
      },
      error: () => {
        // Mock update
        const updated = {
          ...order,
          status: SalesOrderStatus.Confirmed,
          confirmedAtUtc: new Date().toISOString(),
        };
        this.updateOrderInList(updated);
      },
    });
  }

  createChallan(order: SalesOrderDto) {
    if (!order.id) return;
    this.challanService.createFromSalesOrder(order.id).subscribe({
      next: () => {
        this.router.navigate(['/sales/challans']);
      },
      error: () => {
        this.router.navigate(['/sales/challans']);
      },
    });
  }

  createInvoice(order: SalesOrderDto) {
    if (!order.id) return;
    this.invoiceService.createFromSalesOrder(order.id).subscribe({
      next: () => {
        this.router.navigate(['/sales/invoices']);
      },
      error: () => {
        this.router.navigate(['/sales/invoices']);
      },
    });
  }

  viewCustomer360(customerId: string) {
    this.router.navigate(['/contacts', customerId, '360']);
  }

  private updateOrderInList(updated: SalesOrderDto) {
    this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
    if (this.selectedOrder()?.id === updated.id) {
      this.selectedOrder.set(updated);
    }
  }

  getStatusLabel(status: SalesOrderStatus): string {
    switch (status) {
      case SalesOrderStatus.Draft:
        return 'Draft';
      case SalesOrderStatus.Confirmed:
        return 'Confirmed';
      case SalesOrderStatus.InProduction:
        return 'In Production';
      case SalesOrderStatus.PartiallyDispatched:
        return 'Partially Dispatched';
      case SalesOrderStatus.Dispatched:
        return 'Dispatched';
      case SalesOrderStatus.Completed:
        return 'Completed';
      case SalesOrderStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getStatusTone(status: SalesOrderStatus): ChipTone {
    switch (status) {
      case SalesOrderStatus.Draft:
        return 'neutral';
      case SalesOrderStatus.Confirmed:
        return 'teal';
      case SalesOrderStatus.InProduction:
        return 'amber';
      case SalesOrderStatus.PartiallyDispatched:
        return 'warn';
      case SalesOrderStatus.Dispatched:
        return 'good';
      case SalesOrderStatus.Completed:
        return 'good';
      case SalesOrderStatus.Cancelled:
        return 'bad';
      default:
        return 'neutral';
    }
  }
}
