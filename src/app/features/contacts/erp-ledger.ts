import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ErpCustomerLedgerDto, ErpSyncService } from '../../proxy/integrations/erp-sync.service';
import { rupees } from '../payments/payment-logic';

/**
 * What the ERP says this customer has been billed and owes, as of the last sync. Shows nothing at all for a customer that is in
 * no ERP — most workspaces have none connected, and an empty "Invoices" box would only be noise.
 */
@Component({
  selector: 'ar-erp-ledger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ledger(); as l) {
      @if (l.erpName || l.invoices.length > 0) {
        <section class="led" aria-label="Invoices from the ERP">
          <div class="led__sum">
            <div>
              <b>{{ l.balanceInPaise != null ? money(l.balanceInPaise) : '—' }}</b>
              <span>Outstanding{{ l.balanceAtUtc ? ' · ' + day(l.balanceAtUtc) : '' }}</span>
            </div>
            <div [class.led__bad]="l.overdueInPaise > 0">
              <b>{{ money(l.overdueInPaise) }}</b>
              <span>Overdue</span>
            </div>
          </div>
          @if (l.invoices.length > 0) {
            <div class="led__scroll">
              <table class="led__table">
                <thead>
                  <tr><th>Invoice</th><th>Date</th><th>Due</th><th class="num">Total</th><th class="num">Unpaid</th></tr>
                </thead>
                <tbody>
                  @for (i of l.invoices; track i.number) {
                    <tr [class.led__bad]="i.isOverdue">
                      <td>{{ i.number }}</td>
                      <td>{{ day(i.invoiceDateUtc) }}</td>
                      <td>{{ i.dueDateUtc ? day(i.dueDateUtc) : '—' }}</td>
                      <td class="num">{{ money(i.totalInPaise) }}</td>
                      <td class="num">{{ i.outstandingInPaise != null ? money(i.outstandingInPaise) : '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    }
  `,
  styles: `
    .led { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--ar-line-200); }
    .led__sum { display: flex; gap: 24px; flex-wrap: wrap; }
    .led__sum div { display: flex; flex-direction: column; gap: 2px; }
    .led__sum b { font: 600 15px var(--ar-font-sans); color: var(--ar-ink-900); font-variant-numeric: tabular-nums; }
    .led__sum span { font: 400 11.5px var(--ar-font-sans); color: var(--ar-ink-500); }
    .led__scroll { overflow-x: auto; }
    .led__table { width: 100%; border-collapse: collapse; font: 400 12px var(--ar-font-sans); color: var(--ar-ink-900); }
    .led__table th { text-align: left; font-weight: 500; color: var(--ar-ink-500); padding: 4px 8px 4px 0; border-bottom: 1px solid var(--ar-line-200); }
    .led__table td { padding: 5px 8px 5px 0; border-bottom: 1px solid var(--ar-line-100, var(--ar-line-200)); white-space: nowrap; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .led__bad, .led__bad b { color: var(--ar-bad-600, #b42318); }
  `,
})
export class ArErpLedger {
  private readonly erp = inject(ErpSyncService);

  /** An account id — or a contact's, for a contact with no account. */
  readonly customerId = input.required<string>();

  protected readonly ledger = signal<ErpCustomerLedgerDto | null>(null);

  constructor() {
    effect(() => {
      const id = this.customerId();
      this.ledger.set(null);
      if (environment.useMockData) return;
      firstValueFrom(this.erp.getLedger(id))
        .then((l) => {
          if (this.customerId() === id) this.ledger.set(l);
        })
        .catch(() => undefined); // no permission or no ERP: show nothing
    });
  }

  protected money(paise: number): string {
    return rupees(paise);
  }

  protected day(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
