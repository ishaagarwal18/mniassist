import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PipelineStore, QState, Quotation } from '../../core/services/pipeline.service';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { environment } from '../../../environments/environment';
import {
  QuotationSignatureService,
  QuotationSignatureSummaryDto,
  SignatureRequestStatus,
} from '../../proxy/pipeline';
import { SIGNATURE_STATUS_LABEL } from '../signing/signing-logic';
import { ArQuoteEditor } from './quote-editor';
import { ArQuoteSignatureDialog } from './quote-signature-dialog';
import { ChipTone } from '../../ui/chip';

const STATE_TONE: Record<QState, ChipTone> = {
  draft: 'neutral',
  issued: 'amber',
  revised: 'amber',
  won: 'good',
  lost: 'bad',
  expired: 'warn',
};

/**
 * Quotations (M10). List with the follow-up cadence state front and centre — a
 * quotation with a follow-up due today is the thing a sales engineer came here to
 * find. Won/lost is captured here so conversion reporting has a source.
 */
@Component({
  selector: 'ar-quotations',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArQuoteEditor, ArQuoteSignatureDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quotations.html',
  styleUrl: './quotations.scss',
})
export class ArQuotations {
  private readonly store = inject(PipelineStore);
  private readonly signatures = inject(QuotationSignatureService);

  protected readonly quotes = this.store.quotes;
  protected readonly loading = this.store.loading;
  protected readonly busy = signal<string | null>(null);

  // ---- Signatures ------------------------------------------------------
  /** Signing needs the live API: a link has to be something a customer can open. */
  protected readonly signingAvailable = !environment.useMockData;
  protected readonly signatureStatus = signal<ReadonlyMap<string, QuotationSignatureSummaryDto>>(
    new Map(),
  );
  protected readonly signingFor = signal<Quotation | null>(null);

  constructor() {
    // Where each visible quotation's signature request stands, fetched in one call whenever the list changes.
    effect(() => {
      const ids = this.quotes().map((q) => q.id);
      if (!this.signingAvailable || ids.length === 0) return;
      untracked(() => void this.loadSignatureStatuses(ids));
    });
  }

  private async loadSignatureStatuses(ids: string[]): Promise<void> {
    try {
      const rows = await firstValueFrom(this.signatures.lookupStatuses(ids.slice(0, 200)));
      this.signatureStatus.set(
        new Map(rows.filter((r) => r.quotationId).map((r) => [r.quotationId!, r])),
      );
    } catch {
      // The list is still useful without the chips.
    }
  }

  protected sigChip(q: Quotation): { label: string; tone: ChipTone } | null {
    const s = this.signatureStatus().get(q.id)?.status;
    if (s === undefined) return null;
    const tone: Record<SignatureRequestStatus, ChipTone> = {
      [SignatureRequestStatus.Pending]: 'amber',
      [SignatureRequestStatus.Signed]: 'good',
      [SignatureRequestStatus.Declined]: 'bad',
      [SignatureRequestStatus.Expired]: 'warn',
      [SignatureRequestStatus.Voided]: 'neutral',
    };
    return { label: SIGNATURE_STATUS_LABEL[s], tone: tone[s] };
  }

  protected canSign(q: Quotation): boolean {
    return q.state === 'issued' || q.state === 'revised';
  }

  protected signingClosed(): void {
    this.signingFor.set(null);
    // A signature wins the quotation, so the list itself has changed too.
    this.store.reloadQuotes();
  }

  // ---- Line editor -----------------------------------------------------
  protected readonly editingId = signal<string | null>(null);

  protected editorClosed(saved: boolean): void {
    this.editingId.set(null);
    if (saved) this.store.reloadQuotes();
  }

  // ---- New quotation dialog -----------------------------------------
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly enquiryOptions = signal<{ id: string; label: string }[]>([]);
  protected readonly enquiryId = signal('');

  protected openDialog(): void {
    const opts = this.store.openEnquiryOptions();
    this.enquiryOptions.set(opts);
    this.enquiryId.set(opts[0]?.id ?? '');
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected async createQuotation(): Promise<void> {
    if (!this.enquiryId()) {
      window.alert('Pick the enquiry this quotation is for.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.createQuotation(this.enquiryId());
      this.dialogOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The quotation could not be created.');
    } finally {
      this.saving.set(false);
    }
  }

  protected readonly awaitingDecision = computed(
    () => this.quotes().filter((q) => q.state === 'issued' || q.state === 'revised').length,
  );

  protected tone(s: QState): ChipTone {
    return STATE_TONE[s];
  }

  /** The GST by rate, for the hover text: "GST 12% ₹120 · 18% ₹360". Nothing when there is one rate or none. */
  protected gstTitle(q: Quotation): string {
    const parts = q.taxBreakdown ?? [];
    return parts.length > 1
      ? 'GST ' + parts.map((t) => `${t.ratePercent}% ${inr(t.taxInPaise)}`).join(' · ')
      : '';
  }

  protected money(paise: number): string {
    return inr(paise);
  }

  protected when(iso?: string): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';
  }

  protected followUp(q: Quotation): string {
    if (!q.nextFollowUpAt)
      return q.state === 'issued' || q.state === 'revised' ? 'cadence finished' : '—';
    const days = Math.round((new Date(q.nextFollowUpAt).getTime() - Date.now()) / 86_400_000);
    if (days <= 0) return 'due now';
    return `in ${days}d`;
  }

  protected async won(q: Quotation): Promise<void> {
    this.busy.set(q.id);
    try {
      await this.store.markQuoteWon(q.id);
    } finally {
      this.busy.set(null);
    }
  }

  protected async lost(q: Quotation): Promise<void> {
    const reason = window.prompt('Why was this quotation lost?')?.trim();
    if (!reason) return;
    this.busy.set(q.id);
    try {
      await this.store.markQuoteLost(q.id, reason);
    } finally {
      this.busy.set(null);
    }
  }

  protected async download(q: Quotation): Promise<void> {
    this.busy.set(q.id);
    try {
      await this.store.downloadQuote(q.id);
    } finally {
      this.busy.set(null);
    }
  }
}
