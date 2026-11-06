import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  FieldServiceTicketDto,
  FieldServiceTicketService,
  RecordSpareConsumedDto,
} from '../../../proxy/field-service';
import {
  InventoryService,
  StockItemDto,
} from '../../../proxy/inventory/inventory.service';
import { ArButton, ArCard } from '../../../ui';

/** Mock spare products for the dev environment. */
const MOCK_STOCK_ITEMS: StockItemDto[] = [
  {
    productId: 'prod-1',
    partNumber: 'SK-FKM-90',
    name: 'Viton FKM High-Pressure Cylinder Seal Kit',
    unit: 'Kit',
    onHand: 12,
    reserved: 2,
    available: 10,
    isLow: false,
    averageCostInPaise: 4_600_00,
    valueInPaise: 55_200_00,
    locations: [],
  },
  {
    productId: 'prod-2',
    partNumber: 'SOL-COIL-24V',
    name: 'Proportional Directional Solenoid Coil 24V DC',
    unit: 'Pcs',
    onHand: 8,
    reserved: 1,
    available: 7,
    isLow: false,
    averageCostInPaise: 6_200_00,
    valueInPaise: 49_600_00,
    locations: [],
  },
  {
    productId: 'prod-3',
    partNumber: 'BRG-6205-ZZ',
    name: 'Deep Groove Ball Bearing 6205-ZZ (25×52×15)',
    unit: 'Pcs',
    onHand: 50,
    reserved: 0,
    available: 50,
    isLow: false,
    averageCostInPaise: 850_00,
    valueInPaise: 42_500_00,
    locations: [],
  },
  {
    productId: 'prod-4',
    partNumber: 'VFD-BRAKE-RES-10R',
    name: 'VFD Dynamic Braking Resistor 10Ω 400W',
    unit: 'Pcs',
    onHand: 5,
    reserved: 0,
    available: 5,
    isLow: true,
    averageCostInPaise: 2_800_00,
    valueInPaise: 14_000_00,
    locations: [],
  },
  {
    productId: 'prod-5',
    partNumber: 'HOSE-HP-6MM-1M',
    name: 'High-Pressure Hydraulic Hose 6mm ID 1m',
    unit: 'Mtr',
    onHand: 30,
    reserved: 0,
    available: 30,
    isLow: false,
    averageCostInPaise: 1_200_00,
    valueInPaise: 36_000_00,
    locations: [],
  },
];

interface SpareLineItem {
  product: StockItemDto;
  quantity: number;
  unitPriceInPaise: number;
  isBillable: boolean;
}

/**
 * Add spare parts consumed for a field service ticket.
 * Spare parts are sourced from the product / inventory catalogue.
 * Route: /field-service/tickets/:id/spares
 */
@Component({
  selector: 'ar-add-spare-parts-page',
  standalone: true,
  imports: [DecimalPipe, FormsModule, ArTopbar, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Add Spare Parts"
      subtitle="Select parts from the inventory catalogue and record them against this ticket"
    >
      <button ar-button type="button" variant="ghost" (click)="cancel()">Back to tickets</button>
    </ar-topbar>

    <div class="sp ar-scroll">

      @if (ticket(); as t) {
        <div class="sp__context-banner">
          <span class="sp__ticket-no">{{ t.ticketNumber }}</span>
          <span class="sp__sep">·</span>
          <span>{{ t.customerName }}</span>
          <span class="sp__sep">·</span>
          <span class="sp__equipment">{{ t.equipmentModel }}</span>
        </div>
      }

      <div class="sp__layout">

        <!-- Left: product catalogue picker -->
        <ar-card heading="Parts catalogue" class="sp__catalogue-card">
          <div class="sp__search-row">
            <input
              class="ar-field__input sp__search"
              placeholder="Search by part number or name…"
              [(ngModel)]="searchQuery"
            />
          </div>

          @if (loadingProducts()) {
            <p class="sp__loading">Loading inventory…</p>
          } @else if (filteredProducts().length === 0) {
            <p class="sp__empty">No parts match your search.</p>
          } @else {
            <div class="sp__product-list">
              @for (item of filteredProducts(); track item.productId) {
                <div
                  class="sp__product-row"
                  [class.sp__product-row--selected]="isSelected(item)"
                  (click)="toggleSelect(item)"
                  role="checkbox"
                  [attr.aria-checked]="isSelected(item)"
                  tabindex="0"
                  (keydown.enter)="toggleSelect(item)"
                  (keydown.space)="$event.preventDefault(); toggleSelect(item)"
                >
                  <span class="sp__check">{{ isSelected(item) ? '☑' : '☐' }}</span>
                  <span class="sp__part-no ar-mono">{{ item.partNumber }}</span>
                  <span class="sp__part-name">{{ item.name }}</span>
                  <span class="sp__avail" [class.sp__avail--low]="item.isLow">
                    Avail: {{ item.available }} {{ item.unit }}
                  </span>
                  <span class="sp__price">
                    ₹{{ (item.averageCostInPaise ?? 0) / 100 | number: '1.2-2' }}
                  </span>
                </div>
              }
            </div>
          }
        </ar-card>

        <!-- Right: selected items + qty / billing -->
        <ar-card heading="Selected parts to record" class="sp__basket-card">
          @if (basket().length === 0) {
            <p class="sp__empty sp__empty--basket">
              Click parts on the left to add them here.
            </p>
          } @else {
            <div class="sp__basket-list">
              @for (line of basket(); track line.product.productId) {
                <div class="sp__basket-row">
                  <div class="sp__basket-info">
                    <span class="sp__part-no ar-mono">{{ line.product.partNumber }}</span>
                    <span class="sp__basket-name">{{ line.product.name }}</span>
                  </div>
                  <div class="sp__basket-controls">
                    <label class="ar-field sp__qty-field">
                      <span class="ar-field__label">Qty</span>
                      <input
                        type="number"
                        class="ar-field__input sp__qty-input"
                        min="1"
                        [ngModel]="line.quantity"
                        (ngModelChange)="updateQty(line, $event)"
                      />
                    </label>
                    <label class="ar-field sp__price-field">
                      <span class="ar-field__label">Unit price (₹)</span>
                      <input
                        type="number"
                        class="ar-field__input sp__qty-input"
                        min="0"
                        [ngModel]="line.unitPriceInPaise / 100"
                        (ngModelChange)="updatePrice(line, $event)"
                      />
                    </label>
                    <label class="sp__bill-label">
                      <input type="checkbox" [ngModel]="line.isBillable" (ngModelChange)="updateBillable(line, $event)" />
                      <span>Billable to customer</span>
                    </label>
                    <span class="sp__line-total">
                      ₹{{ (line.quantity * line.unitPriceInPaise) / 100 | number: '1.2-2' }}
                    </span>
                    <button ar-button type="button" variant="ghost" class="sp__remove" (click)="removeLine(line)">
                      ✕
                    </button>
                  </div>
                </div>
              }
            </div>

            <div class="sp__basket-total">
              <span>Total spare cost:</span>
              <strong>₹{{ basketTotal() / 100 | number: '1.2-2' }}</strong>
            </div>
          }

          @if (error(); as e) {
            <p class="sp__error" role="alert">{{ e }}</p>
          }

          <div class="sp__actions">
            <button ar-button type="button" variant="ghost" (click)="cancel()">Cancel</button>
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy() || basket().length === 0"
              (click)="submit()"
            >
              {{ busy() ? 'Saving…' : 'Record ' + basket().length + ' part(s)' }}
            </button>
          </div>
        </ar-card>
      </div>
    </div>
  `,
  styles: `
    .sp {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .sp__context-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding: 10px 14px;
      background: var(--ar-blue-50, #eff6ff);
      border: 1px solid var(--ar-blue-200, #bfdbfe);
      border-radius: var(--ar-radius-control, 6px);
      font-size: 0.85rem;
      color: var(--ar-blue-800, #1e40af);
    }
    .sp__ticket-no {
      font-weight: 700;
      font-family: var(--ar-font-mono, monospace);
    }
    .sp__sep {
      color: var(--ar-blue-300, #93c5fd);
    }
    .sp__equipment {
      color: var(--ar-blue-600, #2563eb);
    }
    .sp__layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      align-items: start;
    }
    .sp__catalogue-card,
    .sp__basket-card {
      display: block;
    }
    .sp__search-row {
      margin-bottom: 10px;
    }
    .sp__search {
      width: 100%;
    }
    .sp__loading,
    .sp__empty {
      font-size: 0.85rem;
      color: var(--ar-slate-400, #94a3b8);
      padding: 12px 0;
    }
    .sp__empty--basket {
      text-align: center;
      padding: 24px 0;
    }
    .sp__product-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 460px;
      overflow-y: auto;
    }
    .sp__product-row {
      display: grid;
      grid-template-columns: 20px 110px 1fr 90px 90px;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.82rem;
      transition: background 0.1s;
      border: 1px solid transparent;
    }
    .sp__product-row:hover {
      background: var(--ar-slate-50, #f8fafc);
    }
    .sp__product-row--selected {
      background: var(--ar-blue-50, #eff6ff);
      border-color: var(--ar-blue-200, #bfdbfe);
    }
    .sp__check {
      font-size: 1rem;
      color: var(--ar-blue-600, #2563eb);
    }
    .sp__part-no {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--ar-slate-700, #334155);
    }
    .sp__part-name {
      color: var(--ar-slate-700, #334155);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sp__avail {
      font-size: 0.75rem;
      color: var(--ar-green-700, #15803d);
    }
    .sp__avail--low {
      color: var(--ar-amber-600, #d97706);
      font-weight: 600;
    }
    .sp__price {
      text-align: right;
      font-weight: 600;
      color: var(--ar-slate-700, #334155);
    }
    .sp__basket-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 12px;
    }
    .sp__basket-row {
      padding: 10px 12px;
      background: var(--ar-slate-50, #f8fafc);
      border: 1px solid var(--ar-slate-200, #e2e8f0);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sp__basket-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sp__basket-name {
      font-size: 0.82rem;
      color: var(--ar-slate-700, #334155);
    }
    .sp__basket-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .sp__qty-field,
    .sp__price-field {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .sp__qty-input {
      width: 90px;
    }
    .sp__bill-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      cursor: pointer;
      white-space: nowrap;
    }
    .sp__line-total {
      margin-left: auto;
      font-weight: 700;
      font-size: 0.88rem;
      color: var(--ar-green-700, #15803d);
      white-space: nowrap;
    }
    .sp__remove {
      font-size: 0.75rem;
      padding: 2px 6px !important;
    }
    .sp__basket-total {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-top: 1px solid var(--ar-slate-200, #e2e8f0);
      font-size: 0.88rem;
      color: var(--ar-slate-600, #475569);
    }
    .sp__basket-total strong {
      font-size: 1rem;
      color: var(--ar-green-700, #15803d);
    }
    .sp__error {
      margin: 0 0 8px;
      padding: 0.75rem 1rem;
      border: 1px solid var(--ar-red-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
      font: 500 13px var(--ar-font-sans);
    }
    .sp__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 8px;
    }
    @media (max-width: 900px) {
      .sp__layout {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArAddSparePartsPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ticketService = inject(FieldServiceTicketService);
  private readonly inventoryService = inject(InventoryService);
  private readonly toasts = inject(ToastService);

  private readonly ticketId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly ticket = signal<FieldServiceTicketDto | null>(null);
  protected readonly allProducts = signal<StockItemDto[]>([]);
  protected readonly loadingProducts = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected searchQuery = '';

  /** Items added to the basket. Using a mutable array + signal pair so we can mutate entries. */
  private readonly basketSignal = signal<SpareLineItem[]>([]);
  protected readonly basket = this.basketSignal.asReadonly();

  protected readonly filteredProducts = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.allProducts();
    return this.allProducts().filter(
      (p) =>
        p.partNumber.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  });

  protected readonly basketTotal = computed(() =>
    this.basket().reduce((acc, l) => acc + l.quantity * l.unitPriceInPaise, 0),
  );

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    // Load ticket for context banner
    if (!environment.useMockData && this.ticketId) {
      this.ticketService.get(this.ticketId).subscribe({
        next: (t) => this.ticket.set(t),
        error: () => { /* non-critical */ },
      });
    }

    // Load products from inventory
    if (environment.useMockData) {
      this.allProducts.set(MOCK_STOCK_ITEMS);
      return;
    }

    this.loadingProducts.set(true);
    this.inventoryService.getLevels().subscribe({
      next: (items) => {
        this.allProducts.set(items);
        this.loadingProducts.set(false);
      },
      error: () => {
        this.allProducts.set([]);
        this.loadingProducts.set(false);
      },
    });
  }

  protected isSelected(item: StockItemDto): boolean {
    return this.basket().some((l) => l.product.productId === item.productId);
  }

  protected toggleSelect(item: StockItemDto): void {
    if (this.isSelected(item)) {
      this.basketSignal.update((b) => b.filter((l) => l.product.productId !== item.productId));
    } else {
      const line: SpareLineItem = {
        product: item,
        quantity: 1,
        unitPriceInPaise: item.averageCostInPaise ?? 0,
        isBillable: false,
      };
      this.basketSignal.update((b) => [...b, line]);
    }
  }

  protected updateQty(line: SpareLineItem, qty: number): void {
    this.basketSignal.update((b) =>
      b.map((l) =>
        l.product.productId === line.product.productId
          ? { ...l, quantity: Math.max(1, Number(qty) || 1) }
          : l,
      ),
    );
  }

  protected updatePrice(line: SpareLineItem, priceInRupees: number): void {
    this.basketSignal.update((b) =>
      b.map((l) =>
        l.product.productId === line.product.productId
          ? { ...l, unitPriceInPaise: Math.max(0, Math.round((Number(priceInRupees) || 0) * 100)) }
          : l,
      ),
    );
  }

  protected updateBillable(line: SpareLineItem, billable: boolean): void {
    this.basketSignal.update((b) =>
      b.map((l) =>
        l.product.productId === line.product.productId ? { ...l, isBillable: billable } : l,
      ),
    );
  }

  protected removeLine(line: SpareLineItem): void {
    this.basketSignal.update((b) =>
      b.filter((l) => l.product.productId !== line.product.productId),
    );
  }

  cancel(): void {
    void this.router.navigateByUrl('/field-service/tickets');
  }

  submit(): void {
    if (this.busy() || this.basket().length === 0) return;
    this.error.set(null);

    if (environment.useMockData) {
      this.toasts.success(`${this.basket().length} spare part(s) recorded (mock).`);
      void this.router.navigateByUrl('/field-service/tickets');
      return;
    }

    this.busy.set(true);

    // Record each spare sequentially using a simple recursive call
    const lines = this.basket();
    const submit = (index: number): void => {
      if (index >= lines.length) {
        this.busy.set(false);
        this.toasts.success(`${lines.length} spare part(s) recorded for ticket.`);
        void this.router.navigateByUrl('/field-service/tickets');
        return;
      }
      const l = lines[index];
      const dto: RecordSpareConsumedDto = {
        partNumber: l.product.partNumber,
        description: l.product.name,
        quantity: l.quantity,
        unitPriceInPaise: l.unitPriceInPaise,
        isBillableToCustomer: l.isBillable,
      };
      this.ticketService.recordSpare(this.ticketId, dto).subscribe({
        next: () => submit(index + 1),
        error: (err) => {
          this.busy.set(false);
          this.error.set(
            err?.error?.error?.message ?? `Failed to record part ${l.product.partNumber}.`,
          );
        },
      });
    };
    submit(0);
  }
}
