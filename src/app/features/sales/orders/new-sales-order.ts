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
import { PickerOption } from '../../../core/services/pipeline.service';
import type { ProductDto } from '../../../proxy/library/product.service';
import { CreateSalesOrderDto, SalesOrderDto } from '../../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';
import { ArButton, ArDialog } from '../../../ui';
import { ArSelect } from '../../../ui/select';
import { errorMessage } from '../../activities/activity-logic';
import { ArCatalogueItem, CatalogueSearch } from '../catalogue-item';
import { ArSalesCustomer, SalesCustomerChoice } from '../sales-customer';
import { EMPTY_PARTY, SalesParty, defaultShipIndex, shipToText } from '../sales-party';
import {
  OrderLine,
  blankLine,
  editLine,
  lineFromOrder,
  lineFromProduct,
  toOrderLines,
} from './new-sales-order.logic';

/**
 * A new sales order, shown as the page at /sales/orders/new (from Sales orders or Customer 360). The customer is an account and
 * the contact person who placed the order (or a contact with no account); choosing them fills the billing and site addresses from
 * the account, the site from its default shipping address. Each item's name searches the product catalogue: picking one fills
 * the item number, description, HSN, price and GST. Emits the created order, or null when cancelled.
 */
@Component({
  selector: 'ar-new-sales-order',
  imports: [FormsModule, ArButton, ArDialog, ArSalesCustomer, ArCatalogueItem, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      [title]="editing() ? 'Edit ' + editing()!.orderNumber : 'Create New Sales Order'"
      width="min(920px, calc(100vw - 32px))"
      (dismiss)="closed.emit(null)"
    >
      <div class="so">
        @if (editing(); as e) {
          <p class="so__fixed">
            Customer: <strong translate="no">{{ e.customerName }}</strong>
            @if (e.customerAccountName) {
              · <span translate="no">{{ e.customerAccountName }}</span>
            }
          </p>
        } @else {
          <ar-sales-customer [initialCustomer]="initialCustomer()" (changed)="onCustomer($event)" />
        }

        <div class="so__grid">
          <label class="ar-field" for="so-po">
            <span class="ar-field__label">Customer PO number <span class="so__req">*</span></span>
            <input
              id="so-po"
              type="text"
              class="ar-field__input"
              [(ngModel)]="order.customerPoNumber"
              placeholder="e.g. PO-KF-1029"
            />
          </label>
          <label class="ar-field" for="so-days">
            <span class="ar-field__label">Payment terms (days)</span>
            <input
              id="so-days"
              type="number"
              class="ar-field__input"
              [(ngModel)]="order.paymentTermsDays"
              placeholder="30"
            />
          </label>
          <label class="ar-field so__wide" for="so-delivery">
            <span class="ar-field__label">Delivery terms</span>
            <input
              id="so-delivery"
              type="text"
              class="ar-field__input"
              [(ngModel)]="order.deliveryTerms"
              placeholder="Ex-Works / FOR Destination"
            />
          </label>

          <label class="ar-field so__half" for="so-bill">
            <span class="ar-field__label">Billing address</span>
            <textarea
              id="so-bill"
              class="ar-field__input"
              rows="3"
              [value]="billingAddress()"
              (input)="billingAddress.set($any($event.target).value)"
            ></textarea>
          </label>
          <div class="ar-field so__half">
            <label class="ar-field__label" for="so-ship">Shipping / Site address</label>
            @if (party().shipTo.length) {
              <select
                class="ar-field__input"
                aria-label="Ship to"
                (change)="chooseShipTo(+$any($event.target).value)"
              >
                @for (s of party().shipTo; track $index; let i = $index) {
                  <option [value]="i" [selected]="i === shipIndex()">
                    {{ s.label }}{{ s.isDefault ? ' (default)' : '' }}
                  </option>
                }
                <option [value]="-1" [selected]="shipIndex() === -1">Billing address</option>
              </select>
            }
            <textarea
              id="so-ship"
              class="ar-field__input"
              rows="3"
              placeholder="Site delivery address"
              [value]="shippingAddress()"
              (input)="shippingAddress.set($any($event.target).value)"
            ></textarea>
          </div>
          <label class="ar-field so__half" for="so-notes">
            <span class="ar-field__label"
              >Notes <span class="ar-field__opt">printed on the order</span></span
            >
            <textarea
              id="so-notes"
              class="ar-field__input"
              rows="3"
              maxlength="2000"
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
            ></textarea>
          </label>
          <label class="ar-field so__half" for="so-internal">
            <span class="ar-field__label"
              >Internal notes <span class="ar-field__opt">only your team sees these</span></span
            >
            <textarea
              id="so-internal"
              class="ar-field__input"
              rows="3"
              maxlength="2000"
              placeholder="e.g. Agreed 2% extra discount on next order"
              [value]="internalNotes()"
              (input)="internalNotes.set($any($event.target).value)"
            ></textarea>
          </label>
        </div>

        <h4 class="so__h">Order items</h4>
        @if (catalogue.blocked()) {
          <span class="ar-field__hint">
            The product catalogue isn't available to your role: type the item number and
            description.
          </span>
        }
        <div class="so__lines">
          <div class="so__line so__line--head" aria-hidden="true">
            <span>Item name</span><span>Item no.</span><span>Description</span><span>Qty</span
            ><span>Price ₹</span><span></span>
          </div>
          @for (l of lines(); track $index; let i = $index) {
            <div class="so__line">
              <ar-catalogue-item
                [value]="l.itemName"
                (typed)="patchLine(i, { itemName: $event })"
                (picked)="pickItem(i, $event)"
              />
              <input
                class="ar-field__input ar-mono"
                aria-label="Item number"
                placeholder="Item no."
                [value]="l.partNumber"
                (input)="patchLine(i, { partNumber: $any($event.target).value })"
              />
              <input
                class="ar-field__input"
                aria-label="Description"
                placeholder="Description"
                [value]="l.description"
                (input)="patchLine(i, { description: $any($event.target).value })"
              />
              <input
                type="number"
                min="0"
                class="ar-field__input so__num"
                aria-label="Quantity"
                [value]="l.quantity"
                (input)="patchLine(i, { quantity: +$any($event.target).value })"
              />
              <input
                type="number"
                min="0"
                class="ar-field__input so__num"
                aria-label="Price in rupees"
                [value]="l.unitPrice"
                (input)="patchLine(i, { unitPrice: +$any($event.target).value })"
              />
              <button
                type="button"
                class="so__x"
                aria-label="Remove item"
                [disabled]="lines().length === 1"
                (click)="removeLine(i)"
              >
                ✕
              </button>
            </div>
          }
        </div>
        <button type="button" class="so__add" (click)="addLine()">+ Add line item</button>

        @if (error(); as e) {
          <p class="so__error" role="alert">{{ e }}</p>
        }
      </div>
      <div dialogActions>
        <button ar-button variant="ghost" (click)="closed.emit(null)">Cancel</button>
        <button ar-button variant="primary" [disabled]="creating()" (click)="submit()">
          {{ creating() ? 'Saving…' : editing() ? 'Save changes' : 'Create Sales Order' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .so {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .so__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
      align-items: start;
    }
    .so__wide {
      grid-column: 1 / -1;
    }
    .so__half {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .so__req {
      color: var(--ar-bad-600);
    }
    .so__h {
      margin: 4px 0 0;
      font: 700 12px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .so__lines {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .so__line {
      display: grid;
      grid-template-columns:
        minmax(150px, 2fr) minmax(100px, 1.2fr) minmax(140px, 2.2fr)
        70px 100px 32px;
      gap: 8px;
      align-items: start;
    }
    .so__line > input {
      min-width: 0;
    }
    .so__line--head {
      font: 600 11px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .so__num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .so__x {
      height: 36px;
      background: none;
      border: 0;
      color: var(--ar-ink-500);
      cursor: pointer;
      border-radius: var(--ar-radius-control);
    }
    .so__x:hover:not(:disabled) {
      color: var(--ar-bad-600);
      background: var(--ar-red-100);
    }
    .so__x:disabled {
      opacity: 0.3;
      cursor: default;
    }
    .so__add {
      align-self: flex-start;
      background: none;
      border: 1px dashed var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      padding: 7px 12px;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-blue-600);
      cursor: pointer;
    }
    .so__add:hover {
      background: var(--ar-blue-100);
    }
    .so__error {
      margin: 0;
      padding: 0.75rem 1rem;
      border: 1px solid var(--ar-red-200);
      border-radius: 8px;
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
    }
    .so__fixed {
      margin: 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    @media (max-width: 760px) {
      .so__grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .so__line {
        grid-template-columns: 1fr 1fr;
      }
      .so__line--head {
        display: none;
      }
    }
  `,
})
export class ArNewSalesOrder {
  private readonly orderService = inject(SalesOrderService);
  protected readonly catalogue = inject(CatalogueSearch);

  /** The customer to start with: a contact passed from Customer 360 or a list showing one customer. */
  readonly initialCustomer = input<PickerOption | null>(null);
  /** A draft order to edit instead of making a new one. Its customer stays as it is. */
  readonly editing = input<SalesOrderDto | null>(null);
  readonly closed = output<SalesOrderDto | null>();

  protected readonly choice = signal<SalesCustomerChoice | null>(null);
  protected readonly party = signal<SalesParty>(EMPTY_PARTY);
  protected readonly billingAddress = signal('');
  protected readonly shippingAddress = signal('');
  protected readonly notes = signal('');
  protected readonly internalNotes = signal('');
  protected readonly shipIndex = signal(-1);
  protected readonly lines = signal<OrderLine[]>([blankLine()]);

  protected readonly error = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected order = {
    customerPoNumber: '',
    paymentTermsDays: 30,
    deliveryTerms: 'Ex-Works',
  };

  /** A new customer choice; a new account (or none) refills the billing and site addresses from it. */
  protected onCustomer(choice: SalesCustomerChoice): void {
    this.choice.set(choice);
    this.error.set(null);
    if (choice.party !== this.party()) {
      this.party.set(choice.party);
      this.billingAddress.set(choice.party.billingAddress);
      this.chooseShipTo(defaultShipIndex(choice.party));
    }
  }

  protected chooseShipTo(index: number): void {
    this.shipIndex.set(index);
    this.shippingAddress.set(shipToText(this.party(), index));
  }

  // ---- Items ---------------------------------------------------------------------

  protected patchLine(index: number, patch: Partial<OrderLine>): void {
    this.lines.update((ls) => ls.map((l, i) => (i === index ? editLine(l, patch) : l)));
  }

  protected addLine(): void {
    this.lines.update((ls) => [...ls, blankLine()]);
  }

  protected removeLine(index: number): void {
    this.lines.update((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== index) : ls));
  }

  protected pickItem(index: number, p: ProductDto): void {
    this.lines.update((ls) => ls.map((l, i) => (i === index ? lineFromProduct(p, l) : l)));
  }

  // ---- Save ----------------------------------------------------------------------

  constructor() {
    // An edit starts from the saved order.
    effect(() => {
      const o = this.editing();
      if (!o) return;
      untracked(() => {
        this.order = {
          customerPoNumber: o.customerPoNumber ?? '',
          paymentTermsDays: o.paymentTermsDays ?? 30,
          deliveryTerms: o.deliveryTerms ?? 'Ex-Works',
        };
        this.billingAddress.set(o.billingAddress ?? '');
        this.shippingAddress.set(o.shippingAddress ?? '');
        this.notes.set(o.notes ?? '');
        this.internalNotes.set(o.internalNotes ?? '');
        this.lines.set(o.lines.length ? o.lines.map(lineFromOrder) : [blankLine()]);
      });
    });
  }

  private saveEdit(o: SalesOrderDto): void {
    if (!this.order.customerPoNumber.trim()) {
      this.error.set('Enter the customer PO number.');
      return;
    }
    const lines = toOrderLines(this.lines());
    if (lines.length === 0) {
      this.error.set('Add at least one item with an item number and quantity.');
      return;
    }
    this.creating.set(true);
    this.error.set(null);
    this.orderService
      .update(o.id!, {
        customerPoNumber: this.order.customerPoNumber.trim(),
        customerPoDate: o.customerPoDate,
        paymentTermsDays: this.order.paymentTermsDays,
        deliveryTerms: this.order.deliveryTerms,
        billingAddress: this.billingAddress().trim() || undefined,
        shippingAddress: this.shippingAddress().trim() || undefined,
        expectedDeliveryDateUtc: o.expectedDeliveryDateUtc,
        discountInPaise: o.discountInPaise,
        notes: this.notes().trim() || undefined,
        internalNotes: this.internalNotes().trim() || undefined,
        lines,
      })
      .subscribe({
        next: (saved) => {
          this.creating.set(false);
          this.closed.emit(saved);
        },
        error: (e: unknown) => {
          this.creating.set(false);
          this.error.set(errorMessage(e, 'The sales order could not be saved.'));
        },
      });
  }

  protected submit(): void {
    const editing = this.editing();
    if (editing) {
      this.saveEdit(editing);
      return;
    }
    const choice = this.choice();
    const customer = choice?.customer;
    if (!customer) {
      this.error.set(
        choice?.mode !== 'contact'
          ? 'Choose the account and the contact person who placed this order.'
          : 'Pick the customer this order is for.',
      );
      return;
    }
    if (!this.order.customerPoNumber.trim()) {
      this.error.set('Enter the customer PO number.');
      return;
    }
    const lines = toOrderLines(this.lines());
    if (lines.length === 0) {
      this.error.set('Add at least one item with an item number and quantity.');
      return;
    }

    const input: CreateSalesOrderDto = {
      customerId: customer.id,
      customerAccountId: choice.accountId ?? undefined,
      customerPoNumber: this.order.customerPoNumber.trim(),
      paymentTermsDays: this.order.paymentTermsDays,
      deliveryTerms: this.order.deliveryTerms,
      billingAddress: this.billingAddress().trim() || undefined,
      shippingAddress: this.shippingAddress().trim() || undefined,
      notes: this.notes().trim() || undefined,
      internalNotes: this.internalNotes().trim() || undefined,
      discountInPaise: 0,
      lines,
    };

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
