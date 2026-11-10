import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import {
  InventoryService,
  InventorySettingsDto,
  StockImportCheckDto,
  StockItemDto,
  StockKeptIn,
  ErpStockDto,
  StockLocationDto,
  StockLotDto,
  StockMovementDto,
  StockTracking,
} from '../../proxy/inventory/inventory.service';
import { ProductService } from '../../proxy/library/product.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArDateInput } from '../../ui/date-input';
import { ArSelect } from '../../ui/select';
import { parseRupees, rupees } from '../reorder/reorder-logic';
import { MOVE_LABEL, MoveKind, parseLots, parseMove, qty } from './stock-logic';

interface MoveTarget {
  productId: string;
  partNumber: string;
  name: string;
  /** Batch or serial tracking, when known (a part picked from the catalogue search isn't). */
  numbering?: StockTracking;
}

const NUMBERING_LABEL: Record<StockTracking, string> = {
  None: 'Counted only',
  Batch: 'By batch',
  Serial: 'By serial number',
};

/**
 * Stock kept in AutoReach (with the re-order portal add-on): how many of each part at each location, every movement that changed it,
 * minimum levels, counts and imports. Customers on the portal see only “In stock / Limited / On order”; this page is the real figures.
 */
@Component({
  selector: 'ar-stock',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSelect, ArDateInput, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Stock"
      [subtitle]="subtitle()"
      help="Quantities of each catalogue part at each location. Every change is a movement (received, issued, adjusted, counted), so the history explains every figure. Parts on an open re-order request are held (reserved) until the quotation is won or lost; a won quotation issues its parts."
    >
      @if (tracking()) {
        <button ar-button type="button" variant="ghost" icon="search" (click)="openTrace()">
          Trace a number
        </button>
      }
      @if (tracking() && canManage()) {
        <button ar-button type="button" variant="ghost" (click)="openImport()">Import</button>
        <button
          ar-button
          type="button"
          variant="primary"
          icon="plus"
          (click)="openMove(null, 'receive')"
        >
          Receive stock
        </button>
      }
      <!-- Without the add-on the server refuses every setting; the banner below says why. -->
      @if (canSettings() && settings()?.included !== false) {
        <button ar-button type="button" variant="ghost" icon="settings" (click)="openSettings()">
          Settings
        </button>
      }
    </ar-topbar>

    <div class="st ar-scroll">
      @if (error(); as e) {
        <p class="st__err" role="alert">{{ e }}</p>
      }
      @if (notice(); as n) {
        <p class="st__ok" role="status">{{ n }}</p>
      }

      @if (settings(); as s) {
        @if (!s.included) {
          <section class="setup">
            <h2>Stock comes with the re-order portal add-on</h2>
            <p class="st__hint">
              Ask your MNI Assist contact to switch on the re-order portal. Anything already
              recorded here stays readable.
            </p>
          </section>
        } @else if (s.keptIn === 'Erp') {
          <section class="setup">
            <h2>Stock is read from {{ erpName() }}</h2>
            <p class="st__hint">
              Customers on the re-order portal see availability from what the ERP last reported: on
              hand less what its open sales orders hold. Items match catalogue parts by part number;
              ones that don't match aren't shown to customers. Turn on “Stock on hand” on the ERP
              connection (Settings → Integrations) so every sync reads it.
            </p>
            <div class="bar">
              @if (canManage()) {
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy()"
                  (click)="readErpStock()"
                >
                  {{ busy() ? 'Reading…' : 'Read stock now' }}
                </button>
              }
              @if (erpRows().length) {
                <span class="st__hint"
                  >Last read {{ when(erpRows()[0].syncedAtUtc) }} · {{ erpMatched() }} of
                  {{ erpRows().length }} rows match the catalogue</span
                >
              }
            </div>
          </section>
          @if (erpRows().length) {
            <ejs-grid arGrid="erp-stock" [dataSource]="erpRows()" aria-label="ERP Stock">
              <e-columns>
                <e-column field="itemCode" headerText="Item" width="220">
                  <ng-template #template let-r>
                    <b class="ar-mono">{{ r.itemCode }}</b>
                    <span class="sub">{{
                      r.productId ? r.productName : 'Not in the catalogue: not shown to customers'
                    }}</span>
                  </ng-template>
                </e-column>
                <e-column field="warehouse" headerText="Warehouse" width="160">
                  <ng-template #template let-r>
                    {{ r.warehouse || '—' }}
                  </ng-template>
                </e-column>
                <e-column field="onHand" headerText="On hand" textAlign="Right" width="110">
                  <ng-template #template let-r>
                    {{ n(r.onHand) }}
                  </ng-template>
                </e-column>
                <e-column field="committed" headerText="Committed" textAlign="Right" width="110">
                  <ng-template #template let-r>
                    {{ r.committed ? n(r.committed) : '—' }}
                  </ng-template>
                </e-column>
                <e-column field="available" headerText="Available" textAlign="Right" width="110">
                  <ng-template #template let-r>
                    <b>{{ n(r.available) }}</b>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          }
        } @else if (s.keptIn !== 'AutoReach') {
          <section class="setup">
            <h2>Where do you keep your stock?</h2>
            <p class="st__hint">
              Keeping it here lets the re-order portal show customers what's in stock, holds parts
              for their requests, and issues them when a quotation is won.
            </p>
            @if (canSettings()) {
              <button ar-button type="button" variant="primary" (click)="openSettings()">
                Set up stock
              </button>
            }
          </section>
        }
      }

      @if (tracking() || items().length) {
        <div class="bar">
          <input
            id="st-filter"
            class="ar-field__input bar__search"
            type="search"
            placeholder="Part number or name"
            aria-label="Find a part"
            [value]="filter()"
            (input)="filter.set($any($event.target).value)"
          />
          <label class="bar__check" for="st-low">
            <input
              id="st-low"
              type="checkbox"
              [checked]="lowOnly()"
              (change)="lowOnly.set($any($event.target).checked)"
            />
            Below minimum only
          </label>
        </div>

        @if (visible().length === 0) {
          <p class="st__hint">
            @if (items().length === 0) {
              No stock recorded yet. Import your opening stock, or receive a delivery.
            } @else {
              No parts match.
            }
          </p>
        } @else {
          <ejs-grid arGrid="stock-items" [dataSource]="visible()" aria-label="Stock items">
            <e-columns>
              <e-column field="partNumber" headerText="Part" width="240">
                <ng-template #template let-i>
                  <b class="ar-mono">{{ i.partNumber }}</b>
                  <span class="sub">{{ i.name }}</span>
                  @if (i.tracking && i.tracking !== 'None') {
                    <ar-chip tone="neutral">{{ numberingLabel(i.tracking) }}</ar-chip>
                  }
                </ng-template>
              </e-column>
              <e-column field="onHand" headerText="On hand" textAlign="Right" width="110">
                <ng-template #template let-i>
                  {{ n(i.onHand) }}
                </ng-template>
              </e-column>
              <e-column field="reserved" headerText="Held" textAlign="Right" width="100">
                <ng-template #template let-i>
                  {{ i.reserved ? n(i.reserved) : '—' }}
                </ng-template>
              </e-column>
              <e-column field="available" headerText="Available" textAlign="Right" width="120">
                <ng-template #template let-i>
                  <b>{{ n(i.available) }}</b>
                  @if (i.isLow) {
                    <ar-chip tone="warn">Low</ar-chip>
                  }
                </ng-template>
              </e-column>
              <e-column field="onOrder" headerText="On order" textAlign="Right" width="110">
                <ng-template #template let-i>
                  {{ i.onOrder ? n(i.onOrder) : '—' }}
                </ng-template>
              </e-column>
              <e-column field="valueInPaise" headerText="Value" textAlign="Right" width="130">
                <ng-template #template let-i>
                  @if (i.valueInPaise != null) {
                    {{ money(i.valueInPaise) }}
                    <span class="sub">{{ money(i.averageCostInPaise ?? 0) }} avg</span>
                  } @else {
                    —
                  }
                </ng-template>
              </e-column>
              <e-column headerText="By location" width="200">
                <ng-template #template let-i>
                  @for (l of i.locations; track l.locationId) {
                    <span class="loc" [class.loc--low]="l.isLow"
                      >{{ l.locationName }}: {{ n(l.available)
                      }}{{ l.minLevel != null ? ' (min ' + n(l.minLevel) + ')' : '' }}</span
                    >
                  }
                </ng-template>
              </e-column>
              <e-column headerText="Actions" width="320">
                <ng-template #template let-i>
                  <div class="acts">
                    @if (tracking() && canManage()) {
                      <button type="button" class="act" (click)="openMove(i, 'receive')">
                        Receive
                      </button>
                      <button type="button" class="act" (click)="openMove(i, 'issue')">
                        Issue
                      </button>
                      <button type="button" class="act" (click)="openMove(i, 'adjust')">
                        Adjust
                      </button>
                      <button type="button" class="act" (click)="openMove(i, 'count')">
                        Count
                      </button>
                      <button type="button" class="act" (click)="openMove(i, 'min')">
                        Minimum
                      </button>
                      <button type="button" class="act" (click)="openNumbering(i)">Tracking</button>
                    }
                    @if (i.tracking && i.tracking !== 'None') {
                      <button type="button" class="act" (click)="openLots(i)">
                        {{ i.tracking === 'Serial' ? 'Serials' : 'Batches' }}
                      </button>
                    }
                    <button type="button" class="act" (click)="openHistory(i)">History</button>
                  </div>
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        }
      }
    </div>

    @if (move(); as m) {
      <ar-dialog [title]="moveTitle()" (dismiss)="move.set(null)">
        @if (m.target) {
          <p class="st__hint">
            <b class="ar-mono">{{ m.target.partNumber }}</b> · {{ m.target.name }}
          </p>
        } @else {
          <label class="ar-field" for="st-product">
            <span class="ar-field__label">Part</span>
            <input
              required
              id="st-product"
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
                  <button type="button" class="act" (click)="pickProduct(p)">
                    <b class="ar-mono">{{ p.partNumber }}</b> {{ p.name }}
                  </button>
                </li>
              }
            </ul>
          }
        }
        <label class="ar-field" for="st-location">
          <span class="ar-field__label">Location</span>
          <select
            required
            id="st-location"
            class="ar-field__input"
            [value]="moveLocation()"
            (change)="moveLocation.set($any($event.target).value)"
          >
            @for (l of activeLocations(); track l.id) {
              <option [value]="l.id">{{ l.name }}</option>
            }
          </select>
        </label>
        <label class="ar-field" for="st-qty">
          <span class="ar-field__label">{{ quantityLabel() }}</span>
          <input
            required
            id="st-qty"
            class="ar-field__input"
            inputmode="decimal"
            [value]="moveQty()"
            (input)="moveQty.set($any($event.target).value)"
          />
        </label>
        @if (m.kind === 'receive') {
          <label class="ar-field" for="st-cost">
            <span class="ar-field__label"
              >Cost per unit, ₹ before GST
              <span class="ar-field__opt">(optional: moves the average cost)</span></span
            >
            <input
              id="st-cost"
              class="ar-field__input"
              inputmode="decimal"
              [value]="moveCost()"
              (input)="moveCost.set($any($event.target).value)"
            />
          </label>
        }
        @if (m.kind !== 'min' && m.target?.numbering === 'Serial') {
          <label class="ar-field" for="st-lots">
            <span class="ar-field__label"
              >{{ m.kind === 'adjust' || m.kind === 'count' ? 'Serial number' : 'Serial numbers' }}
              <span class="ar-field__opt">{{
                m.kind === 'issue'
                  ? '(blank: the oldest go first)'
                  : m.kind === 'receive'
                    ? '(one per line, one per unit)'
                    : ''
              }}</span></span
            >
            @if (m.kind === 'adjust' || m.kind === 'count') {
              <input
                id="st-lots"
                class="ar-field__input ar-mono"
                [value]="moveLots()"
                (input)="moveLots.set($any($event.target).value)"
              />
            } @else {
              <textarea
                id="st-lots"
                class="ar-field__input ar-mono"
                rows="4"
                [value]="moveLots()"
                (input)="moveLots.set($any($event.target).value)"
              ></textarea>
            }
          </label>
        }
        @if (m.kind !== 'min' && m.target?.numbering === 'Batch') {
          <div class="st__pair">
            <label class="ar-field" for="st-lots">
              <span class="ar-field__label"
                >Batch number
                @if (m.kind === 'issue') {
                  <span class="ar-field__opt">(blank: soonest expiry first)</span>
                }
              </span>
              <input
                id="st-lots"
                class="ar-field__input ar-mono"
                [value]="moveLots()"
                (input)="moveLots.set($any($event.target).value)"
              />
            </label>
            @if (m.kind === 'receive') {
              <label class="ar-field" for="st-expiry">
                <span class="ar-field__label"
                  >Expiry <span class="ar-field__opt">(optional)</span></span
                >
                <input
                  id="st-expiry"
                  class="ar-field__input"
                  type="date"
                  [value]="moveExpiry()"
                  (input)="moveExpiry.set($any($event.target).value)"
                />
              </label>
            }
          </div>
        }
        @if (m.kind !== 'min') {
          <label class="ar-field" for="st-reason">
            <span class="ar-field__label"
              >Reason
              <span class="ar-field__opt">{{
                m.kind === 'adjust' ? '(required: damage, return, correction…)' : '(optional)'
              }}</span></span
            >
            <input
              id="st-reason"
              class="ar-field__input"
              [value]="moveReason()"
              (input)="moveReason.set($any($event.target).value)"
            />
          </label>
        }
        @if (dialogError(); as e) {
          <p class="st__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="move.set(null)">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !m.target"
            (click)="saveMove()"
          >
            {{ busy() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </ar-dialog>
    }

    @if (numberingFor(); as nf) {
      <ar-dialog [title]="'Tracking · ' + nf.partNumber" (dismiss)="numberingFor.set(null)">
        <p class="st__hint">
          Track a part by batch (oils, filters with a shelf life) or by serial number (drives,
          controllers, anything under warranty). Every unit received then needs its number, issues
          take the soonest expiry or oldest first, and any number can be traced to the customer it
          went to. Change it only while none is in stock: count it to zero first.
        </p>
        @for (o of numberingOptions; track o) {
          <label class="st__radio" [for]="'st-num-' + o">
            <input
              type="radio"
              name="st-numbering"
              [id]="'st-num-' + o"
              [checked]="numberingChoice() === o"
              (change)="numberingChoice.set(o)"
            />
            {{ numberingLabel(o) }}
          </label>
        }
        @if (dialogError(); as e) {
          <p class="st__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="numberingFor.set(null)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="saveNumbering()"
          >
            {{ busy() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </ar-dialog>
    }

    @if (lots(); as lv) {
      <ar-dialog
        [title]="(lv.item.tracking === 'Serial' ? 'Serials · ' : 'Batches · ') + lv.item.partNumber"
        (dismiss)="lots.set(null)"
      >
        @if (lv.rows.length === 0) {
          <p class="st__hint">None in stock.</p>
        } @else {
          <ejs-grid
            arGrid="stock-lots"
            [dataSource]="lv.rows"
            aria-label="Stock Batches or Serials"
          >
            <e-columns>
              <e-column
                [headerText]="lv.item.tracking === 'Serial' ? 'Serial' : 'Batch'"
                width="160"
              >
                <ng-template #template let-l>
                  <button type="button" class="act font-mono" (click)="trace(l.number)">
                    {{ l.number }}
                  </button>
                </ng-template>
              </e-column>
              <e-column field="locationName" headerText="Where" width="160"></e-column>
              <e-column headerText="Expiry" width="140" [visible]="lv.item.tracking === 'Batch'">
                <ng-template #template let-l>
                  {{ l.expiresOn ? day(l.expiresOn) : '—' }}
                  @if (l.expired) {
                    <ar-chip tone="warn">Expired</ar-chip>
                  }
                </ng-template>
              </e-column>
              <e-column
                field="onHand"
                headerText="On hand"
                width="100"
                [textAlign]="'Right'"
                [visible]="lv.item.tracking === 'Batch'"
              >
                <ng-template #template let-l>
                  {{ n(l.onHand) }}
                </ng-template>
              </e-column>
              <e-column field="receivedAtUtc" headerText="Received" width="120">
                <ng-template #template let-l>
                  {{ day(l.receivedAtUtc) }}
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        }
      </ar-dialog>
    }

    @if (traceOpen()) {
      <ar-dialog title="Trace a batch or serial number" (dismiss)="traceOpen.set(false)">
        <form class="st__pair" (submit)="$event.preventDefault(); trace(traceQuery())">
          <label class="ar-field" for="st-trace">
            <span class="ar-field__label"
              >Batch or serial number <span class="ar-field__opt">optional</span></span
            >
            <input
              id="st-trace"
              class="ar-field__input ar-mono"
              [value]="traceQuery()"
              (input)="traceQuery.set($any($event.target).value)"
            />
          </label>
          <div>
            <button
              ar-button
              type="submit"
              variant="primary"
              [disabled]="busy() || !traceQuery().trim()"
            >
              Trace
            </button>
          </div>
        </form>
        @if (traceRows(); as rows) {
          @if (rows.length === 0) {
            <p class="st__hint">Nothing recorded under that number.</p>
          } @else {
            <ejs-grid
              arGrid="stock-trace-rows"
              [dataSource]="rows"
              aria-label="Stock Trace Movements"
            >
              <e-columns>
                <e-column field="occurredAtUtc" headerText="When" width="130">
                  <ng-template #template let-r>
                    {{ when(r.occurredAtUtc) }}
                  </ng-template>
                </e-column>
                <e-column field="partNumber" headerText="Part" width="150">
                  <ng-template #template let-r>
                    <span class="ar-mono">{{ r.partNumber }}</span>
                  </ng-template>
                </e-column>
                <e-column headerText="What" width="180">
                  <ng-template #template let-r>
                    {{ kindLabel(r.kind) }}
                    @if (r.reason) {
                      <span class="sub block text-muted">{{ r.reason }}</span>
                    }
                  </ng-template>
                </e-column>
                <e-column field="locationName" headerText="Where" width="140"></e-column>
                <e-column field="quantity" headerText="Change" width="110" [textAlign]="'Right'">
                  <ng-template #template let-r>
                    <span [class.neg]="r.quantity < 0">
                      {{ r.quantity > 0 ? '+' : '' }}{{ n(r.quantity) }}
                    </span>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          }
        }
        @if (dialogError(); as e) {
          <p class="st__err" role="alert">{{ e }}</p>
        }
      </ar-dialog>
    }

    @if (history(); as h) {
      <ar-dialog [title]="'History · ' + h.item.partNumber" (dismiss)="history.set(null)">
        @if (h.rows.length === 0) {
          <p class="st__hint">No movements yet.</p>
        } @else {
          <ejs-grid
            arGrid="stock-history-rows"
            [dataSource]="h.rows"
            aria-label="Stock Movement History"
          >
            <e-columns>
              <e-column field="occurredAtUtc" headerText="When" width="130">
                <ng-template #template let-r>
                  {{ when(r.occurredAtUtc) }}
                </ng-template>
              </e-column>
              <e-column headerText="What" width="200">
                <ng-template #template let-r>
                  {{ kindLabel(r.kind) }}
                  @if (r.lotNumber) {
                    <span class="ar-mono"> · {{ r.lotNumber }}</span>
                  }
                  @if (r.reason) {
                    <span class="sub block text-muted">{{ r.reason }}</span>
                  }
                </ng-template>
              </e-column>
              <e-column field="locationName" headerText="Where" width="140"></e-column>
              <e-column field="quantity" headerText="Change" width="110" [textAlign]="'Right'">
                <ng-template #template let-r>
                  <span [class.neg]="r.quantity < 0">
                    {{ r.quantity > 0 ? '+' : '' }}{{ n(r.quantity) }}
                  </span>
                </ng-template>
              </e-column>
              <e-column
                field="onHandAfter"
                headerText="On hand after"
                width="130"
                [textAlign]="'Right'"
              >
                <ng-template #template let-r>
                  {{ n(r.onHandAfter) }}
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        }
      </ar-dialog>
    }

    @if (importOpen()) {
      <ar-dialog title="Import stock" (dismiss)="importOpen.set(false)">
        <p class="st__hint">
          A CSV with <code>part_number</code> and <code>quantity</code> columns, optionally
          <code>location</code> (a location's name; blank is the default) and
          <code>min_level</code>. Parts are matched to the catalogue by part number.
        </p>
        <fieldset class="radio">
          <legend>This file is</legend>
          <label for="st-imp-count"
            ><input
              id="st-imp-count"
              type="radio"
              name="st-imp"
              [checked]="setToCount()"
              (change)="setToCount.set(true); check.set(null)"
            />
            A count: set each part to the quantity (opening stock, a stocktake)</label
          >
          <label for="st-imp-add"
            ><input
              id="st-imp-add"
              type="radio"
              name="st-imp"
              [checked]="!setToCount()"
              (change)="setToCount.set(false); check.set(null)"
            />
            A delivery: add the quantity to what's there</label
          >
        </fieldset>
        <label class="ar-field" for="st-imp-file">
          <span class="ar-field__label">CSV file</span>
          <input
            id="st-imp-file"
            class="ar-field__input"
            type="file"
            accept=".csv,text/csv"
            (change)="readFile($any($event.target))"
          />
        </label>
        @if (check(); as c) {
          <p class="st__hint">
            <b>{{ c.usable }}</b> row{{ c.usable === 1 ? '' : 's' }} ready{{
              c.problems ? ', ' + c.problems + ' with a problem (skipped)' : ''
            }}.
          </p>
          <ejs-grid
            arGrid="stock-import-lines"
            [dataSource]="c.lines"
            aria-label="Stock Import Lines"
          >
            <e-columns>
              <e-column field="line" headerText="Line" width="70" [textAlign]="'Right'"></e-column>
              <e-column field="partNumber" headerText="Part" width="160">
                <ng-template #template let-l>
                  <div>
                    <span class="ar-mono">{{ l.partNumber }}</span>
                    @if (l.location) {
                      <span class="sub block text-muted">{{ l.location }}</span>
                    }
                  </div>
                </ng-template>
              </e-column>
              <e-column field="onHandNow" headerText="Now" width="100" [textAlign]="'Right'">
                <ng-template #template let-l>
                  {{ l.onHandNow != null ? n(l.onHandNow) : '—' }}
                </ng-template>
              </e-column>
              <e-column field="quantity" headerText="File" width="100" [textAlign]="'Right'">
                <ng-template #template let-l>
                  {{ n(l.quantity) }}
                </ng-template>
              </e-column>
              <e-column field="error" headerText="Problem" width="200">
                <ng-template #template let-l>
                  <span class="bad font-medium">{{ l.error || '' }}</span>
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        }
        @if (dialogError(); as e) {
          <p class="st__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="importOpen.set(false)">
            Close
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !check()?.usable"
            (click)="applyImport()"
          >
            {{ busy() ? 'Applying…' : 'Apply ' + (check()?.usable ?? 0) + ' rows' }}
          </button>
        </div>
      </ar-dialog>
    }

    @if (settingsOpen()) {
      <ar-dialog title="Stock settings" (dismiss)="settingsOpen.set(false)">
        <fieldset class="radio">
          <legend>Where does this workspace keep its stock?</legend>
          @for (o of keptOptions; track o.value) {
            <label [for]="'st-kept-' + o.value"
              ><input
                [id]="'st-kept-' + o.value"
                type="radio"
                name="st-kept"
                [checked]="kept() === o.value"
                (change)="kept.set(o.value)"
              />
              <span
                ><b>{{ o.label }}</b> <small>{{ o.hint }}</small></span
              ></label
            >
          }
        </fieldset>
        @if (kept() === 'AutoReach' && settings()?.erpSyncOn) {
          <p class="warn" role="alert">
            This workspace syncs with Tally or SAP. If stock is also kept there, you'll have two
            stock records that drift apart. Keep stock here only if the ERP doesn't track it, or
            choose “In Tally or SAP”.
          </p>
        }
        @if (kept() === 'AutoReach') {
          <label class="ar-field" for="st-default">
            <span class="ar-field__label"
              >Default location (portal requests and won quotations)</span
            >
            <select
              id="st-default"
              class="ar-field__input"
              [value]="defaultLocation()"
              (change)="defaultLocation.set($any($event.target).value)"
            >
              <!-- Empty is a real choice: the server keeps the current default, or
                   makes "Main store" when there is no location yet. -->
              <option value="" [selected]="!defaultLocation()">
                {{ locations().length ? 'Keep the current default' : 'Main store (created now)' }}
              </option>
              @for (l of activeLocations(); track l.id) {
                <option [value]="l.id" [selected]="l.id === defaultLocation()">{{ l.name }}</option>
              }
            </select>
          </label>
          <label class="bar__check" for="st-issue">
            <input
              id="st-issue"
              type="checkbox"
              [checked]="issueOnWin()"
              (change)="issueOnWin.set($any($event.target).checked)"
            />
            Issue a quotation's parts from stock when it is won
          </label>
          <div class="locs">
            <span class="ar-field__label">Locations</span>
            @for (l of locations(); track l.id) {
              <span class="loc">{{ l.name }}{{ l.isActive ? '' : ' (closed)' }}</span>
            }
            <div class="locs__add">
              <input
                id="st-newloc"
                class="ar-field__input"
                placeholder="New location, e.g. Service van 1"
                [value]="newLocation()"
                (input)="newLocation.set($any($event.target).value)"
              />
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="!newLocation().trim() || busy()"
                (click)="addLocation()"
              >
                Add
              </button>
            </div>
          </div>
        }
        @if (dialogError(); as e) {
          <p class="st__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="settingsOpen.set(false)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="saveSettings()"
          >
            Save
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .st {
      padding: 16px 20px 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .st__hint {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      max-width: 75ch;
    }
    .st__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .off {
      opacity: 0.6;
    }
    .st__pair {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
      align-items: end;
    }
    .st__radio {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 400 13px var(--ar-font-sans);
    }
    .st__ok {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-good-600, #067647);
    }
    .setup {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }
    .setup h2 {
      margin: 0;
      font: 600 15px var(--ar-font-sans);
    }
    .bar {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .bar__search {
      flex: 1 1 240px;
      max-width: 360px;
    }
    .bar__check {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 500 13px var(--ar-font-sans);
    }
    .tbl {
      overflow-x: auto;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .tbl--short {
      max-height: 280px;
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    th,
    td {
      padding: 8px 10px;
      border-top: 1px solid var(--ar-line-100, #eef0f2);
      text-align: left;
      vertical-align: top;
    }
    thead th {
      border-top: 0;
      font: 600 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .neg {
      color: var(--ar-bad-600, #b42318);
    }
    tr.low td:first-child {
      box-shadow: inset 3px 0 0 var(--ar-amber-500, #f59e0b);
    }
    tr.bad td {
      color: var(--ar-bad-600, #b42318);
    }
    .sub {
      display: block;
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    .loc {
      display: inline-block;
      margin: 0 8px 2px 0;
      font-size: 12px;
      color: var(--ar-ink-600, #475467);
    }
    .loc--low {
      color: var(--ar-amber-700, #b54708);
      font-weight: 600;
    }
    .acts {
      white-space: nowrap;
    }
    .act {
      border: 0;
      background: none;
      padding: 2px 4px;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
      cursor: pointer;
    }
    .act:focus-visible {
      outline: 2px solid var(--ar-teal-600, #0d9488);
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .pick {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 180px;
      overflow: auto;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
    }
    .radio {
      border: 0;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font: 400 13px/1.45 var(--ar-font-sans);
    }
    .radio legend {
      font: 600 13px var(--ar-font-sans);
      margin-bottom: 4px;
    }
    .radio label {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .radio small {
      display: block;
      color: var(--ar-ink-500);
    }
    .warn {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-amber-100, #fef3c7);
      color: var(--ar-amber-800, #92400e);
      font: 500 12.5px/1.45 var(--ar-font-sans);
    }
    .locs {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .locs__add {
      display: flex;
      gap: 8px;
    }
    @media (max-width: 560px) {
      .st {
        padding-inline: 12px;
      }
    }
  `,
})
export class ArStock {
  private readonly api = inject(InventoryService);
  private readonly productsApi = inject(ProductService);
  private readonly permissions = inject(PermissionService);
  protected readonly canManage = grantedPolicy('AutoReach.Inventory.Manage', this.permissions);
  protected readonly canSettings = grantedPolicy('AutoReach.Inventory.Settings', this.permissions);

  protected readonly settings = signal<InventorySettingsDto | null>(null);
  protected readonly items = signal<StockItemDto[]>([]);
  protected readonly locations = signal<StockLocationDto[]>([]);
  protected readonly filter = signal('');
  protected readonly lowOnly = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly dialogError = signal<string | null>(null);

  protected readonly tracking = computed(() => this.settings()?.keptIn === 'AutoReach');
  protected readonly activeLocations = computed(() => this.locations().filter((l) => l.isActive));
  protected readonly visible = computed(() => {
    const f = this.filter().trim().toLowerCase();
    return this.items().filter(
      (i) =>
        (!this.lowOnly() || i.isLow) &&
        (!f || i.partNumber.toLowerCase().includes(f) || i.name.toLowerCase().includes(f)),
    );
  });
  protected readonly subtitle = computed(() => {
    const low = this.items().filter((i) => i.isLow).length;
    const value = this.items().reduce((sum, i) => sum + (i.valueInPaise ?? 0), 0);
    return (
      `${this.items().length} part${this.items().length === 1 ? '' : 's'} in stock records · ${low} below minimum` +
      (value ? ` · worth ${rupees(value)} at average cost` : '')
    );
  });

  // Move dialog.
  protected readonly move = signal<{ target: MoveTarget | null; kind: MoveKind } | null>(null);
  protected readonly moveLocation = signal('');
  protected readonly moveQty = signal('');
  protected readonly moveReason = signal('');
  protected readonly moveLots = signal('');
  protected readonly moveExpiry = signal('');
  protected readonly moveCost = signal('');

  // Stock kept in Tally or SAP.
  protected readonly erpRows = signal<ErpStockDto[]>([]);
  protected readonly erpMatched = computed(() => this.erpRows().filter((r) => r.productId).length);
  protected readonly erpName = signal('Tally or SAP');

  // Batch and serial tracking.
  protected readonly numberingOptions: StockTracking[] = ['None', 'Batch', 'Serial'];
  protected readonly numberingFor = signal<StockItemDto | null>(null);
  protected readonly numberingChoice = signal<StockTracking>('None');
  protected readonly lots = signal<{ item: StockItemDto; rows: StockLotDto[] } | null>(null);
  protected readonly traceOpen = signal(false);
  protected readonly traceQuery = signal('');
  protected readonly traceRows = signal<StockMovementDto[] | null>(null);
  protected readonly productQuery = signal('');
  protected readonly products = signal<MoveTarget[]>([]);
  protected readonly moveTitle = computed(() => MOVE_LABEL[this.move()?.kind ?? 'receive'].title);
  protected readonly quantityLabel = computed(
    () => MOVE_LABEL[this.move()?.kind ?? 'receive'].quantity,
  );

  // History, import, settings.
  protected readonly history = signal<{ item: StockItemDto; rows: StockMovementDto[] } | null>(
    null,
  );
  protected readonly importOpen = signal(false);
  protected readonly setToCount = signal(true);
  protected readonly csv = signal('');
  protected readonly check = signal<StockImportCheckDto | null>(null);
  protected readonly settingsOpen = signal(false);
  protected readonly kept = signal<StockKeptIn>('NotTracked');
  protected readonly defaultLocation = signal('');
  protected readonly issueOnWin = signal(true);
  protected readonly newLocation = signal('');
  protected readonly keptOptions: { value: StockKeptIn; label: string; hint: string }[] = [
    {
      value: 'AutoReach',
      label: 'Here, in MNI Assist',
      hint: 'Levels, movements and counts here; the portal shows availability.',
    },
    {
      value: 'Erp',
      label: 'In Tally or SAP',
      hint: 'Read from the ERP on each sync; the portal shows availability from it.',
    },
    {
      value: 'NotTracked',
      label: "We don't track stock",
      hint: 'No stock anywhere in MNI Assist.',
    },
  ];

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.error.set(null);

    try {
      const [settings, locations, items] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(this.api.getLocations()),
        firstValueFrom(this.api.getLevels()),
      ]);
      this.settings.set(settings);
      this.locations.set(locations);
      this.items.set(items);
      if (settings.keptIn === 'Erp') {
        this.erpRows.set(await firstValueFrom(this.api.getErpStock()));
      }
    } catch (e: unknown) {
      this.error.set(problem(e, 'Could not load stock.'));
    }
  }

  protected n(value: number): string {
    return qty(value);
  }

  protected kindLabel(kind: string): string {
    return (
      {
        Opening: 'Opening stock',
        Receipt: 'Received',
        Issue: 'Issued',
        Adjustment: 'Adjusted',
        Count: 'Counted',
      }[kind] ?? kind
    );
  }

  protected when(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ---- Moves ---------------------------------------------------------------------------------------------------------------

  protected async readErpStock(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.api.readErpStock());
      if (!result.anyConnection) {
        this.error.set(
          'No connected ERP has “Stock on hand” switched on. Turn it on under Settings → Integrations.',
        );
      } else if (result.error) {
        this.error.set(`The ERP couldn't be read: ${result.error}`);
      } else {
        this.notice.set(`Read ${result.rows} rows; ${result.matched} match catalogue parts.`);
      }
      this.erpRows.set(await firstValueFrom(this.api.getErpStock()));
    } catch (e: unknown) {
      this.error.set(problem(e, 'Stock could not be read from the ERP.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected money(paise: number): string {
    return rupees(Math.round(paise));
  }

  protected numberingLabel(t: StockTracking): string {
    return NUMBERING_LABEL[t] ?? t;
  }

  protected day(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  protected openNumbering(item: StockItemDto): void {
    this.dialogError.set(null);
    this.numberingChoice.set(item.tracking ?? 'None');
    this.numberingFor.set(item);
  }

  protected async saveNumbering(): Promise<void> {
    const item = this.numberingFor();
    if (!item) return;
    this.busy.set(true);
    this.dialogError.set(null);
    try {
      await firstValueFrom(
        this.api.setTracking({ productId: item.productId, tracking: this.numberingChoice() }),
      );
      this.items.set(await firstValueFrom(this.api.getLevels()));
      this.notice.set(`${item.partNumber}: ${this.numberingLabel(this.numberingChoice())}.`);
      this.numberingFor.set(null);
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'The tracking could not be changed.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async openLots(item: StockItemDto): Promise<void> {
    try {
      this.lots.set({ item, rows: await firstValueFrom(this.api.getLots(item.productId)) });
    } catch (e: unknown) {
      this.error.set(problem(e, 'Could not load the batches or serials.'));
    }
  }

  protected openTrace(): void {
    this.dialogError.set(null);
    this.traceRows.set(null);
    this.traceOpen.set(true);
  }

  protected async trace(number: string): Promise<void> {
    const n = number.trim();
    if (!n) return;
    this.lots.set(null);
    this.traceQuery.set(n);
    this.traceOpen.set(true);
    this.dialogError.set(null);
    this.busy.set(true);
    try {
      this.traceRows.set(await firstValueFrom(this.api.getTrace(n)));
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'That number could not be traced.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected openMove(item: StockItemDto | null, kind: MoveKind): void {
    this.dialogError.set(null);
    this.moveQty.set('');
    this.moveReason.set('');
    this.moveLots.set('');
    this.moveExpiry.set('');
    this.moveCost.set('');
    this.productQuery.set('');
    this.products.set([]);
    const at =
      item?.locations[0]?.locationId ??
      this.settings()?.defaultLocationId ??
      this.activeLocations()[0]?.id ??
      '';
    this.moveLocation.set(at);
    if (item && kind === 'min') {
      const min = item.locations.find((l) => l.locationId === at)?.minLevel;
      this.moveQty.set(min != null ? String(min) : '');
    }
    this.move.set({
      target: item
        ? {
            productId: item.productId,
            partNumber: item.partNumber,
            name: item.name,
            numbering: item.tracking ?? 'None',
          }
        : null,
      kind,
    });
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

  protected pickProduct(p: MoveTarget): void {
    this.move.update((m) => (m ? { ...m, target: p } : m));
    this.products.set([]);
  }

  protected async saveMove(): Promise<void> {
    const m = this.move();
    if (!m?.target) return;
    const parsed = parseMove(m.kind, this.moveQty(), this.moveReason());
    if ('error' in parsed) {
      this.dialogError.set(parsed.error);
      return;
    }
    if (!this.moveLocation()) {
      this.dialogError.set('Choose a location.');
      return;
    }
    const cost = m.kind === 'receive' ? parseRupees(this.moveCost()) : null;
    if (cost === undefined) {
      this.dialogError.set('Enter the cost per unit in rupees, or leave it blank.');
      return;
    }
    const lots = parseLots(
      m.kind,
      m.target.numbering ?? 'None',
      parsed.quantity,
      this.moveLots(),
      this.moveExpiry(),
    );
    if ('error' in lots) {
      this.dialogError.set(lots.error);
      return;
    }
    this.busy.set(true);
    this.dialogError.set(null);
    try {
      const input = {
        productId: m.target.productId,
        locationId: this.moveLocation(),
        quantity: parsed.quantity ?? 0,
        reason: this.moveReason().trim() || null,
        lots: lots.lots,
        unitCostInPaise: m.kind === 'receive' ? cost : null,
      };
      switch (m.kind) {
        case 'receive':
          await firstValueFrom(this.api.receive(input));
          break;
        case 'issue':
          await firstValueFrom(this.api.issue(input));
          break;
        case 'adjust':
          await firstValueFrom(this.api.adjust(input));
          break;
        case 'count':
          await firstValueFrom(this.api.count(input));
          break;
        case 'min':
          await firstValueFrom(
            this.api.setMinLevel({
              productId: input.productId,
              locationId: input.locationId,
              minLevel: parsed.quantity,
            }),
          );
          break;
      }
      this.items.set(await firstValueFrom(this.api.getLevels()));
      this.notice.set(`${MOVE_LABEL[m.kind].done} ${m.target.partNumber}.`);
      this.move.set(null);
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'That could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async openHistory(item: StockItemDto): Promise<void> {
    try {
      this.history.set({ item, rows: await firstValueFrom(this.api.getMovements(item.productId)) });
    } catch (e: unknown) {
      this.error.set(problem(e, 'Could not load the history.'));
    }
  }

  // ---- Import --------------------------------------------------------------------------------------------------------------

  protected openImport(): void {
    this.csv.set('');
    this.check.set(null);
    this.dialogError.set(null);
    this.importOpen.set(true);
  }

  protected async readFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      this.dialogError.set('That file is over 2 MB. Split it into smaller files.');
      return;
    }
    this.csv.set(await file.text());
    this.busy.set(true);
    this.dialogError.set(null);
    try {
      this.check.set(
        await firstValueFrom(
          this.api.checkImport({ csv: this.csv(), setToCount: this.setToCount() }),
        ),
      );
    } catch (e: unknown) {
      this.check.set(null);
      this.dialogError.set(problem(e, 'The file could not be read.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async applyImport(): Promise<void> {
    this.busy.set(true);
    try {
      const n = await firstValueFrom(
        this.api.applyImport({ csv: this.csv(), setToCount: this.setToCount() }),
      );
      this.notice.set(`${n} row${n === 1 ? '' : 's'} applied.`);
      this.importOpen.set(false);
      await this.load();
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'The import could not be applied.'));
    } finally {
      this.busy.set(false);
    }
  }

  // ---- Settings ------------------------------------------------------------------------------------------------------------

  protected openSettings(): void {
    const s = this.settings();
    this.kept.set(s?.keptIn ?? 'NotTracked');
    this.defaultLocation.set(s?.defaultLocationId ?? '');
    this.issueOnWin.set(s?.issueOnWin ?? true);
    this.newLocation.set('');
    this.dialogError.set(null);
    this.settingsOpen.set(true);
  }

  protected async addLocation(): Promise<void> {
    this.busy.set(true);
    try {
      const made = await firstValueFrom(
        this.api.createLocation({ name: this.newLocation().trim(), isActive: true }),
      );
      this.locations.update((list) => [...list, made]);
      this.newLocation.set('');
      // The first place stock can go is the obvious default.
      if (!this.defaultLocation() && made.id) this.defaultLocation.set(made.id);
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'The location could not be added.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async saveSettings(): Promise<void> {
    this.busy.set(true);
    this.dialogError.set(null);
    try {
      this.settings.set(
        await firstValueFrom(
          this.api.updateSettings({
            keptIn: this.kept(),
            defaultLocationId: this.defaultLocation() || null,
            issueOnWin: this.issueOnWin(),
          }),
        ),
      );
      await this.load();
      this.settingsOpen.set(false);
      this.notice.set('Stock settings saved.');
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'The settings could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}

function problem(e: unknown, fallback: string): string {
  return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
}
