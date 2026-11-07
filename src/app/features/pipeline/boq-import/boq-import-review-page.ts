import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { inr } from '../../../core/util/format';
import { ArTopbar } from '../../../layout/topbar';
import {
  BoqImportDto,
  BoqImportLineDto,
  BoqImportService,
  BoqImportState,
  BoqLineDecision,
  BoqLineDecisionInput,
} from '../../../proxy/pipeline/boq-import.service';
import { QuotationService } from '../../../proxy/pipeline/quotation.service';
import type { CatalogueMatchDto } from '../../../proxy/pipeline/quote-pricing.models';
import { ArBanner, ArButton, ArChip } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import {
  DECISION_LABEL,
  LineFilter,
  STATE_LABEL,
  STATE_TONE,
  acceptableSuggestions,
  filterLines,
  isBusy,
  matchLabel,
  paiseOf,
  progress,
  summary,
} from './boq-import.logic';

/** How often the page asks how the reading is going. */
const POLL_MS = 3000;

/** What the editor under the grid is doing for one line. */
interface Editing {
  line: BoqImportLineDto;
  mode: 'change' | 'price';
}

/**
 * Quote from a file, step 2: the progress while the files are read, then every line with what it matched, for the engineer to
 * accept, change, price by hand or skip. "Create draft quotation" is offered once no line is left to decide.
 */
@Component({
  selector: 'ar-boq-import-review-page',
  imports: [ArTopbar, ArButton, ArBanner, ArChip, ArGrid, GridModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boq-import-review-page.html',
  styleUrl: './boq-import-review-page.scss',
})
export class ArBoqImportReviewPage {
  private readonly api = inject(BoqImportService);
  private readonly quotations = inject(QuotationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly State = BoqImportState;
  protected readonly Decision = BoqLineDecision;
  protected readonly inr = inr;
  protected readonly matchLabel = matchLabel;
  protected readonly stateLabel = STATE_LABEL;
  protected readonly stateTone = STATE_TONE;

  private readonly id = this.route.snapshot.paramMap.get('id')!;
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly item = signal<BoqImportDto | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly filter = signal<LineFilter>('check');
  /** Lines decided while "Needs checking" is shown: they stay in view until the filter changes. */
  private readonly keep = signal<ReadonlySet<string>>(new Set());

  protected readonly editing = signal<Editing | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly searchResults = signal<CatalogueMatchDto[]>([]);
  protected readonly searching = signal(false);
  protected readonly priceText = signal('');

  protected readonly lines = computed(() => {
    const i = this.item();
    return i ? filterLines(i.lines, this.filter(), this.keep()) : [];
  });
  protected readonly summaryText = computed(() => (this.item() ? summary(this.item()!) : ''));
  protected readonly progressText = computed(() => (this.item() ? progress(this.item()!) : ''));
  protected readonly suggestions = computed(() => acceptableSuggestions(this.item()?.lines ?? []));
  protected readonly canDraft = computed(() => {
    const i = this.item();
    return (
      !!i &&
      i.state === BoqImportState.Review &&
      i.pendingCount === 0 &&
      i.lines.some((l) => l.decision !== BoqLineDecision.Skipped) &&
      !this.saving()
    );
  });
  protected readonly closed = computed(() => {
    const s = this.item()?.state;
    return s === BoqImportState.Drafted || s === BoqImportState.Discarded;
  });
  protected readonly notFoundCount = computed(() => this.item()?.notFoundCount ?? 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopPolling());
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const i = await firstValueFrom(this.api.get(this.id));
      this.item.set(i);
      this.loadError.set(null);
      this.stopPolling();
      if (isBusy(i.state)) {
        this.timer = setTimeout(() => void this.load(), POLL_MS);
      }
    } catch (e) {
      this.loadError.set(readApiError(e, 'The import could not be loaded.'));
    }
  }

  private stopPolling(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  protected setFilter(f: LineFilter): void {
    this.keep.set(new Set());
    this.filter.set(f);
  }

  /** Saves decisions and takes the import back as the API has it now. */
  private async decide(decisions: BoqLineDecisionInput[], done?: string): Promise<boolean> {
    if (!decisions.length) return false;
    this.saving.set(true);
    try {
      const i = await firstValueFrom(this.api.updateLines(this.id, { lines: decisions }));
      this.keep.update((k) => new Set([...k, ...decisions.map((d) => d.lineId)]));
      this.item.set(i);
      if (done) this.toasts.success(done);
      return true;
    } catch (e) {
      this.toasts.error(readApiError(e, 'The line could not be saved.'));
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  protected accept(l: BoqImportLineDto): void {
    void this.decide([{ lineId: l.id, decision: BoqLineDecision.Accepted }]);
  }

  protected skip(l: BoqImportLineDto): void {
    void this.decide([{ lineId: l.id, decision: BoqLineDecision.Skipped }]);
  }

  protected reopen(l: BoqImportLineDto): void {
    void this.decide([{ lineId: l.id, decision: BoqLineDecision.Pending }]);
  }

  protected setQuantity(l: BoqImportLineDto, value: string): void {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity === l.quantity) return;
    void this.decide([
      {
        lineId: l.id,
        decision: l.decision,
        quantity,
        partNumber: l.partNumber,
        unitPriceInPaise: l.unitPriceInPaise,
      },
    ]);
  }

  protected async acceptSuggestions(): Promise<void> {
    const lines = this.suggestions();
    if (!lines.length) return;
    const ok = await this.dialogs.confirm({
      title: `Accept ${lines.length} suggested item${lines.length === 1 ? '' : 's'}?`,
      message:
        'Each line is quoted as the item shown beside it. Suggestions come from a text search, so check the list first; you can still change any line afterwards.',
      confirmText: 'Accept all',
    });
    if (!ok) return;
    void this.decide(
      lines.map((l) => ({ lineId: l.id, decision: BoqLineDecision.Accepted })),
      `${lines.length} line${lines.length === 1 ? '' : 's'} accepted.`,
    );
  }

  protected startChange(l: BoqImportLineDto): void {
    this.editing.set({ line: l, mode: 'change' });
    this.searchTerm.set(l.asPartNumber ?? '');
    this.searchResults.set([]);
    if (l.asPartNumber) void this.search();
  }

  protected startPrice(l: BoqImportLineDto): void {
    this.editing.set({ line: l, mode: 'price' });
    this.priceText.set(l.unitPriceInPaise ? (l.unitPriceInPaise / 100).toString() : '');
  }

  protected closeEditor(): void {
    this.editing.set(null);
  }

  protected async search(): Promise<void> {
    const term = this.searchTerm().trim();
    const i = this.item();
    if (term.length < 2 || !i) return;
    this.searching.set(true);
    try {
      this.searchResults.set(
        await firstValueFrom(
          this.quotations.searchCatalogue({
            query: term,
            contactId: i.contactId,
            priceListId: i.priceListId,
            maxResultCount: 8,
          }),
        ),
      );
    } catch (e) {
      this.toasts.error(readApiError(e, 'The catalogue could not be searched.'));
    } finally {
      this.searching.set(false);
    }
  }

  protected async choose(partNumber: string): Promise<void> {
    const e = this.editing();
    if (!e) return;
    if (await this.decide([{ lineId: e.line.id, decision: BoqLineDecision.Changed, partNumber }])) {
      this.editing.set(null);
    }
  }

  protected async savePrice(): Promise<void> {
    const e = this.editing();
    const paise = paiseOf(this.priceText());
    if (!e) return;
    if (paise === null) {
      this.toasts.warning('Type the unit price in rupees, for example 1250 or 1,250.50.');
      return;
    }
    if (
      await this.decide([
        { lineId: e.line.id, decision: BoqLineDecision.ManualPrice, unitPriceInPaise: paise },
      ])
    ) {
      this.editing.set(null);
    }
  }

  protected async retry(): Promise<void> {
    this.saving.set(true);
    try {
      this.item.set(await firstValueFrom(this.api.start(this.id)));
      void this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The files could not be read again.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async discard(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Discard this import?',
      message: 'No quotation is made. The import stays in the list as Discarded.',
      confirmText: 'Discard',
    });
    if (!ok) return;
    try {
      this.item.set(await firstValueFrom(this.api.discard(this.id)));
      this.toasts.success('Import discarded.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The import could not be discarded.'));
    }
  }

  protected async createQuotation(): Promise<void> {
    if (!this.canDraft()) return;
    this.saving.set(true);
    try {
      const i = await firstValueFrom(this.api.createQuotation(this.id));
      this.item.set(i);
      this.toasts.success(`Draft ${i.quotationReference ?? 'quotation'} created.`);
      if (i.quotationId) await this.router.navigate(['/quotations', i.quotationId, 'edit']);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The draft quotation could not be created.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected decisionText(d: BoqLineDecision): string {
    return DECISION_LABEL[d];
  }

  protected lineTotal(l: BoqImportLineDto): number | null {
    return l.unitPriceInPaise === null || l.unitPriceInPaise === undefined
      ? null
      : Math.round(l.quantity * l.unitPriceInPaise);
  }
}
