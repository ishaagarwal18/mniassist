import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { inr } from '../../core/util/format';
import {
  QuotationRevisionDiffDto,
  QuotationRevisionDto,
  QuotationService,
} from '../../proxy/pipeline/quotation.service';
import { ArButton, ArCard, ArChip } from '../../ui';

/**
 * Every issue of a quotation, R0, R1, R2…, each with its own PDF, and what changed between any two: lines added, removed or
 * changed, the total difference, and a plain note to paste into the message that sends the new revision.
 */
@Component({
  selector: 'ar-quote-revisions',
  imports: [ArButton, ArCard, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quote-revisions.html',
  styleUrl: './quote-revisions.scss',
})
export class ArQuoteRevisions implements OnInit {
  private readonly api = inject(QuotationService);
  private readonly toasts = inject(ToastService);

  readonly quotationId = input.required<string>();
  readonly reference = input('');

  protected readonly inr = inr;
  protected readonly revisions = signal<QuotationRevisionDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly from = signal<number | null>(null);
  protected readonly to = signal<number | null>(null);
  protected readonly diff = signal<QuotationRevisionDiffDto | null>(null);
  protected readonly comparing = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const list = await firstValueFrom(this.api.getRevisions(this.quotationId()));
      this.revisions.set(list);
      // Newest against the one before it: what the customer is about to be told.
      if (list.length >= 2) {
        this.to.set(list[0].revisionNumber);
        this.from.set(list[1].revisionNumber);
        await this.compare();
      }
    } catch (e) {
      this.toasts.error(readApiError(e, 'The revisions could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async compare(): Promise<void> {
    const from = this.from();
    const to = this.to();
    if (from === null || to === null || from === to) {
      this.diff.set(null);
      return;
    }
    this.comparing.set(true);
    try {
      this.diff.set(
        await firstValueFrom(
          this.api.compareRevisions(this.quotationId(), Math.min(from, to), Math.max(from, to)),
        ),
      );
    } catch (e) {
      this.toasts.error(readApiError(e, 'The revisions could not be compared.'));
    } finally {
      this.comparing.set(false);
    }
  }

  protected pick(side: 'from' | 'to', value: string): void {
    (side === 'from' ? this.from : this.to).set(Number(value));
    void this.compare();
  }

  protected async download(r: QuotationRevisionDto): Promise<void> {
    try {
      const blob = await firstValueFrom(
        this.api.downloadRevisionPdf(this.quotationId(), r.revisionNumber),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.reference()}-R${r.revisionNumber}${blob.type.includes('pdf') ? '.pdf' : '.html'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.toasts.error(readApiError(e, 'That revision has no document.'));
    }
  }

  protected async copyChanges(): Promise<void> {
    const d = this.diff();
    if (!d) return;
    try {
      await navigator.clipboard.writeText(`${d.summary}\n\n${d.changeNote}`.trim());
      this.toasts.success('Changes copied. Paste them into the message that sends the revision.');
    } catch {
      this.toasts.warning(
        'The browser did not allow copying. Select the text and copy it instead.',
      );
    }
  }

  protected money(paise: number | null | undefined): string {
    return paise === null || paise === undefined ? '—' : inr(paise);
  }

  protected qty(q: number | null | undefined): string {
    return q === null || q === undefined ? '—' : String(q);
  }

  protected tone(change: string): 'good' | 'bad' | 'amber' {
    return change === 'Added' ? 'good' : change === 'Removed' ? 'bad' : 'amber';
  }
}
