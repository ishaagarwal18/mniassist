import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import { InventoryService, StockLocationDto } from '../../proxy/inventory/inventory.service';
import {
  PurchaseOrderDto,
  PurchasingService,
  ReorderSuggestionDto,
  SaveSupplierInput,
  SupplierDto,
} from '../../proxy/inventory/purchasing.service';
import { ProductService } from '../../proxy/library/product.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArDateInput } from '../../ui/date-input';
import { ArSelect } from '../../ui/select';
import { rupees } from '../reorder/reorder-logic';
import { DraftLine, ORDER_STATE, draftTotal, readLines } from './purchasing-logic';
import { parseLots, qty } from './stock-logic';

type Tab = 'orders' | 'suggestions' | 'suppliers';

interface ReceiveRow {
  lineId: string;
  partNumber: string;
  description: string;
  outstanding: number;
  tracking: 'None' | 'Batch' | 'Serial';
  quantity: string;
  numbers: string;
  expiry: string;
}

const MOCK_SUPPLIERS: SupplierDto[] = [
  {
    id: 's1',
    name: 'Pune Filtration Supplies',
    gstin: '27AABCU9603R1ZM',
    leadDays: 7,
    isActive: true,
  },
  { id: 's2', name: 'Deccan Drives & Controls', leadDays: 14, isActive: true },
];

const MOCK_ORDERS: PurchaseOrderDto[] = [
  {
    id: 'o1',
    reference: 'PO-2026-0012',
    supplierId: 's1',
    supplierName: 'Pune Filtration Supplies',
    locationId: 'l1',
    locationName: 'Main store',
    state: 'PartlyReceived',
    expectedOn: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    creationTime: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    subtotalInPaise: 31_000_00,
    lines: [
      {
        id: 'ol1',
        productId: 'p1',
        partNumber: 'AF-2901',
        description: 'Air filter element',
        quantity: 20,
        unitCostInPaise: 1_300_00,
        receivedQuantity: 12,
        outstanding: 8,
        tracking: 'None',
      },
      {
        id: 'ol2',
        productId: 'p2',
        partNumber: 'OF-1625',
        description: 'Oil filter',
        quantity: 5,
        unitCostInPaise: 1_000_00,
        receivedQuantity: 0,
        outstanding: 5,
        tracking: 'None',
      },
    ],
  },
];

/**
 * Buying stock: purchase orders from draft to received, receipts posted into stock at the order's cost (which moves each part's
 * average cost), suppliers, and what to reorder from minimum levels.
 */
@Component({
  selector: 'ar-purchasing',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, RouterLink, ArSelect, ArDateInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Purchasing"
      [subtitle]="subtitle()"
      help="Orders to suppliers, received into stock at their cost. Stock is valued at moving average cost, the method Tally's Average Cost and SAP Business One's Moving Average use. Sent orders count as on order on the Stock page."
    >
      @if (canManage) {
        <button ar-button type="button" variant="ghost" (click)="openSupplier(null)">
          New supplier
        </button>
        <button ar-button type="button" variant="primary" icon="plus" (click)="openOrder(null)">
          New order
        </button>
      }
    </ar-topbar>

    <div class="pu ar-scroll">
      @if (error(); as e) {
        <p class="pu__err" role="alert">{{ e }}</p>
      }
      @if (notice(); as n) {
        <p class="pu__ok" role="status">{{ n }}</p>
      }

      <div class="tabs" role="tablist">
        @for (t of tabs; track t.id) {
          <button
            type="button"
            role="tab"
            class="tab"
            [attr.aria-selected]="tab() === t.id"
            [class.tab--on]="tab() === t.id"
            (click)="tab.set(t.id)"
          >
            {{ t.label }}
            @if (t.id === 'suggestions' && suggestions().length) {
              <span class="tab__n">{{ suggestions().length }}</span>
            }
          </button>
        }
      </div>

      @switch (tab()) {
        @case ('orders') {
          @if (orders().length === 0) {
            <p class="pu__hint">
              No purchase orders yet. Start one with New order, or from the Reorder suggestions tab.
            </p>
          } @else {
            <div class="tbl">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Supplier</th>
                    <th scope="col">Expected</th>
                    <th scope="col" class="num">Value</th>
                    <th scope="col">To come</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span class="sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (o of orders(); track o.id) {
                    <tr>
                      <td>
                        <b class="ar-mono">{{ o.reference }}</b>
                        <span class="sub"
                          >{{ day(o.creationTime) }} · into {{ o.locationName }}</span
                        >
                      </td>
                      <td>{{ o.supplierName }}</td>
                      <td>{{ o.expectedOn ? day(o.expectedOn) : '—' }}</td>
                      <td class="num">{{ money(o.subtotalInPaise) }}</td>
                      <td>
                        @for (l of o.lines; track l.id) {
                          @if (l.outstanding > 0 && o.state !== 'Cancelled') {
                            <span class="sub"
                              ><span class="ar-mono">{{ l.partNumber }}</span>
                              {{ n(l.outstanding) }} of {{ n(l.quantity) }}</span
                            >
                          }
                        }
                      </td>
                      <td>
                        <ar-chip [tone]="stateOf(o).tone" [dot]="true">{{
                          stateOf(o).label
                        }}</ar-chip>
                      </td>
                      <td class="acts">
                        @if (canManage) {
                          @if (o.state === 'Draft') {
                            <button type="button" class="act" (click)="openOrder(o)">Edit</button>
                            <button type="button" class="act" (click)="markSent(o)">
                              Mark sent
                            </button>
                          }
                          @if (o.state === 'Sent' || o.state === 'PartlyReceived') {
                            <button type="button" class="act" (click)="openReceive(o)">
                              Receive
                            </button>
                          }
                          @if (o.state === 'Draft' || o.state === 'Sent') {
                            <button type="button" class="act" (click)="cancel(o)">Cancel</button>
                          }
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
        @case ('suggestions') {
          @if (suggestions().length === 0) {
            <p class="pu__hint">
              Nothing to reorder: every part with a minimum level has enough available or on order.
              Set minimum levels on the <a routerLink="/stock">Stock</a> page.
            </p>
          } @else {
            <p class="pu__hint">
              Parts below their minimum, counting what is on order. The suggestion brings each back
              to twice its minimum.
            </p>
            <div class="tbl">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Part</th>
                    <th scope="col" class="num">Available</th>
                    <th scope="col" class="num">On order</th>
                    <th scope="col" class="num">Minimum</th>
                    <th scope="col" class="num">Buy</th>
                    <th scope="col">Last bought</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of suggestions(); track s.productId) {
                    <tr>
                      <td>
                        <b class="ar-mono">{{ s.partNumber }}</b>
                        <span class="sub">{{ s.name }}</span>
                      </td>
                      <td class="num">{{ n(s.available) }}</td>
                      <td class="num">{{ s.onOrder ? n(s.onOrder) : '—' }}</td>
                      <td class="num">{{ n(s.minLevel) }}</td>
                      <td class="num">
                        <b>{{ n(s.suggested) }}</b>
                      </td>
                      <td>
                        {{ s.lastSupplierName || '—' }}
                        @if (s.lastCostInPaise != null) {
                          <span class="sub">{{ money(s.lastCostInPaise) }} each</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (canManage) {
              <div>
                <button ar-button type="button" variant="primary" (click)="orderSuggestions()">
                  Start an order for these
                </button>
              </div>
            }
          }
        }
        @case ('suppliers') {
          @if (suppliers().length === 0) {
            <p class="pu__hint">No suppliers yet. Add one with New supplier.</p>
          } @else {
            <div class="tbl">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Supplier</th>
                    <th scope="col">GSTIN</th>
                    <th scope="col">Contact</th>
                    <th scope="col" class="num">Lead time</th>
                    <th scope="col"><span class="sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of suppliers(); track s.id) {
                    <tr [class.off]="!s.isActive">
                      <td>
                        <b>{{ s.name }}</b>
                        @if (!s.isActive) {
                          <span class="sub">Not in use</span>
                        }
                      </td>
                      <td class="ar-mono">{{ s.gstin || '—' }}</td>
                      <td>
                        {{ s.phone || '' }}
                        @if (s.email) {
                          <span class="sub">{{ s.email }}</span>
                        }
                      </td>
                      <td class="num">{{ s.leadDays != null ? s.leadDays + ' days' : '—' }}</td>
                      <td class="acts">
                        @if (canManage) {
                          <button type="button" class="act" (click)="openSupplier(s)">Edit</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </div>

    @if (editing(); as ed) {
      <ar-dialog
        [title]="ed.id ? 'Edit ' + ed.reference : 'New purchase order'"
        (dismiss)="editing.set(null)"
      >
        <div class="pu__grid">
          <label class="ar-field" for="pu-supplier">
            <span class="ar-field__label">Supplier</span>
            <select
              required
              id="pu-supplier"
              class="ar-field__input"
              [value]="ed.supplierId"
              (change)="patchOrder({ supplierId: $any($event.target).value })"
            >
              <option value="">Choose…</option>
              @for (s of activeSuppliers(); track s.id) {
                <option [value]="s.id">{{ s.name }}</option>
              }
            </select>
          </label>
          <label class="ar-field" for="pu-location">
            <span class="ar-field__label">Receive into</span>
            <select
              required
              id="pu-location"
              class="ar-field__input"
              [value]="ed.locationId"
              (change)="patchOrder({ locationId: $any($event.target).value })"
            >
              @for (l of locations(); track l.id) {
                <option [value]="l.id">{{ l.name }}</option>
              }
            </select>
          </label>
          <label class="ar-field" for="pu-expected">
            <span class="ar-field__label"
              >Expected <span class="ar-field__opt">(blank: from the lead time)</span></span
            >
            <input
              id="pu-expected"
              class="ar-field__input"
              type="date"
              [value]="ed.expectedOn"
              (input)="patchOrder({ expectedOn: $any($event.target).value })"
            />
          </label>
        </div>

        <div class="pu__lines">
          @for (l of ed.lines; track l.productId; let i = $index) {
            <div class="pu__line">
              <span class="pu__part"
                ><b class="ar-mono">{{ l.partNumber }}</b>
                <span class="sub">{{ l.name }}</span></span
              >
              <label class="ar-field" [for]="'pu-q-' + i">
                <span class="ar-field__label">Quantity</span>
                <input
                  required
                  class="ar-field__input"
                  inputmode="decimal"
                  [id]="'pu-q-' + i"
                  [value]="l.quantity"
                  (input)="patchLine(i, { quantity: $any($event.target).value })"
                />
              </label>
              <label class="ar-field" [for]="'pu-c-' + i">
                <span class="ar-field__label">₹ each</span>
                <input
                  required
                  class="ar-field__input"
                  inputmode="decimal"
                  [id]="'pu-c-' + i"
                  [value]="l.cost"
                  (input)="patchLine(i, { cost: $any($event.target).value })"
                />
              </label>
              <button type="button" class="act" (click)="removeLine(i)">Remove</button>
            </div>
          }
        </div>

        <label class="ar-field" for="pu-find">
          <span class="ar-field__label">Add a part</span>
          <input
            id="pu-find"
            class="ar-field__input"
            placeholder="Search the catalogue by part number or name"
            [value]="productQuery()"
            (input)="findProducts($any($event.target).value)"
          />
        </label>
        @if (products().length) {
          <ul class="pick">
            @for (p of products(); track p.productId) {
              <li>
                <button type="button" class="act" (click)="addLine(p)">
                  <b class="ar-mono">{{ p.partNumber }}</b> {{ p.name }}
                </button>
              </li>
            }
          </ul>
        }
        <label class="ar-field" for="pu-note">
          <span class="ar-field__label">Note <span class="ar-field__opt">(optional)</span></span>
          <input
            id="pu-note"
            class="ar-field__input"
            [value]="ed.note"
            (input)="patchOrder({ note: $any($event.target).value })"
          />
        </label>
        <p class="pu__total">{{ money(total()) }} before GST</p>
        @if (dialogError(); as e) {
          <p class="pu__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="editing.set(null)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="saveOrder()"
          >
            {{ busy() ? 'Saving…' : 'Save draft' }}
          </button>
        </div>
      </ar-dialog>
    }

    @if (receiving(); as r) {
      <ar-dialog [title]="'Receive ' + r.order.reference" (dismiss)="receiving.set(null)">
        <p class="pu__hint">
          Enter what arrived. It goes into {{ r.order.locationName }} at the order's cost, which
          moves each part's average cost.
        </p>
        @for (row of r.rows; track row.lineId; let i = $index) {
          <div class="pu__recv">
            <span class="pu__part"
              ><b class="ar-mono">{{ row.partNumber }}</b>
              <span class="sub"
                >{{ row.description }} · {{ n(row.outstanding) }} to come</span
              ></span
            >
            <label class="ar-field" [for]="'pu-rq-' + i">
              <span class="ar-field__label">Arrived</span>
              <input
                required
                class="ar-field__input"
                inputmode="decimal"
                [id]="'pu-rq-' + i"
                [value]="row.quantity"
                (input)="patchReceive(i, { quantity: $any($event.target).value })"
              />
            </label>
            @if (row.tracking === 'Serial') {
              <label class="ar-field pu__wide" [for]="'pu-rn-' + i">
                <span class="ar-field__label"
                  >Serial numbers, one per line <span class="ar-field__opt">optional</span></span
                >
                <textarea
                  class="ar-field__input ar-mono"
                  rows="3"
                  [id]="'pu-rn-' + i"
                  [value]="row.numbers"
                  (input)="patchReceive(i, { numbers: $any($event.target).value })"
                ></textarea>
              </label>
            }
            @if (row.tracking === 'Batch') {
              <label class="ar-field" [for]="'pu-rn-' + i">
                <span class="ar-field__label"
                  >Batch <span class="ar-field__opt">optional</span></span
                >
                <input
                  class="ar-field__input ar-mono"
                  [id]="'pu-rn-' + i"
                  [value]="row.numbers"
                  (input)="patchReceive(i, { numbers: $any($event.target).value })"
                />
              </label>
              <label class="ar-field" [for]="'pu-re-' + i">
                <span class="ar-field__label"
                  >Expiry <span class="ar-field__opt">optional</span></span
                >
                <input
                  class="ar-field__input"
                  type="date"
                  [id]="'pu-re-' + i"
                  [value]="row.expiry"
                  (input)="patchReceive(i, { expiry: $any($event.target).value })"
                />
              </label>
            }
          </div>
        }
        <label class="ar-field" for="pu-rnote">
          <span class="ar-field__label"
            >Supplier's invoice or delivery note <span class="ar-field__opt">(optional)</span></span
          >
          <input
            id="pu-rnote"
            class="ar-field__input"
            [value]="receiveNote()"
            (input)="receiveNote.set($any($event.target).value)"
          />
        </label>
        @if (dialogError(); as e) {
          <p class="pu__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="receiving.set(null)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="saveReceive()"
          >
            {{ busy() ? 'Saving…' : 'Receive' }}
          </button>
        </div>
      </ar-dialog>
    }

    @if (supplier(); as s) {
      <ar-dialog [title]="s.id ? 'Edit supplier' : 'New supplier'" (dismiss)="supplier.set(null)">
        <label class="ar-field" for="pu-sname">
          <span class="ar-field__label">Name</span>
          <input
            required
            maxlength="128"
            id="pu-sname"
            class="ar-field__input"
            [value]="s.form.name"
            (input)="patchSupplier({ name: $any($event.target).value })"
          />
        </label>
        <div class="pu__grid">
          <label class="ar-field" for="pu-sgst">
            <span class="ar-field__label">GSTIN <span class="ar-field__opt">(optional)</span></span>
            <input
              id="pu-sgst"
              class="ar-field__input ar-mono"
              maxlength="15"
              [value]="s.form.gstin ?? ''"
              (input)="patchSupplier({ gstin: $any($event.target).value })"
            />
          </label>
          <label class="ar-field" for="pu-slead">
            <span class="ar-field__label"
              >Lead time, days <span class="ar-field__opt">(optional)</span></span
            >
            <input
              id="pu-slead"
              class="ar-field__input"
              inputmode="numeric"
              [value]="s.form.leadDays ?? ''"
              (input)="patchSupplier({ leadDays: toDays($any($event.target).value) })"
            />
          </label>
          <label class="ar-field" for="pu-sphone">
            <span class="ar-field__label">Phone <span class="ar-field__opt">(optional)</span></span>
            <input
              id="pu-sphone"
              class="ar-field__input"
              [value]="s.form.phone ?? ''"
              (input)="patchSupplier({ phone: $any($event.target).value })"
            />
          </label>
          <label class="ar-field" for="pu-semail">
            <span class="ar-field__label">Email <span class="ar-field__opt">(optional)</span></span>
            <input
              id="pu-semail"
              class="ar-field__input"
              type="email"
              [value]="s.form.email ?? ''"
              (input)="patchSupplier({ email: $any($event.target).value })"
            />
          </label>
        </div>
        <label class="ar-field" for="pu-saddr">
          <span class="ar-field__label">Address <span class="ar-field__opt">(optional)</span></span>
          <input
            id="pu-saddr"
            class="ar-field__input"
            [value]="s.form.address ?? ''"
            (input)="patchSupplier({ address: $any($event.target).value })"
          />
        </label>
        <label class="pu__check" for="pu-sactive">
          <input
            id="pu-sactive"
            type="checkbox"
            [checked]="s.form.isActive"
            (change)="patchSupplier({ isActive: $any($event.target).checked })"
          />
          In use: offered on new orders
        </label>
        @if (dialogError(); as e) {
          <p class="pu__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="supplier.set(null)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="saveSupplier()"
          >
            {{ busy() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .pu {
      flex: 1;
      min-height: 0;
      padding: 18px 22px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .pu__hint {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      max-width: 75ch;
    }
    .pu__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .pu__ok {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-good-600, #067647);
    }
    .tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--ar-line-200, #e5e7eb);
    }
    .tab {
      border: 0;
      background: none;
      padding: 8px 12px;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tab--on {
      color: var(--ar-ink-900);
      border-bottom-color: var(--ar-teal-700, #0f766e);
    }
    .tab__n {
      margin-left: 4px;
      font-size: 11.5px;
      padding: 0 6px;
      border-radius: 999px;
      background: var(--ar-blue-100);
      color: var(--ar-amber-800, #92400e);
    }
    .tbl {
      overflow-x: auto;
      border: 1px solid var(--ar-line-200, #e5e7eb);
      border-radius: 10px;
      background: var(--ar-surface, #fff);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    th,
    td {
      text-align: left;
      vertical-align: top;
      padding: 8px 12px;
      border-top: 1px solid var(--ar-line-200, #e5e7eb);
    }
    thead th {
      border-top: 0;
      font: 600 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .sub {
      display: block;
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    .off {
      opacity: 0.6;
    }
    .acts {
      white-space: nowrap;
      text-align: right;
    }
    .act {
      border: 0;
      background: none;
      color: var(--ar-teal-700, #0f766e);
      font: 500 12.5px var(--ar-font-sans);
      cursor: pointer;
      padding: 2px 6px;
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .pu__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
    }
    .pu__lines {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .pu__line,
    .pu__recv {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto;
      gap: 10px;
      align-items: end;
      padding-block: 6px;
      border-top: 1px solid var(--ar-line-200, #e5e7eb);
    }
    .pu__recv {
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
    }
    .pu__wide {
      grid-column: span 2;
    }
    .pu__part {
      min-width: 0;
      align-self: center;
    }
    .pick {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 180px;
      overflow: auto;
    }
    .pu__total {
      margin: 0;
      font: 600 14px var(--ar-font-sans);
      font-variant-numeric: tabular-nums;
    }
    .pu__check {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 400 13px var(--ar-font-sans);
    }
    @media (max-width: 640px) {
      .pu {
        padding-inline: 12px;
      }
      .pu__line,
      .pu__recv {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .pu__wide {
        grid-column: span 2;
      }
    }
  `,
})
export class ArPurchasing {
  private readonly api = inject(PurchasingService);
  private readonly stockApi = inject(InventoryService);
  private readonly productsApi = inject(ProductService);
  private readonly permissions = inject(PermissionService);

  protected readonly canManage = grantedPolicy('AutoReach.Inventory.Manage', this.permissions);
  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'orders', label: 'Orders' },
    { id: 'suggestions', label: 'Reorder suggestions' },
    { id: 'suppliers', label: 'Suppliers' },
  ];
  protected readonly tab = signal<Tab>('orders');
  protected readonly orders = signal<PurchaseOrderDto[]>([]);
  protected readonly suppliers = signal<SupplierDto[]>([]);
  protected readonly suggestions = signal<ReorderSuggestionDto[]>([]);
  protected readonly locations = signal<StockLocationDto[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly dialogError = signal<string | null>(null);

  protected readonly activeSuppliers = computed(() => this.suppliers().filter((s) => s.isActive));
  protected readonly subtitle = computed(() => {
    const open = this.orders().filter((o) => o.state === 'Sent' || o.state === 'PartlyReceived');
    const value = open.reduce(
      (sum, o) =>
        sum + o.lines.reduce((s, l) => s + Math.round(l.outstanding * l.unitCostInPaise), 0),
      0,
    );
    return `${open.length} order${open.length === 1 ? '' : 's'} to come · ${rupees(value)} on order`;
  });

  // Order editor.
  protected readonly editing = signal<{
    id: string | null;
    reference: string;
    supplierId: string;
    locationId: string;
    expectedOn: string;
    note: string;
    lines: DraftLine[];
  } | null>(null);
  protected readonly productQuery = signal('');
  protected readonly products = signal<{ productId: string; partNumber: string; name: string }[]>(
    [],
  );
  protected readonly total = computed(() => draftTotal(this.editing()?.lines ?? []));

  // Receiving.
  protected readonly receiving = signal<{ order: PurchaseOrderDto; rows: ReceiveRow[] } | null>(
    null,
  );
  protected readonly receiveNote = signal('');

  // Supplier editor.
  protected readonly supplier = signal<{ id: string | null; form: SaveSupplierInput } | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    if (environment.useMockData) {
      this.suppliers.set(MOCK_SUPPLIERS);
      this.orders.set(MOCK_ORDERS);
      this.locations.set([{ id: 'l1', name: 'Main store', isActive: true }]);
      return;
    }
    try {
      const [orders, suppliers, suggestions, locations] = await Promise.all([
        firstValueFrom(this.api.getOrders()),
        firstValueFrom(this.api.getSuppliers()),
        firstValueFrom(this.api.getSuggestions()),
        firstValueFrom(this.stockApi.getLocations()),
      ]);
      this.orders.set(orders);
      this.suppliers.set(suppliers);
      this.suggestions.set(suggestions);
      this.locations.set(locations.filter((l) => l.isActive));
    } catch (e: unknown) {
      this.error.set(problem(e, 'Could not load purchasing.'));
    }
  }

  protected money(paise: number): string {
    return rupees(paise);
  }

  protected n(value: number): string {
    return qty(value);
  }

  protected day(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  protected stateOf(o: PurchaseOrderDto) {
    return ORDER_STATE[o.state] ?? { label: o.state, tone: 'neutral' as const };
  }

  protected toDays(text: string): number | null {
    const t = text.trim();
    return /^\d{1,3}$/.test(t) ? Number(t) : null;
  }

  // ---- Orders ----------------------------------------------------------------------------------------------------------------

  protected openOrder(o: PurchaseOrderDto | null, lines: DraftLine[] = []): void {
    this.dialogError.set(null);
    this.productQuery.set('');
    this.products.set([]);
    this.editing.set(
      o
        ? {
            id: o.id,
            reference: o.reference,
            supplierId: o.supplierId,
            locationId: o.locationId,
            expectedOn: o.expectedOn?.slice(0, 10) ?? '',
            note: o.note ?? '',
            lines: o.lines.map((l) => ({
              productId: l.productId,
              partNumber: l.partNumber,
              name: l.description,
              quantity: String(l.quantity),
              cost: String(l.unitCostInPaise / 100),
            })),
          }
        : {
            id: null,
            reference: '',
            supplierId: this.activeSuppliers()[0]?.id ?? '',
            locationId: this.locations()[0]?.id ?? '',
            expectedOn: '',
            note: '',
            lines,
          },
    );
  }

  protected orderSuggestions(): void {
    const list = this.suggestions();
    this.openOrder(
      null,
      list.map((s) => ({
        productId: s.productId,
        partNumber: s.partNumber,
        name: s.name,
        quantity: String(s.suggested),
        cost: s.lastCostInPaise != null ? String(s.lastCostInPaise / 100) : '',
      })),
    );
    const supplier = list.find((s) => s.lastSupplierId)?.lastSupplierId;
    if (supplier) this.patchOrder({ supplierId: supplier });
  }

  protected patchOrder(
    p: Partial<{ supplierId: string; locationId: string; expectedOn: string; note: string }>,
  ): void {
    this.editing.update((e) => (e ? { ...e, ...p } : e));
  }

  protected patchLine(i: number, p: Partial<DraftLine>): void {
    this.editing.update((e) =>
      e ? { ...e, lines: e.lines.map((l, j) => (j === i ? { ...l, ...p } : l)) } : e,
    );
  }

  protected removeLine(i: number): void {
    this.editing.update((e) => (e ? { ...e, lines: e.lines.filter((_, j) => j !== i) } : e));
  }

  protected addLine(p: { productId: string; partNumber: string; name: string }): void {
    this.editing.update((e) =>
      e && !e.lines.some((l) => l.productId === p.productId)
        ? { ...e, lines: [...e.lines, { ...p, quantity: '1', cost: '' }] }
        : e,
    );
    this.products.set([]);
    this.productQuery.set('');
  }

  private productTimer: ReturnType<typeof setTimeout> | null = null;

  protected findProducts(text: string): void {
    this.productQuery.set(text);
    if (this.productTimer) clearTimeout(this.productTimer);
    if (text.trim().length < 2) {
      this.products.set([]);
      return;
    }
    this.productTimer = setTimeout(async () => {
      if (environment.useMockData) {
        this.products.set([{ productId: 'p3', partNumber: 'OS-4410', name: 'Oil separator' }]);
        return;
      }
      try {
        const page = await firstValueFrom(
          this.productsApi.getList({ filter: text.trim(), activeOnly: true, maxResultCount: 10 }),
        );
        this.products.set(
          (page.items ?? []).map((p) => ({
            productId: p.id!,
            partNumber: p.partNumber ?? '',
            name: p.name ?? '',
          })),
        );
      } catch {
        this.products.set([]);
      }
    }, 250);
  }

  protected async saveOrder(): Promise<void> {
    const e = this.editing();
    if (!e) return;
    if (!e.supplierId) {
      this.dialogError.set('Choose a supplier, or add one first.');
      return;
    }
    const read = readLines(e.lines);
    if ('error' in read) {
      this.dialogError.set(read.error);
      return;
    }
    this.busy.set(true);
    this.dialogError.set(null);
    try {
      const input = {
        supplierId: e.supplierId,
        locationId: e.locationId || null,
        expectedOn: e.expectedOn || null,
        note: e.note.trim() || null,
        lines: read.lines,
      };
      if (!environment.useMockData) {
        const saved = await firstValueFrom(
          e.id ? this.api.update(e.id, input) : this.api.create(input),
        );
        this.notice.set(
          `${saved.reference} saved as a draft. Mark it sent once it has gone to the supplier.`,
        );
        await this.load();
      }
      this.editing.set(null);
    } catch (err: unknown) {
      this.dialogError.set(problem(err, 'The order could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async markSent(o: PurchaseOrderDto): Promise<void> {
    await this.act(
      o,
      () => this.api.markSent(o.id),
      `${o.reference} is sent: its parts now count as on order.`,
    );
  }

  protected async cancel(o: PurchaseOrderDto): Promise<void> {
    await this.act(o, () => this.api.cancel(o.id), `${o.reference} cancelled.`);
  }

  private async act(
    o: PurchaseOrderDto,
    call: () => ReturnType<PurchasingService['cancel']>,
    done: string,
  ): Promise<void> {
    this.error.set(null);
    try {
      if (!environment.useMockData) {
        await firstValueFrom(call());
        await this.load();
      }
      this.notice.set(done);
    } catch (e: unknown) {
      this.error.set(problem(e, `${o.reference} could not be changed.`));
    }
  }

  // ---- Receiving -------------------------------------------------------------------------------------------------------------

  protected openReceive(o: PurchaseOrderDto): void {
    this.dialogError.set(null);
    this.receiveNote.set('');
    this.receiving.set({
      order: o,
      rows: o.lines
        .filter((l) => l.outstanding > 0)
        .map((l) => ({
          lineId: l.id,
          partNumber: l.partNumber,
          description: l.description,
          outstanding: l.outstanding,
          tracking: l.tracking,
          quantity: String(l.outstanding),
          numbers: '',
          expiry: '',
        })),
    });
  }

  protected patchReceive(i: number, p: Partial<ReceiveRow>): void {
    this.receiving.update((r) =>
      r ? { ...r, rows: r.rows.map((row, j) => (j === i ? { ...row, ...p } : row)) } : r,
    );
  }

  protected async saveReceive(): Promise<void> {
    const r = this.receiving();
    if (!r) return;
    const lines: {
      lineId: string;
      quantity: number;
      lots?: { number: string; quantity: number; expiresOn?: string | null }[] | null;
    }[] = [];
    for (const row of r.rows) {
      const t = row.quantity.trim();
      if (t === '' || Number(t) === 0) continue;
      if (!/^\d{1,8}(\.\d{1,3})?$/.test(t)) {
        this.dialogError.set(`Enter how many ${row.partNumber} arrived.`);
        return;
      }
      const q = Number(t);
      if (q > row.outstanding) {
        this.dialogError.set(
          `Only ${qty(row.outstanding)} of ${row.partNumber} are still to come.`,
        );
        return;
      }
      const lots = parseLots('receive', row.tracking, q, row.numbers, row.expiry);
      if ('error' in lots) {
        this.dialogError.set(`${row.partNumber}: ${lots.error}`);
        return;
      }
      lines.push({ lineId: row.lineId, quantity: q, lots: lots.lots });
    }
    if (lines.length === 0) {
      this.dialogError.set('Enter what arrived on at least one line.');
      return;
    }
    this.busy.set(true);
    this.dialogError.set(null);
    try {
      if (!environment.useMockData) {
        const saved = await firstValueFrom(
          this.api.receive(r.order.id, { lines, note: this.receiveNote().trim() || null }),
        );
        this.notice.set(
          `${saved.reference}: ${saved.state === 'Received' ? 'all received' : 'received in part'}. Stock and average costs are updated.`,
        );
        await this.load();
      }
      this.receiving.set(null);
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'The delivery could not be received.'));
    } finally {
      this.busy.set(false);
    }
  }

  // ---- Suppliers -------------------------------------------------------------------------------------------------------------

  protected openSupplier(s: SupplierDto | null): void {
    this.dialogError.set(null);
    this.supplier.set({
      id: s?.id ?? null,
      form: {
        name: s?.name ?? '',
        gstin: s?.gstin ?? null,
        phone: s?.phone ?? null,
        email: s?.email ?? null,
        address: s?.address ?? null,
        leadDays: s?.leadDays ?? null,
        isActive: s?.isActive ?? true,
      },
    });
  }

  protected patchSupplier(p: Partial<SaveSupplierInput>): void {
    this.supplier.update((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));
  }

  protected async saveSupplier(): Promise<void> {
    const s = this.supplier();
    if (!s) return;
    this.busy.set(true);
    this.dialogError.set(null);
    try {
      const form = {
        ...s.form,
        name: s.form.name.trim(),
        gstin: s.form.gstin?.trim() || null,
        phone: s.form.phone?.trim() || null,
        email: s.form.email?.trim() || null,
        address: s.form.address?.trim() || null,
      };
      if (!environment.useMockData) {
        await firstValueFrom(
          s.id ? this.api.updateSupplier(s.id, form) : this.api.createSupplier(form),
        );
        await this.load();
      }
      this.notice.set(`${form.name} saved.`);
      this.supplier.set(null);
      this.tab.set('suppliers');
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'The supplier could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}

function problem(e: unknown, fallback: string): string {
  return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
}
