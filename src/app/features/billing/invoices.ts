import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { OpsService } from '../../core/services/ops.service';
import { Invoice, InvoiceState } from '../../core/models/ops.model';
import { count, inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ChipTone } from '../../ui/chip';

/** The first day of last month → the last day of last month, as yyyy-mm-dd. */
function lastMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

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
  imports: [ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoices.html',
  styleUrl: './invoices.scss',
})
export class ArInvoices {
  private readonly ops = inject(OpsService);

  protected readonly invoices = this.ops.invoices;
  protected readonly runs = this.ops.reconciliationRuns;
  protected readonly selectedId = signal<string | null>('inv-1');

  // ---- Generate invoice dialog -----------------------------------
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly g = signal({
    periodStart: '',
    periodEnd: '',
    stateCode: '',
    legalName: '',
    gstin: '',
    address: '',
  });

  protected patchInvoice(key: keyof ReturnType<ArInvoices['g']>, value: string): void {
    this.g.update((s) => ({ ...s, [key]: value }));
  }

  protected openDialog(): void {
    const { start, end } = lastMonthRange();
    this.g.set({
      periodStart: start,
      periodEnd: end,
      stateCode: '',
      legalName: '',
      gstin: '',
      address: '',
    });
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected async generate(): Promise<void> {
    const v = this.g();
    if (!v.legalName.trim() || !/^\d{2}$/.test(v.stateCode.trim())) {
      window.alert('Customer legal name and a 2-digit place-of-supply state code are required.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.ops.generateInvoice({
        periodStartUtc: v.periodStart ? new Date(v.periodStart).toISOString() : undefined,
        periodEndUtc: v.periodEnd ? new Date(v.periodEnd).toISOString() : undefined,
        placeOfSupplyStateCode: v.stateCode.trim(),
        customerLegalName: v.legalName.trim(),
        customerGstin: v.gstin.trim() || undefined,
        customerAddress: v.address.trim() || undefined,
      });
      this.dialogOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The invoice could not be generated.');
    } finally {
      this.saving.set(false);
    }
  }

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
