import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AccountMasterDataService } from '../../../core/services/account-master-data.service';
import { PickerOption } from '../../../core/services/pipeline.service';
import { WorkspaceProfileService } from '../../../proxy/business/workspace-profile.service';
import { SalesInvoiceKind, SalesInvoiceStatus } from '../../../proxy/sales/sales-enums';
import { CreateSalesInvoiceDto, SalesInvoiceDto } from '../../../proxy/sales/sales-invoice.models';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { ArButton, ArDialog } from '../../../ui';
import { ArDateInput } from '../../../ui/date-input';
import { ArSelect } from '../../../ui/select';
import { errorMessage } from '../../activities/activity-logic';
import { ArContactPicker } from '../../pipeline/contact-picker';
import { EMPTY_PARTY, SalesParty, SalesPartyService } from '../sales-party';

interface InvoiceLine {
  partNumber: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  gstPercent: number;
}

const BLANK_LINE: InvoiceLine = {
  partNumber: '',
  description: '',
  hsnCode: '',
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  gstPercent: 18,
};

const GST_RATES = [0, 5, 12, 18, 28] as const;

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Taxable value of a line in paise: quantity × rate, less its discount. */
export function lineTaxablePaise(l: InvoiceLine): number {
  const gross = Math.round(l.quantity * l.unitPrice * 100);
  return Math.round(gross * (1 - Math.min(100, Math.max(0, l.discountPercent)) / 100));
}

/**
 * A new sales invoice raised directly — not from an order or a challan. Picking the customer fills the GSTIN, billing and shipping
 * addresses from their account; the place of supply decides CGST+SGST or IGST. Saved as a draft for review, then issued from the list.
 */
@Component({
  selector: 'ar-new-sales-invoice',
  imports: [ArDialog, ArButton, ArSelect, ArDateInput, ArContactPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      title="New sales invoice"
      width="min(920px, calc(100vw - 32px))"
      (dismiss)="closed.emit(null)"
    >
      <div class="ni">
        <div class="ni__grid">
          <div class="ar-field ni__wide">
            <span class="ar-field__label">Customer <span class="ar-field__req">*</span></span>
            <ar-contact-picker (picked)="pickCustomer($event)" />
            @if (party().accountName; as a) {
              <span class="ar-field__hint">Account: {{ a }}</span>
            } @else if (customer()) {
              <span class="ar-field__hint">
                This contact has no account: enter the GSTIN and addresses below.
              </span>
            }
          </div>
          <label class="ar-field">
            <span class="ar-field__label">Document</span>
            <select
              required
              class="ar-field__input"
              (change)="kind.set(+$any($event.target).value)"
            >
              <option [value]="Kind.TaxInvoice" [selected]="kind() === Kind.TaxInvoice">
                Tax invoice
              </option>
              <option [value]="Kind.BillOfSupply" [selected]="kind() === Kind.BillOfSupply">
                Bill of supply (no GST)
              </option>
            </select>
          </label>
          <label class="ar-field">
            <span class="ar-field__label"
              >Customer GSTIN <span class="ar-field__opt">optional</span></span
            >
            <input
              class="ar-field__input ar-mono"
              maxlength="15"
              [value]="gstin()"
              (input)="setGstin($any($event.target).value)"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Invoice date</span>
            <input
              type="date"
              class="ar-field__input"
              [value]="issueDate()"
              (input)="issueDate.set($any($event.target).value)"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Due date</span>
            <input
              type="date"
              class="ar-field__input"
              [value]="dueDate()"
              (input)="dueDate.set($any($event.target).value)"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Place of supply</span>
            <select
              required
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
          <label class="ni__check">
            <input
              type="checkbox"
              [checked]="interState()"
              (change)="interState.set($any($event.target).checked)"
            />
            Inter-state supply (IGST instead of CGST + SGST)
          </label>
          <label class="ar-field ni__half">
            <span class="ar-field__label">Billing address</span>
            <textarea
              class="ar-field__input"
              rows="3"
              [value]="billingAddress()"
              (input)="billingAddress.set($any($event.target).value)"
            ></textarea>
          </label>
          <div class="ar-field ni__half">
            <span class="ar-field__label">Shipping address</span>
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
              [value]="shippingAddress()"
              (input)="shippingAddress.set($any($event.target).value); shipIndex.set(-1)"
            ></textarea>
          </div>
        </div>

        <h4 class="ni__h">Items</h4>
        <div class="ni__lines">
          <div class="ni__line ni__line--head" aria-hidden="true">
            <span>Part no.</span><span>Description</span><span>HSN</span><span>Qty</span>
            <span>Rate ₹</span><span>Disc %</span><span>GST %</span><span class="num">Amount ₹</span
            ><span></span>
          </div>
          @for (l of lines(); track $index; let i = $index) {
            <div class="ni__line">
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
              <input
                class="ar-field__input"
                aria-label="Rate in rupees"
                type="number"
                min="0"
                step="any"
                [value]="l.unitPrice"
                (input)="patchLine(i, 'unitPrice', +$any($event.target).value)"
              />
              <input
                class="ar-field__input"
                aria-label="Discount percent"
                type="number"
                min="0"
                max="100"
                [value]="l.discountPercent"
                (input)="patchLine(i, 'discountPercent', +$any($event.target).value)"
              />
              <select
                required
                class="ar-field__input"
                aria-label="GST rate"
                [disabled]="kind() === Kind.BillOfSupply"
                (change)="patchLine(i, 'gstPercent', +$any($event.target).value)"
              >
                @for (r of gstRates; track r) {
                  <option [value]="r" [selected]="r === l.gstPercent">{{ r }}%</option>
                }
              </select>
              <span class="num">{{ money(taxable(l)) }}</span>
              <button
                type="button"
                class="ni__x"
                [attr.aria-label]="'Remove line ' + (i + 1)"
                [disabled]="lines().length === 1"
                (click)="removeLine(i)"
              >
                ✕
              </button>
            </div>
          }
          <button type="button" class="ni__add" (click)="addLine()">+ Add item</button>
        </div>

        <div class="ni__foot">
          <label class="ar-field ni__notes">
            <span class="ar-field__label"
              >Notes <span class="ar-field__opt">printed on the invoice</span></span
            >
            <textarea
              class="ar-field__input"
              rows="2"
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
            ></textarea>
          </label>
          <dl class="ni__totals">
            <dt>Taxable value</dt>
            <dd>{{ money(totals().taxable) }}</dd>
            @if (interState()) {
              <dt>IGST</dt>
              <dd>{{ money(totals().tax) }}</dd>
            } @else {
              <dt>CGST</dt>
              <dd>{{ money(totals().tax / 2) }}</dd>
              <dt>SGST</dt>
              <dd>{{ money(totals().tax / 2) }}</dd>
            }
            <dt class="ni__grand">Total</dt>
            <dd class="ni__grand">{{ money(totals().taxable + totals().tax) }}</dd>
          </dl>
        </div>

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
      gap: 14px;
    }
    .ni__grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px 14px;
      align-items: end;
    }
    .ni__wide {
      grid-column: span 2;
    }
    .ni__half {
      grid-column: span 2;
    }
    .ni__check {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 400 12.5px var(--ar-font-sans);
      grid-column: span 2;
    }
    .ni__h {
      margin: 4px 0 0;
      font: 600 13px var(--ar-font-sans);
    }
    .ni__lines {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ni__line {
      display: grid;
      grid-template-columns: 1.2fr 2fr 0.8fr 0.6fr 0.9fr 0.6fr 0.7fr 0.9fr 28px;
      gap: 6px;
      align-items: center;
    }
    .ni__line--head {
      font: 600 11px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font: 500 12.5px var(--ar-font-sans);
    }
    .ni__x {
      background: none;
      border: 0;
      color: var(--ar-bad-600, #b42318);
      cursor: pointer;
    }
    .ni__x:disabled {
      opacity: 0.3;
      cursor: default;
    }
    .ni__add {
      align-self: flex-start;
      background: none;
      border: 1px dashed var(--ar-line-200);
      border-radius: 6px;
      padding: 6px 12px;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
      cursor: pointer;
    }
    .ni__foot {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }
    .ni__notes {
      flex: 1;
    }
    .ni__totals {
      margin: 0;
      display: grid;
      grid-template-columns: auto auto;
      gap: 4px 18px;
      font: 400 12.5px var(--ar-font-sans);
      min-width: 220px;
    }
    .ni__totals dd {
      margin: 0;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .ni__grand {
      font-weight: 700;
      color: var(--ar-ink-900);
    }
    .ni__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    @media (max-width: 760px) {
      .ni__grid {
        grid-template-columns: 1fr 1fr;
      }
      .ni__line {
        grid-template-columns: 1fr 1fr;
      }
      .ni__line--head {
        display: none;
      }
    }
  `,
})
export class ArNewSalesInvoice {
  private readonly api = inject(SalesInvoiceService);
  private readonly parties = inject(SalesPartyService);
  private readonly masterData = inject(AccountMasterDataService);
  private readonly workspace = inject(WorkspaceProfileService);

  /** The invoice saved, or null when cancelled. */
  readonly closed = output<SalesInvoiceDto | null>();

  protected readonly Kind = SalesInvoiceKind;
  protected readonly gstRates = GST_RATES;

  protected readonly customer = signal<PickerOption | null>(null);
  protected readonly party = signal<SalesParty>(EMPTY_PARTY);
  protected readonly kind = signal<SalesInvoiceKind>(SalesInvoiceKind.TaxInvoice);
  protected readonly gstin = signal('');
  protected readonly issueDate = signal(today());
  protected readonly dueDate = signal(plusDays(today(), 30));
  protected readonly placeCode = signal('');
  protected readonly interState = signal(false);
  protected readonly billingAddress = signal('');
  protected readonly shippingAddress = signal('');
  protected readonly shipIndex = signal(-1);
  protected readonly notes = signal('');
  protected readonly lines = signal<InvoiceLine[]>([{ ...BLANK_LINE }]);
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

  protected readonly totals = computed(() => {
    let taxable = 0;
    let tax = 0;
    const gst = this.kind() !== SalesInvoiceKind.BillOfSupply;
    for (const l of this.lines()) {
      const t = lineTaxablePaise(l);
      taxable += t;
      if (gst) tax += Math.round((t * l.gstPercent) / 100);
    }
    return { taxable, tax };
  });

  constructor() {
    if (!environment.useMockData) {
      firstValueFrom(this.workspace.get({ skipHandleError: true }))
        .then((p) => (this.ownStateCode = p?.stateCode ?? null))
        .catch(() => undefined);
    }
  }

  protected async pickCustomer(option: PickerOption | null): Promise<void> {
    this.customer.set(option);
    const party = option ? await this.parties.forContact(option.id) : EMPTY_PARTY;
    if (this.customer()?.id !== option?.id) return;
    this.party.set(party);
    this.gstin.set(party.gstin ?? '');
    this.billingAddress.set(party.billingAddress);
    const def = Math.max(
      0,
      party.shipTo.findIndex((s) => s.isDefault),
    );
    if (party.shipTo.length) {
      this.chooseShipTo(def);
    } else {
      this.shipIndex.set(-1);
      this.shippingAddress.set(party.billingAddress);
      this.setPlaceOfSupply(party.billingStateCode ?? '');
    }
  }

  /** Goods going to a site: its address, and its state as the place of supply. */
  protected chooseShipTo(index: number): void {
    this.shipIndex.set(index);
    const s = this.party().shipTo[index];
    if (!s) return;
    this.shippingAddress.set(s.text);
    if (s.gstin) this.gstin.set(s.gstin);
    this.setPlaceOfSupply(s.stateCode ?? this.party().billingStateCode ?? '');
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

  protected addLine(): void {
    this.lines.update((ls) => [...ls, { ...BLANK_LINE }]);
  }

  protected removeLine(index: number): void {
    this.lines.update((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== index) : ls));
  }

  protected patchLine<K extends keyof InvoiceLine>(
    index: number,
    key: K,
    value: InvoiceLine[K],
  ): void {
    this.lines.update((ls) => ls.map((l, i) => (i === index ? { ...l, [key]: value } : l)));
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

  protected async save(): Promise<void> {
    const customer = this.customer();
    if (!customer) {
      this.error.set('Pick the customer this invoice is for.');
      return;
    }
    const gstin = this.gstin().trim();
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
      this.error.set("That GSTIN isn't valid. It has 15 characters, like 27ABCDE1234F1Z5.");
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
    if (this.dueDate() < this.issueDate()) {
      this.error.set('The due date cannot be before the invoice date.');
      return;
    }

    const billOfSupply = this.kind() === SalesInvoiceKind.BillOfSupply;
    const input: CreateSalesInvoiceDto = {
      kind: this.kind(),
      customerId: customer.id,
      customerAccountId: this.party().accountId ?? undefined,
      customerGstin: gstin || undefined,
      billingAddress: this.billingAddress().trim() || undefined,
      shippingAddress: this.shippingAddress().trim() || undefined,
      placeOfSupplyStateCode: this.placeCode() || undefined,
      isInterState: this.interState(),
      issueDateUtc: new Date(this.issueDate()).toISOString(),
      dueDateUtc: new Date(this.dueDate()).toISOString(),
      discountInPaise: 0,
      notes: this.notes().trim() || undefined,
      lines: lines.map((l) => ({
        partNumber: l.partNumber.trim() || l.description.trim(),
        description: l.description.trim() || l.partNumber.trim(),
        hsnCode: l.hsnCode.trim() || undefined,
        quantity: l.quantity,
        unitPriceInPaise: Math.round(l.unitPrice * 100),
        discountPercent: l.discountPercent || 0,
        taxRateBasisPoints: billOfSupply ? 0 : Math.round(l.gstPercent * 100),
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
      this.error.set(errorMessage(e, 'The invoice could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  private mockCreated(input: CreateSalesInvoiceDto, customerName: string): SalesInvoiceDto {
    const { taxable, tax } = this.totals();
    const half = Math.round(tax / 2);
    return {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      kind: input.kind ?? SalesInvoiceKind.TaxInvoice,
      status: SalesInvoiceStatus.Draft,
      customerId: input.customerId,
      customerName,
      customerGstin: input.customerGstin,
      billingAddress: input.billingAddress,
      shippingAddress: input.shippingAddress,
      placeOfSupplyStateCode: input.placeOfSupplyStateCode,
      issueDateUtc: input.issueDateUtc!,
      dueDateUtc: input.dueDateUtc!,
      subtotalInPaise: taxable,
      discountInPaise: 0,
      cgstInPaise: input.isInterState ? 0 : half,
      sgstInPaise: input.isInterState ? 0 : tax - half,
      igstInPaise: input.isInterState ? tax : 0,
      totalTaxInPaise: tax,
      grandTotalInPaise: taxable + tax,
      paidAmountInPaise: 0,
      balanceDueInPaise: taxable + tax,
      isInterState: input.isInterState,
      creationTime: new Date().toISOString(),
      lines: [],
      payments: [],
    };
  }
}
