import { InventoryService, StockLocationDto } from '../../../proxy/inventory/inventory.service';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PickerOption } from '../../../core/services/pipeline.service';
import type { ProductDto } from '../../../proxy/library/product.service';
import {
  CreateDeliveryChallanDto,
  DeliveryChallanDto,
} from '../../../proxy/sales/delivery-challan.models';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { DeliveryChallanType } from '../../../proxy/sales/sales-enums';
import { ArButton, ArDialog } from '../../../ui';
import { ArDateInput } from '../../../ui/date-input';
import { ArSelect } from '../../../ui/select';
import { errorMessage } from '../../activities/activity-logic';
import { ArCatalogueItem, CatalogueSearch } from '../catalogue-item';
import { ArSalesCustomer, SalesCustomerChoice } from '../sales-customer';
import { EMPTY_PARTY, SalesParty, defaultShipIndex, shipToText } from '../sales-party';
import {
  ChallanLine,
  blankChallanLine,
  challanLineFromProduct,
  editChallanLine,
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
  imports: [ArDialog, ArButton, ArSelect, ArDateInput, ArSalesCustomer, ArCatalogueItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      title="New delivery challan"
      width="min(960px, calc(100vw - 32px))"
      (dismiss)="closed.emit(null)"
    >
      <div class="nc">
        <ar-sales-customer [initialCustomer]="initialCustomer()" (changed)="onCustomer($event)" />

        <div class="nc__grid">
          <label class="ar-field">
            <span class="ar-field__label">Challan type</span>
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
          <label class="ar-field">
            <span class="ar-field__label">Challan date</span>
            <input
              type="date"
              class="ar-field__input"
              [value]="challanDate()"
              (input)="challanDate.set($any($event.target).value)"
            />
          </label>

          <div class="ar-field nc__wide">
            <label class="ar-field__label" for="nc-ship">Shipping / Site address</label>
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
                <option [value]="-1" [selected]="shipIndex() === -1">Billing address</option>
              </select>
            }
            <textarea
              id="nc-ship"
              class="ar-field__input"
              rows="3"
              placeholder="Delivery site address"
              [value]="shippingAddress()"
              (input)="shippingAddress.set($any($event.target).value)"
            ></textarea>
          </div>
          @if (locations().length) {
            <label class="ar-field">
              <span class="ar-field__label"
                >Dispatch from <span class="ar-field__opt">optional</span></span
              >
              <select class="ar-field__input" (change)="locationId.set($any($event.target).value)">
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
              maxlength="12"
              [value]="eway()"
              (input)="eway.set($any($event.target).value)"
            />
          </label>
        </div>

        <h4 class="nc__h">Items</h4>
        @if (catalogue.blocked()) {
          <span class="ar-field__hint">
            The product catalogue isn't available to your role: type the item number and
            description.
          </span>
        }
        <div class="nc__lines">
          <div class="nc__line nc__line--head" aria-hidden="true">
            <span>Item name</span><span>Item no.</span><span>Description</span><span>HSN</span
            ><span>Qty</span><span>Unit</span><span></span>
          </div>
          @for (l of lines(); track $index; let i = $index) {
            <div class="nc__line">
              <ar-catalogue-item
                [value]="l.itemName"
                (typed)="patchLine(i, { itemName: $event })"
                (picked)="pickItem(i, $event)"
              />
              <input
                class="ar-field__input ar-mono"
                aria-label="Item number"
                placeholder="Item no."
                [value]="l.partNumber"
                (input)="patchLine(i, { partNumber: $any($event.target).value })"
              />
              <input
                class="ar-field__input"
                aria-label="Description"
                placeholder="Description"
                [value]="l.description"
                (input)="patchLine(i, { description: $any($event.target).value })"
              />
              <input
                class="ar-field__input ar-mono"
                aria-label="HSN code"
                maxlength="8"
                [value]="l.hsnCode"
                (input)="patchLine(i, { hsnCode: $any($event.target).value })"
              />
              <input
                class="ar-field__input"
                aria-label="Quantity"
                type="number"
                min="0"
                step="any"
                [value]="l.quantity"
                (input)="patchLine(i, { quantity: +$any($event.target).value })"
              />
              <select
                required
                class="ar-field__input"
                aria-label="Unit"
                (change)="patchLine(i, { unitOfMeasure: $any($event.target).value })"
              >
                @for (u of units(l); track u) {
                  <option [value]="u" [selected]="u === l.unitOfMeasure">{{ u }}</option>
                }
              </select>
              <button
                type="button"
                class="nc__x"
                [attr.aria-label]="'Remove line ' + (i + 1)"
                [disabled]="lines().length === 1"
                (click)="removeLine(i)"
              >
                ✕
              </button>
            </div>
          }
          <button type="button" class="nc__add" (click)="addLine()">+ Add item</button>
        </div>

        <label class="ar-field">
          <span class="ar-field__label">Remarks <span class="ar-field__opt">optional</span></span>
          <textarea
            class="ar-field__input"
            rows="2"
            placeholder="e.g. Sent for job work: machining of flanges, to be returned within 180 days"
            [value]="remarks()"
            (input)="remarks.set($any($event.target).value)"
          ></textarea>
        </label>

        @if (error(); as e) {
          <p class="nc__err" role="alert">{{ e }}</p>
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
    .nc {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .nc__grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px 14px;
      align-items: end;
    }
    .nc__wide {
      grid-column: 1 / -1;
    }
    .nc__h {
      margin: 4px 0 0;
      font: 600 13px var(--ar-font-sans);
    }
    .nc__lines {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .nc__line {
      display: grid;
      grid-template-columns: 1.6fr 1.1fr 2fr 0.8fr 0.7fr 0.8fr 28px;
      gap: 6px;
      align-items: start;
    }
    .nc__line > input,
    .nc__line > select {
      min-width: 0;
    }
    .nc__line--head {
      font: 600 11px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .nc__x {
      height: 36px;
      background: none;
      border: 0;
      color: var(--ar-bad-600, #b42318);
      cursor: pointer;
    }
    .nc__x:disabled {
      opacity: 0.3;
      cursor: default;
    }
    .nc__add {
      align-self: flex-start;
      background: none;
      border: 1px dashed var(--ar-line-200);
      border-radius: 6px;
      padding: 6px 12px;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
      cursor: pointer;
    }
    .nc__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    @media (max-width: 760px) {
      .nc__grid {
        grid-template-columns: 1fr 1fr;
      }
      .nc__line {
        grid-template-columns: 1fr 1fr;
      }
      .nc__line--head {
        display: none;
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

  /** A new customer choice; a new account (or none) refills the site address from it. */
  protected onCustomer(choice: SalesCustomerChoice): void {
    this.choice.set(choice);
    this.error.set(null);
    if (choice.party !== this.party()) {
      this.party.set(choice.party);
      this.chooseShipTo(defaultShipIndex(choice.party));
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

  protected async save(): Promise<void> {
    const choice = this.choice();
    const customer = choice?.customer;
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
      customerId: customer.id,
      customerAccountId: choice.accountId ?? undefined,
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
      const created = await firstValueFrom(this.api.create(input));
      this.closed.emit(created);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The challan could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
