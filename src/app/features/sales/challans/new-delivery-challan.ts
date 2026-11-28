import { InventoryService, StockLocationDto } from '../../../proxy/inventory/inventory.service';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  effect,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PickerOption } from '../../../core/services/pipeline.service';
import type { ProductDto } from '../../../proxy/library/product.service';
import {
  CreateDeliveryChallanDto,
  DeliveryChallanDto,
} from '../../../proxy/sales/delivery-challan.models';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import type { SalesOrderDto } from '../../../proxy/sales/sales-order.models';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';
import { DeliveryChallanType } from '../../../proxy/sales/sales-enums';
import { ArButton } from '../../../ui';
import { ArIcon } from '../../../ui/icon';
import { ArDateInput } from '../../../ui/date-input';
import { ArSelect } from '../../../ui/select';
import { errorMessage } from '../../activities/activity-logic';
import { ArCatalogueItem, CatalogueSearch } from '../catalogue-item';
import { ArSalesCustomer, SalesCustomerChoice } from '../sales-customer';
import { EMPTY_PARTY, SalesParty, defaultShipIndex, shipToText } from '../sales-party';
import {
  OPEN_ORDER_STATUSES,
  challanLinesFromOrder,
  ChallanLine,
  blankChallanLine,
  challanLineFromProduct,
  editChallanLine,
  challanLineFromSaved,
  filledChallanLines,
  toChallanLines,
  unitsFor,
} from './new-delivery-challan.logic';
import { withOptionNames } from '../../../core/pick-lists/option-names';
import { PickListStore } from '../../../core/pick-lists/pick-list.store';

/** Why goods move on a challan — the GST reasons a challan is used instead of an invoice. */
export const CHALLAN_TYPES = withOptionNames('sales.challan-type', [
  { value: DeliveryChallanType.SupplyAgainstOrder, label: 'Supply against order' },
  { value: DeliveryChallanType.JobWork, label: 'Job work' },
  { value: DeliveryChallanType.SupplyOnApproval, label: 'Supply on approval' },
  { value: DeliveryChallanType.MaterialReturn, label: 'Material return' },
  { value: DeliveryChallanType.Other, label: 'Other' },
]);

/**
 * A new delivery challan raised directly — job work, supply on approval, returns, or goods sent before the order is in the system.
 * The customer is an account and its contact person (or a contact with no account); the site address fills in from the account's
 * default shipping address. Each item's name searches the product catalogue: picking one fills the item number, description,
 * HSN and unit. Saved as a draft; dispatched and invoiced from its page.
 */
@Component({
  selector: 'ar-new-delivery-challan',
  imports: [ArButton, ArIcon, ArSelect, ArDateInput, ArSalesCustomer, ArCatalogueItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nc">
      <header class="nc__head">
        <div class="nc__head-text">
          <h1 class="nc__title">
            {{ editing() ? 'Edit challan ' + editing()!.challanNumber : 'New delivery challan' }}
          </h1>
          <p class="nc__sub">
            {{
              editing()
                ? 'Change the purpose, transport and goods of this draft challan.'
                : 'Create a delivery document and record dispatch information.'
            }}
          </p>
        </div>
        <span class="nc__status" title="A challan is saved as a draft; it is dispatched from its own page.">
          <span class="nc__dot" aria-hidden="true"></span>Draft
        </span>
      </header>

      <div class="nc__layout">
        <div class="nc__main">
          <!-- 1. Customer -->
          <section class="nc__card" aria-labelledby="nc-h-customer">
            <header class="nc__card-head">
              <span class="nc__ico"><ar-icon name="accounts" [size]="18" /></span>
              <div>
                <h2 class="nc__h" id="nc-h-customer">Customer details</h2>
                <p class="nc__hint">Who the goods are going to.</p>
              </div>
            </header>
            @if (editing(); as e) {
              <p class="nc__fixed">
                Customer: <strong translate="no">{{ e.customerName }}</strong>
                @if (e.customerAccountName) {
                  · <span translate="no">{{ e.customerAccountName }}</span>
                }
              </p>
            } @else {
              <ar-sales-customer
                [initialCustomer]="initialCustomer()"
                (changed)="onCustomer($event)"
              />
              @if (!choice()?.customer) {
                <p class="nc__empty">
                  {{
                    choice()?.mode === 'contact'
                      ? 'Search for the contact the goods are going to.'
                      : 'Search for an account, then pick the contact person on it.'
                  }}
                </p>
              }
            }
            @if (customerLabel(); as c) {
              <dl class="nc__facts" aria-label="Selected customer">
                <div>
                  <dt>Customer</dt>
                  <dd translate="no">{{ c }}</dd>
                </div>
                @if (contactPerson(); as p) {
                  <div>
                    <dt>Contact person</dt>
                    <dd translate="no">{{ p }}</dd>
                  </div>
                }
                @if (party().gstin; as g) {
                  <div>
                    <dt>GSTIN</dt>
                    <dd class="ar-mono" translate="no">{{ g }}</dd>
                  </div>
                }
              </dl>
            }
          </section>

          <!-- 2. Challan details -->
          <section class="nc__card" aria-labelledby="nc-h-details">
            <header class="nc__card-head">
              <span class="nc__ico"><ar-icon name="document" [size]="18" /></span>
              <div>
                <h2 class="nc__h" id="nc-h-details">Challan details</h2>
                <p class="nc__hint">Why the goods are moving, and when.</p>
              </div>
            </header>
            <div class="nc__compact">
              <label class="ar-field">
                <span class="ar-field__label">Challan type <span class="nc__req">*</span></span>
                <select
                  required
                  class="ar-field__input"
                  (change)="type.set(+$any($event.target).value)"
                >
                  @for (t of types; track t.value) {
                    <option [value]="t.value" [selected]="t.value === type()">{{ t.label }}</option>
                  }
                </select>
              </label>
              @if (openOrders().length > 0) {
                <label class="ar-field">
                  <span class="ar-field__label">Against sales order</span>
                  <select class="ar-field__input" (change)="pickOrder($any($event.target).value)">
                    <option value="" [selected]="!orderId()">None (goods not on an order)</option>
                    @for (o of openOrders(); track o.id) {
                      <option [value]="o.id" [selected]="o.id === orderId()">
                        {{ o.orderNumber }}
                      </option>
                    }
                  </select>
                </label>
              }
              <label class="ar-field">
                <span class="ar-field__label">Challan date</span>
                <input
                  type="date"
                  class="ar-field__input"
                  [value]="challanDate()"
                  (input)="challanDate.set($any($event.target).value)"
                />
              </label>
            </div>
          </section>

          <!-- 3. Shipping / site address -->
          <section class="nc__card" aria-labelledby="nc-h-ship">
            <header class="nc__card-head">
              <span class="nc__ico"><ar-icon name="tower" [size]="18" /></span>
              <div>
                <h2 class="nc__h" id="nc-h-ship">Shipping / Site address</h2>
                <p class="nc__hint">
                  {{
                    party().shipTo.length
                      ? 'Filled in from the account. Change it if the goods go elsewhere.'
                      : 'Where the goods are delivered.'
                  }}
                </p>
              </div>
            </header>
            @if (party().shipTo.length) {
              <label class="ar-field nc__ship-pick">
                <span class="ar-field__label">Ship to</span>
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
              </label>
            }
            <label class="ar-field">
              <span class="ar-field__label">Delivery address</span>
              <textarea
                id="nc-ship"
                class="ar-field__input nc__area"
                rows="4"
                placeholder="Delivery site address: street, city, state and PIN code"
                [value]="shippingAddress()"
                (input)="shippingAddress.set($any($event.target).value)"
              ></textarea>
            </label>
          </section>

          <!-- 4. Dispatch & transport -->
          <section class="nc__card" aria-labelledby="nc-h-dispatch">
            <header class="nc__card-head">
              <span class="nc__ico"><ar-icon name="delivery-challans" [size]="18" /></span>
              <div>
                <h2 class="nc__h" id="nc-h-dispatch">Dispatch &amp; transport</h2>
                <p class="nc__hint">All optional. Add what you know now; the rest can wait.</p>
              </div>
            </header>
            <div class="nc__fields">
              @if (locations().length) {
                <label class="ar-field">
                  <span class="ar-field__label"
                    >Dispatch from <span class="ar-field__opt">optional</span></span
                  >
                  <select
                    class="ar-field__input"
                    title="The stock location the goods leave from"
                    (change)="locationId.set($any($event.target).value)"
                  >
                    <option value="" [selected]="!locationId()">Not tracked</option>
                    @for (l of locations(); track l.id) {
                      <option [value]="l.id" [selected]="l.id === locationId()" translate="no">
                        {{ l.name }}
                      </option>
                    }
                  </select>
                </label>
              }
              <label class="ar-field">
                <span class="ar-field__label"
                  >Transporter <span class="ar-field__opt">optional</span></span
                >
                <input
                  class="ar-field__input"
                  autocomplete="off"
                  placeholder="e.g. VRL Logistics"
                  [value]="transporter()"
                  (input)="transporter.set($any($event.target).value)"
                />
              </label>
              <label class="ar-field">
                <span class="ar-field__label"
                  >Vehicle no. <span class="ar-field__opt">optional</span></span
                >
                <input
                  class="ar-field__input ar-mono"
                  autocomplete="off"
                  placeholder="e.g. MH 14 HG 4521"
                  [value]="vehicle()"
                  (input)="vehicle.set($any($event.target).value.toUpperCase())"
                />
              </label>
              <label class="ar-field">
                <span class="ar-field__label"
                  >LR / docket no. <span class="ar-field__opt">optional</span></span
                >
                <input
                  class="ar-field__input ar-mono"
                  autocomplete="off"
                  placeholder="Transporter receipt number"
                  title="The lorry receipt or docket number the transporter gives you"
                  [value]="lr()"
                  (input)="lr.set($any($event.target).value)"
                />
              </label>
              <label class="ar-field">
                <span class="ar-field__label"
                  >E-way bill no. <span class="ar-field__opt">optional</span></span
                >
                <input
                  class="ar-field__input ar-mono"
                  inputmode="numeric"
                  autocomplete="off"
                  maxlength="12"
                  placeholder="12 digits"
                  title="The 12-digit number from the GST e-way bill portal"
                  [class.nc__bad]="ewayState() === 'bad'"
                  [attr.aria-invalid]="ewayState() === 'bad'"
                  [value]="eway()"
                  (input)="eway.set($any($event.target).value)"
                />
                @if (ewayState() === 'bad') {
                  <span class="ar-field__error" role="alert">An e-way bill number has 12 digits.</span>
                }
              </label>
            </div>
          </section>

          <!-- 5. Items -->
          <section class="nc__card" aria-labelledby="nc-h-items">
            <header class="nc__card-head">
              <span class="nc__ico"><ar-icon name="stock" [size]="18" /></span>
              <div class="nc__grow">
                <h2 class="nc__h" id="nc-h-items">Items</h2>
                <p class="nc__hint">
                  {{ filled().length }} {{ filled().length === 1 ? 'item' : 'items' }} on this
                  challan
                </p>
              </div>
              <button type="button" class="nc__add nc__add--head" (click)="addLine()">
                <ar-icon name="plus" [size]="14" /> Add item
              </button>
            </header>
            @if (catalogue.blocked()) {
              <p class="nc__note">
                The product catalogue isn't available to your role: type the item number and
                description.
              </p>
            }
            <div class="nc__items">
              @for (l of lines(); track $index; let i = $index) {
                <article class="nc__item" [class.nc__item--bad]="lineQtyBad(l)">
                  <header class="nc__item-head">
                    <span class="nc__badge" aria-hidden="true">{{ i + 1 }}</span>
                    <div class="ar-field nc__item-name">
                      <span class="ar-field__label">Item name</span>
                      <ar-catalogue-item
                        [value]="l.itemName"
                        (typed)="patchLine(i, { itemName: $event })"
                        (picked)="pickItem(i, $event)"
                      />
                    </div>
                    <button
                      type="button"
                      class="nc__x"
                      [attr.aria-label]="'Remove item ' + (i + 1)"
                      title="Remove this item"
                      [disabled]="lines().length === 1"
                      (click)="removeLine(i)"
                    >
                      <ar-icon name="trash" [size]="16" /><span class="nc__x-text">Remove</span>
                    </button>
                  </header>
                  <div class="nc__item-grid">
                    <label class="ar-field nc__f-no">
                      <span class="ar-field__label">Item no.</span>
                      <input
                        class="ar-field__input ar-mono"
                        autocomplete="off"
                        placeholder="Item no."
                        [value]="l.partNumber"
                        (input)="patchLine(i, { partNumber: $any($event.target).value })"
                      />
                    </label>
                    <label class="ar-field nc__f-desc">
                      <span class="ar-field__label">Description</span>
                      <input
                        class="ar-field__input"
                        autocomplete="off"
                        placeholder="Description"
                        [value]="l.description"
                        (input)="patchLine(i, { description: $any($event.target).value })"
                      />
                    </label>
                    <label class="ar-field nc__f-hsn">
                      <span class="ar-field__label">HSN</span>
                      <input
                        class="ar-field__input ar-mono"
                        autocomplete="off"
                        maxlength="8"
                        placeholder="HSN code"
                        [value]="l.hsnCode"
                        (input)="patchLine(i, { hsnCode: $any($event.target).value })"
                      />
                    </label>
                    <label class="ar-field nc__f-qty">
                      <span class="ar-field__label">Quantity</span>
                      <input
                        class="ar-field__input"
                        type="number"
                        inputmode="decimal"
                        min="0"
                        step="any"
                        [class.nc__bad]="lineQtyBad(l)"
                        [attr.aria-invalid]="lineQtyBad(l)"
                        [value]="l.quantity"
                        (input)="patchLine(i, { quantity: +$any($event.target).value })"
                      />
                      @if (lineQtyBad(l)) {
                        <span class="ar-field__error" role="alert">Above zero, please.</span>
                      }
                    </label>
                    <label class="ar-field nc__f-unit">
                      <span class="ar-field__label">Unit</span>
                      <select
                        required
                        class="ar-field__input"
                        (change)="patchLine(i, { unitOfMeasure: $any($event.target).value })"
                      >
                        @for (u of units(l); track u) {
                          <option [value]="u" [selected]="u === l.unitOfMeasure">{{ u }}</option>
                        }
                      </select>
                    </label>
                  </div>
                </article>
              }
            </div>
            <button type="button" class="nc__add" (click)="addLine()">
              <ar-icon name="plus" [size]="14" /> Add item
            </button>
          </section>

          <!-- 6. Remarks -->
          <section class="nc__card" aria-labelledby="nc-h-remarks">
            <header class="nc__card-head">
              <span class="nc__ico"><ar-icon name="edit" [size]="18" /></span>
              <div>
                <h2 class="nc__h" id="nc-h-remarks">
                  Remarks <span class="ar-field__opt">(optional)</span>
                </h2>
                <p class="nc__hint">Shown on the challan, for example the purpose of job work.</p>
              </div>
            </header>
            <textarea
              class="ar-field__input nc__area"
              rows="3"
              aria-labelledby="nc-h-remarks"
              placeholder="e.g. Sent for job work: machining of flanges, to be returned within 180 days"
              [value]="remarks()"
              (input)="remarks.set($any($event.target).value)"
            ></textarea>
          </section>
        </div>

        <!-- Delivery overview: follows the form as you type -->
        <aside class="nc__side" aria-label="Delivery overview">
          <section class="nc__ov">
            <button
              type="button"
              class="nc__ov-toggle"
              aria-controls="nc-ov-body"
              [attr.aria-expanded]="overviewOpen()"
              (click)="overviewOpen.set(!overviewOpen())"
            >
              <span class="nc__ov-title">Delivery overview</span>
              <span class="nc__ov-brief">{{ brief() }}</span>
              <ar-icon name="chevdown" class="nc__ov-chev" [size]="16" />
            </button>
            <div id="nc-ov-body" class="nc__ov-body" [class.nc__ov-body--open]="overviewOpen()">
              <div class="nc__ready" [class.nc__ready--ok]="problems().length === 0">
                <p class="nc__ready-title">
                  @if (problems().length === 0) {
                    <ar-icon name="check" [size]="16" /> Ready to save as a draft
                  } @else {
                    <ar-icon name="alert" [size]="16" />
                    {{ problems().length }} {{ problems().length === 1 ? 'thing' : 'things' }} to
                    sort out
                  }
                </p>
                @if (problems().length) {
                  <ul class="nc__ready-list">
                    @for (p of problems(); track p) {
                      <li>{{ p }}</li>
                    }
                  </ul>
                }
              </div>

              <dl class="nc__dl">
                <div><dt>Document type</dt><dd>Delivery challan</dd></div>
                <div><dt>Challan type</dt><dd>{{ typeLabel() }}</dd></div>
                @if (orderNumber(); as o) {
                  <div><dt>Against order</dt><dd class="ar-mono" translate="no">{{ o }}</dd></div>
                }
                <div><dt>Challan date</dt><dd>{{ dateLabel() }}</dd></div>
                <div>
                  <dt>Customer</dt>
                  <dd [class.nc__none]="!customerLabel()" translate="no">{{ customerLabel() || 'Not chosen yet' }}</dd>
                </div>
                @if (contactPerson(); as p) {
                  <div><dt>Contact person</dt><dd translate="no">{{ p }}</dd></div>
                }
                <div><dt>Items</dt><dd>{{ filled().length }}</dd></div>
                <div>
                  <dt>Total quantity</dt>
                  <dd [class.nc__none]="!filled().length">{{ totalQuantity() }}</dd>
                </div>
                <div><dt>Dispatch status</dt><dd>Draft, not yet dispatched</dd></div>
                <div>
                  <dt>Dispatch from</dt>
                  <dd [class.nc__none]="!locationName()" translate="no">{{ locationName() || 'Not tracked' }}</dd>
                </div>
                <div>
                  <dt>Transporter</dt>
                  <dd [class.nc__none]="!transporter().trim()" translate="no">{{ transporter().trim() || 'Not added' }}</dd>
                </div>
                <div>
                  <dt>Vehicle no.</dt>
                  <dd class="ar-mono" [class.nc__none]="!vehicle().trim()" translate="no">{{ vehicle().trim() || 'Not added' }}</dd>
                </div>
                <div>
                  <dt>LR / docket no.</dt>
                  <dd class="ar-mono" [class.nc__none]="!lr().trim()" translate="no">{{ lr().trim() || 'Not added' }}</dd>
                </div>
                <div>
                  <dt>E-way bill</dt>
                  <dd [class.nc__none]="ewayState() === 'none'" [class.nc__badtxt]="ewayState() === 'bad'">
                    @switch (ewayState()) {
                      @case ('ok') {
                        <span class="ar-mono" translate="no">{{ eway().trim() }}</span>
                      }
                      @case ('bad') {
                        Needs 12 digits
                      }
                      @default {
                        Not added
                      }
                    }
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </aside>
      </div>

      <!-- Actions: always in reach; pinned to the bottom edge on a phone -->
      <div class="nc__bar">
        @if (error(); as e) {
          <p class="nc__err" role="alert">{{ e }}</p>
        }
        <div class="nc__bar-btns">
          <button ar-button type="button" variant="ghost" (click)="closed.emit(null)">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            [attr.aria-busy]="busy()"
            (click)="save()"
          >
            {{ busy() ? 'Saving…' : editing() ? 'Save changes' : 'Save as draft' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    .nc {
      --nc-pad: clamp(14px, 2.2vw, 36px);
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      box-sizing: border-box;
      padding: clamp(16px, 2vw, 28px) var(--nc-pad) 0;
      font-family: var(--ar-font-sans);
    }

    /* Page heading */
    .nc__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px 16px;
    }
    .nc__title {
      margin: 0;
      font-size: clamp(20px, 1.6vw, 26px);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--ar-ink-900);
    }
    .nc__sub {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--ar-ink-500);
    }
    .nc__status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: var(--ar-blue-100);
      border: 1px solid var(--ar-blue-200);
      color: var(--ar-blue-700);
      font: 600 12px var(--ar-font-sans);
    }
    .nc__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--ar-primary);
    }

    /* Two columns on a large screen: form left, sticky overview right */
    .nc__layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) clamp(320px, 28vw, 560px);
      gap: 20px;
      align-items: start;
    }
    .nc__main,
    .nc__side {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }
    /* Sticky, but never taller than the room above the action bar, so its end is not hidden behind it.
       --nc-chrome is the app's top bar and breadcrumb; --nc-bar-h is the action bar. */
    .nc__side {
      --nc-chrome: 132px;
      --nc-bar-h: 76px;
      position: sticky;
      top: 16px;
      max-height: calc(100dvh - var(--nc-chrome) - var(--nc-bar-h) - 32px);
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    /* The overview card keeps its full height; the side column scrolls instead of squashing it. */
    .nc__side > * {
      flex: none;
    }

    /* Cards keep a clear edge on every screen */
    .nc__card,
    .nc__ov {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: clamp(14px, 1.4vw, 24px);
      background: var(--ar-white);
      border: 1px solid var(--ar-line-300);
      border-radius: 12px;
      box-shadow: var(--ar-shadow-card);
      min-width: 0;
      animation: nc-in 0.25s ease backwards;
    }
    @keyframes nc-in {
      from {
        opacity: 0;
      }
    }
    .nc__card-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .nc__grow {
      flex: 1;
      min-width: 0;
    }
    .nc__ico {
      flex: none;
      display: inline-grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: var(--ar-blue-100);
      color: var(--ar-primary);
    }
    .nc__h {
      margin: 0;
      font-size: 15px;
      font-weight: 650;
      color: var(--ar-ink-900);
    }
    .nc__hint {
      margin: 2px 0 0;
      font-size: 12.5px;
      color: var(--ar-ink-500);
    }
    .nc__req {
      color: var(--ar-red-600);
    }
    .nc .ar-field__label {
      font-size: 12px;
    }
    .nc__fixed,
    .nc__empty,
    .nc__note {
      margin: 0;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      font-size: 13px;
      color: var(--ar-ink-700);
    }
    .nc__empty {
      color: var(--ar-ink-500);
    }

    /* Selected customer */
    .nc__facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px 16px;
      margin: 0;
      padding: 12px 14px;
      border-radius: 8px;
      background: var(--ar-blue-100);
      border: 1px solid var(--ar-blue-200);
    }
    .nc__facts dt {
      font: 600 11px var(--ar-font-sans);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--ar-ink-500);
    }
    .nc__facts dd {
      margin: 2px 0 0;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--ar-ink-900);
      overflow-wrap: anywhere;
    }

    /* Field grids */
    .nc__compact {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 280px));
      gap: 16px;
    }
    .nc__fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
    }
    .nc__ship-pick {
      max-width: 420px;
    }
    .nc__area {
      height: auto;
      min-height: 96px;
      padding: 10px 12px;
      line-height: 1.5;
      resize: vertical;
    }
    .nc .nc__bad {
      border-color: var(--ar-red-600);
    }

    /* Items: one card per item */
    .nc__items {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .nc__item {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-300);
      border-radius: 10px;
    }
    .nc__item--bad {
      border-color: var(--ar-red-200);
    }
    .nc__item-head {
      display: flex;
      align-items: flex-end;
      gap: 12px;
    }
    .nc__badge {
      flex: none;
      display: inline-grid;
      place-items: center;
      width: 28px;
      height: 28px;
      margin-bottom: 4px;
      border-radius: 50%;
      background: var(--ar-primary);
      color: #fff;
      font: 700 12.5px var(--ar-font-sans);
    }
    .nc__item-name {
      flex: 1;
      min-width: 0;
    }
    .nc__item-grid {
      display: grid;
      grid-template-columns: 1.1fr 2.4fr 0.9fr 0.9fr 1fr;
      gap: 12px 14px;
      align-items: start;
    }
    .nc__item-grid > * {
      min-width: 0;
    }
    .nc__x {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 12px;
      border: 1px solid var(--ar-line-300);
      border-radius: 8px;
      background: var(--ar-white);
      color: var(--ar-red-600);
      font: 600 12.5px var(--ar-font-sans);
      cursor: pointer;
    }
    .nc__x:hover:not(:disabled) {
      background: var(--ar-red-100);
      border-color: var(--ar-red-200);
    }
    .nc__x:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .nc__x-text {
      display: none;
    }
    .nc__add {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      align-self: flex-start;
      height: 38px;
      padding: 0 16px;
      border: 1px dashed var(--ar-blue-600);
      border-radius: 8px;
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
      font: 600 13px var(--ar-font-sans);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .nc__add:hover {
      background: var(--ar-blue-200);
    }
    .nc__add--head {
      display: none;
    }

    /* Overview */
    .nc__ov {
      gap: 12px;
      padding: 0;
      overflow: hidden;
    }
    .nc__ov-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 14px 18px;
      border: 0;
      background: none;
      text-align: left;
      cursor: default;
      font-family: inherit;
    }
    .nc__ov-title {
      font: 700 11px var(--ar-font-sans);
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--ar-ink-500);
    }
    .nc__ov-brief,
    .nc__ov-chev {
      display: none;
    }
    .nc__ov-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 0 18px 18px;
    }
    .nc__dl {
      display: flex;
      flex-direction: column;
      margin: 0;
    }
    .nc__dl > div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid var(--ar-line-200);
    }
    .nc__dl > div:last-child {
      border-bottom: 0;
    }
    .nc__dl dt {
      flex: none;
      font-size: 12.5px;
      color: var(--ar-ink-500);
    }
    .nc__dl dd {
      margin: 0;
      min-width: 0;
      text-align: right;
      font-size: 13px;
      font-weight: 600;
      color: var(--ar-ink-900);
      overflow-wrap: anywhere;
    }
    .nc__dl dd.nc__none {
      font-weight: 400;
      color: var(--ar-ink-400);
    }
    .nc__dl dd.nc__badtxt {
      color: var(--ar-red-600);
    }
    .nc__ready {
      padding: 12px 14px;
      border-radius: 8px;
      background: var(--ar-amber-100, var(--ar-bg-100));
      border: 1px solid var(--ar-amber-200);
    }
    .nc__ready--ok {
      background: var(--ar-green-100);
      border-color: var(--ar-green-200, var(--ar-green-500));
    }
    .nc__ready-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font: 650 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .nc__ready-list {
      margin: 8px 0 0;
      padding-left: 22px;
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--ar-ink-700);
    }

    /* Action bar */
    .nc__bar {
      position: sticky;
      bottom: 0;
      z-index: 3;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 10px 16px;
      margin: 0 calc(var(--nc-pad) * -1);
      padding: 12px var(--nc-pad) calc(12px + env(safe-area-inset-bottom, 0px));
      background: var(--ar-white);
      border-top: 1px solid var(--ar-line-300);
      box-shadow: 0 -4px 12px rgba(16, 24, 40, 0.05);
    }
    .nc__bar-btns {
      display: flex;
      gap: 8px;
    }
    .nc__bar-btns > button {
      min-height: 40px;
      min-width: 110px;
    }
    .nc__err {
      flex: 1 1 260px;
      margin: 0;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-red-600);
    }

    /* Laptops: keep the overview from getting cramped */
    @media (max-width: 1439px) {
      .nc__item-grid {
        grid-template-columns: 1fr 2fr 1fr;
      }
      .nc__f-desc {
        grid-column: span 2;
        order: 2;
      }
      .nc__f-no {
        order: 1;
      }
      .nc__f-hsn,
      .nc__f-qty,
      .nc__f-unit {
        order: 3;
      }
    }

    /* Tablets and below: one column; the overview follows the form and folds away */
    @media (max-width: 1199px) {
      .nc__layout {
        grid-template-columns: minmax(0, 1fr);
      }
      .nc__side {
        position: static;
        max-height: none;
        overflow: visible;
      }
      .nc__ov-toggle {
        cursor: pointer;
      }
      .nc__ov-brief {
        display: block;
        flex: 1;
        min-width: 0;
        text-align: right;
        font-size: 12.5px;
        color: var(--ar-ink-500);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .nc__ov-chev {
        display: inline-block;
        flex: none;
        color: var(--ar-ink-500);
        transition: transform 0.2s ease;
      }
      .nc__ov-toggle[aria-expanded='true'] .nc__ov-chev {
        transform: rotate(180deg);
      }
      .nc__ov-body {
        display: none;
      }
      .nc__ov-body--open {
        display: flex;
      }
      .nc__add--head {
        display: inline-flex;
        height: 34px;
        padding: 0 12px;
      }
      .nc__card > .nc__add {
        display: none;
      }
    }

    /* Large phones and small tablets */
    @media (max-width: 767px) {
      .nc__compact,
      .nc__fields {
        grid-template-columns: minmax(0, 1fr);
      }
      .nc__ship-pick {
        max-width: none;
      }
      .nc__item-head {
        flex-wrap: wrap;
      }
      .nc__item-name {
        flex-basis: calc(100% - 44px);
      }
      .nc__x {
        order: 3;
        flex: 1 1 100%;
        justify-content: center;
        height: 40px;
      }
      .nc__x-text {
        display: inline;
      }
      .nc__item-grid {
        grid-template-columns: 1fr 1fr;
      }
      .nc__f-no,
      .nc__f-desc,
      .nc__f-hsn {
        grid-column: 1 / -1;
        order: 0;
      }
      .nc__f-qty,
      .nc__f-unit {
        order: 1;
      }
      .nc .ar-field__input {
        min-height: 42px;
      }
      .nc__add--head {
        display: none;
      }
      .nc__card > .nc__add {
        display: inline-flex;
        align-self: stretch;
        justify-content: center;
        height: 44px;
      }
      .nc__bar {
        flex-direction: column;
        align-items: stretch;
      }
      .nc__bar-btns > button {
        flex: 1;
        min-height: 44px;
      }
    }

    /* Short screens (small laptops, landscape tablets): the overview scrolls with the page, so nothing is clipped. */
    @media (max-height: 760px) {
      .nc__side {
        position: static;
        max-height: none;
        overflow: visible;
      }
    }

    @media (min-width: 1920px) {
      .nc__fields {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .nc__card,
      .nc__ov {
        animation: none;
      }
      .nc__ov-chev,
      .nc__add {
        transition: none;
      }
    }
    @media (forced-colors: active) {
      .nc__card,
      .nc__ov,
      .nc__item,
      .nc__bar {
        border: 1px solid CanvasText;
      }
    }
  `,
})
export class ArNewDeliveryChallan {
  private readonly api = inject(DeliveryChallanService);
  protected readonly catalogue = inject(CatalogueSearch);

  /** The challan saved, or null when cancelled. */
  readonly closed = output<DeliveryChallanDto | null>();
  /** The customer to start with, e.g. from an account's Customer 360 (?customer=…&customerName=…). */
  readonly initialCustomer = input<PickerOption | null>(null);
  /** A draft challan to edit; its customer stays fixed. */
  readonly editing = input<DeliveryChallanDto | null>(null);

  protected readonly types = CHALLAN_TYPES;
  private readonly pickLists = inject(PickListStore);
  private readonly challanUnits = computed(() => this.pickLists.texts('sales.challan-unit'));
  protected units(line: ChallanLine): readonly string[] {
    return unitsFor(line, this.challanUnits());
  }

  protected readonly choice = signal<SalesCustomerChoice | null>(null);
  protected readonly party = signal<SalesParty>(EMPTY_PARTY);
  protected readonly type = signal<DeliveryChallanType>(DeliveryChallanType.SupplyAgainstOrder);
  protected readonly challanDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly shippingAddress = signal('');
  protected readonly shipIndex = signal(-1);
  protected readonly transporter = signal('');
  protected readonly vehicle = signal('');
  protected readonly lr = signal('');
  protected readonly eway = signal('');
  protected readonly remarks = signal('');
  /** The stock location the goods leave from; the challan then issues them from that location's stock. */
  protected readonly locationId = signal('');
  protected readonly locations = signal<StockLocationDto[]>([]);
  private readonly inventoryApi = inject(InventoryService);
  private readonly locationsLoad = firstValueFrom(
    this.inventoryApi.getLocations({ skipHandleError: true }),
  )
    .then((l) => this.locations.set((l ?? []).filter((x) => x.isActive)))
    .catch(() => undefined);
  protected readonly lines = signal<ChallanLine[]>([blankChallanLine()]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  // ---- What the overview and the inline checks show: all derived from the form, nothing stored or sent ----------------------
  /** The overview folds away on a phone and tablet; on a large screen it is always open. */
  protected readonly overviewOpen = signal(false);

  protected readonly filled = computed(() => filledChallanLines(this.lines()));

  protected readonly typeLabel = computed(
    () => this.types.find((t) => t.value === this.type())?.label ?? '',
  );

  protected readonly orderNumber = computed(
    () => this.openOrders().find((o) => o.id === this.orderId())?.orderNumber ?? null,
  );

  protected readonly dateLabel = computed(() => {
    const d = new Date(`${this.challanDate()}T00:00:00`);
    return isNaN(d.getTime())
      ? 'Not set'
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  protected readonly locationName = computed(
    () => this.locations().find((l) => l.id === this.locationId())?.name ?? null,
  );

  /** The account when there is one, else the person: what the goods are going to. */
  protected readonly customerLabel = computed(() => {
    const e = this.editing();
    if (e) return e.customerAccountName || e.customerName || null;
    return this.party().accountName || this.choice()?.customer?.label || null;
  });

  /** The person on the account; not repeated when the customer is just that person. */
  protected readonly contactPerson = computed(() => {
    const e = this.editing();
    const person = e ? e.customerName : this.choice()?.customer?.label;
    return person && person !== this.customerLabel() ? person : null;
  });

  /** Quantities add up per unit, since 5 Nos and 3 Kg are not 8 of anything. */
  protected readonly totalQuantity = computed(() => {
    const sums = new Map<string, number>();
    for (const l of this.filled()) {
      if (l.quantity > 0) sums.set(l.unitOfMeasure, (sums.get(l.unitOfMeasure) ?? 0) + l.quantity);
    }
    return sums.size
      ? [...sums].map(([unit, n]) => `${Number(n.toFixed(3))} ${unit}`).join(' · ')
      : 'None yet';
  });

  protected readonly ewayState = computed<'none' | 'ok' | 'bad'>(() => {
    const e = this.eway().trim();
    return !e ? 'none' : /^[0-9]{12}$/.test(e) ? 'ok' : 'bad';
  });

  /** A filled item whose quantity is not above zero: the same rule save() enforces. */
  protected lineQtyBad(l: ChallanLine): boolean {
    return filledChallanLines([l]).length > 0 && !(l.quantity > 0);
  }

  /** What is still missing before a save: the same checks save() makes, in the same words. */
  protected readonly problems = computed(() => {
    const out: string[] = [];
    if (!this.editing() && !this.choice()?.customer) {
      out.push(
        this.choice()?.mode === 'contact'
          ? 'Pick the customer the goods are going to.'
          : 'Choose the account and the contact person.',
      );
    }
    if (!this.filled().length) out.push('Add at least one item.');
    else if (this.filled().some((l) => !(l.quantity > 0))) {
      out.push('Every item needs a quantity above zero.');
    }
    if (this.ewayState() === 'bad') out.push('An e-way bill number has 12 digits.');
    return out;
  });

  /** The one-line summary shown while the overview is folded. */
  protected readonly brief = computed(() => {
    const n = this.filled().length;
    return `${n} ${n === 1 ? 'item' : 'items'} · ${this.problems().length ? 'Needs attention' : 'Ready'}`;
  });

  /** A new customer choice; a new account (or none) refills the site address from it. */
  protected onCustomer(choice: SalesCustomerChoice): void {
    const changed = choice.customer?.id !== this.choice()?.customer?.id;
    this.choice.set(choice);
    this.error.set(null);
    if (changed) void this.loadOrders(choice);
    if (choice.party !== this.party()) {
      this.party.set(choice.party);
      this.chooseShipTo(defaultShipIndex(choice.party));
    }
  }

  private readonly ordersApi = inject(SalesOrderService);
  /** The customer's orders with goods still to go out; a challan against one counts towards it. */
  protected readonly openOrders = signal<SalesOrderDto[]>([]);
  protected readonly orderId = signal('');

  private async loadOrders(choice: SalesCustomerChoice): Promise<void> {
    this.openOrders.set([]);
    this.orderId.set('');
    const customerId = choice.customer?.id;
    if (!customerId) return;
    try {
      const page = await firstValueFrom(
        this.ordersApi.getList({
          customerId,
          customerAccountId: choice.accountId ?? undefined,
          maxResultCount: 100,
        }),
      );
      this.openOrders.set((page.items ?? []).filter((o) => OPEN_ORDER_STATUSES.includes(o.status)));
    } catch {
      // Without the list the challan is simply not linked to an order.
    }
  }

  /** Choosing an order fills the lines with what is still to dispatch on it. */
  protected async pickOrder(id: string): Promise<void> {
    this.orderId.set(id);
    if (!id) {
      this.lines.set([blankChallanLine()]);
      return;
    }
    try {
      const order = await firstValueFrom(this.ordersApi.get(id));
      const lines = challanLinesFromOrder(order);
      this.lines.set(lines.length ? lines : [blankChallanLine()]);
      if (!lines.length) this.error.set('Everything on this order has already been dispatched.');
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The order could not be loaded.'));
    }
  }

  protected chooseShipTo(index: number): void {
    this.shipIndex.set(index);
    this.shippingAddress.set(shipToText(this.party(), index));
  }

  protected addLine(): void {
    this.lines.update((ls) => [...ls, blankChallanLine()]);
  }

  protected removeLine(index: number): void {
    this.lines.update((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== index) : ls));
  }

  protected patchLine(index: number, patch: Partial<ChallanLine>): void {
    this.lines.update((ls) => ls.map((l, i) => (i === index ? editChallanLine(l, patch) : l)));
  }

  protected pickItem(index: number, p: ProductDto): void {
    this.lines.update((ls) => ls.map((l, i) => (i === index ? challanLineFromProduct(p, l) : l)));
  }

  constructor() {
    // An edit starts from the saved challan.
    effect(() => {
      const c = this.editing();
      if (!c) return;
      untracked(() => {
        this.type.set(c.type);
        this.orderId.set(c.salesOrderId ?? '');
        this.challanDate.set((c.challanDateUtc ?? new Date().toISOString()).slice(0, 10));
        this.shippingAddress.set(c.shippingAddress ?? '');
        this.transporter.set(c.transporterName ?? '');
        this.vehicle.set(c.vehicleNumber ?? '');
        this.lr.set(c.lrNumber ?? '');
        this.eway.set(c.eWayBillNumber ?? '');
        this.remarks.set(c.remarks ?? '');
        this.locationId.set(c.dispatchFromLocationId ?? '');
        this.lines.set(
          c.lines.length ? c.lines.map(challanLineFromSaved) : [blankChallanLine()],
        );
      });
    });
  }

  protected async save(): Promise<void> {
    const editing = this.editing();
    const choice = this.choice();
    const customer = editing
      ? { id: editing.customerId }
      : choice?.customer;
    if (!customer) {
      this.error.set(
        choice?.mode !== 'contact'
          ? 'Choose the account and the contact person the goods are going to.'
          : 'Pick the customer the goods are going to.',
      );
      return;
    }
    const filled = filledChallanLines(this.lines());
    if (!filled.length) {
      this.error.set('Add at least one item with a name, item number or description.');
      return;
    }
    if (filled.some((l) => !(l.quantity > 0))) {
      this.error.set('Every item needs a quantity above zero.');
      return;
    }
    const eway = this.eway().trim();
    if (eway && !/^[0-9]{12}$/.test(eway)) {
      this.error.set('An e-way bill number has 12 digits.');
      return;
    }

    const input: CreateDeliveryChallanDto = {
      type: this.type(),
      salesOrderId: this.orderId() || undefined,
      customerId: customer.id,
      customerAccountId: editing
        ? editing.customerAccountId
        : (choice?.accountId ?? undefined),
      challanNumber: editing?.challanNumber,
      challanDateUtc: new Date(this.challanDate()).toISOString(),
      shippingAddress: this.shippingAddress().trim() || undefined,
      transporterName: this.transporter().trim() || undefined,
      vehicleNumber: this.vehicle().trim() || undefined,
      lrNumber: this.lr().trim() || undefined,
      eWayBillNumber: eway || undefined,
      remarks: this.remarks().trim() || undefined,
      dispatchFromLocationId: this.locationId() || undefined,
      lines: toChallanLines(filled),
    };

    this.busy.set(true);
    this.error.set(null);
    try {
      const created = await firstValueFrom(
        editing?.id ? this.api.update(editing.id, input) : this.api.create(input),
      );
      this.closed.emit(created);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The challan could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
