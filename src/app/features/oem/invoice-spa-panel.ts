import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { SpaMode } from '../../proxy/oem/oem-pricing.service';
import { InvoiceSpaLineDto, SpaClaimService } from '../../proxy/oem/spa-claim.service';
import { environment } from '../../../environments/environment';
import { LINE_STATE_TEXT } from './claims.logic';
import { rupees } from './oem.logic';

/**
 * The sales invoice page's "special price lines": for each line sold under an OEM special price, the units counted, any flagged excess,
 * and what can be claimed, with the claim it is on. Shows nothing for an invoice without special prices.
 */
@Component({
  selector: 'ar-invoice-spa-panel',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length) {
      <section class="spa__card" aria-labelledby="si-spa">
        <header class="spa__head">
          <div>
            <h2 id="si-spa">Special price lines</h2>
            <p>Claimable from the OEM: {{ rupees(total()) || '₹0' }}.</p>
          </div>
        </header>
        <table class="spa__table">
          <thead>
            <tr>
              <th scope="col">Part</th>
              <th scope="col">Special price</th>
              <th scope="col" class="spa__num">Units counted</th>
              <th scope="col" class="spa__num">Claimable</th>
              <th scope="col">Claim</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.salesInvoiceLineId) {
              <tr>
                <td translate="no">{{ r.partNumber }}</td>
                <td>
                  <a [routerLink]="['/oem/spa', r.spaId]">{{ r.spaReference }}</a>
                  @if (r.mode === Mode.BuySide) {
                    <div class="spa__muted">Billed at the special price: nothing to claim</div>
                  }
                </td>
                <td class="spa__num">
                  {{ r.usedQty ?? 'when issued' }}
                  @if (r.excessQty) {
                    <div class="spa__bad">
                      {{ r.excessQty }} over what was left: sold without the special price
                    </div>
                  }
                </td>
                <td class="spa__num">{{ rupees(r.claimableInPaise) }}</td>
                <td>
                  @if (r.claimId) {
                    <a [routerLink]="['/oem/claims', r.claimId]">{{ r.claimReference }}</a>
                    @if (r.claimLineState != null) {
                      <div class="spa__muted">{{ stateText(r.claimLineState) }}</div>
                    }
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
  `,
  styleUrl: './invoice-spa-panel.scss',
})
export class ArInvoiceSpaPanel {
  private readonly api = inject(SpaClaimService);
  private readonly permissions = inject(PermissionService);

  readonly invoiceId = input.required<string>();
  /** Bump to reload, e.g. after the invoice is issued. */
  readonly version = input(0);

  private readonly canSee = grantedPolicy('AutoReach.Spa', this.permissions);
  protected readonly rows = signal<InvoiceSpaLineDto[]>([]);
  protected readonly total = signal(0);
  protected readonly Mode = SpaMode;
  protected readonly rupees = rupees;

  constructor() {
    effect(() => {
      const id = this.invoiceId();
      this.version();
      if (!environment.useMockData && this.canSee()) void this.load(id);
    });
  }

  protected stateText(s: number): string {
    return LINE_STATE_TEXT[s as keyof typeof LINE_STATE_TEXT];
  }

  private async load(id: string): Promise<void> {
    try {
      const rows = await firstValueFrom(this.api.getForInvoice(id));
      this.rows.set(rows);
      this.total.set(rows.reduce((n, r) => n + r.claimableInPaise, 0));
    } catch {
      // Optional panel: the invoice page works without it.
      this.rows.set([]);
    }
  }
}
