import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';

import { environment } from '../../../environments/environment';
import { ErpCustomerLedgerDto, ErpSyncService } from '../../proxy/integrations/erp-sync.service';
import { rupees } from '../payments/payment-logic';

/**
 * What the ERP says this customer has been billed and owes, as of the last sync. Shows nothing at all for a customer that is in
 * no ERP — most workspaces have none connected, and an empty "Invoices" box would only be noise.
 */
@Component({
  selector: 'ar-erp-ledger',
  imports: [ArGrid, GridModule],
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
            <ejs-grid
              arGrid="erp-ledger-invoices"
              [dataSource]="l.invoices"
              aria-label="Invoices from the ERP"
            >
              <e-columns>
                <e-column field="number" headerText="Invoice" width="130"></e-column>
                <e-column field="invoiceDateUtc" headerText="Date" width="110">
                  <ng-template #template let-i>
                    {{ day(i.invoiceDateUtc) }}
                  </ng-template>
                </e-column>
                <e-column field="dueDateUtc" headerText="Due" width="110">
                  <ng-template #template let-i>
                    {{ i.dueDateUtc ? day(i.dueDateUtc) : '—' }}
                  </ng-template>
                </e-column>
                <e-column field="totalInPaise" headerText="Total" width="120" [textAlign]="'Right'">
                  <ng-template #template let-i>
                    {{ money(i.totalInPaise) }}
                  </ng-template>
                </e-column>
                <e-column field="outstandingInPaise" headerText="Unpaid" width="120" [textAlign]="'Right'">
                  <ng-template #template let-i>
                    <span [class.led__bad]="i.isOverdue">
                      {{ i.outstandingInPaise != null ? money(i.outstandingInPaise) : '—' }}
                    </span>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          }
        </section>
      }
    }
  `,
  styles: `
    .led {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--ar-line-200);
    }
    .led__sum {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .led__sum div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .led__sum b {
      font: 600 15px var(--ar-font-sans);
      color: var(--ar-ink-900);
      font-variant-numeric: tabular-nums;
    }
    .led__sum span {
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .led__scroll {
      overflow-x: auto;
    }
    .led__table {
      width: 100%;
      border-collapse: collapse;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .led__table th {
      text-align: left;
      font-weight: 500;
      color: var(--ar-ink-500);
      padding: 4px 8px 4px 0;
      border-bottom: 1px solid var(--ar-line-200);
    }
    .led__table td {
      padding: 5px 8px 5px 0;
      border-bottom: 1px solid var(--ar-line-100, var(--ar-line-200));
      white-space: nowrap;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .led__bad,
    .led__bad b {
      color: var(--ar-bad-600, #b42318);
    }
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
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
