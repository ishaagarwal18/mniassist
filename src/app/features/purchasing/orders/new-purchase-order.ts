import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { checkPolicy } from '../../../core/auth/permission';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { inr } from '../../../core/util/format';
import { readSupplierScope, supplierScopeParams } from '../../../core/util/supplier-scope';
import { CockpitOriginService } from '../../../layout/cockpit-origin.service';
import { ArTopbar } from '../../../layout/topbar';
import { InventoryService, StockLocationDto } from '../../../proxy/inventory/inventory.service';
import {
  PurchasingService,
  ReorderSuggestionDto,
} from '../../../proxy/inventory/purchasing.service';
import { ProductService } from '../../../proxy/library/product.service';
import { ArButton, ArIcon, ArDateInput, ArSelect } from '../../../ui';
import { DraftLine, draftTotal, readLines } from '../../inventory/purchasing-logic';
import {
  ArPfSupplier,
  PURCHASE_FORM_STYLES,
  SupplierOption,
  SupplierOptionsService,
} from '../purchase-form';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';

interface PartHit {
  productId: string;
  partNumber: string;
  name: string;
}

/**
 * Raise a purchase order on its own page (/purchasing/orders/new). `?supplier=<id>&name=` picks the supplier (from Vendor 360).
 * Parts come from the catalogue; the parts below minimum stock last bought from this supplier can be added in one click. Saved as
 * a draft (marked sent from Purchasing); returns to where it was opened from, otherwise to Purchasing.
 */
@Component({
  selector: 'ar-new-purchase-order-page',
  imports: [ArTopbar, ArButton, ArIcon, ArPfSupplier, ArDateInput, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="editing() ? 'Edit ' + editing() : 'New purchase order'"
      [subtitle]="supplierName() || 'Order parts from a supplier'"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (!canCreate) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="shield" [size]="20" />
          <div>
            <strong>Your role can't raise purchase orders.</strong>
            <p>Ask an administrator for the "Inventory › Manage" permission.</p>
          </div>
          <button ar-button variant="ghost" type="button" (click)="cancel()">Go back</button>
        </section>
      } @else if (loading()) {
        <p class="po-none">Loading the order…</p>
      } @else if (loadProblem(); as p) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="alert" [size]="20" />
          <div>
            <strong>{{ p }}</strong>
          </div>
          <button ar-button variant="ghost" type="button" (click)="cancel()">Go back</button>
        </section>
      } @else {
        <form class="pf__form" novalidate (submit)="$event.preventDefault(); save()">
          <section class="pf__card" aria-labelledby="po-s1">
            <header class="pf__head">
              <span class="pf__step">1</span>
              <div>
                <h2 id="po-s1">Supplier & delivery</h2>
                <p>Who supplies it, where it is delivered and by when.</p>
              </div>
            </header>
            <div class="pf__grid">
              <ar-pf-supplier
                class="pf__span2"
                [suppliers]="suppliers()"
                [value]="supplierId()"
                [name]="supplierName()"
                [loading]="suppliersLoading()"
                [failed]="suppliersError()"
                [error]="submitted() && !supplierId() ? 'Pick the supplier.' : null"
                [(locked)]="supplierLocked"
                (picked)="pickSupplier($event)"
              />
              <div class="ar-field">
                <label class="ar-field__label" for="po-loc">Receive into</label>
                <select
                  id="po-loc"
                  class="ar-field__input"
                  (change)="locationId.set($any($event.target).value)"
                >
                  @if (!locations().length) {
                    <option value="">Default store</option>
                  }
                  @for (l of locations(); track l.id) {
                    <option [value]="l.id" [selected]="l.id === locationId()">{{ l.name }}</option>
                  }
                </select>
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="po-exp"
                  >Expected <span class="ar-field__opt">optional</span></label
                >
                <input
                  id="po-exp"
                  type="date"
                  class="ar-field__input"
                  [value]="expectedOn()"
                  (input)="expectedOn.set($any($event.target).value)"
                />
                <span class="ar-field__hint">Blank: from the supplier's lead time.</span>
              </div>
              <div class="ar-field pf__span4">
                <label class="ar-field__label" for="po-note"
                  >Note to supplier <span class="ar-field__opt">optional</span></label
                >
                <input
                  id="po-note"
                  class="ar-field__input"
                  placeholder="e.g. Deliver with test certificates"
                  [value]="note()"
                  (input)="note.set($any($event.target).value)"
                />
              </div>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="po-s2">
            <header class="pf__head">
              <span class="pf__step">2</span>
              <div>
                <h2 id="po-s2">Parts</h2>
                <p>From the catalogue, with the agreed price per unit before GST.</p>
              </div>
            </header>

            @if (supplierSuggestions().length) {
              <div class="po-suggest" role="status">
                <ar-icon name="bolt" [size]="16" />
                <span
                  >{{ supplierSuggestions().length }} part(s) last bought from this supplier are
                  below minimum stock.</span
                >
                <button ar-button variant="ghost" type="button" (click)="addSuggestions()">
                  Add them
                </button>
              </div>
            }

            <div class="pf__lines" role="table" aria-label="Parts">
              @if (lines().length) {
                <div class="pf__line pf__line--po pf__line--head" role="row">
                  <span role="columnheader">Part</span>
                  <span role="columnheader" class="pf__num">Quantity *</span>
                  <span role="columnheader" class="pf__num">₹ each *</span>
                  <span role="columnheader" class="pf__num">Amount</span>
                  <span role="columnheader" aria-label="Remove"></span>
                </div>
              }
              @for (l of lines(); track l.productId; let i = $index) {
                <div class="pf__line pf__line--po" role="row">
                  <span role="cell">
                    <b class="ar-mono">{{ l.partNumber }}</b>
                    <span class="pf__sub">{{ l.name }}</span>
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input pf__num"
                      inputmode="decimal"
                      [attr.aria-label]="'Quantity of ' + l.partNumber"
                      [value]="l.quantity"
                      (input)="patchLine(i, { quantity: $any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input pf__num"
                      inputmode="decimal"
                      [attr.aria-label]="'Cost per unit of ' + l.partNumber"
                      [value]="l.cost"
                      (input)="patchLine(i, { cost: $any($event.target).value })"
                    />
                  </span>
                  <span role="cell" class="pf__cell-value">{{ inr(lineAmount(l)) }}</span>
                  <span role="cell">
                    <button
                      type="button"
                      class="pf__x"
                      [attr.aria-label]="'Remove ' + l.partNumber"
                      (click)="removeLine(i)"
                    >
                      <ar-icon name="trash" [size]="15" />
                    </button>
                  </span>
                </div>
              } @empty {
                <p class="po-none">No parts yet. Search the catalogue below to add one.</p>
              }
            </div>

            <div class="ar-field po-find">
              <label class="ar-field__label" for="po-find">Add a part</label>
              <input
                id="po-find"
                class="ar-field__input"
                placeholder="Search the catalogue by part number or name"
                autocomplete="off"
                [value]="query()"
                (input)="find($any($event.target).value)"
              />
              @if (hits().length) {
                <ul class="pf__pick" role="listbox" aria-label="Matching parts">
                  @for (p of hits(); track p.productId) {
                    <li>
                      <button type="button" (click)="addPart(p)">
                        <b class="ar-mono">{{ p.partNumber }}</b> {{ p.name }}
                      </button>
                    </li>
                  }
                </ul>
              } @else if (query().trim().length >= 2 && !searching()) {
                <span class="ar-field__hint">No parts match "{{ query().trim() }}".</span>
              }
            </div>

            @if (lineError(); as e) {
              <span class="pf__err">{{ e }}</span>
            }

            <dl class="pf__totals" aria-label="Order total">
              <dt class="pf__grand">Order value</dt>
              <dd class="pf__grand">{{ inr(total()) }}</dd>
              <dt>GST</dt>
              <dd>added on the supplier's bill</dd>
            </dl>
          </section>

          @if (saveError(); as e) {
            <p class="pf__alert" role="alert">{{ e }}</p>
          }

          <footer class="pf__bar">
            <span class="pf__summary">
              {{ lines().length }} part(s) · <strong>{{ inr(total()) }}</strong> before GST
            </span>
            <button ar-button variant="ghost" type="button" (click)="cancel()">Cancel</button>
            <button ar-button variant="primary" type="submit" icon="check" [disabled]="busy()">
              {{ busy() ? 'Saving…' : id ? 'Save changes' : 'Save draft order' }}
            </button>
          </footer>
        </form>
      }
    </div>
  `,
  styles: [
    PURCHASE_FORM_STYLES,
    `
      .pf__line--po {
        grid-template-columns: 2.6fr 0.9fr 0.9fr 1fr 32px;
        align-items: center;
      }
      .po-none {
        margin: 0;
        padding: 0.9rem;
        border: 1px dashed var(--ar-line-300);
        border-radius: var(--ar-radius-inset);
        font: 400 13px var(--ar-font-sans);
        color: var(--ar-ink-500);
        text-align: center;
      }
      .po-find {
        max-width: 560px;
      }
      .po-suggest {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0.6rem 0.9rem;
        border: 1px solid var(--ar-amber-200);
        border-radius: var(--ar-radius-inset);
        background: var(--ar-amber-50);
        color: var(--ar-amber-800);
        font: 500 12.5px var(--ar-font-sans);
      }
      .po-suggest span {
        flex: 1;
      }
    `,
  ],
})
export class ArNewPurchaseOrderPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly origin = inject(CockpitOriginService);
  private readonly api = inject(PurchasingService);
  private readonly stockApi = inject(InventoryService);
  private readonly productsApi = inject(ProductService);
  private readonly supplierOptions = inject(SupplierOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly inr = inr;
  protected readonly canCreate = checkPolicy(
    PURCHASING_PERMISSIONS.manageInventory,
    inject(PermissionService),
  );

  private readonly scope = readSupplierScope(this.route);
  /** The draft being edited (/purchasing/orders/<id>/edit); null for a new order. */
  protected readonly id = this.route.snapshot.paramMap.get('id');
  /** The edited order's reference, once loaded. */
  protected readonly editing = signal<string | null>(null);
  protected readonly loading = signal(!!this.id && !environment.useMockData);
  protected readonly loadProblem = signal<string | null>(null);
  protected readonly supplierLocked = signal(!!this.scope);
  protected readonly supplierId = signal(this.scope?.supplierId ?? '');
  protected readonly supplierName = signal(this.scope?.name ?? '');
  protected readonly locationId = signal('');
  protected readonly expectedOn = signal('');
  protected readonly note = signal('');
  protected readonly lines = signal<DraftLine[]>([]);

  protected readonly suppliers = signal<SupplierOption[]>([]);
  protected readonly suppliersLoading = signal(true);
  protected readonly suppliersError = signal(false);
  protected readonly locations = signal<StockLocationDto[]>([]);
  private readonly suggestions = signal<ReorderSuggestionDto[]>([]);
  /** Parts below minimum, last bought from this supplier, not yet on the order. */
  protected readonly supplierSuggestions = computed(() =>
    this.suggestions().filter(
      (s) =>
        s.lastSupplierId === this.supplierId() &&
        !this.lines().some((l) => l.productId === s.productId),
    ),
  );

  protected readonly query = signal('');
  protected readonly hits = signal<PartHit[]>([]);
  protected readonly searching = signal(false);

  protected readonly submitted = signal(false);
  protected readonly total = computed(() => draftTotal(this.lines()));
  protected readonly lineError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly saveError = signal<string | null>(null);

  constructor() {
    if (!this.canCreate) return;
    this.supplierOptions
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.suppliers.set(list);
          this.suppliersLoading.set(false);
        },
        error: () => {
          this.suppliersLoading.set(false);
          this.suppliersError.set(true);
        },
      });
    if (environment.useMockData) return;
    const quiet = { skipHandleError: true };
    if (this.id) void this.loadOrder(this.id);
    this.stockApi
      .getLocations(quiet)
      .pipe(
        catchError(() => of([] as StockLocationDto[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => {
        const active = list.filter((l) => l.isActive);
        this.locations.set(active);
        if (!this.locationId() && !this.id && active[0]) this.locationId.set(active[0].id);
      });
    this.api
      .getSuggestions(quiet)
      .pipe(
        catchError(() => of([] as ReorderSuggestionDto[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => this.suggestions.set(list));
  }

  /** Edit: the draft's supplier, delivery details and lines. Only drafts can change. */
  private async loadOrder(id: string): Promise<void> {
    try {
      const o = await firstValueFrom(this.api.get(id, { skipHandleError: true }));
      if (o.state !== 'Draft') {
        this.loadProblem.set(`${o.reference} has been sent, so it can no longer be changed.`);
        return;
      }
      this.editing.set(o.reference);
      this.supplierId.set(o.supplierId);
      this.supplierName.set(o.supplierName);
      this.supplierLocked.set(false);
      this.locationId.set(o.locationId);
      this.expectedOn.set(o.expectedOn?.slice(0, 10) ?? '');
      this.note.set(o.note ?? '');
      this.lines.set(
        o.lines.map((l) => ({
          productId: l.productId,
          partNumber: l.partNumber,
          name: l.description,
          quantity: String(l.quantity),
          cost: String(l.unitCostInPaise / 100),
        })),
      );
    } catch (e: unknown) {
      this.loadProblem.set(readApiError(e, 'This order could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected pickSupplier(id: string): void {
    const s = this.suppliers().find((x) => x.id === id);
    this.supplierId.set(s?.id ?? '');
    this.supplierName.set(s?.name ?? '');
  }

  protected lineAmount(l: DraftLine): number {
    return draftTotal([l]);
  }

  protected patchLine(i: number, p: Partial<DraftLine>): void {
    this.lines.update((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  }

  protected removeLine(i: number): void {
    this.lines.update((ls) => ls.filter((_, j) => j !== i));
  }

  protected addPart(p: PartHit, quantity = '1', cost = ''): void {
    this.lines.update((ls) =>
      ls.some((l) => l.productId === p.productId) ? ls : [...ls, { ...p, quantity, cost }],
    );
    this.hits.set([]);
    this.query.set('');
    this.lineError.set(null);
  }

  protected addSuggestions(): void {
    for (const s of this.supplierSuggestions()) {
      this.addPart(
        { productId: s.productId, partNumber: s.partNumber, name: s.name },
        String(s.suggested),
        s.lastCostInPaise != null ? String(s.lastCostInPaise / 100) : '',
      );
    }
  }

  private findTimer: ReturnType<typeof setTimeout> | null = null;

  protected find(text: string): void {
    this.query.set(text);
    if (this.findTimer) clearTimeout(this.findTimer);
    if (text.trim().length < 2) {
      this.hits.set([]);
      return;
    }
    this.searching.set(true);
    this.findTimer = setTimeout(async () => {
      try {
        if (environment.useMockData) {
          this.hits.set([{ productId: 'p3', partNumber: 'OS-4410', name: 'Oil separator' }]);
          return;
        }
        const page = await firstValueFrom(
          this.productsApi.getList(
            { filter: text.trim(), activeOnly: true, maxResultCount: 10 },
            { skipHandleError: true },
          ),
        );
        if (this.query() !== text) return;
        this.hits.set(
          (page.items ?? []).map((p) => ({
            productId: p.id!,
            partNumber: p.partNumber ?? '',
            name: p.name ?? '',
          })),
        );
      } catch {
        this.hits.set([]);
      } finally {
        this.searching.set(false);
      }
    }, 250);
  }

  protected cancel(): void {
    void this.router.navigateByUrl(this.origin.returnUrl(this.listUrl()));
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.saveError.set(null);
    const read = readLines(this.lines());
    this.lineError.set('error' in read ? read.error : null);
    if (!this.supplierId() || 'error' in read) {
      this.toasts.warning(
        !this.supplierId() ? 'Pick the supplier.' : 'error' in read ? read.error : '',
      );
      return;
    }
    this.busy.set(true);
    try {
      const input = {
        supplierId: this.supplierId(),
        locationId: this.locationId() || null,
        expectedOn: this.expectedOn() || null,
        note: this.note().trim() || null,
        lines: read.lines,
      };
      const quiet = { skipHandleError: true };
      const reference = environment.useMockData
        ? `PO-2026-${String(Date.now()).slice(-4)}`
        : (
            await firstValueFrom(
              this.id ? this.api.update(this.id, input, quiet) : this.api.create(input, quiet),
            )
          ).reference;
      this.toasts.success(
        this.id
          ? `${reference} saved.`
          : `${reference} saved as a draft. Mark it sent from Purchasing once it has gone to the supplier.`,
        'Purchase order saved',
      );
      void this.router.navigateByUrl(this.origin.returnUrl(this.listUrl()));
    } catch (e: unknown) {
      const message = readApiError(e, 'The order could not be saved.');
      this.saveError.set(message);
      this.toasts.error(message, 'Not saved');
    } finally {
      this.busy.set(false);
    }
  }

  private listUrl(): string {
    return this.router
      .createUrlTree(['/purchasing'], {
        queryParams: this.scope ? supplierScopeParams(this.scope) : {},
      })
      .toString();
  }
}
