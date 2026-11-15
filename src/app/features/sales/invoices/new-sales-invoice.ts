import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountMasterDataService } from '../../../core/services/account-master-data.service';
import { PickerOption } from '../../../core/services/pipeline.service';
import type { ProductDto } from '../../../proxy/library/product.service';
import { WorkspaceProfileService } from '../../../proxy/business/workspace-profile.service';
import {
  DeliveryChallanStatus,
  SalesInvoiceKind,
  SalesInvoiceStatus,
} from '../../../proxy/sales/sales-enums';
import type { DeliveryChallanDto } from '../../../proxy/sales/delivery-challan.models';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { CreateSalesInvoiceDto, SalesInvoiceDto } from '../../../proxy/sales/sales-invoice.models';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { ArButton, ArDialog } from '../../../ui';
import { errorMessage } from '../../activities/activity-logic';
import { ArCatalogueItem, CatalogueSearch } from '../catalogue-item';
import { ArSalesCustomer, SalesCustomerChoice } from '../sales-customer';
import { EMPTY_PARTY, SalesParty, defaultShipIndex, shipToText } from '../sales-party';
import {
  InvoiceLine,
  blankInvoiceLine,
  editInvoiceLine,
  invoiceLineFromProduct,
  invoiceTotals,
  isStarted,
  lineTaxablePaise,
  plusDays,
  toInvoiceLines,
} from './new-sales-invoice.logic';
import { PickListStore } from '../../../core/pick-lists/pick-list.store';

/** Today in the browser's time zone (yyyy-mm-dd); toISOString would give yesterday before 05:30 IST. */
const localToday = () => plusDays(new Date().toLocaleDateString('en-CA'), 0);

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/**
 * A new sales invoice raised directly — not from an order or a challan — shown as the page at /sales/invoices/new. It is billed
 * to an account (and the contact person on it) or to a contact with no account; an account fills the GSTIN, billing and shipping
 * addresses, and the site decides the place of supply and so CGST + SGST or IGST. Each item's name searches the product
 * catalogue: picking one fills the item number, description, HSN, rate and GST. Saved as a draft, issued from its page.
 */
@Component({
  selector: 'ar-new-sales-invoice',
  imports: [ArDialog, ArButton, ArSalesCustomer, ArCatalogueItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      title="New sales invoice"
      width="min(920px, calc(100vw - 32px))"
      (dismiss)="closed.emit(null)"
    >
      <div class="ni">
        <!-- Bill to -->
        <section class="ni__sec" aria-labelledby="ni-billto">
          <header class="ni__sec-head">
            <h3 id="ni-billto" class="ni__sec-title">Bill to</h3>
            <p class="ni__sec-sub">An account and its contact person, or a contact on their own.</p>
          </header>
          <ar-sales-customer [initialCustomer]="initialCustomer()" (changed)="onCustomer($event)" />
          @if (choice()?.mode === 'contact' && choice()?.customer && !party().accountId) {
            <p class="ni__note">
              This contact has no account: enter their GSTIN and addresses below.
            </p>
          }
          <div class="ni__grid ni__grid--3">
            <label class="ar-field">
              <span class="ar-field__label">Document</span>
              <select class="ar-field__input" (change)="kind.set(+$any($event.target).value)">
                <option [value]="Kind.TaxInvoice" [selected]="kind() === Kind.TaxInvoice">
                  Tax invoice
                </option>
                <option [value]="Kind.BillOfSupply" [selected]="kind() === Kind.BillOfSupply">
                  Bill of supply (no GST)
                </option>
                <option [value]="Kind.CreditNote" [selected]="kind() === Kind.CreditNote">
                  Credit note
                </option>
                <option [value]="Kind.DebitNote" [selected]="kind() === Kind.DebitNote">
                  Debit note
                </option>
              </select>
            </label>
            @if (isNote()) {
              <label class="ar-field ni__span2" for="ni-original">
                <span class="ar-field__label">Against invoice</span>
                <select
                  id="ni-original"
                  class="ar-field__input"
                  (change)="originalInvoiceId.set($any($event.target).value)"
                >
                  <option value="" [selected]="!originalInvoiceId()">
                    {{
                      priorInvoices().length
                        ? 'Choose the invoice it adjusts'
                        : 'No issued invoices for this customer'
                    }}
                  </option>
                  @for (i of priorInvoices(); track i.id) {
                    <option [value]="i.id" [selected]="i.id === originalInvoiceId()" translate="no">
                      {{ i.invoiceNumber }} · {{ i.issueDateUtc.slice(0, 10) }}
                    </option>
                  }
                </select>
              </label>
            } @else if (challans().length) {
              <label class="ar-field ni__span2" for="ni-challan">
                <span class="ar-field__label"
                  >Against challan <span class="ar-field__opt">optional</span></span
                >
                <select
                  id="ni-challan"
                  class="ar-field__input"
                  (change)="challanId.set($any($event.target).value)"
                >
                  <option value="" [selected]="!challanId()">Not against a challan</option>
                  @for (c of challans(); track c.id) {
                    <option [value]="c.id" [selected]="c.id === challanId()" translate="no">
                      {{ c.challanNumber }} · {{ c.challanDateUtc.slice(0, 10) }}
                    </option>
                  }
                </select>
              </label>
            }
            <label class="ar-field ni__span2">
              <span class="ar-field__label"
                >Customer GSTIN <span class="ar-field__opt">optional</span></span
              >
              <input
                class="ar-field__input ar-mono"
                maxlength="15"
                placeholder="e.g. 27ABCDE1234F1Z5"
                [class.ni__invalid]="gstinInvalid()"
                [value]="gstin()"
                (input)="setGstin($any($event.target).value)"
              />
              @if (gstinInvalid()) {
                <span class="ar-field__hint ni__bad"
                  >A GSTIN has 15 characters, like 27ABCDE1234F1Z5.</span
                >
              }
            </label>
          </div>
        </section>

        <!-- Invoice details -->
        <section class="ni__sec" aria-labelledby="ni-details">
          <header class="ni__sec-head">
            <h3 id="ni-details" class="ni__sec-title">Invoice details</h3>
          </header>
          <div class="ni__grid ni__grid--4">
            <label class="ar-field">
              <span class="ar-field__label">Invoice date</span>
              <input
                type="date"
                class="ar-field__input"
                [value]="issueDate()"
                (input)="setIssueDate($any($event.target).value)"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Payment terms</span>
              <select class="ar-field__input" (change)="setTerms($any($event.target).value)">
                @for (d of paymentTerms(); track d.value) {
                  <option [value]="d.value" [selected]="terms() === d.value">
                    {{ d.label }}
                  </option>
                }
                <option value="custom" [selected]="terms() === null">Custom date</option>
              </select>
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Due date</span>
              <input
                type="date"
                class="ar-field__input"
                [min]="issueDate()"
                [value]="dueDate()"
                (input)="setDueDate($any($event.target).value)"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Place of supply</span>
              <select
                class="ar-field__input"
                (change)="setPlaceOfSupply($any($event.target).value)"
              >
                <option value="" [selected]="!placeCode()">Choose state…</option>
                @for (s of states(); track s.name) {
                  <option [value]="s.code" [selected]="s.code === placeCode()">
                    {{ s.code }} · {{ s.name }}
                  </option>
                }
              </select>
            </label>
          </div>
          <label class="ni__switch">
            <input
              type="checkbox"
              [checked]="interState()"
              (change)="interState.set($any($event.target).checked)"
            />
            <span>
              <strong>Inter-state supply</strong>
              <small>{{
                interState()
                  ? 'IGST is charged.'
                  : 'CGST + SGST are charged. Tick when the place of supply is outside your state.'
              }}</small>
            </span>
          </label>
        </section>

        <!-- Addresses -->
        <section class="ni__sec" aria-labelledby="ni-addr">
          <header class="ni__sec-head">
            <h3 id="ni-addr" class="ni__sec-title">Addresses</h3>
          </header>
          <div class="ni__grid ni__grid--2">
            <label class="ar-field">
              <span class="ar-field__label">Billing address</span>
              <textarea
                class="ar-field__input"
                rows="3"
                [value]="billingAddress()"
                (input)="billingAddress.set($any($event.target).value)"
              ></textarea>
            </label>
            <div class="ar-field">
              <span class="ar-field__label">Shipping / site address</span>
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
                  <option [value]="-1" [selected]="shipIndex() === -1">
                    Same as billing / other…
                  </option>
                </select>
              }
              <textarea
                class="ar-field__input"
                rows="3"
                aria-label="Shipping address"
                [value]="shippingAddress()"
                (input)="shippingAddress.set($any($event.target).value); shipIndex.set(-1)"
              ></textarea>
            </div>
          </div>
        </section>

        <!-- Items -->
        <section class="ni__sec" aria-labelledby="ni-items">
          <header class="ni__sec-head">
            <h3 id="ni-items" class="ni__sec-title">Invoice items</h3>
            <p class="ni__sec-sub">
              {{
                catalogue.blocked()
                  ? "The product catalogue isn't available to your role: type the item number and description."
                  : 'Search an item by name to fill its number, HSN, rate and GST from the catalogue.'
              }}
            </p>
          </header>

          <ol class="ni__items">
            @for (l of lines(); track $index; let i = $index) {
              <li class="ni__item">
                <span class="ni__no" aria-hidden="true">{{ i + 1 }}</span>
                <div class="ni__row ni__row--main">
                  <div class="ar-field">
                    <span class="ar-field__label">Item name</span>
                    <ar-catalogue-item
                      [value]="l.itemName"
                      (typed)="patchLine(i, { itemName: $event })"
                      (picked)="pickItem(i, $event)"
                    />
                  </div>
                  <label class="ar-field">
                    <span class="ar-field__label">Item no.</span>
                    <input
                      class="ar-field__input ar-mono"
                      placeholder="Item no."
                      [value]="l.partNumber"
                      (input)="patchLine(i, { partNumber: $any($event.target).value })"
                    />
                  </label>
                  <label class="ar-field">
                    <span class="ar-field__label">Qty</span>
                    <input
                      class="ar-field__input ni__num"
                      type="number"
                      min="0"
                      step="any"
                      [value]="l.quantity"
                      (input)="patchLine(i, { quantity: +$any($event.target).value })"
                    />
                  </label>
                  <label class="ar-field">
                    <span class="ar-field__label">Rate ₹</span>
                    <input
                      class="ar-field__input ni__num"
                      type="number"
                      min="0"
                      step="any"
                      [value]="l.unitPrice"
                      (input)="patchLine(i, { unitPrice: +$any($event.target).value })"
                    />
                  </label>
                  <div class="ni__amount">
                    <span class="ar-field__label">Amount ₹</span>
                    <strong>{{ money(taxable(l)) }}</strong>
                  </div>
                </div>
                <div class="ni__row ni__row--more">
                  <label class="ar-field">
                    <span class="ar-field__label">Description</span>
                    <input
                      class="ar-field__input"
                      placeholder="What is being sold"
                      [value]="l.description"
                      (input)="patchLine(i, { description: $any($event.target).value })"
                    />
                  </label>
                  <label class="ar-field">
                    <span class="ar-field__label">HSN / SAC</span>
                    <input
                      class="ar-field__input ar-mono"
                      maxlength="8"
                      [value]="l.hsnCode"
                      (input)="patchLine(i, { hsnCode: $any($event.target).value })"
                    />
                  </label>
                  <label class="ar-field">
                    <span class="ar-field__label">Disc %</span>
                    <input
                      class="ar-field__input ni__num"
                      type="number"
                      min="0"
                      max="100"
                      [value]="l.discountPercent"
                      (input)="patchLine(i, { discountPercent: +$any($event.target).value })"
                    />
                  </label>
                  <label class="ar-field">
                    <span class="ar-field__label">GST %</span>
                    <select
                      class="ar-field__input"
                      [disabled]="kind() === Kind.BillOfSupply"
                      (change)="patchLine(i, { gstPercent: +$any($event.target).value })"
                    >
                      @for (r of gstRates(); track r.value) {
                        <option [value]="r.value" [selected]="r.value === l.gstPercent">
                          {{ r.label }}
                        </option>
                      }
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  class="ni__x"
                  [attr.aria-label]="'Remove item ' + (i + 1)"
                  [title]="
                    lines().length === 1 ? 'An invoice needs at least one item' : 'Remove this item'
                  "
                  [disabled]="lines().length === 1"
                  (click)="removeLine(i)"
                >
                  ✕
                </button>
              </li>
            }
          </ol>
          <button type="button" class="ni__add" (click)="addLine()">+ Add item</button>
        </section>

        <!-- Summary -->
        <section class="ni__foot" aria-label="Notes and totals">
          <label class="ar-field ni__notes">
            <span class="ar-field__label"
              >Notes <span class="ar-field__opt">printed on the invoice</span></span
            >
            <textarea
              class="ar-field__input"
              rows="4"
              placeholder="Bank details, delivery terms, thank-you note…"
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
            ></textarea>
          </label>
          <label class="ar-field ni__notes" for="ni-conditions">
            <span class="ar-field__label"
              >Terms and conditions <span class="ar-field__opt">printed on the invoice</span></span
            >
            <textarea
              id="ni-conditions"
              class="ar-field__input"
              rows="4"
              maxlength="4000"
              placeholder="Payment, warranty and dispute terms"
              [value]="conditions()"
              (input)="conditions.set($any($event.target).value)"
            ></textarea>
          </label>
          <dl class="ni__totals">
            <div>
              <dt>Items</dt>
              <dd>{{ startedCount() }}</dd>
            </div>
            <div>
              <dt>Taxable value</dt>
              <dd>₹ {{ money(totals().taxable) }}</dd>
            </div>
            @if (kind() === Kind.BillOfSupply) {
              <div>
                <dt>GST</dt>
                <dd>Not charged</dd>
              </div>
            } @else if (interState()) {
              <div>
                <dt>IGST</dt>
                <dd>₹ {{ money(totals().tax) }}</dd>
              </div>
            } @else {
              <div>
                <dt>CGST</dt>
                <dd>₹ {{ money(totals().tax / 2) }}</dd>
              </div>
              <div>
                <dt>SGST</dt>
                <dd>₹ {{ money(totals().tax / 2) }}</dd>
              </div>
            }
            <div class="ni__grand">
              <dt>Total</dt>
              <dd>₹ {{ money(totals().taxable + totals().tax) }}</dd>
            </div>
          </dl>
        </section>

        @if (error(); as e) {
          <p class="ni__err" role="alert">{{ e }}</p>
        }
      </div>
      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(null)">Cancel</button>
        <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
          {{ busy() ? 'Saving…' : 'Save as draft' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .ni {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .ni__sec {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--ar-line-100);
    }
    .ni__sec-head {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ni__sec-title {
      margin: 0;
      font: 700 12px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .ni__sec-sub {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .ni__note {
      margin: 0;
      padding: 8px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-amber-50);
      border: 1px solid var(--ar-amber-200);
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-amber-800);
    }
    .ni__grid {
      display: grid;
      gap: 12px 14px;
      align-items: start;
    }
    .ni__grid--2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .ni__grid--3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .ni__grid--4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .ni__span2 {
      grid-column: span 2;
    }
    .ni__grid .ar-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .ni__invalid {
      border-color: var(--ar-bad-600);
    }
    .ni__bad {
      color: var(--ar-bad-600);
    }
    .ni__switch {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      cursor: pointer;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .ni__switch input {
      margin-top: 2px;
    }
    .ni__switch span {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .ni__switch strong {
      font-weight: 600;
      color: var(--ar-ink-800);
    }
    .ni__switch small {
      font-size: 12px;
      color: var(--ar-ink-500);
    }

    .ni__items {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ni__item {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px 44px 12px 44px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      background: var(--ar-bg-50);
    }
    .ni__item:focus-within {
      border-color: var(--ar-blue-200);
      background: var(--ar-white);
    }
    .ni__no {
      position: absolute;
      top: 14px;
      left: 12px;
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
      font: 700 11px var(--ar-font-sans);
    }
    .ni__row {
      display: grid;
      gap: 10px;
      align-items: end;
    }
    .ni__row .ar-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .ni__row .ar-field__label {
      font-size: 11px;
    }
    .ni__row--main {
      grid-template-columns: minmax(180px, 2.4fr) minmax(110px, 1.2fr) 80px 110px 120px;
    }
    .ni__row--more {
      grid-template-columns: minmax(180px, 3.6fr) 110px 80px 110px;
    }
    .ni__num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .ni__amount {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-end;
    }
    .ni__amount .ar-field__label {
      font-size: 11px;
    }
    .ni__amount strong {
      min-height: 36px;
      display: flex;
      align-items: center;
      font: 700 14px var(--ar-font-sans);
      font-variant-numeric: tabular-nums;
      color: var(--ar-ink-900);
    }
    .ni__x {
      position: absolute;
      top: 10px;
      right: 8px;
      width: 28px;
      height: 28px;
      background: none;
      border: 0;
      border-radius: var(--ar-radius-control);
      color: var(--ar-ink-400);
      cursor: pointer;
    }
    .ni__x:hover:not(:disabled) {
      color: var(--ar-bad-600);
      background: var(--ar-red-100);
    }
    .ni__x:disabled {
      opacity: 0.3;
      cursor: default;
    }
    .ni__add {
      align-self: flex-start;
      background: none;
      border: 1px dashed var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      padding: 7px 14px;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-blue-600);
      cursor: pointer;
    }
    .ni__add:hover {
      background: var(--ar-blue-100);
    }

    .ni__foot {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 20px;
      align-items: start;
    }
    .ni__notes {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ni__totals {
      margin: 0;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      background: var(--ar-bg-50);
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .ni__totals > div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    .ni__totals dt {
      color: var(--ar-ink-500);
    }
    .ni__totals dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
    }
    .ni__grand {
      margin-top: 4px;
      padding-top: 10px;
      border-top: 1px solid var(--ar-line-200);
      align-items: baseline;
    }
    .ni__grand dt {
      font-weight: 700;
      color: var(--ar-ink-900);
    }
    .ni__grand dd {
      font: 700 18px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .ni__err {
      margin: 0;
      padding: 0.75rem 1rem;
      border: 1px solid var(--ar-red-200);
      border-radius: 8px;
      background: var(--ar-red-100);
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600);
    }
    @media (max-width: 860px) {
      .ni__grid--4 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .ni__row--main,
      .ni__row--more {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .ni__amount {
        align-items: flex-start;
      }
      .ni__foot {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 560px) {
      .ni__grid--2,
      .ni__grid--3,
      .ni__grid--4 {
        grid-template-columns: minmax(0, 1fr);
      }
      .ni__span2 {
        grid-column: auto;
      }
    }
  `,
})
export class ArNewSalesInvoice {
  private readonly api = inject(SalesInvoiceService);
  private readonly masterData = inject(AccountMasterDataService);
  private readonly workspace = inject(WorkspaceProfileService);
  protected readonly catalogue = inject(CatalogueSearch);

  /** The invoice saved, or null when cancelled. */
  readonly closed = output<SalesInvoiceDto | null>();
  /** The customer to start with, e.g. from an account's Customer 360 (?customer=…&customerName=…). */
  readonly initialCustomer = input<PickerOption | null>(null);

  protected readonly Kind = SalesInvoiceKind;
  private readonly pickLists = inject(PickListStore);
  /** GST rates and payment terms come from the database (Settings → Pick lists). */
  protected readonly gstRates = computed(() =>
    this.pickLists.options('tax.gst-rate').map((o) => ({ value: Number(o.value), label: o.label })),
  );
  protected readonly paymentTerms = computed(() =>
    this.pickLists
      .options('sales.payment-term')
      .map((o) => ({ value: Number(o.value), label: o.label })),
  );

  protected readonly choice = signal<SalesCustomerChoice | null>(null);
  protected readonly party = signal<SalesParty>(EMPTY_PARTY);
  protected readonly kind = signal<SalesInvoiceKind>(SalesInvoiceKind.TaxInvoice);
  protected readonly gstin = signal('');
  protected readonly issueDate = signal(localToday());
  /** Days from the invoice date to the due date; null when a date was picked by hand. */
  protected readonly terms = signal<number | null>(30);
  protected readonly dueDate = signal(plusDays(localToday(), 30));
  protected readonly placeCode = signal('');
  protected readonly interState = signal(false);
  protected readonly billingAddress = signal('');
  protected readonly shippingAddress = signal('');
  protected readonly shipIndex = signal(-1);
  protected readonly notes = signal('');
  protected readonly conditions = signal('');
  /** A credit or debit note adjusts one earlier invoice. */
  protected readonly isNote = computed(
    () => this.kind() === SalesInvoiceKind.CreditNote || this.kind() === SalesInvoiceKind.DebitNote,
  );
  protected readonly originalInvoiceId = signal('');
  protected readonly challanId = signal('');
  /** The customer's issued invoices a note can be raised against. */
  protected readonly priorInvoices = signal<SalesInvoiceDto[]>([]);
  /** The customer's challans not yet invoiced, which an invoice can bill. */
  protected readonly challans = signal<DeliveryChallanDto[]>([]);
  private readonly challanApi = inject(DeliveryChallanService);
  protected readonly lines = signal<InvoiceLine[]>([blankInvoiceLine()]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Our own GST state, to tell an inter-state supply from a local one. */
  private ownStateCode: string | null = null;

  /** States that have a GST code, for the place of supply. */
  protected readonly states = computed(() =>
    this.masterData
      .states()
      .map((name) => ({ name, code: this.masterData.stateCode(name) }))
      .filter((s): s is { name: string; code: string } => !!s.code)
      .sort((a, b) => a.code.localeCompare(b.code)),
  );

  protected readonly totals = computed(() =>
    invoiceTotals(this.lines(), this.kind() === SalesInvoiceKind.BillOfSupply),
  );
  protected readonly startedCount = computed(() => this.lines().filter(isStarted).length);
  protected readonly gstinInvalid = computed(() => {
    const g = this.gstin();
    return g.length === 15 && !GSTIN_PATTERN.test(g);
  });

  constructor() {
    // The invoices and challans a document can point back to belong to the chosen customer.
    effect(() => {
      const customerId = this.choice()?.customer?.id;
      this.originalInvoiceId.set('');
      this.challanId.set('');
      this.priorInvoices.set([]);
      this.challans.set([]);
      if (customerId) void this.loadReferences(customerId);
    });
    firstValueFrom(this.workspace.get({ skipHandleError: true }))
      .then((p) => {
        this.ownStateCode = p?.stateCode ?? null;
        if (this.placeCode()) this.setPlaceOfSupply(this.placeCode());
      })
      .catch(() => undefined);
  }

  private async loadReferences(customerId: string): Promise<void> {
    try {
      const [invoices, challans] = await Promise.all([
        firstValueFrom(
          this.api.getList(
            { customerId, maxResultCount: 200, skipCount: 0 },
            { skipHandleError: true },
          ),
        ),
        firstValueFrom(
          this.challanApi.getList(
            { customerId, maxResultCount: 200, skipCount: 0 },
            { skipHandleError: true },
          ),
        ),
      ]);
      if (this.choice()?.customer?.id !== customerId) return;
      this.priorInvoices.set(
        (invoices.items ?? []).filter(
          (i) =>
            (i.kind === SalesInvoiceKind.TaxInvoice || i.kind === SalesInvoiceKind.BillOfSupply) &&
            i.status !== SalesInvoiceStatus.Draft &&
            i.status !== SalesInvoiceStatus.Cancelled,
        ),
      );
      this.challans.set(
        (challans.items ?? []).filter(
          (c) =>
            c.status === DeliveryChallanStatus.Dispatched ||
            c.status === DeliveryChallanStatus.Delivered,
        ),
      );
    } catch {
      // Without the lists the document can still be made; it just is not linked.
    }
  }

  // ---- Customer ------------------------------------------------------------------

  /** A new customer choice; a new account (or none) refills the GSTIN, addresses and place of supply from it. */
  protected onCustomer(choice: SalesCustomerChoice): void {
    this.choice.set(choice);
    this.error.set(null);
    if (choice.party === this.party()) return;
    const party = choice.party;
    this.party.set(party);
    this.gstin.set(party.gstin ?? '');
    this.billingAddress.set(party.billingAddress);
    const index = defaultShipIndex(party);
    if (index >= 0) {
      this.chooseShipTo(index);
    } else {
      this.shipIndex.set(-1);
      this.shippingAddress.set(party.billingAddress);
      this.setPlaceOfSupply(party.billingStateCode ?? '');
    }
  }

  /** Goods going to a site: its address, and its state as the place of supply. */
  protected chooseShipTo(index: number): void {
    this.shipIndex.set(index);
    this.shippingAddress.set(shipToText(this.party(), index));
    const site = this.party().shipTo[index];
    if (site?.gstin) this.gstin.set(site.gstin);
    this.setPlaceOfSupply(site?.stateCode ?? this.party().billingStateCode ?? '');
  }

  protected setGstin(value: string): void {
    const g = value.toUpperCase().replace(/\s/g, '');
    this.gstin.set(g);
    if (/^[0-9]{2}/.test(g) && !this.placeCode()) this.setPlaceOfSupply(g.slice(0, 2));
  }

  protected setPlaceOfSupply(code: string): void {
    this.placeCode.set(code);
    if (code && this.ownStateCode) this.interState.set(code !== this.ownStateCode);
  }

  // ---- Dates ---------------------------------------------------------------------

  protected setIssueDate(value: string): void {
    if (!value) return;
    this.issueDate.set(value);
    const t = this.terms();
    if (t !== null) this.dueDate.set(plusDays(value, t));
  }

  protected setTerms(value: string): void {
    if (value === 'custom') {
      this.terms.set(null);
      return;
    }
    const days = +value;
    this.terms.set(days);
    this.dueDate.set(plusDays(this.issueDate(), days));
  }

  protected setDueDate(value: string): void {
    if (!value) return;
    this.dueDate.set(value);
    const match = this.paymentTerms().find((d) => plusDays(this.issueDate(), d.value) === value);
    this.terms.set(match?.value ?? null);
  }

  // ---- Items ---------------------------------------------------------------------

  protected addLine(): void {
    this.lines.update((ls) => [...ls, blankInvoiceLine()]);
  }

  protected removeLine(index: number): void {
    this.lines.update((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== index) : ls));
  }

  protected patchLine(index: number, patch: Partial<InvoiceLine>): void {
    this.lines.update((ls) => ls.map((l, i) => (i === index ? editInvoiceLine(l, patch) : l)));
  }

  protected pickItem(index: number, p: ProductDto): void {
    this.lines.update((ls) =>
      ls.map((l, i) =>
        i === index
          ? invoiceLineFromProduct(
              p,
              l,
              this.gstRates().map((r) => r.value),
            )
          : l,
      ),
    );
  }

  protected taxable(l: InvoiceLine): number {
    return lineTaxablePaise(l);
  }

  protected money(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // ---- Save ----------------------------------------------------------------------

  protected async save(): Promise<void> {
    const choice = this.choice();
    const customer = choice?.customer;
    if (!customer) {
      this.error.set(
        choice?.mode === 'contact'
          ? 'Pick the contact this invoice is for.'
          : 'Choose the account and the contact person this invoice is for.',
      );
      return;
    }
    const gstin = this.gstin().trim();
    if (gstin && !GSTIN_PATTERN.test(gstin)) {
      this.error.set("That GSTIN isn't valid. It has 15 characters, like 27ABCDE1234F1Z5.");
      return;
    }
    const started = this.lines().filter(isStarted);
    if (!started.length) {
      this.error.set('Add at least one item: pick it from the catalogue or type its name.');
      return;
    }
    if (started.some((l) => !(l.quantity > 0))) {
      this.error.set('Every item needs a quantity above zero.');
      return;
    }
    if (this.dueDate() < this.issueDate()) {
      this.error.set('The due date cannot be before the invoice date.');
      return;
    }

    if (this.isNote() && !this.originalInvoiceId()) {
      this.error.set('A credit or debit note needs the invoice it adjusts.');
      return;
    }

    const billOfSupply = this.kind() === SalesInvoiceKind.BillOfSupply;
    const input: CreateSalesInvoiceDto = {
      kind: this.kind(),
      customerId: customer.id,
      customerAccountId: choice.accountId ?? undefined,
      customerGstin: gstin || undefined,
      billingAddress: this.billingAddress().trim() || undefined,
      shippingAddress: this.shippingAddress().trim() || undefined,
      placeOfSupplyStateCode: this.placeCode() || undefined,
      isInterState: this.interState(),
      issueDateUtc: new Date(`${this.issueDate()}T00:00:00`).toISOString(),
      dueDateUtc: new Date(`${this.dueDate()}T00:00:00`).toISOString(),
      discountInPaise: 0,
      notes: this.notes().trim() || undefined,
      termsAndConditions: this.conditions().trim() || undefined,
      originalInvoiceId: this.isNote() ? this.originalInvoiceId() || undefined : undefined,
      deliveryChallanId: !this.isNote() ? this.challanId() || undefined : undefined,
      lines: toInvoiceLines(this.lines(), billOfSupply),
    };

    this.busy.set(true);
    this.error.set(null);
    try {
      const created = await firstValueFrom(this.api.create(input));
      this.closed.emit(created);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The invoice could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
