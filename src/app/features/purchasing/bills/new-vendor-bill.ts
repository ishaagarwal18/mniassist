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
import { checkPolicy } from '../../../core/auth/permission';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { inr } from '../../../core/util/format';
import { readSupplierScope, supplierScopeParams } from '../../../core/util/supplier-scope';
import { CockpitOriginService } from '../../../layout/cockpit-origin.service';
import { ArTopbar } from '../../../layout/topbar';
import { PurchasingService } from '../../../proxy/inventory/purchasing.service';
import {
  GoodsReceiptNoteDto,
  GoodsReceiptNoteService,
  VendorBillService,
} from '../../../proxy/purchasing';
import { VendorBillReaderService } from '../../../proxy/purchasing';
import { ArButton, ArDialog, ArIcon, ArDateInput, ArSelect } from '../../../ui';
import { ArCatalogueItem } from '../../sales/catalogue-item';
import { ProductDto, ProductService } from '../../../proxy/library/product.service';
import {
  ArPfSupplier,
  gstRateOptions,
  PURCHASE_FORM_STYLES,
  SupplierOption,
  SupplierOptionsService,
  isoDay,
} from '../purchase-form';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import {
  BillForm,
  BillFormLine,
  TDS_OPTIONS,
  billTotals,
  billUploadProblem,
  blankBillLine,
  formFromReading,
  lineTaxable,
  linesFromReceipt,
  toCreateBillDto,
  validateBillForm,
} from './new-vendor-bill.logic';
import { PickListStore } from '../../../core/pick-lists/pick-list.store';

/**
 * Record a vendor bill (purchase invoice) on its own page (/purchasing/bills/new). `?supplier=<id>&name=` picks the supplier (from
 * Vendor 360); `?grn=<id>` bills that goods receipt (from the GRN list). Picking one of the supplier's goods receipts fills the
 * accepted items, with rates from the purchase order, so the API can match PO, GRN and bill. Saved, it returns to where it was
 * opened from, otherwise to the bills list with the new bill open.
 */
@Component({
  selector: 'ar-new-vendor-bill-page',
  imports: [
    ArTopbar,
    ArButton,
    ArIcon,
    ArPfSupplier,
    ArDateInput,
    ArSelect,
    ArDialog,
    ArCatalogueItem,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Record vendor bill"
      [subtitle]="form().supplierName || 'Enter a supplier invoice for 3-way matching and payment'"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (!canCreate) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="shield" [size]="20" />
          <div>
            <strong>Your role can't record vendor bills.</strong>
            <p>Ask an administrator for the "Vendor bills › Create" permission.</p>
          </div>
          <button ar-button variant="ghost" type="button" (click)="cancel()">Go back</button>
        </section>
      } @else {
        <form class="pf__form" novalidate (submit)="$event.preventDefault(); save()">
          <!-- Read the bill from a PDF or photo -->
          <section
            class="pf__card vb-up"
            [class.vb-up--over]="dragOver()"
            [class.vb-up--focus]="uploadFirst"
            aria-labelledby="vb-up"
            (dragover)="$event.preventDefault(); dragOver.set(true)"
            (dragleave)="dragOver.set(false)"
            (drop)="onDrop($event)"
          >
            <div class="vb-up__row">
              <ar-icon name="upload" [size]="22" />
              <div class="vb-up__text">
                <h2 id="vb-up">Upload the bill</h2>
                @if (reading()) {
                  <p>Reading {{ uploadName() }}… this takes a few seconds.</p>
                } @else if (uploadName()) {
                  <p>
                    Filled in from <strong>{{ uploadName() }}</strong
                    >. Check every field against the bill before saving.
                    @if (uploadUrl(); as u) {
                      <a [href]="u" target="_blank" rel="noopener">Open the file</a>
                    }
                  </p>
                } @else {
                  <p>
                    Drop a PDF or photo of the supplier's invoice here, or choose a file. The AI
                    reads it and fills in this form for you to check.
                  </p>
                }
              </div>
              <input
                #billFile
                type="file"
                class="vb-up__input"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                (change)="onFile($any($event.target).files?.[0]); billFile.value = ''"
              />
              <button
                ar-button
                type="button"
                [variant]="uploadName() ? 'ghost' : 'ai'"
                icon="sparkle"
                [disabled]="reading()"
                (click)="billFile.click()"
              >
                {{ reading() ? 'Reading…' : uploadName() ? 'Upload another' : 'Choose file' }}
              </button>
            </div>
            @if (uploadError(); as e) {
              <p class="pf__err" role="alert">{{ e }}</p>
            }
            @if (readWarnings().length) {
              <ul class="vb-up__warn" role="status">
                @for (w of readWarnings(); track w) {
                  <li>{{ w }}</li>
                }
              </ul>
            }
          </section>

          <section class="pf__card" aria-labelledby="vb-s1">
            <header class="pf__head">
              <span class="pf__step">1</span>
              <div>
                <h2 id="vb-s1">Supplier & invoice</h2>
                <p>As printed on the supplier's tax invoice.</p>
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
              <div class="ar-field">
                <label class="ar-field__label" for="vb-gstin"
                  >Supplier GSTIN <span class="ar-field__opt">optional</span></label
                >
                <input
                  id="vb-gstin"
                  class="ar-field__input ar-mono"
                  maxlength="15"
                  placeholder="27AABCB1234F1Z5"
                  [attr.aria-invalid]="!!err('supplierGstin')"
                  [value]="form().supplierGstin"
                  (input)="patch({ supplierGstin: $any($event.target).value.toUpperCase() })"
                />
                @if (err('supplierGstin'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="vb-supply">Supply type</label>
                <select
                  id="vb-supply"
                  class="ar-field__input"
                  (change)="patch({ isInterState: $any($event.target).value === 'inter' })"
                >
                  <option value="intra" [selected]="!form().isInterState">
                    Same state · CGST + SGST
                  </option>
                  <option value="inter" [selected]="form().isInterState">Other state · IGST</option>
                </select>
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="vb-inv"
                  >Supplier invoice no. <span class="pf__req">*</span></label
                >
                <input
                  id="vb-inv"
                  class="ar-field__input ar-mono"
                  placeholder="e.g. INV-BPG-8912"
                  [attr.aria-invalid]="!!err('vendorInvoiceNumber')"
                  [value]="form().vendorInvoiceNumber"
                  (input)="patch({ vendorInvoiceNumber: $any($event.target).value })"
                />
                @if (err('vendorInvoiceNumber'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="vb-date"
                  >Invoice date <span class="pf__req">*</span></label
                >
                <input
                  id="vb-date"
                  type="date"
                  class="ar-field__input"
                  [attr.aria-invalid]="!!err('invoiceDate')"
                  [value]="form().invoiceDate"
                  (input)="patch({ invoiceDate: $any($event.target).value })"
                />
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="vb-due"
                  >Due date <span class="pf__req">*</span></label
                >
                <input
                  id="vb-due"
                  type="date"
                  class="ar-field__input"
                  [attr.aria-invalid]="!!err('dueDate')"
                  [value]="form().dueDate"
                  (input)="patch({ dueDate: $any($event.target).value })"
                />
                @if (err('dueDate'); as e) {
                  <span class="pf__err">{{ e }}</span>
                } @else {
                  <span class="ar-field__hint">MSME suppliers: within 45 days.</span>
                }
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="vb-tds">TDS</label>
                <select
                  id="vb-tds"
                  class="ar-field__input"
                  (change)="patch({ tds: $any($event.target).value })"
                >
                  @for (t of tdsOptions; track t.key) {
                    <option [value]="t.key" [selected]="t.key === form().tds">{{ t.label }}</option>
                  }
                </select>
              </div>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="vb-s2">
            <header class="pf__head">
              <span class="pf__step">2</span>
              <div>
                <h2 id="vb-s2">Goods receipt & order</h2>
                <p>
                  Link the goods receipt so the bill is matched against what was ordered and
                  accepted.
                </p>
              </div>
            </header>
            <div class="pf__grid">
              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="vb-grn"
                  >Goods receipt (GRN) <span class="ar-field__opt">optional</span></label
                >
                @if (receipts() !== null) {
                  <select
                    id="vb-grn"
                    class="ar-field__input"
                    [disabled]="!form().supplierId"
                    (change)="pickReceipt($any($event.target).value)"
                  >
                    <option value="" [selected]="!form().goodsReceiptNoteId">
                      {{
                        !form().supplierId
                          ? 'Pick the supplier first'
                          : receipts()!.length
                            ? 'No GRN — bill without a receipt'
                            : 'No goods receipts to bill'
                      }}
                    </option>
                    @for (g of receipts(); track g.id) {
                      <option [value]="g.id" [selected]="g.id === form().goodsReceiptNoteId">
                        {{ g.grnNumber }} · challan {{ g.challanNumber
                        }}{{ g.purchaseOrderReference ? ' · ' + g.purchaseOrderReference : '' }}
                      </option>
                    }
                  </select>
                  <span class="ar-field__hint">Picking a receipt fills in its accepted items.</span>
                } @else {
                  <input
                    id="vb-grn"
                    class="ar-field__input ar-mono"
                    placeholder="e.g. GRN-2026-0104"
                    [value]="form().goodsReceiptNoteNumber"
                    (input)="patch({ goodsReceiptNoteNumber: $any($event.target).value })"
                  />
                }
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="vb-po"
                  >Purchase order <span class="ar-field__opt">optional</span></label
                >
                <input
                  id="vb-po"
                  class="ar-field__input ar-mono"
                  placeholder="e.g. PO-2026-0089"
                  [readOnly]="!!form().purchaseOrderId"
                  [value]="form().purchaseOrderReference"
                  (input)="patch({ purchaseOrderReference: $any($event.target).value })"
                />
              </div>
              <label class="ar-field pf-check">
                <input
                  type="checkbox"
                  [checked]="form().isReverseCharge"
                  (change)="patch({ isReverseCharge: $any($event.target).checked })"
                />
                <span>Reverse charge (we pay the GST)</span>
              </label>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="vb-s3">
            <header class="pf__head">
              <span class="pf__step">3</span>
              <div>
                <h2 id="vb-s3">Billed items</h2>
                <p>
                  Rates before GST. Differences from the order show up as a 3-way match variance.
                </p>
              </div>
            </header>
            <div class="pf__lines" role="table" aria-label="Billed items">
              <div class="pf__line pf__line--bill pf__line--head" role="row">
                <span role="columnheader">Part name</span>
                <span role="columnheader">Part no.</span>
                <span role="columnheader">Description</span>
                <span role="columnheader">HSN</span>
                <span role="columnheader" class="pf__num">Qty *</span>
                <span role="columnheader" class="pf__num">Rate ₹ *</span>
                <span role="columnheader" class="pf__num">Disc %</span>
                <span role="columnheader">GST</span>
                <span role="columnheader" class="pf__num">Taxable</span>
                <span role="columnheader" aria-label="Remove"></span>
              </div>
              @for (l of form().lines; track $index; let i = $index) {
                <div class="pf__line pf__line--bill" role="row">
                  <span role="cell">
                    <ar-catalogue-item
                      placeholder="Search or add an item"
                      [value]="l.partName ?? ''"
                      [allowCreate]="canAddItem"
                      (typed)="patchLine(i, { partName: $event, productId: undefined })"
                      (picked)="pickItem(i, $event)"
                      (createNew)="openNewItem(i, $event)"
                    />
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input ar-mono"
                      [attr.aria-label]="'Part number, line ' + (i + 1)"
                      [attr.aria-invalid]="!!err('line.' + i + '.partNumber')"
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
                      class="ar-field__input ar-mono"
                      inputmode="numeric"
                      maxlength="8"
                      [attr.aria-label]="'HSN code, line ' + (i + 1)"
                      [attr.aria-invalid]="!!err('line.' + i + '.hsnCode')"
                      [value]="l.hsnCode"
                      (input)="patchLine(i, { hsnCode: $any($event.target).value })"
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
                    <input
                      class="ar-field__input pf__num"
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      [attr.aria-label]="'Discount percent, line ' + (i + 1)"
                      [value]="l.discountPercent"
                      (input)="patchLine(i, { discountPercent: +$any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <select
                      required
                      class="ar-field__input"
                      [attr.aria-label]="'GST rate, line ' + (i + 1)"
                      (change)="patchLine(i, { taxRateBasisPoints: +$any($event.target).value })"
                    >
                      @for (r of gstRates(); track r.bps) {
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
            @if (newItem(); as n) {
              <ar-dialog title="New catalogue item" (dismiss)="newItem.set(null)">
                <p class="vb-new__note">
                  Saved to your item catalogue, so you can pick it on later bills, orders and
                  quotations.
                </p>
                <label class="ar-field">
                  <span class="ar-field__label">Part name *</span>
                  <input
                    class="ar-field__input"
                    maxlength="256"
                    [value]="n.name"
                    (input)="patchNewItem({ name: $any($event.target).value })"
                  />
                </label>
                <label class="ar-field">
                  <span class="ar-field__label">Part number *</span>
                  <input
                    class="ar-field__input ar-mono"
                    maxlength="64"
                    placeholder="Maker's part / catalogue number"
                    [value]="n.partNumber"
                    (input)="patchNewItem({ partNumber: $any($event.target).value })"
                  />
                </label>
                <div class="vb-new__row">
                  <label class="ar-field">
                    <span class="ar-field__label"
                      >HSN <span class="ar-field__opt">(optional)</span></span
                    >
                    <input
                      class="ar-field__input ar-mono"
                      inputmode="numeric"
                      maxlength="8"
                      [value]="n.hsnCode"
                      (input)="patchNewItem({ hsnCode: $any($event.target).value })"
                    />
                  </label>
                  <label class="ar-field">
                    <span class="ar-field__label">GST</span>
                    <select
                      class="ar-field__input"
                      (change)="patchNewItem({ taxRateBasisPoints: +$any($event.target).value })"
                    >
                      @for (r of gstRates(); track r.bps) {
                        <option [value]="r.bps" [selected]="r.bps === n.taxRateBasisPoints">
                          {{ r.label }}
                        </option>
                      }
                    </select>
                  </label>
                </div>
                <div class="vb-new__row">
                  <label class="ar-field">
                    <span class="ar-field__label"
                      >Purchase rate ₹ <span class="ar-field__opt">(optional)</span></span
                    >
                    <input
                      class="ar-field__input"
                      type="number"
                      min="0"
                      step="0.01"
                      [value]="n.purchaseRate || ''"
                      (input)="patchNewItem({ purchaseRate: +$any($event.target).value })"
                    />
                  </label>
                  <label class="ar-field">
                    <span class="ar-field__label"
                      >Selling price ₹ <span class="ar-field__opt">(optional)</span></span
                    >
                    <input
                      class="ar-field__input"
                      type="number"
                      min="0"
                      step="0.01"
                      [value]="n.salePrice || ''"
                      (input)="patchNewItem({ salePrice: +$any($event.target).value })"
                    />
                  </label>
                </div>
                <div dialogActions>
                  <button ar-button type="button" variant="ghost" (click)="newItem.set(null)">
                    Cancel
                  </button>
                  <button
                    ar-button
                    type="button"
                    variant="primary"
                    [disabled]="savingItem()"
                    (click)="saveNewItem()"
                  >
                    {{ savingItem() ? 'Adding…' : 'Add item' }}
                  </button>
                </div>
              </ar-dialog>
            }

            <dl class="pf__totals" aria-label="Bill totals">
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
              <dt class="pf__grand">Invoice total</dt>
              <dd class="pf__grand">{{ inr(totals().grand) }}</dd>
              @if (totals().tds > 0) {
                <dt>Less TDS</dt>
                <dd>− {{ inr(totals().tds) }}</dd>
                <dt class="pf__grand">Net payable</dt>
                <dd class="pf__grand">{{ inr(totals().net) }}</dd>
              }
            </dl>

            <div class="ar-field">
              <label class="ar-field__label" for="vb-rem"
                >Remarks <span class="ar-field__opt">optional</span></label
              >
              <input
                id="vb-rem"
                class="ar-field__input"
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
              {{ itemCount() }} item(s) · net payable <strong>{{ inr(totals().net) }}</strong>
            </span>
            <button ar-button variant="ghost" type="button" (click)="cancel()">Cancel</button>
            <button ar-button variant="primary" type="submit" icon="check" [disabled]="busy()">
              {{ busy() ? 'Saving…' : 'Save bill' }}
            </button>
          </footer>
        </form>
      }
    </div>
  `,
  styles: [
    PURCHASE_FORM_STYLES,
    `
      .pf__line--bill {
        grid-template-columns: 1.6fr 1fr 1.6fr 0.8fr 0.6fr 0.8fr 0.6fr 0.7fr 0.8fr 32px;
      }
      .vb-new__note {
        margin: 0 0 12px;
        font: 400 12.5px var(--ar-font-sans);
        color: var(--ar-ink-500);
      }
      .vb-new__row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 12px;
      }
      .vb-up {
        border-style: dashed;
        border-color: var(--ar-ai-200, var(--ar-line-300));
        background: var(--ar-ai-100, var(--ar-bg-50));
        transition:
          border-color var(--ar-ease),
          background var(--ar-ease);
      }
      .vb-up--focus {
        border-width: 2px;
      }
      .vb-up--over {
        border-color: var(--ar-ai-500, var(--ar-blue-500));
        background: var(--ar-white);
      }
      .vb-up__row {
        display: flex;
        align-items: center;
        gap: 14px;
        color: var(--ar-ai-700, var(--ar-blue-700));
      }
      .vb-up__text {
        flex: 1;
        min-width: 0;
      }
      .vb-up__text h2 {
        margin: 0;
        font: 600 14px var(--ar-font-sans);
        color: var(--ar-ink-900);
      }
      .vb-up__text p {
        margin: 2px 0 0;
        font: 400 12.5px var(--ar-font-sans);
        color: var(--ar-ink-600);
      }
      .vb-up__text a {
        margin-left: 6px;
        font-weight: 600;
      }
      .vb-up__input {
        display: none;
      }
      .vb-up__warn {
        margin: 0;
        padding: 0.6rem 0.9rem 0.6rem 1.8rem;
        border-radius: var(--ar-radius-inset);
        border: 1px solid var(--ar-amber-200);
        background: var(--ar-amber-50);
        color: var(--ar-amber-800);
        font: 500 12.5px var(--ar-font-sans);
      }
      .pf-check {
        flex-direction: row;
        align-items: center;
        gap: 8px;
        align-self: end;
        height: 36px;
        font: 400 13px var(--ar-font-sans);
        color: var(--ar-ink-700);
      }
    `,
  ],
})
export class ArNewVendorBillPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly origin = inject(CockpitOriginService);
  private readonly billApi = inject(VendorBillService);
  private readonly readerApi = inject(VendorBillReaderService);
  private readonly grnApi = inject(GoodsReceiptNoteService);
  private readonly purchasingApi = inject(PurchasingService);
  private readonly supplierOptions = inject(SupplierOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly inr = inr;
  protected readonly lineTaxable = lineTaxable;
  private readonly pickLists = inject(PickListStore);
  protected readonly gstRates = computed(() => gstRateOptions(this.pickLists));
  protected readonly tdsOptions = TDS_OPTIONS;
  protected readonly canCreate = checkPolicy(
    PURCHASING_PERMISSIONS.createBill,
    inject(PermissionService),
  );

  private readonly scope = readSupplierScope(this.route);
  /** `?grn=<id>`: bill this goods receipt (from the GRN list's "Convert to bill"). */
  private readonly grnRequest = this.route.snapshot.queryParamMap.get('grn');
  protected readonly supplierLocked = signal(!!this.scope);

  protected readonly form = signal<BillForm>({
    supplierId: this.scope?.supplierId ?? '',
    supplierName: this.scope?.name ?? '',
    supplierGstin: '',
    vendorInvoiceNumber: '',
    invoiceDate: isoDay(),
    dueDate: isoDay(30),
    isInterState: false,
    purchaseOrderId: '',
    purchaseOrderReference: '',
    goodsReceiptNoteId: '',
    goodsReceiptNoteNumber: '',
    tds: '194Q',
    isReverseCharge: false,
    remarks: '',
    lines: [blankBillLine()],
  });

  protected readonly suppliers = signal<SupplierOption[]>([]);
  protected readonly suppliersLoading = signal(true);
  protected readonly suppliersError = signal(false);
  /** The supplier's goods receipts that can be billed; null when the role can't read them (the GRN number is typed in). */
  protected readonly receipts = signal<GoodsReceiptNoteDto[] | null>([]);

  private readonly submitted = signal(false);
  protected readonly errors = computed(() =>
    this.submitted() ? validateBillForm(this.form()) : {},
  );
  protected readonly totals = computed(() => billTotals(this.form()));
  protected readonly itemCount = computed(
    () => this.form().lines.filter((l) => l.partNumber.trim() || l.description.trim()).length,
  );
  protected readonly busy = signal(false);
  protected readonly saveError = signal<string | null>(null);

  /** `?upload=1` (the list's Upload bill): the upload step comes first and stands out. */
  protected readonly uploadFirst = !!this.route.snapshot.queryParamMap.get('upload');
  protected readonly dragOver = signal(false);
  protected readonly reading = signal(false);
  protected readonly uploadName = signal<string | null>(null);
  protected readonly uploadUrl = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly readWarnings = signal<string[]>([]);

  constructor() {
    if (!this.canCreate) return;
    this.supplierOptions
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.suppliers.set(list);
          this.suppliersLoading.set(false);
          // The supplier's GSTIN, once known.
          const s = list.find((x) => x.id === this.form().supplierId);
          if (s?.gstin && !this.form().supplierGstin) this.patch({ supplierGstin: s.gstin });
        },
        error: () => {
          this.suppliersLoading.set(false);
          this.suppliersError.set(true);
        },
      });
    if (this.grnRequest) void this.billReceipt(this.grnRequest);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    void this.onFile(event.dataTransfer?.files?.[0]);
  }

  /** Reads the bill with the AI model and fills the form; the user checks and saves. */
  protected async onFile(file: File | undefined | null): Promise<void> {
    if (!file || this.reading()) return;
    this.uploadError.set(null);
    this.readWarnings.set([]);
    const problem = billUploadProblem(file);
    if (problem) {
      this.uploadError.set(problem);
      return;
    }
    const old = this.uploadUrl();
    if (old) URL.revokeObjectURL(old);
    this.uploadName.set(file.name);
    this.uploadUrl.set(URL.createObjectURL(file));
    this.reading.set(true);
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const reading = await firstValueFrom(
        this.readerApi.read({ content, mediaType: file.type }, { skipHandleError: true }),
      );
      const { form, warnings } = formFromReading(this.form(), reading);
      // A supplier the reader matched but the picker doesn't offer (inactive or blacklisted) is not used.
      if (form.supplierId && !this.suppliers().some((s) => s.id === form.supplierId)) {
        warnings.unshift(
          `${form.supplierName} is not active or is blacklisted. Pick the supplier.`,
        );
        form.supplierId = '';
        form.supplierName = '';
      }
      this.form.set(form);
      this.supplierLocked.set(!!form.supplierId);
      this.readWarnings.set(reading.note ? [...warnings, reading.note] : warnings);
      this.submitted.set(false);
      this.toasts.success(
        `${reading.lines.length} item(s) read${reading.invoiceNumber ? ` from invoice ${reading.invoiceNumber}` : ''}. Check them before saving.`,
        'Bill read',
      );
    } catch (e: unknown) {
      this.uploadError.set(
        readApiError(e, 'The bill could not be read. Fill in the form instead.'),
      );
    } finally {
      this.reading.set(false);
    }
  }

  protected err(key: string): string | null {
    return this.errors()[key] ?? null;
  }

  protected patch(p: Partial<BillForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  // ---- Part name: pick from the catalogue, or add a new item here ----
  private readonly productApi = inject(ProductService);
  protected readonly canAddItem = checkPolicy('AutoReach.Library.Create', inject(PermissionService));
  protected readonly newItem = signal<NewItemForm | null>(null);
  protected readonly savingItem = signal(false);

  /** A catalogue item fills the line; a rate already typed on the bill is kept. */
  protected pickItem(index: number, p: ProductDto): void {
    const line = this.form().lines[index];
    this.patchLine(index, {
      productId: p.id,
      partName: p.name ?? '',
      partNumber: p.partNumber ?? '',
      description: p.description ?? '',
      hsnCode: p.hsnCode ?? line.hsnCode,
      taxRateBasisPoints: p.taxRateBasisPoints ?? line.taxRateBasisPoints,
      rate: line.rate || (p.purchasePriceInPaise ?? 0) / 100,
    });
  }

  protected openNewItem(index: number, typed: string): void {
    const line = this.form().lines[index];
    this.newItem.set({
      line: index,
      name: typed || line.partName || '',
      partNumber: line.partNumber,
      hsnCode: line.hsnCode,
      taxRateBasisPoints: line.taxRateBasisPoints,
      purchaseRate: line.rate,
      salePrice: 0,
    });
  }

  protected patchNewItem(p: Partial<NewItemForm>): void {
    this.newItem.update((n) => (n ? { ...n, ...p } : n));
  }

  protected async saveNewItem(): Promise<void> {
    const n = this.newItem();
    if (!n) return;
    if (!n.name.trim() || !n.partNumber.trim()) {
      this.toasts.warning('Enter the part name and part number.', 'New item');
      return;
    }
    if (n.hsnCode.trim() && !/^\d{4,8}$/.test(n.hsnCode.trim())) {
      this.toasts.warning('HSN is 4 to 8 digits.', 'New item');
      return;
    }
    this.savingItem.set(true);
    try {
      const created = await firstValueFrom(
        this.productApi.create(
          {
            name: n.name.trim(),
            partNumber: n.partNumber.trim(),
            hsnCode: n.hsnCode.trim() || null,
            taxRateBasisPoints: n.taxRateBasisPoints,
            purchasePriceInPaise: n.purchaseRate > 0 ? Math.round(n.purchaseRate * 100) : null,
            listPriceInPaise: n.salePrice > 0 ? Math.round(n.salePrice * 100) : 0,
            isActive: true,
          },
          { skipHandleError: true },
        ),
      );
      this.pickItem(n.line, created);
      this.newItem.set(null);
      this.toasts.success(`${created.name} added to the catalogue.`, 'Item added');
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The item could not be added.'), 'Not added');
    } finally {
      this.savingItem.set(false);
    }
  }

  protected patchLine(index: number, p: Partial<BillFormLine>): void {
    this.form.update((f) => ({
      ...f,
      lines: f.lines.map((l, i) => (i === index ? { ...l, ...p } : l)),
    }));
  }

  protected addLine(): void {
    this.form.update((f) => ({ ...f, lines: [...f.lines, blankBillLine()] }));
  }

  protected removeLine(index: number): void {
    this.form.update((f) =>
      f.lines.length > 1 ? { ...f, lines: f.lines.filter((_, i) => i !== index) } : f,
    );
  }

  protected pickSupplier(id: string): void {
    const s = this.suppliers().find((x) => x.id === id);
    this.form.update((f) => ({
      ...f,
      supplierId: s?.id ?? '',
      supplierName: s?.name ?? '',
      supplierGstin: s?.gstin ?? '',
      goodsReceiptNoteId: '',
      goodsReceiptNoteNumber: '',
      purchaseOrderId: '',
      purchaseOrderReference: '',
      lines: f.goodsReceiptNoteId ? [blankBillLine()] : f.lines,
    }));
  }

  protected pickReceipt(id: string): void {
    const g = this.receipts()?.find((x) => x.id === id);
    if (g) void this.applyReceipt(g);
    else
      this.patch({
        goodsReceiptNoteId: '',
        goodsReceiptNoteNumber: '',
        purchaseOrderId: '',
        purchaseOrderReference: '',
        lines: [blankBillLine()],
      });
  }

  /** `?grn=` from the GRN list: that receipt's supplier and accepted items. */
  private async billReceipt(id: string): Promise<void> {
    try {
      const g = await firstValueFrom(this.grnApi.get(id, { skipHandleError: true }));
      this.patch({ supplierId: g.supplierId, supplierName: g.supplierName });
      this.supplierLocked.set(true);
      await this.applyReceipt(g);
    } catch {
      this.toasts.warning('That goods receipt could not be loaded. Pick it below instead.');
    }
  }

  private async applyReceipt(g: GoodsReceiptNoteDto): Promise<void> {
    // Rates come from the order, when the role can read it.
    const order = g.purchaseOrderId
      ? await firstValueFrom(
          this.purchasingApi
            .get(g.purchaseOrderId, { skipHandleError: true })
            .pipe(catchError(() => of(null))),
        )
      : null;
    const lines = linesFromReceipt(g, order);
    this.patch({
      goodsReceiptNoteId: g.id ?? '',
      goodsReceiptNoteNumber: g.grnNumber,
      purchaseOrderId: g.purchaseOrderId ?? '',
      purchaseOrderReference: g.purchaseOrderReference ?? '',
      lines: lines.length ? lines : [blankBillLine()],
    });
  }

  protected cancel(): void {
    void this.router.navigateByUrl(this.origin.returnUrl(this.listUrl()));
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.saveError.set(null);
    if (Object.keys(validateBillForm(this.form())).length) {
      this.toasts.warning('Fill in the highlighted fields.');
      return;
    }
    const dto = toCreateBillDto(this.form());
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(this.billApi.create(dto, { skipHandleError: true }));
      this.toasts.success(
        `${saved.billNumber} saved as a draft for ${inr(saved.netPayableInPaise)} net payable. Approve it from Vendor bills.`,
        'Bill recorded',
      );
      void this.router.navigateByUrl(this.origin.returnUrl(this.listUrl(saved.id)));
    } catch (e: unknown) {
      const message = readApiError(e, 'The bill could not be saved.');
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
    return this.router.createUrlTree(['/purchasing/bills'], { queryParams: params }).toString();
  }
}

interface NewItemForm {
  line: number;
  name: string;
  partNumber: string;
  hsnCode: string;
  taxRateBasisPoints: number;
  purchaseRate: number;
  salePrice: number;
}
