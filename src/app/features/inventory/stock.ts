import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import {
  InventoryService,
  InventorySettingsDto,
  StockImportCheckDto,
  StockItemDto,
  StockKeptIn,
  StockLocationDto,
  StockMovementDto,
} from '../../proxy/inventory/inventory.service';
import { ProductService } from '../../proxy/library/product.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { MOVE_LABEL, MoveKind, parseMove, qty } from './stock-logic';

const SEED_ITEMS: StockItemDto[] = [
  {
    productId: 'p1',
    partNumber: 'AF-2901',
    name: 'Air filter element',
    unit: 'no',
    onHand: 3,
    reserved: 2,
    available: 1,
    isLow: true,
    locations: [
      {
        locationId: 'l1',
        locationName: 'Main store',
        onHand: 3,
        reserved: 2,
        available: 1,
        minLevel: 4,
        isLow: true,
      },
    ],
  },
  {
    productId: 'p2',
    partNumber: 'OF-1613',
    name: 'Oil filter',
    unit: 'no',
    onHand: 18,
    reserved: 0,
    available: 18,
    isLow: false,
    locations: [
      {
        locationId: 'l1',
        locationName: 'Main store',
        onHand: 12,
        reserved: 0,
        available: 12,
        minLevel: 5,
        isLow: false,
      },
      {
        locationId: 'l2',
        locationName: 'Service van 1',
        onHand: 6,
        reserved: 0,
        available: 6,
        minLevel: null,
        isLow: false,
      },
    ],
  },
];

interface MoveTarget {
  productId: string;
  partNumber: string;
  name: string;
}

/**
 * Stock kept in AutoReach (with the re-order portal add-on): how many of each part at each location, every movement that changed it,
 * minimum levels, counts and imports. Customers on the portal see only “In stock / Limited / On order”; this page is the real figures.
 */
@Component({
  selector: 'ar-stock',
  imports: [ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Stock"
      [subtitle]="subtitle()"
      help="Quantities of each catalogue part at each location. Every change is a movement (received, issued, adjusted, counted), so the history explains every figure. Parts on an open re-order request are held (reserved) until the quotation is won or lost; a won quotation issues its parts."
    >
      @if (tracking() && canManage) {
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
      @if (canSettings) {
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
              Ask your AutoReach contact to switch on the re-order portal. Anything already recorded
              here stays readable.
            </p>
          </section>
        } @else if (s.keptIn !== 'AutoReach') {
          <section class="setup">
            <h2>Where do you keep your stock?</h2>
            <p class="st__hint">
              Keeping it here lets the re-order portal show customers what's in stock, holds parts
              for their requests, and issues them when a quotation is won.
            </p>
            @if (canSettings) {
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
          <div class="tbl">
            <table>
              <thead>
                <tr>
                  <th scope="col">Part</th>
                  <th scope="col" class="num">On hand</th>
                  <th scope="col" class="num">Held</th>
                  <th scope="col" class="num">Available</th>
                  <th scope="col">By location</th>
                  <th scope="col"><span class="sr">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                @for (i of visible(); track i.productId) {
                  <tr [class.low]="i.isLow">
                    <td>
                      <b class="ar-mono">{{ i.partNumber }}</b>
                      <span class="sub">{{ i.name }}</span>
                    </td>
                    <td class="num">{{ n(i.onHand) }}</td>
                    <td class="num">{{ i.reserved ? n(i.reserved) : '—' }}</td>
                    <td class="num">
                      <b>{{ n(i.available) }}</b>
                      @if (i.isLow) {
                        <ar-chip tone="warn">Low</ar-chip>
                      }
                    </td>
                    <td>
                      @for (l of i.locations; track l.locationId) {
                        <span class="loc" [class.loc--low]="l.isLow"
                          >{{ l.locationName }}: {{ n(l.available)
                          }}{{ l.minLevel != null ? ' (min ' + n(l.minLevel) + ')' : '' }}</span
                        >
                      }
                    </td>
                    <td class="acts">
                      @if (tracking() && canManage) {
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
                      }
                      <button type="button" class="act" (click)="openHistory(i)">History</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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
            id="st-qty"
            class="ar-field__input"
            inputmode="decimal"
            [value]="moveQty()"
            (input)="moveQty.set($any($event.target).value)"
          />
        </label>
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

    @if (history(); as h) {
      <ar-dialog [title]="'History · ' + h.item.partNumber" (dismiss)="history.set(null)">
        @if (h.rows.length === 0) {
          <p class="st__hint">No movements yet.</p>
        } @else {
          <div class="tbl">
            <table>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">What</th>
                  <th scope="col">Where</th>
                  <th scope="col" class="num">Change</th>
                  <th scope="col" class="num">On hand after</th>
                </tr>
              </thead>
              <tbody>
                @for (r of h.rows; track r.id) {
                  <tr>
                    <td>{{ when(r.occurredAtUtc) }}</td>
                    <td>
                      {{ kindLabel(r.kind) }}
                      @if (r.reason) {
                        <span class="sub">{{ r.reason }}</span>
                      }
                    </td>
                    <td>{{ r.locationName }}</td>
                    <td class="num" [class.neg]="r.quantity < 0">
                      {{ r.quantity > 0 ? '+' : '' }}{{ n(r.quantity) }}
                    </td>
                    <td class="num">{{ n(r.onHandAfter) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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
          <div class="tbl tbl--short">
            <table>
              <thead>
                <tr>
                  <th scope="col">Line</th>
                  <th scope="col">Part</th>
                  <th scope="col" class="num">Now</th>
                  <th scope="col" class="num">File</th>
                  <th scope="col">Problem</th>
                </tr>
              </thead>
              <tbody>
                @for (l of c.lines; track l.line) {
                  <tr [class.bad]="!!l.error">
                    <td class="num">{{ l.line }}</td>
                    <td>
                      <span class="ar-mono">{{ l.partNumber }}</span>
                      @if (l.location) {
                        <span class="sub">{{ l.location }}</span>
                      }
                    </td>
                    <td class="num">{{ l.onHandNow != null ? n(l.onHandNow) : '—' }}</td>
                    <td class="num">{{ n(l.quantity) }}</td>
                    <td>{{ l.error || '' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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
              <option value="">
                {{ locations().length ? 'Choose…' : 'Main store (created now)' }}
              </option>
              @for (l of activeLocations(); track l.id) {
                <option [value]="l.id">{{ l.name }}</option>
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
    return `${this.items().length} part${this.items().length === 1 ? '' : 's'} in stock records · ${low} below minimum`;
  });

  // Move dialog.
  protected readonly move = signal<{ target: MoveTarget | null; kind: MoveKind } | null>(null);
  protected readonly moveLocation = signal('');
  protected readonly moveQty = signal('');
  protected readonly moveReason = signal('');
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
      label: 'Here, in AutoReach',
      hint: 'Levels, movements and counts here; the portal shows availability.',
    },
    {
      value: 'Erp',
      label: 'In Tally or SAP',
      hint: "AutoReach doesn't read it yet, so the portal shows no availability.",
    },
    { value: 'NotTracked', label: "We don't track stock", hint: 'No stock anywhere in AutoReach.' },
  ];

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.error.set(null);
    if (environment.useMockData) {
      this.settings.set({
        keptIn: 'AutoReach',
        issueOnWin: true,
        included: true,
        erpSyncOn: false,
      });
      this.locations.set([
        { id: 'l1', name: 'Main store', isActive: true },
        { id: 'l2', name: 'Service van 1', isActive: true },
      ]);
      this.items.set(SEED_ITEMS);
      return;
    }
    try {
      const [settings, locations, items] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(this.api.getLocations()),
        firstValueFrom(this.api.getLevels()),
      ]);
      this.settings.set(settings);
      this.locations.set(locations);
      this.items.set(items);
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

  protected openMove(item: StockItemDto | null, kind: MoveKind): void {
    this.dialogError.set(null);
    this.moveQty.set('');
    this.moveReason.set('');
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
        ? { productId: item.productId, partNumber: item.partNumber, name: item.name }
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
      if (environment.useMockData) {
        this.products.set(
          SEED_ITEMS.map((i) => ({
            productId: i.productId,
            partNumber: i.partNumber,
            name: i.name,
          })),
        );
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
    this.busy.set(true);
    this.dialogError.set(null);
    try {
      if (!environment.useMockData) {
        const input = {
          productId: m.target.productId,
          locationId: this.moveLocation(),
          quantity: parsed.quantity ?? 0,
          reason: this.moveReason().trim() || null,
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
      }
      this.notice.set(`${MOVE_LABEL[m.kind].done} ${m.target.partNumber}.`);
      this.move.set(null);
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'That could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async openHistory(item: StockItemDto): Promise<void> {
    if (environment.useMockData) {
      this.history.set({ item, rows: [] });
      return;
    }
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
        environment.useMockData
          ? { usable: 0, problems: 0, lines: [] }
          : await firstValueFrom(
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
      const n = environment.useMockData
        ? 0
        : await firstValueFrom(
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
      const made = environment.useMockData
        ? { id: crypto.randomUUID(), name: this.newLocation().trim(), isActive: true }
        : await firstValueFrom(
            this.api.createLocation({ name: this.newLocation().trim(), isActive: true }),
          );
      this.locations.update((list) => [...list, made]);
      this.newLocation.set('');
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
      if (!environment.useMockData) {
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
      } else {
        this.settings.update((s) => (s ? { ...s, keptIn: this.kept() } : s));
      }
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
