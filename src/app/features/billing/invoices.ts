import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { OpsService } from '../../core/services/ops.service';
import { Invoice, InvoiceState } from '../../core/models/ops.model';
import { count, inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

const STATE_TONE: Record<InvoiceState, ChipTone> = {
  draft: 'neutral',
  issued: 'amber',
  paid: 'good',
  cancelled: 'neutral',
  credited: 'warn',
};

/**
 * GST invoices and the meter-versus-Meta variance.
 *
 * The two live on one screen because they answer the same question from opposite
 * ends: the invoice says what the customer owes, reconciliation says whether the
 * number behind it can be trusted. Splitting them means the variance is only ever
 * found by someone who went looking.
 */
@Component({
  selector: 'ar-invoices',
  imports: [ArTopbar, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoices.html',
  styleUrl: './invoices.scss',
})
export class ArInvoices {
  private readonly ops = inject(OpsService);

  protected readonly invoices = this.ops.invoices;
  protected readonly runs = this.ops.reconciliationRuns;
  protected readonly selectedId = signal<string | null>('inv-1');

  protected readonly selected = computed<Invoice | null>(
    () => this.invoices().find((i) => i.id === this.selectedId()) ?? this.invoices()[0] ?? null,
  );

  protected readonly outstanding = computed(() =>
    this.invoices()
      .filter((i) => i.state === 'issued')
      .reduce((n, i) => n + i.totalInPaise, 0),
  );

  /** Runs past tolerance that nobody has looked at yet. The number that should worry someone. */
  protected readonly unresolvedVariances = computed(
    () => this.runs().filter((r) => !r.withinTolerance && !r.acknowledged).length,
  );

  protected readonly subtitle = computed(() => {
    const outstanding = this.outstanding();
    const variances = this.unresolvedVariances();
    const money = outstanding === 0 ? 'Nothing outstanding' : `${inr(outstanding)} outstanding`;

    return variances === 0
      ? `${money} · meter reconciled`
      : `${money} · ${variances} unresolved variance${variances === 1 ? '' : 's'}`;
  });

  protected tone(state: InvoiceState): ChipTone {
    return STATE_TONE[state];
  }

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected period(invoice: Invoice): string {
    const from = new Date(invoice.periodStart);
    const to = new Date(invoice.periodEnd);
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return `${fmt(from)} – ${fmt(to)} ${to.getFullYear()}`;
  }

  protected day(iso?: string): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';
  }

  /** 1800 basis points reads as 18%. Nobody outside the code thinks in basis points. */
  protected ratePercent(basisPoints: number): string {
    return `${(basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 2)}%`;
  }

  protected variancePercent(basisPoints: number): string {
    const sign = basisPoints > 0 ? '+' : '';
    return `${sign}${(basisPoints / 100).toFixed(2)}%`;
  }

  protected readonly inr = inr;
  protected readonly count = count;
}
