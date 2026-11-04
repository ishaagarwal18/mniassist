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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { checkPolicy } from '../../../core/auth/permission';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { readSupplierScope, supplierScopeParams } from '../../../core/util/supplier-scope';
import { CockpitOriginService } from '../../../layout/cockpit-origin.service';
import { ArTopbar } from '../../../layout/topbar';
import { InventoryService, StockLocationDto } from '../../../proxy/inventory/inventory.service';
import { PurchaseOrderDto, PurchasingService } from '../../../proxy/inventory/purchasing.service';
import {
  GoodsReceiptNoteDto,
  GoodsReceiptNoteService,
  GrnStatus,
  QcInspectionStatus,
} from '../../../proxy/purchasing';
import { ArButton, ArIcon } from '../../../ui';
import {
  ArPfSupplier,
  PURCHASE_FORM_STYLES,
  SupplierOption,
  SupplierOptionsService,
} from '../purchase-form';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import {
  GRN_UNITS,
  GrnForm,
  GrnFormErrors,
  GrnFormLine,
  blankGrnLine,
  linesFromOrder,
  localDateTime,
  shortBy,
  toCreateGrnDto,
  validateGrnForm,
} from './new-goods-receipt.logic';

/**
 * Inward gate entry (GRN) as its own page (/purchasing/grn/new), opened from Vendor 360 and the Goods receipt list. `?supplier=<id>
 * &name=` picks the supplier (from Vendor 360). Picking one of the supplier's open purchase orders fills the items with what is
 * still to come. Saved, the GRN waits for QC inspection; the page returns to the Vendor 360 it was opened from, otherwise to the
 * list with the new GRN open.
 */
@Component({
  selector: 'ar-new-goods-receipt-page',
  imports: [ArTopbar, ArButton, ArIcon, ArPfSupplier, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Inward goods receipt (GRN)"
      [subtitle]="form().supplierName || 'Record goods arriving at the gate, then send them to QC'"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (!canCreate) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="shield" [size]="20" />
          <div>
            <strong>Your role can't record goods receipts.</strong>
            <p>Ask an administrator for the "Goods receipt notes › Create" permission.</p>
          </div>
          <button ar-button variant="ghost" type="button" (click)="cancel()">Go back</button>
        </section>
      } @else {
        <form class="pf__form" novalidate (submit)="$event.preventDefault(); save()">
          <!-- 1. Supplier & order -->
          <section class="pf__card" aria-labelledby="ng-s1">
            <header class="pf__head">
              <span class="pf__step">1</span>
              <div>
                <h2 id="ng-s1">Supplier & order</h2>
                <p>Who sent the goods, and against which purchase order.</p>
              </div>
            </header>
            <div class="pf__grid">
              <ar-pf-supplier
                class="pf__span2"
                [suppliers]="suppliers()"
                [value]="form().supplierId"
                [name]="form().supplierName"
                [loading]="suppliersLoading()"
                [failed]="suppliersError()"
                [error]="err('supplier')"
                [(locked)]="supplierLocked"
                (picked)="pickSupplier($event)"
              />

              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="ng-po"
                  >Purchase order <span class="ar-field__opt">optional</span></label
                >
                @if (ordersAvailable()) {
                  <select
                    id="ng-po"
                    class="ar-field__input"
                    [disabled]="!form().supplierId"
                    (change)="pickOrder($any($event.target).value)"
                  >
                    <option value="" [selected]="!form().purchaseOrderId">
                      {{
                        !form().supplierId
                          ? 'Pick the supplier first'
                          : supplierOrders().length
                            ? 'No PO — direct receipt'
                            : 'No open purchase orders'
                      }}
                    </option>
                    @for (o of supplierOrders(); track o.id) {
                      <option [value]="o.id" [selected]="o.id === form().purchaseOrderId">
                        {{ orderLabel(o) }}
                      </option>
                    }
                  </select>
                  <span class="ar-field__hint"
                    >Picking an order fills in what is still to come.</span
                  >
                } @else {
                  <input
                    id="ng-po"
                    class="ar-field__input ar-mono"
                    placeholder="e.g. PO-2026-0091"
                    [value]="form().purchaseOrderReference"
                    (input)="patch({ purchaseOrderReference: $any($event.target).value })"
                  />
                }
              </div>

              @if (locations().length) {
                <div class="ar-field pf__span2">
                  <label class="ar-field__label" for="ng-loc"
                    >Receive into <span class="ar-field__opt">optional</span></label
                  >
                  <select
                    id="ng-loc"
                    class="ar-field__input"
                    (change)="pickLocation($any($event.target).value)"
                  >
                    <option value="" [selected]="!form().locationId">Default store</option>
                    @for (l of locations(); track l.id) {
                      <option [value]="l.id" [selected]="l.id === form().locationId">
                        {{ l.name }}
                      </option>
                    }
                  </select>
                </div>
              }
            </div>
          </section>

          <!-- 2. Gate entry -->
          <section class="pf__card" aria-labelledby="ng-s2">
            <header class="pf__head">
              <span class="pf__step">2</span>
              <div>
                <h2 id="ng-s2">Gate entry & transport</h2>
                <p>From the supplier's delivery challan and the security register.</p>
              </div>
            </header>
            <div class="pf__grid">
              <div class="ar-field">
                <label class="ar-field__label" for="ng-challan"
                  >Supplier challan no. <span class="pf__req">*</span></label
                >
                <input
                  id="ng-challan"
                  class="ar-field__input ar-mono"
                  placeholder="e.g. DC-BPG-4402"
                  [attr.aria-invalid]="!!err('challanNumber')"
                  [value]="form().challanNumber"
                  (input)="patch({ challanNumber: $any($event.target).value })"
                />
                @if (err('challanNumber'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="ng-cdate">Challan date</label>
                <input
                  id="ng-cdate"
                  type="date"
                  class="ar-field__input"
                  [value]="form().challanDate"
                  (input)="patch({ challanDate: $any($event.target).value })"
                />
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="ng-gate"
                  >Gate entry no. <span class="ar-field__opt">optional</span></label
                >
                <input
                  id="ng-gate"
                  class="ar-field__input ar-mono"
                  placeholder="e.g. GE-2026-0412"
                  [value]="form().gateEntryNumber"
                  (input)="patch({ gateEntryNumber: $any($event.target).value })"
                />
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="ng-gin">Gate-in time</label>
                <input
                  id="ng-gin"
                  type="datetime-local"
                  class="ar-field__input"
                  [value]="form().gateInTime"
                  (input)="patch({ gateInTime: $any($event.target).value })"
                />
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="ng-veh"
                  >Vehicle no. <span class="ar-field__opt">optional</span></label
                >
                <input
                  id="ng-veh"
                  class="ar-field__input ar-mono"
                  placeholder="e.g. MH 14 HG 8921"
                  [value]="form().vehicleNumber"
                  (input)="patch({ vehicleNumber: $any($event.target).value.toUpperCase() })"
                />
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="ng-trans"
                  >Transporter <span class="ar-field__opt">optional</span></label
                >
                <input
                  id="ng-trans"
                  class="ar-field__input"
                  placeholder="e.g. VRL Logistics"
                  [value]="form().transporterName"
                  (input)="patch({ transporterName: $any($event.target).value })"
                />
              </div>
              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="ng-rem"
                  >Remarks <span class="ar-field__opt">optional</span></label
                >
                <input
                  id="ng-rem"
                  class="ar-field__input"
                  placeholder="e.g. Unloaded at Bay 2, seal intact"
                  [value]="form().remarks"
                  (input)="patch({ remarks: $any($event.target).value })"
                />
              </div>
            </div>
          </section>

          <!-- 3. Items -->
          <section class="pf__card" aria-labelledby="ng-s3">
            <header class="pf__head">
              <span class="pf__step">3</span>
              <div>
                <h2 id="ng-s3">Items received</h2>
                <p>
                  Count what actually arrived. QC accepts or rejects it next; stock is posted after
                  QC.
                </p>
              </div>
            </header>

            <div class="pf__lines" role="table" aria-label="Items received">
              <div class="pf__line pf__line--grn pf__line--head" role="row">
                <span role="columnheader">Part no. *</span>
                <span role="columnheader">Description</span>
                <span role="columnheader" class="pf__num">On challan</span>
                <span role="columnheader" class="pf__num">Received *</span>
                <span role="columnheader">Unit</span>
                <span role="columnheader">Bin</span>
                <span role="columnheader">Batch / serial</span>
                <span role="columnheader" aria-label="Remove"></span>
              </div>
              @for (l of form().lines; track $index; let i = $index) {
                <div class="pf__line pf__line--grn" role="row">
                  <span role="cell">
                    <input
                      class="ar-field__input ar-mono"
                      [attr.aria-label]="'Part number, line ' + (i + 1)"
                      [attr.aria-invalid]="!!err('line.' + i + '.partNumber')"
                      [readOnly]="!!l.purchaseOrderLineId"
                      [value]="l.partNumber"
                      (input)="patchLine(i, { partNumber: $any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input"
                      [attr.aria-label]="'Description, line ' + (i + 1)"
                      [readOnly]="!!l.purchaseOrderLineId"
                      [value]="l.description"
                      (input)="patchLine(i, { description: $any($event.target).value })"
                    />
                    @if (l.orderedQuantity != null) {
                      <span class="pf__sub">Ordered {{ l.orderedQuantity }}</span>
                    }
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input pf__num"
                      type="number"
                      min="0"
                      step="any"
                      [attr.aria-label]="'Quantity on challan, line ' + (i + 1)"
                      [attr.aria-invalid]="!!err('line.' + i + '.challanQuantity')"
                      [value]="l.challanQuantity"
                      (input)="patchLine(i, { challanQuantity: +$any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input pf__num"
                      type="number"
                      min="0"
                      step="any"
                      [attr.aria-label]="'Quantity received, line ' + (i + 1)"
                      [attr.aria-invalid]="!!err('line.' + i + '.receivedQuantity')"
                      [value]="l.receivedQuantity"
                      (input)="patchLine(i, { receivedQuantity: +$any($event.target).value })"
                    />
                    @if (shortBy(l) > 0) {
                      <span class="pf__warn">Short by {{ shortBy(l) }}</span>
                    }
                  </span>
                  <span role="cell">
                    <select
                      required
                      class="ar-field__input"
                      [attr.aria-label]="'Unit, line ' + (i + 1)"
                      (change)="patchLine(i, { unitOfMeasure: $any($event.target).value })"
                    >
                      @for (u of units; track u) {
                        <option [value]="u" [selected]="u === l.unitOfMeasure">{{ u }}</option>
                      }
                    </select>
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input ar-mono"
                      placeholder="BIN-A1"
                      [attr.aria-label]="'Storage bin, line ' + (i + 1)"
                      [value]="l.storageBin"
                      (input)="patchLine(i, { storageBin: $any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input ar-mono"
                      [attr.aria-label]="'Batch or serial number, line ' + (i + 1)"
                      [value]="l.batchOrSerialNumber"
                      (input)="patchLine(i, { batchOrSerialNumber: $any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <button
                      type="button"
                      class="pf__x"
                      [attr.aria-label]="'Remove line ' + (i + 1)"
                      [disabled]="form().lines.length === 1"
                      (click)="removeLine(i)"
                    >
                      <ar-icon name="trash" [size]="15" />
                    </button>
                  </span>
                </div>
              }
            </div>
            @if (err('lines'); as e) {
              <span class="pf__err">{{ e }}</span>
            }
            <button type="button" class="pf__add" (click)="addLine()">
              <ar-icon name="plus" [size]="14" /> Add item
            </button>
          </section>

          @if (saveError(); as e) {
            <p class="pf__alert" role="alert">{{ e }}</p>
          }

          <footer class="pf__bar">
            <span class="pf__summary">
              {{ totals().lines }} item(s) · {{ totals().received }} received
              @if (totals().short > 0) {
                · <span class="pf__warn">{{ totals().short }} short of challan</span>
              }
            </span>
            <button ar-button variant="ghost" type="button" (click)="cancel()">Cancel</button>
            <button ar-button variant="primary" type="submit" icon="check" [disabled]="busy()">
              {{ busy() ? 'Saving…' : 'Save & send to QC' }}
            </button>
          </footer>
        </form>
      }
      @if (canCreate && !environmentMock) {
        <p class="pf-foot">
          Looking for an earlier receipt?
          <a routerLink="/purchasing/grn" [queryParams]="listParams()">Open Goods receipts</a>.
        </p>
      }
    </div>
  `,
  styles: [
    PURCHASE_FORM_STYLES,
    `
      .pf__line--grn {
        grid-template-columns: 1.2fr 2.2fr 0.8fr 0.9fr 0.8fr 0.9fr 1fr 32px;
      }
      .pf-foot {
        margin: 0 0 1.25rem;
        font: 400 12.5px var(--ar-font-sans);
        color: var(--ar-ink-500);
      }
      .pf-foot a {
        color: var(--ar-blue-600);
        font-weight: 600;
      }
    `,
  ],
})
export class ArNewGoodsReceiptPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly origin = inject(CockpitOriginService);
  private readonly grnApi = inject(GoodsReceiptNoteService);
  private readonly purchasingApi = inject(PurchasingService);
  private readonly supplierOptions = inject(SupplierOptionsService);
  private readonly stockApi = inject(InventoryService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly environmentMock = environment.useMockData;
  protected readonly units = GRN_UNITS;
  protected readonly shortBy = shortBy;
  protected readonly canCreate = checkPolicy(
    PURCHASING_PERMISSIONS.createGrn,
    inject(PermissionService),
  );

  /** Opened for one supplier (from Vendor 360): it is filled in and shown locked, with a way to change it. */
  private readonly scope = readSupplierScope(this.route);
  protected readonly supplierLocked = signal(!!this.scope);

  protected readonly form = signal<GrnForm>({
    supplierId: this.scope?.supplierId ?? '',
    supplierName: this.scope?.name ?? '',
    purchaseOrderId: '',
    purchaseOrderReference: '',
    locationId: '',
    locationName: '',
    challanNumber: '',
    challanDate: new Date().toISOString().slice(0, 10),
    gateEntryNumber: '',
    gateInTime: localDateTime(),
    vehicleNumber: '',
    transporterName: '',
    remarks: '',
    lines: [blankGrnLine()],
  });

  protected readonly suppliers = signal<SupplierOption[]>([]);
  protected readonly suppliersLoading = signal(true);
  protected readonly suppliersError = signal(false);
  /** Open purchase orders, when the role may read them (null: not available, so the PO is typed in). */
  private readonly orders = signal<PurchaseOrderDto[] | null>(null);
  protected readonly ordersAvailable = computed(() => this.orders() !== null);
  protected readonly supplierOrders = computed(() =>
    (this.orders() ?? []).filter((o) => o.supplierId === this.form().supplierId),
  );
  protected readonly locations = signal<StockLocationDto[]>([]);

  /** Shown once the user has tried to save, so the form doesn't open covered in red. */
  private readonly submitted = signal(false);
  protected readonly errors = computed<GrnFormErrors>(() =>
    this.submitted() ? validateGrnForm(this.form()) : {},
  );
  protected readonly busy = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly totals = computed(() => {
    const lines = this.form().lines.filter((l) => l.partNumber.trim() || l.description.trim());
    return {
      lines: lines.length,
      received: lines.reduce((s, l) => s + (l.receivedQuantity || 0), 0),
      short: lines.reduce((s, l) => s + shortBy(l), 0),
    };
  });

  /** The Goods receipt list, still on this supplier when opened for one. */
  protected readonly listParams = computed(() =>
    this.scope ? supplierScopeParams(this.scope) : {},
  );

  constructor() {
    if (this.canCreate) this.loadPickLists();
  }

  protected orderLabel(o: PurchaseOrderDto): string {
    const open = o.lines.filter((l) => l.outstanding > 0).length;
    const due = o.expectedOn ? ` · due ${new Date(o.expectedOn).toLocaleDateString('en-IN')}` : '';
    return `${o.reference} · ${open} item(s) to come${due}`;
  }

  protected err(key: string): string | null {
    return this.errors()[key] ?? null;
  }

  protected patch(p: Partial<GrnForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  protected patchLine(index: number, p: Partial<GrnFormLine>): void {
    this.form.update((f) => ({
      ...f,
      lines: f.lines.map((l, i) => (i === index ? { ...l, ...p } : l)),
    }));
  }

  protected addLine(): void {
    this.form.update((f) => ({ ...f, lines: [...f.lines, blankGrnLine()] }));
  }

  protected removeLine(index: number): void {
    this.form.update((f) =>
      f.lines.length > 1 ? { ...f, lines: f.lines.filter((_, i) => i !== index) } : f,
    );
  }

  protected pickSupplier(id: string): void {
    const s = this.suppliers().find((x) => x.id === id);
    // A new supplier drops the previous one's order and its lines.
    this.form.update((f) => ({
      ...f,
      supplierId: s?.id ?? '',
      supplierName: s?.name ?? '',
      purchaseOrderId: '',
      purchaseOrderReference: '',
      lines: f.purchaseOrderId ? [blankGrnLine()] : f.lines,
    }));
  }

  protected pickOrder(id: string): void {
    const po = this.supplierOrders().find((o) => o.id === id);
    if (!po) {
      this.patch({ purchaseOrderId: '', purchaseOrderReference: '', lines: [blankGrnLine()] });
      return;
    }
    const lines = linesFromOrder(po);
    this.patch({
      purchaseOrderId: po.id,
      purchaseOrderReference: po.reference,
      locationId: po.locationId || this.form().locationId,
      locationName: po.locationName || this.form().locationName,
      lines: lines.length ? lines : [blankGrnLine()],
    });
  }

  protected pickLocation(id: string): void {
    const l = this.locations().find((x) => x.id === id);
    this.patch({ locationId: l?.id ?? '', locationName: l?.name ?? '' });
  }

  protected cancel(): void {
    void this.router.navigateByUrl(this.origin.returnUrl(this.listUrl()));
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.saveError.set(null);
    if (Object.keys(validateGrnForm(this.form())).length) {
      this.toasts.warning('Fill in the highlighted fields.');
      return;
    }
    const dto = toCreateGrnDto(this.form());
    this.busy.set(true);
    try {
      const saved = environment.useMockData
        ? this.mockSaved()
        : await firstValueFrom(this.grnApi.create(dto, { skipHandleError: true }));
      this.toasts.success(
        `${saved.grnNumber} recorded with ${saved.lines.length} item(s). It is waiting for QC inspection.`,
        'Goods received',
      );
      void this.router.navigateByUrl(this.origin.returnUrl(this.listUrl(saved.id)));
    } catch (e: unknown) {
      const message = readApiError(e, 'The goods receipt could not be saved.');
      this.saveError.set(message);
      this.toasts.error(message, 'Not saved');
    } finally {
      this.busy.set(false);
    }
  }

  private listUrl(openId?: string): string {
    const params = { ...this.listParams(), ...(openId ? { open: openId } : {}) };
    return this.router.createUrlTree(['/purchasing/grn'], { queryParams: params }).toString();
  }

  /** Suppliers, open orders and stores. Each is optional: what the role can't read is left out. */
  private loadPickLists(): void {
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
    this.purchasingApi
      .getOrders(true, quiet)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) =>
        this.orders.set(list ? list.filter((o) => o.state !== 'Cancelled') : null),
      );
    this.stockApi
      .getLocations(quiet)
      .pipe(
        catchError(() => of([] as StockLocationDto[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => this.locations.set(list.filter((l) => l.isActive)));
  }

  private mockSaved(): GoodsReceiptNoteDto {
    const f = this.form();
    const dto = toCreateGrnDto(f);
    const id = `grn-${Date.now()}`;
    return {
      id,
      grnNumber: `GRN-2026-${String(Date.now()).slice(-4)}`,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      purchaseOrderReference: dto.purchaseOrderReference,
      challanNumber: dto.challanNumber,
      challanDateUtc: dto.challanDateUtc ?? new Date().toISOString(),
      vehicleNumber: dto.vehicleNumber,
      transporterName: dto.transporterName,
      gateEntryNumber: dto.gateEntryNumber,
      gateInTimeUtc: dto.gateInTimeUtc,
      status: GrnStatus.UnderInspection,
      qcStatus: QcInspectionStatus.Pending,
      creationTime: new Date().toISOString(),
      lines: dto.lines.map((l, i) => ({
        ...l,
        id: `${id}-${i}`,
        goodsReceiptNoteId: id,
        lineNumber: i + 1,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
      })),
    };
  }
}
