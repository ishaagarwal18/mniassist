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
import { firstValueFrom } from 'rxjs';
import { checkPolicy } from '../../../core/auth/permission';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { inr } from '../../../core/util/format';
import { readSupplierScope, supplierScopeParams } from '../../../core/util/supplier-scope';
import { CockpitOriginService } from '../../../layout/cockpit-origin.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  GoodsReceiptNoteDto,
  GoodsReceiptNoteService,
  VendorBillDto,
  VendorDebitNoteService,
} from '../../../proxy/purchasing';
import { ArButton, ArIcon, ArSelect } from '../../../ui';
import {
  ArPfSupplier,
  GST_RATES,
  PURCHASE_FORM_STYLES,
  SupplierOption,
  SupplierOptionsService,
} from '../purchase-form';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import {
  DEBIT_REASONS,
  DebitForm,
  DebitFormLine,
  blankDebitLine,
  debitLineTaxable,
  debitTotals,
  linesFromBill,
  linesFromRejections,
  toCreateDebitDto,
  validateDebitForm,
} from './new-debit-note.logic';

/**
 * Issue a vendor debit note on its own page (/purchasing/debit-notes/new). `?supplier=<id>&name=` picks the supplier (from Vendor
 * 360); `?grn=<id>` debits that goods receipt's rejections (from the GRN list). Picking a goods receipt fills its rejected items,
 * priced from the linked bill; picking a bill alone offers its lines. Saved, it returns to where it was opened from, otherwise to
 * the debit notes list with the new note open.
 */
@Component({
  selector: 'ar-new-debit-note-page',
  imports: [ArTopbar, ArButton, ArIcon, ArPfSupplier, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Issue debit note"
      [subtitle]="
        form().supplierName || 'Debit a supplier for rejections, short supply or rate differences'
      "
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (!canCreate) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="shield" [size]="20" />
          <div>
            <strong>Your role can't issue debit notes.</strong>
            <p>Ask an administrator for the "Vendor debit notes › Create" permission.</p>
          </div>
          <button ar-button variant="ghost" type="button" (click)="cancel()">Go back</button>
        </section>
      } @else {
        <form class="pf__form" novalidate (submit)="$event.preventDefault(); save()">
          <section class="pf__card" aria-labelledby="dn-s1">
            <header class="pf__head">
              <span class="pf__step">1</span>
              <div>
                <h2 id="dn-s1">Supplier & reference</h2>
                <p>Which bill or goods receipt the debit is against.</p>
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
                <label class="ar-field__label" for="dn-supply">Supply type</label>
                <select
                  id="dn-supply"
                  class="ar-field__input"
                  (change)="patch({ isInterState: $any($event.target).value === 'inter' })"
                >
                  <option value="intra" [selected]="!form().isInterState">
                    Same state · CGST + SGST
                  </option>
                  <option value="inter" [selected]="form().isInterState">Other state · IGST</option>
                </select>
              </div>

              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="dn-bill"
                  >Vendor bill <span class="ar-field__opt">optional</span></label
                >
                @if (bills() !== null) {
                  <select
                    id="dn-bill"
                    class="ar-field__input"
                    [disabled]="!form().supplierId"
                    (change)="pickBill($any($event.target).value)"
                  >
                    <option value="" [selected]="!form().vendorBillId">
                      {{ !form().supplierId ? 'Pick the supplier first' : 'Not against a bill' }}
                    </option>
                    @for (b of bills(); track b.id) {
                      <option [value]="b.id" [selected]="b.id === form().vendorBillId">
                        {{ b.billNumber }} · inv {{ b.vendorInvoiceNumber }} ·
                        {{ inr(b.grandTotalInPaise) }}
                      </option>
                    }
                  </select>
                } @else {
                  <input
                    id="dn-bill"
                    class="ar-field__input ar-mono"
                    placeholder="e.g. BILL-2026-0089"
                    [value]="form().vendorBillNumber"
                    (input)="patch({ vendorBillNumber: $any($event.target).value })"
                  />
                }
              </div>
              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="dn-grn"
                  >Goods receipt (GRN) <span class="ar-field__opt">optional</span></label
                >
                @if (receipts() !== null) {
                  <select
                    id="dn-grn"
                    class="ar-field__input"
                    [disabled]="!form().supplierId"
                    (change)="pickReceipt($any($event.target).value)"
                  >
                    <option value="" [selected]="!form().goodsReceiptNoteId">
                      {{ !form().supplierId ? 'Pick the supplier first' : 'Not against a receipt' }}
                    </option>
                    @for (g of receipts(); track g.id) {
                      <option [value]="g.id" [selected]="g.id === form().goodsReceiptNoteId">
                        {{ g.grnNumber }} · challan {{ g.challanNumber
                        }}{{ rejected(g) ? ' · ' + rejected(g) + ' rejected' : '' }}
                      </option>
                    }
                  </select>
                  <span class="ar-field__hint"
                    >A receipt with rejections fills in what was rejected.</span
                  >
                } @else {
                  <input
                    id="dn-grn"
                    class="ar-field__input ar-mono"
                    placeholder="e.g. GRN-2026-0103"
                    [value]="form().goodsReceiptNoteNumber"
                    (input)="patch({ goodsReceiptNoteNumber: $any($event.target).value })"
                  />
                }
              </div>

              <div class="ar-field pf__span4">
                <label class="ar-field__label" for="dn-reason"
                  >Reason <span class="pf__req">*</span></label
                >
                <div class="pf__chips" role="group" aria-label="Common reasons">
                  @for (r of reasons; track r) {
                    <button type="button" class="pf__chip" (click)="useReason(r)">{{ r }}</button>
                  }
                </div>
                <input
                  id="dn-reason"
                  class="ar-field__input"
                  placeholder="e.g. QC rejection: 15 bolts failed the pitch gauge"
                  [attr.aria-invalid]="!!err('reason')"
                  [value]="form().reason"
                  (input)="patch({ reason: $any($event.target).value })"
                />
                @if (err('reason'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="dn-s2">
            <header class="pf__head">
              <span class="pf__step">2</span>
              <div>
                <h2 id="dn-s2">Items to debit</h2>
                <p>Quantities and rates being claimed back, before GST.</p>
              </div>
            </header>
            <div class="pf__lines" role="table" aria-label="Items to debit">
              <div class="pf__line pf__line--debit pf__line--head" role="row">
                <span role="columnheader">Part no.</span>
                <span role="columnheader">Description</span>
                <span role="columnheader" class="pf__num">Qty *</span>
                <span role="columnheader" class="pf__num">Rate ₹ *</span>
                <span role="columnheader">GST</span>
                <span role="columnheader" class="pf__num">Taxable</span>
                <span role="columnheader" aria-label="Remove"></span>
              </div>
              @for (l of form().lines; track $index; let i = $index) {
                <div class="pf__line pf__line--debit" role="row">
                  <span role="cell">
                    <input
                      class="ar-field__input ar-mono"
                      [attr.aria-label]="'Part number, line ' + (i + 1)"
                      [value]="l.partNumber"
                      (input)="patchLine(i, { partNumber: $any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input"
                      [attr.aria-label]="'Description, line ' + (i + 1)"
                      [value]="l.description"
                      (input)="patchLine(i, { description: $any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input pf__num"
                      type="number"
                      min="0"
                      step="any"
                      [attr.aria-label]="'Quantity, line ' + (i + 1)"
                      [attr.aria-invalid]="!!err('line.' + i + '.quantity')"
                      [value]="l.quantity"
                      (input)="patchLine(i, { quantity: +$any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input pf__num"
                      type="number"
                      min="0"
                      step="0.01"
                      [attr.aria-label]="'Rate in rupees, line ' + (i + 1)"
                      [attr.aria-invalid]="!!err('line.' + i + '.rate')"
                      [value]="l.rate || ''"
                      (input)="patchLine(i, { rate: +$any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <select
                      required
                      class="ar-field__input"
                      [attr.aria-label]="'GST rate, line ' + (i + 1)"
                      (change)="patchLine(i, { taxRateBasisPoints: +$any($event.target).value })"
                    >
                      @for (r of gstRates; track r.bps) {
                        <option [value]="r.bps" [selected]="r.bps === l.taxRateBasisPoints">
                          {{ r.label }}
                        </option>
                      }
                    </select>
                  </span>
                  <span role="cell" class="pf__cell-value">{{ inr(lineTaxable(l)) }}</span>
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

            <dl class="pf__totals" aria-label="Debit note totals">
              <dt>Taxable value</dt>
              <dd>{{ inr(totals().taxable) }}</dd>
              @if (form().isInterState) {
                <dt>IGST</dt>
                <dd>{{ inr(totals().igst) }}</dd>
              } @else {
                <dt>CGST</dt>
                <dd>{{ inr(totals().cgst) }}</dd>
                <dt>SGST</dt>
                <dd>{{ inr(totals().sgst) }}</dd>
              }
              <dt class="pf__grand">Debit total</dt>
              <dd class="pf__grand">{{ inr(totals().grand) }}</dd>
            </dl>

            <div class="ar-field">
              <label class="ar-field__label" for="dn-rem"
                >Remarks <span class="ar-field__opt">optional</span></label
              >
              <input
                id="dn-rem"
                class="ar-field__input"
                placeholder="e.g. Material kept at the rejection bay for collection"
                [value]="form().remarks"
                (input)="patch({ remarks: $any($event.target).value })"
              />
            </div>
          </section>

          @if (saveError(); as e) {
            <p class="pf__alert" role="alert">{{ e }}</p>
          }

          <footer class="pf__bar">
            <span class="pf__summary">
              {{ itemCount() }} item(s) · debit <strong>{{ inr(totals().grand) }}</strong>
            </span>
            <button ar-button variant="ghost" type="button" (click)="cancel()">Cancel</button>
            <button ar-button variant="primary" type="submit" icon="check" [disabled]="busy()">
              {{ busy() ? 'Saving…' : 'Save debit note' }}
            </button>
          </footer>
        </form>
      }
    </div>
  `,
  styles: [
    PURCHASE_FORM_STYLES,
    `
      .pf__line--debit {
        grid-template-columns: 1.1fr 2.4fr 0.7fr 0.9fr 0.7fr 0.9fr 32px;
      }
    `,
  ],
})
export class ArNewDebitNotePage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly origin = inject(CockpitOriginService);
  private readonly debitApi = inject(VendorDebitNoteService);
  private readonly grnApi = inject(GoodsReceiptNoteService);
  private readonly supplierOptions = inject(SupplierOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly inr = inr;
  protected readonly lineTaxable = debitLineTaxable;
  protected readonly gstRates = GST_RATES;
  protected readonly reasons = DEBIT_REASONS;
  protected readonly canCreate = checkPolicy(
    PURCHASING_PERMISSIONS.createDebitNote,
    inject(PermissionService),
  );

  private readonly scope = readSupplierScope(this.route);
  /** `?grn=<id>`: debit that goods receipt's rejections (from the GRN list). */
  private readonly grnRequest = this.route.snapshot.queryParamMap.get('grn');
  protected readonly supplierLocked = signal(!!this.scope);

  protected readonly form = signal<DebitForm>({
    supplierId: this.scope?.supplierId ?? '',
    supplierName: this.scope?.name ?? '',
    vendorBillId: '',
    vendorBillNumber: '',
    goodsReceiptNoteId: '',
    goodsReceiptNoteNumber: '',
    reason: '',
    isInterState: false,
    remarks: '',
    lines: [blankDebitLine()],
  });

  protected readonly suppliers = signal<SupplierOption[]>([]);
  protected readonly suppliersLoading = signal(true);
  protected readonly suppliersError = signal(false);
  /** The supplier's bills and receipts; null when the role can't read them (the number is typed in). */
  protected readonly bills = signal<VendorBillDto[] | null>([]);
  protected readonly receipts = signal<GoodsReceiptNoteDto[] | null>([]);

  private readonly submitted = signal(false);
  protected readonly errors = computed(() =>
    this.submitted() ? validateDebitForm(this.form()) : {},
  );
  protected readonly totals = computed(() => debitTotals(this.form()));
  protected readonly itemCount = computed(
    () => this.form().lines.filter((l) => l.partNumber.trim() || l.description.trim()).length,
  );
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
    if (this.grnRequest) void this.debitReceipt(this.grnRequest);
  }

  protected err(key: string): string | null {
    return this.errors()[key] ?? null;
  }

  protected rejected(g: GoodsReceiptNoteDto): number {
    return g.lines.reduce((s, l) => s + l.rejectedQuantity, 0);
  }

  protected patch(p: Partial<DebitForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  protected patchLine(index: number, p: Partial<DebitFormLine>): void {
    this.form.update((f) => ({
      ...f,
      lines: f.lines.map((l, i) => (i === index ? { ...l, ...p } : l)),
    }));
  }

  protected addLine(): void {
    this.form.update((f) => ({ ...f, lines: [...f.lines, blankDebitLine()] }));
  }

  protected removeLine(index: number): void {
    this.form.update((f) =>
      f.lines.length > 1 ? { ...f, lines: f.lines.filter((_, i) => i !== index) } : f,
    );
  }

  /** A reason chip starts the reason, keeping any detail already typed after it. */
  protected useReason(r: string): void {
    const current = this.form().reason.trim();
    const detail = current.includes(':') ? current.slice(current.indexOf(':') + 1).trim() : '';
    this.patch({ reason: detail ? `${r}: ${detail}` : `${r}: ` });
    document.getElementById('dn-reason')?.focus();
  }

  protected pickSupplier(id: string): void {
    const s = this.suppliers().find((x) => x.id === id);
    this.form.update((f) => ({
      ...f,
      supplierId: s?.id ?? '',
      supplierName: s?.name ?? '',
      vendorBillId: '',
      vendorBillNumber: '',
      goodsReceiptNoteId: '',
      goodsReceiptNoteNumber: '',
    }));
  }

  protected pickBill(id: string): void {
    const b = this.bills()?.find((x) => x.id === id);
    if (!b) {
      this.patch({ vendorBillId: '', vendorBillNumber: '' });
      return;
    }
    const untouched = this.itemCount() === 0;
    this.patch({
      vendorBillId: b.id ?? '',
      vendorBillNumber: b.billNumber,
      isInterState: b.igstInPaise > 0,
      // A bill's lines only when nothing is entered yet and no receipt supplies the rejections.
      ...(untouched && !this.form().goodsReceiptNoteId ? { lines: linesFromBill(b) } : {}),
    });
    const g = this.receipts()?.find((x) => x.id === this.form().goodsReceiptNoteId);
    if (g) this.applyReceipt(g);
  }

  protected pickReceipt(id: string): void {
    const g = this.receipts()?.find((x) => x.id === id);
    if (g) this.applyReceipt(g);
    else this.patch({ goodsReceiptNoteId: '', goodsReceiptNoteNumber: '' });
  }

  private applyReceipt(g: GoodsReceiptNoteDto): void {
    const bill =
      this.bills()?.find((b) => b.id === this.form().vendorBillId) ??
      this.bills()?.find((b) => b.goodsReceiptNoteId === g.id) ??
      null;
    const lines = linesFromRejections(g, bill);
    this.patch({
      goodsReceiptNoteId: g.id ?? '',
      goodsReceiptNoteNumber: g.grnNumber,
      ...(bill
        ? {
            vendorBillId: bill.id ?? '',
            vendorBillNumber: bill.billNumber,
            isInterState: bill.igstInPaise > 0,
          }
        : {}),
      ...(lines.length ? { lines } : {}),
      ...(lines.length && !this.form().reason.trim()
        ? { reason: `QC rejection: ${g.grnNumber}` }
        : {}),
    });
  }

  /** `?grn=` from the GRN list: that receipt's supplier and rejections. */
  private async debitReceipt(id: string): Promise<void> {
    try {
      const g = await firstValueFrom(this.grnApi.get(id, { skipHandleError: true }));
      this.patch({ supplierId: g.supplierId, supplierName: g.supplierName });
      this.supplierLocked.set(true);
      // The supplier's bills load with the supplier; the receipt is applied on its own meanwhile.
      this.applyReceipt(g);
    } catch {
      this.toasts.warning('That goods receipt could not be loaded. Pick it below instead.');
    }
  }

  protected cancel(): void {
    void this.router.navigateByUrl(this.origin.returnUrl(this.listUrl()));
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.saveError.set(null);
    if (Object.keys(validateDebitForm(this.form())).length) {
      this.toasts.warning('Fill in the highlighted fields.');
      return;
    }
    const dto = toCreateDebitDto(this.form());
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(this.debitApi.create(dto, { skipHandleError: true }));
      this.toasts.success(
        `${saved.debitNoteNumber} for ${inr(saved.grandTotalInPaise)} saved as a draft. Issue it from Debit notes.`,
        'Debit note saved',
      );
      void this.router.navigateByUrl(this.origin.returnUrl(this.listUrl(saved.id)));
    } catch (e: unknown) {
      const message = readApiError(e, 'The debit note could not be saved.');
      this.saveError.set(message);
      this.toasts.error(message, 'Not saved');
    } finally {
      this.busy.set(false);
    }
  }

  private listUrl(openId?: string): string {
    const params = {
      ...(this.scope ? supplierScopeParams(this.scope) : {}),
      ...(openId ? { open: openId } : {}),
    };
    return this.router
      .createUrlTree(['/purchasing/debit-notes'], { queryParams: params })
      .toString();
  }
}
