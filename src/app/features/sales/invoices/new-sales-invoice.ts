import { NgTemplateOutlet } from '@angular/common';
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
import { ArTopbar } from '../../../layout/topbar';
import { ArButton } from '../../../ui';
import { ArIcon } from '../../../ui/icon';
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
  imports: [ArTopbar, ArButton, ArIcon, ArSalesCustomer, ArCatalogueItem, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-sales-invoice.html',
  styleUrl: './new-sales-invoice.scss',
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
  /** E-invoice details from the GST portal or another tool, for an invoice registered outside the app. */
  protected readonly irn = signal('');
  protected readonly qrCode = signal('');
  protected readonly ewayBill = signal('');
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

  /** Mobile summary drawer open/close state (< 1200px) */
  protected readonly mobileSummaryOpen = signal(false);

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

  // ---- Interactions --------------------------------------------------------------

  protected toggleMobileSummary(): void {
    this.mobileSummaryOpen.update((v) => !v);
  }

  protected cancel(): void {
    this.closed.emit(null);
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

    const irn = this.irn().trim();
    const eway = this.ewayBill().replace(/\s/g, '');
    if (irn && !/^[0-9a-fA-F]{64}$/.test(irn)) {
      this.error.set('An IRN is 64 letters and digits (0–9, a–f), as shown on the GST portal.');
      return;
    }
    if (eway && !/^[0-9]{12}$/.test(eway)) {
      this.error.set('An e-way bill number has 12 digits.');
      return;
    }
    if (this.qrCode().trim() && !irn) {
      this.error.set('Enter the IRN that goes with the signed QR code.');
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
      irn: irn || undefined,
      qrCodeData: this.qrCode().trim() || undefined,
      eWayBillNumber: eway || undefined,
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
