import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { inr } from '../../core/util/format';
import { PriceListDto } from '../../proxy/library';
import {
  CatalogueMatchDto,
  QuotationDto,
  QuotationState,
  QuotePriceSource,
  RepriceResultDto,
} from '../../proxy/pipeline';
import { ArButton } from '../../ui';
import { ArSelect } from '../../ui/select';
import {
  QuoteRow,
  belowListPaise,
  belowMinimum,
  blankRow,
  lineTotalPaise,
  percentToBasisPoints,
  rowFromLine,
  rowFromMatch,
  rupeesToPaise,
  taxBasisPointsOf,
  totalsOf,
} from './quote-pricing';
import { QuoteEditorApi } from './quote-editor.api';

/**
 * Writes the lines of a draft quotation. Parts are picked from the product catalogue and priced for
 * this customer: from the quotation's price list if one is chosen, else the list that fits them best,
 * else the catalogue. A typed price is kept as typed, with the list price beside it.
 */
@Component({
  selector: 'ar-quote-editor',
  imports: [ArButton, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quote-editor.html',
  styleUrl: './quote-editor.scss',
})
export class ArQuoteEditor implements OnInit {
  private readonly api = inject(QuoteEditorApi);

  readonly quotationId = input.required<string>();
  readonly closed = output<boolean>();

  protected readonly quote = signal<QuotationDto | null>(null);
  protected readonly lists = signal<PriceListDto[]>([]);
  protected readonly listId = signal('');
  protected readonly rows = signal<QuoteRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly locked = computed(() => {
    const s = this.quote()?.state;
    // Won, lost and expired quotations are a record of what was offered.
    return s === QuotationState.Won || s === QuotationState.Lost || s === QuotationState.Expired;
  });
  protected readonly issued = computed(() => {
    const s = this.quote()?.state;
    return s === QuotationState.Issued || s === QuotationState.Revised;
  });

  /** The GST percent for lines that have no rate of their own, as typed. */
  protected readonly quoteRatePct = signal('18');
  protected readonly taxRate = computed(() =>
    Math.min(3000, Math.max(0, Math.round((Number(this.quoteRatePct()) || 0) * 100))),
  );
  protected readonly totals = computed(() => totalsOf(this.rows(), this.taxRate()));

  // ---- Catalogue picker ----------------------------------------------
  protected readonly term = signal('');
  protected readonly matches = signal<CatalogueMatchDto[]>([]);
  protected readonly searching = signal(false);
  protected readonly pickerOpen = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private searchSeq = 0;
  private nextKey = 1;

  // ---- Reprice preview -----------------------------------------------
  protected readonly reprice = signal<RepriceResultDto | null>(null);
  protected readonly repricing = signal(false);

  protected readonly Source = QuotePriceSource;

  async ngOnInit(): Promise<void> {
    try {
      const [quote, lists] = await Promise.all([
        this.api.get(this.quotationId()),
        this.api.priceLists(),
      ]);
      this.lists.set(lists);
      this.load(quote);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The quotation could not be opened.');
    } finally {
      this.loading.set(false);
    }
  }

  private load(quote: QuotationDto): void {
    this.quote.set(quote);
    this.listId.set(quote.priceListId ?? '');
    this.quoteRatePct.set(String((quote.taxRateBasisPoints ?? 1800) / 100));
    this.rows.set(
      [...(quote.lines ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((l) => rowFromLine(l, this.nextKey++)),
    );
    this.dirty.set(false);
    this.reprice.set(null);
  }

  protected money(paise: number): string {
    return inr(paise);
  }
  protected lineTotal(r: QuoteRow): number {
    return lineTotalPaise(r);
  }
  protected below(r: QuoteRow): boolean {
    return belowMinimum(r);
  }
  protected discountedBy(r: QuoteRow): number {
    return belowListPaise(r);
  }

  protected listLabel(l: PriceListDto): string {
    const scope = [l.region, l.distributorTier].filter(Boolean).join(' · ');
    return scope ? `${l.name} (${scope})` : (l.name ?? '');
  }

  protected sourceLabel(r: QuoteRow): string {
    if (!r.fromList) return 'Typed';
    return r.source === QuotePriceSource.PriceList
      ? `Price list${r.listName ? ' · ' + r.listName : ''}`
      : 'Catalogue';
  }

  protected setQuoteRate(value: string): void {
    this.quoteRatePct.set(value);
    this.dirty.set(true);
  }

  protected ratePct(basisPoints: number): string {
    return String(basisPoints / 100);
  }

  protected setListId(id: string): void {
    this.listId.set(id);
    this.dirty.set(true);
    this.reprice.set(null);
  }

  // ---- Line edits ------------------------------------------------------

  protected edit(key: number, field: keyof QuoteRow, value: string): void {
    this.rows.update((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, [field]: value } as QuoteRow;
        // A price typed over a list price is a manual price from then on, and so is a part that was swapped.
        if (field === 'price' || field === 'partNumber') {
          next.fromList = false;
          next.keep = false;
          next.source = QuotePriceSource.Manual;
          next.priceListId = null;
          next.listName = null;
          if (field === 'partNumber') {
            next.listPaise = null;
            next.moq = 0;
          }
        }
        return next;
      }),
    );
    this.dirty.set(true);
  }

  protected remove(key: number): void {
    this.rows.update((rows) => rows.filter((r) => r.key !== key));
    this.dirty.set(true);
  }

  protected addBlank(): void {
    this.rows.update((rows) => [...rows, blankRow(this.nextKey++)]);
    this.dirty.set(true);
  }

  /** Puts a typed-over line back on the list price. */
  protected async useListPrice(r: QuoteRow): Promise<void> {
    if (!r.partNumber.trim()) return;
    try {
      const priced = await this.api.resolve(
        this.quotationId(),
        this.listId() || null,
        r.partNumber.trim(),
        Number(r.quantity) || 1,
      );
      if (!priced.found) {
        this.error.set(
          `${r.partNumber} is not in a price list or the catalogue: price it by hand.`,
        );
        return;
      }
      this.error.set(null);
      this.rows.update((rows) =>
        rows.map((x) =>
          x.key !== r.key
            ? x
            : {
                ...x,
                price: String((priced.unitPriceInPaise ?? 0) / 100),
                unit: priced.unit ?? x.unit,
                fromList: true,
                keep: false,
                source: priced.source ?? QuotePriceSource.Catalogue,
                priceListId: priced.priceListId ?? null,
                listName: priced.priceListName ?? null,
                tax:
                  x.tax === '' && priced.taxRateBasisPoints != null
                    ? String(priced.taxRateBasisPoints / 100)
                    : x.tax,
                listPaise: priced.unitPriceInPaise ?? null,
                moq: priced.minimumOrderQuantity ?? 0,
              },
        ),
      );
      this.dirty.set(true);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The price could not be looked up.');
    }
  }

  // ---- Picker ------------------------------------------------------------

  protected onTerm(value: string): void {
    this.term.set(value);
    this.pickerOpen.set(true);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.search(), 200);
  }

  protected openPicker(): void {
    this.pickerOpen.set(true);
    if (!this.matches().length) void this.search();
  }

  private async search(): Promise<void> {
    const seq = ++this.searchSeq;
    this.searching.set(true);
    try {
      const found = await this.api.search(
        this.quotationId(),
        this.listId() || null,
        this.term().trim() || null,
      );
      if (seq === this.searchSeq) this.matches.set(found);
    } catch {
      if (seq === this.searchSeq) this.matches.set([]);
    } finally {
      if (seq === this.searchSeq) this.searching.set(false);
    }
  }

  protected pick(m: CatalogueMatchDto): void {
    this.rows.update((rows) => [...rows, rowFromMatch(m, this.nextKey++)]);
    this.dirty.set(true);
    this.term.set('');
    this.pickerOpen.set(false);
  }

  // ---- Save and reprice --------------------------------------------------

  private dto() {
    return {
      enquiryId: this.quote()!.enquiryId,
      priceListId: this.listId() || null,
      taxRateBasisPoints: this.taxRate(),
      lines: this.rows().map((r, i) => ({
        order: i + 1,
        partNumber: r.partNumber.trim() || null,
        description: r.description.trim(),
        quantity: Number(r.quantity) || 0,
        unit: r.unit.trim() || 'no',
        unitPriceInPaise: rupeesToPaise(r.price),
        discountBasisPoints: percentToBasisPoints(r.discount),
        taxRateBasisPoints: taxBasisPointsOf(r),
        useCataloguePrice: r.fromList && !r.keep,
        keepPricing: r.fromList && r.keep,
        priceSource: r.source,
        priceListId: r.priceListId,
        listPriceInPaise: r.listPaise,
      })),
    };
  }

  protected async save(): Promise<void> {
    if (this.rows().some((r) => !r.description.trim())) {
      this.error.set('Every line needs a description.');
      return;
    }
    if (this.rows().some((r) => !(Number(r.quantity) > 0))) {
      this.error.set('Every line needs a quantity above zero.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const saved = await this.api.update(this.quotationId(), this.dto());
      this.load(saved);
      this.closed.emit(true);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The quotation could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async previewReprice(): Promise<void> {
    this.repricing.set(true);
    this.error.set(null);
    try {
      this.reprice.set(
        await this.api.reprice(this.quotationId(), { keepManualPrices: true, apply: false }),
      );
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The prices could not be checked.');
    } finally {
      this.repricing.set(false);
    }
  }

  protected async applyReprice(): Promise<void> {
    this.repricing.set(true);
    this.error.set(null);
    try {
      await this.api.reprice(this.quotationId(), { keepManualPrices: true, apply: true });
      this.load(await this.api.get(this.quotationId()));
      this.closed.emit(true);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The prices could not be updated.');
    } finally {
      this.repricing.set(false);
    }
  }

  protected changedLines = computed(() => (this.reprice()?.lines ?? []).filter((l) => l.changed));

  protected close(): void {
    if (this.dirty() && !confirm('Discard the changes to this quotation?')) return;
    this.closed.emit(false);
  }
}
