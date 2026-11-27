import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PickerOption } from '../../../core/services/pipeline.service';
import { ArTopbar } from '../../../layout/topbar';
import type { ProductDto } from '../../../proxy/library/product.service';
import { CreateSalesOrderDto, SalesOrderDto } from '../../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';
import { ArBanner, ArButton, ArCard, ArIcon } from '../../../ui';
import { ArSelect } from '../../../ui/select';
import { errorMessage } from '../../activities/activity-logic';
import { ArCatalogueItem, CatalogueSearch } from '../catalogue-item';
import { ArSalesCustomer, SalesCustomerChoice } from '../sales-customer';
import { EMPTY_PARTY, SalesParty, defaultShipIndex, shipToText } from '../sales-party';
import {
  DEFAULT_TAX_BPS,
  OrderLine,
  blankLine,
  editLine,
  lineFromOrder,
  lineFromProduct,
  toOrderLines,
} from './new-sales-order.logic';

/**
 * Enterprise Create / Edit Sales Order Component.
 * Styled after the Account Form with 100% full-width layout, structured modular cards,
 * clear visual hierarchy, dynamic calculations, and accessible ERP controls.
 */
@Component({
  selector: 'ar-new-sales-order',
  imports: [
    FormsModule,
    ArTopbar,
    ArCard,
    ArBanner,
    ArButton,
    ArIcon,
    ArSalesCustomer,
    ArCatalogueItem,
    ArSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-sales-order.html',
  styleUrl: './new-sales-order.scss',
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

  /** Standard supported delivery terms */
  protected readonly deliveryTermsOptions = [
    'Ex-Works',
    'FOR Destination',
    'Door Delivery',
    'FOB',
    'CIF',
  ];

  // ---- Dynamic Order Calculations ------------------------------------------------

  protected readonly itemCount = computed(
    () =>
      this.lines().filter((l) => l.partNumber.trim() || l.quantity > 0 || l.itemName.trim())
        .length,
  );

  protected readonly totalQuantity = computed(() =>
    this.lines().reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
  );

  protected readonly subtotal = computed(() =>
    this.lines().reduce(
      (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
      0,
    ),
  );

  protected readonly totalGst = computed(() =>
    this.lines().reduce(
      (sum, l) =>
        sum +
        (Number(l.quantity) || 0) *
          (Number(l.unitPrice) || 0) *
          ((l.taxRateBasisPoints ?? DEFAULT_TAX_BPS) / 10000),
      0,
    ),
  );

  protected readonly grandTotal = computed(() => this.subtotal() + this.totalGst());

  protected lineTotal(l: OrderLine): number {
    return (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
  }

  protected formatInr(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  // ---- Customer & Address Actions -----------------------------------------------

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

  protected copyBillingToShipping(): void {
    this.shippingAddress.set(this.billingAddress());
    this.shipIndex.set(-1);
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

  protected cancel(): void {
    this.closed.emit(null);
  }

  // ---- Save / Submit -------------------------------------------------------------

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
