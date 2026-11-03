import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../../environments/environment';
import { PickerOption } from '../../../core/services/pipeline.service';
import { SalesOrderStatus } from '../../../proxy/sales/sales-enums';
import {
  CreateSalesOrderDto,
  CreateSalesOrderLineDto,
  SalesOrderDto,
} from '../../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';
import { ArButton, ArDialog } from '../../../ui';
import { errorMessage } from '../../activities/activity-logic';
import { ArContactPicker } from '../../pipeline/contact-picker';

type OrderLine = { partNumber: string; description: string; quantity: number; unitPrice: number };
const blankLine = (): OrderLine => ({ partNumber: '', description: '', quantity: 1, unitPrice: 0 });

/**
 * A new sales order: the customer, their PO, terms, the site address and the items. In a dialog on Sales orders, and the whole
 * page at /sales/orders/new (from an account's Customer 360). Emits the created order, or null when cancelled.
 */
@Component({
  selector: 'ar-new-sales-order',
  imports: [FormsModule, ArButton, ArDialog, ArContactPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog title="Create New Sales Order" (dismiss)="closed.emit(null)">
      <div class="create-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label>Customer *</label>
            <ar-contact-picker [initial]="customer()" (picked)="customer.set($event)" />
          </div>
          <div class="form-group flex-1">
            <label>Customer PO Number *</label>
            <input
              type="text"
              class="ar-input"
              [(ngModel)]="order.customerPoNumber"
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
              [(ngModel)]="order.paymentTermsDays"
              placeholder="30"
            />
          </div>
          <div class="form-group flex-1">
            <label>Delivery Terms</label>
            <input
              type="text"
              class="ar-input"
              [(ngModel)]="order.deliveryTerms"
              placeholder="Ex-Works / FOR Destination"
            />
          </div>
        </div>

        <div class="form-group">
          <label>Shipping / Site Address</label>
          <input
            type="text"
            class="ar-input"
            [(ngModel)]="order.shippingAddress"
            placeholder="Site delivery address"
          />
        </div>

        <h4 class="section-title">Order Items</h4>
        @for (item of lines; track $index) {
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
            <button type="button" class="remove-btn" (click)="removeLine($index)">✕</button>
          </div>
        }

        <div class="add-line-wrap">
          <button type="button" class="add-line-btn" (click)="addLine()">+ Add line item</button>
        </div>

        @if (error(); as e) {
          <p class="load-error" role="alert">{{ e }}</p>
        }
      </div>
      <div dialogActions>
        <button ar-button variant="ghost" (click)="closed.emit(null)">Cancel</button>
        <button ar-button variant="primary" [disabled]="creating()" (click)="submit()">
          {{ creating() ? 'Creating…' : 'Create Sales Order' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .create-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
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
    .ar-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--ar-line-strong, #cbd5e1);
      background: var(--ar-surface, #ffffff);
      color: var(--ar-ink-heavy, #0f172a);
      font-size: 0.875rem;
    }
    .section-title {
      font-size: 0.875rem;
      font-weight: 700;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
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
    .load-error {
      margin: 0;
      padding: 0.75rem 1rem;
      border: 1px solid var(--ar-bad-200, #fecaca);
      border-radius: 8px;
      background: var(--ar-bad-50, #fef2f2);
      color: var(--ar-bad-700, #b91c1c);
    }
  `,
})
export class ArNewSalesOrder {
  private readonly orderService = inject(SalesOrderService);

  /** The customer to start with: picked on Sales orders, or passed from an account's Customer 360. */
  readonly initialCustomer = input<PickerOption | null>(null);
  readonly closed = output<SalesOrderDto | null>();

  protected readonly customer = signal<PickerOption | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected order = {
    customerPoNumber: '',
    paymentTermsDays: 30,
    deliveryTerms: 'Ex-Works',
    shippingAddress: '',
  };
  protected lines: OrderLine[] = [blankLine()];

  private readonly applyInitialCustomer = effect(() => {
    const c = this.initialCustomer();
    untracked(() => this.customer.set(c));
  });

  protected addLine(): void {
    this.lines.push(blankLine());
  }

  protected removeLine(index: number): void {
    if (this.lines.length > 1) this.lines.splice(index, 1);
  }

  protected submit(): void {
    const customer = this.customer();
    if (!customer) {
      this.error.set('Pick the customer this order is for.');
      return;
    }
    if (!this.order.customerPoNumber) {
      this.error.set('Enter the customer PO number.');
      return;
    }

    const lines: CreateSalesOrderLineDto[] = this.lines
      .filter((l) => l.partNumber && l.quantity > 0)
      .map((l) => ({
        partNumber: l.partNumber,
        description: l.description || l.partNumber,
        quantity: l.quantity,
        unitPriceInPaise: Math.round(l.unitPrice * 100),
        discountPercent: 0,
        taxRateBasisPoints: 1800,
      }));
    if (lines.length === 0) {
      this.error.set('Add at least one line with a part number and quantity.');
      return;
    }

    const input: CreateSalesOrderDto = {
      customerId: customer.id,
      customerPoNumber: this.order.customerPoNumber,
      paymentTermsDays: this.order.paymentTermsDays,
      deliveryTerms: this.order.deliveryTerms,
      shippingAddress: this.order.shippingAddress,
      discountInPaise: 0,
      lines,
    };

    if (environment.useMockData) {
      this.closed.emit(mockOrder(input, customer.label));
      return;
    }
    this.creating.set(true);
    this.error.set(null);
    this.orderService.create(input).subscribe({
      next: (created) => {
        this.creating.set(false);
        this.closed.emit(created);
      },
      error: (e: unknown) => {
        this.creating.set(false);
        this.error.set(errorMessage(e, 'The sales order could not be created.'));
      },
    });
  }
}

/** What the API would return, for the demo build. */
function mockOrder(input: CreateSalesOrderDto, customerName: string): SalesOrderDto {
  const subtotal = input.lines.reduce((acc, l) => acc + l.quantity * l.unitPriceInPaise, 0);
  const tax = Math.round(subtotal * 0.18);
  const id = `so-${Date.now()}`;
  return {
    id,
    orderNumber: `SO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: input.customerId,
    customerName,
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
      salesOrderId: id,
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
}
