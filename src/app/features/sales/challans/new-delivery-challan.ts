import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PickerOption } from '../../../core/services/pipeline.service';
import {
  CreateDeliveryChallanDto,
  DeliveryChallanDto,
} from '../../../proxy/sales/delivery-challan.models';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { DeliveryChallanStatus, DeliveryChallanType } from '../../../proxy/sales/sales-enums';
import { ArButton, ArDialog } from '../../../ui';
import { ArDateInput } from '../../../ui/date-input';
import { ArSelect } from '../../../ui/select';
import { errorMessage } from '../../activities/activity-logic';
import { ArContactPicker } from '../../pipeline/contact-picker';
import { EMPTY_PARTY, SalesParty, SalesPartyService } from '../sales-party';

interface ChallanLine {
  partNumber: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitOfMeasure: string;
}

const BLANK_LINE: ChallanLine = {
  partNumber: '',
  description: '',
  hsnCode: '',
  quantity: 1,
  unitOfMeasure: 'Nos',
};

/** Why goods move on a challan — the GST reasons a challan is used instead of an invoice. */
export const CHALLAN_TYPES: readonly { value: DeliveryChallanType; label: string }[] = [
  { value: DeliveryChallanType.SupplyAgainstOrder, label: 'Supply against order' },
  { value: DeliveryChallanType.JobWork, label: 'Job work' },
  { value: DeliveryChallanType.SupplyOnApproval, label: 'Supply on approval' },
  { value: DeliveryChallanType.MaterialReturn, label: 'Material return' },
  { value: DeliveryChallanType.Other, label: 'Other' },
];

const UNITS = ['Nos', 'Set', 'Kg', 'Mtr', 'Ltr', 'Box', 'Pair', 'Lot'] as const;

/**
 * A new delivery challan raised directly — job work, supply on approval, returns, or goods sent before the order is in the system.
 * Picking the customer offers their account's shipping addresses. Saved as a draft; dispatched and invoiced from the list.
 */
@Component({
  selector: 'ar-new-delivery-challan',
  imports: [ArDialog, ArButton, ArSelect, ArDateInput, ArContactPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      title="New delivery challan"
      width="min(860px, calc(100vw - 32px))"
      (dismiss)="closed.emit(null)"
    >
      <div class="nc">
        <div class="nc__grid">
          <div class="ar-field nc__wide">
            <span class="ar-field__label">Customer <span class="ar-field__req">*</span></span>
            <ar-contact-picker [initial]="initialCustomer()" (picked)="pickCustomer($event)" />
            @if (party().accountName; as a) {
              <span class="ar-field__hint">Account: {{ a }}</span>
            }
          </div>
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
            <span class="ar-field__label">Ship to</span>
            @if (party().shipTo.length) {
              <select class="ar-field__input" (change)="chooseShipTo(+$any($event.target).value)">
                @for (s of party().shipTo; track $index; let i = $index) {
                  <option [value]="i" [selected]="i === shipIndex()">{{ s.label }}</option>
                }
                <option [value]="-1" [selected]="shipIndex() === -1">Other address…</option>
              </select>
            }
            <textarea
              class="ar-field__input"
              rows="3"
              placeholder="Delivery site address"
              [value]="shippingAddress()"
              (input)="shippingAddress.set($any($event.target).value); shipIndex.set(-1)"
            ></textarea>
          </div>
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
        <div class="nc__lines">
          <div class="nc__line nc__line--head" aria-hidden="true">
            <span>Part no.</span><span>Description</span><span>HSN</span><span>Qty</span
            ><span>Unit</span><span></span>
          </div>
          @for (l of lines(); track $index; let i = $index) {
            <div class="nc__line">
              <input
                class="ar-field__input"
                aria-label="Part number"
                [value]="l.partNumber"
                (input)="patchLine(i, 'partNumber', $any($event.target).value)"
              />
              <input
                class="ar-field__input"
                aria-label="Description"
                [value]="l.description"
                (input)="patchLine(i, 'description', $any($event.target).value)"
              />
              <input
                class="ar-field__input ar-mono"
                aria-label="HSN code"
                maxlength="8"
                [value]="l.hsnCode"
                (input)="patchLine(i, 'hsnCode', $any($event.target).value)"
              />
              <input
                class="ar-field__input"
                aria-label="Quantity"
                type="number"
                min="0"
                step="any"
                [value]="l.quantity"
                (input)="patchLine(i, 'quantity', +$any($event.target).value)"
              />
              <select
                required
                class="ar-field__input"
                aria-label="Unit"
                (change)="patchLine(i, 'unitOfMeasure', $any($event.target).value)"
              >
                @for (u of units; track u) {
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
      grid-column: span 2;
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
      grid-template-columns: 1.3fr 2.4fr 0.9fr 0.7fr 0.8fr 28px;
      gap: 6px;
      align-items: center;
    }
    .nc__line--head {
      font: 600 11px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .nc__x {
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
  private readonly parties = inject(SalesPartyService);

  /** The challan saved, or null when cancelled. */
  readonly closed = output<DeliveryChallanDto | null>();
  /** The customer to start with, e.g. from an account's Customer 360 (?customer=…&customerName=…). */
  readonly initialCustomer = input<PickerOption | null>(null);
  private readonly applyInitialCustomer = effect(() => {
    const c = this.initialCustomer();
    if (c) untracked(() => void this.pickCustomer(c));
  });

  protected readonly types = CHALLAN_TYPES;
  protected readonly units = UNITS;

  protected readonly customer = signal<PickerOption | null>(null);
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
  protected readonly lines = signal<ChallanLine[]>([{ ...BLANK_LINE }]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async pickCustomer(option: PickerOption | null): Promise<void> {
    this.customer.set(option);
    const party = option ? await this.parties.forContact(option.id) : EMPTY_PARTY;
    if (this.customer()?.id !== option?.id) return;
    this.party.set(party);
    if (party.shipTo.length) {
      this.chooseShipTo(
        Math.max(
          0,
          party.shipTo.findIndex((s) => s.isDefault),
        ),
      );
    } else {
      this.shipIndex.set(-1);
      this.shippingAddress.set(party.billingAddress);
    }
  }

  protected chooseShipTo(index: number): void {
    this.shipIndex.set(index);
    const s = this.party().shipTo[index];
    if (s) this.shippingAddress.set(s.text);
  }

  protected addLine(): void {
    this.lines.update((ls) => [...ls, { ...BLANK_LINE }]);
  }

  protected removeLine(index: number): void {
    this.lines.update((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== index) : ls));
  }

  protected patchLine<K extends keyof ChallanLine>(
    index: number,
    key: K,
    value: ChallanLine[K],
  ): void {
    this.lines.update((ls) => ls.map((l, i) => (i === index ? { ...l, [key]: value } : l)));
  }

  protected async save(): Promise<void> {
    const customer = this.customer();
    if (!customer) {
      this.error.set('Pick the customer the goods are going to.');
      return;
    }
    const lines = this.lines().filter((l) => l.partNumber.trim() || l.description.trim());
    if (!lines.length) {
      this.error.set('Add at least one item with a part number or description.');
      return;
    }
    if (lines.some((l) => !(l.quantity > 0))) {
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
      customerAccountId: this.party().accountId ?? undefined,
      challanDateUtc: new Date(this.challanDate()).toISOString(),
      shippingAddress: this.shippingAddress().trim() || undefined,
      transporterName: this.transporter().trim() || undefined,
      vehicleNumber: this.vehicle().trim() || undefined,
      lrNumber: this.lr().trim() || undefined,
      eWayBillNumber: eway || undefined,
      remarks: this.remarks().trim() || undefined,
      lines: lines.map((l) => ({
        partNumber: l.partNumber.trim() || l.description.trim(),
        description: l.description.trim() || l.partNumber.trim(),
        hsnCode: l.hsnCode.trim() || undefined,
        quantity: l.quantity,
        unitOfMeasure: l.unitOfMeasure,
      })),
    };

    this.busy.set(true);
    this.error.set(null);
    try {
      const created = environment.useMockData
        ? this.mockCreated(input, customer.label)
        : await firstValueFrom(this.api.create(input));
      this.closed.emit(created);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The challan could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  private mockCreated(input: CreateDeliveryChallanDto, customerName: string): DeliveryChallanDto {
    return {
      id: `dc-${Date.now()}`,
      challanNumber: `DC-${Date.now().toString().slice(-6)}`,
      type: input.type,
      status: DeliveryChallanStatus.Draft,
      customerId: input.customerId,
      customerName,
      challanDateUtc: input.challanDateUtc!,
      shippingAddress: input.shippingAddress,
      transporterName: input.transporterName,
      vehicleNumber: input.vehicleNumber,
      lrNumber: input.lrNumber,
      remarks: input.remarks,
      creationTime: new Date().toISOString(),
      lines: [],
    };
  }
}
