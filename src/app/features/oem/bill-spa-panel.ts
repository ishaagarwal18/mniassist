import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { SpaBillCheckDto, SpaReportService } from '../../proxy/oem/spa-report.service';
import { environment } from '../../../environments/environment';
import { rupees } from './oem.logic';

/**
 * On a vendor bill: lines from an OEM that bills its special price itself, priced above that special price. Shows nothing when the bill
 * is right (or has no special-price parts).
 */
@Component({
  selector: 'ar-bill-spa-panel',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (flags().length) {
      <section class="spa__card spa__card--warn" role="alert" aria-labelledby="bd-spa">
        <header class="spa__head">
          <div>
            <h2 id="bd-spa">Billed above the special price</h2>
            <p>
              {{ rupees(total()) }} over the agreed special prices. Ask the OEM for a credit note
              before paying.
            </p>
          </div>
        </header>
        <table class="spa__table">
          <thead>
            <tr>
              <th scope="col">Line</th>
              <th scope="col">Part</th>
              <th scope="col" class="spa__num">Billed</th>
              <th scope="col" class="spa__num">Special price</th>
              <th scope="col" class="spa__num">Over by</th>
              <th scope="col">Agreement</th>
            </tr>
          </thead>
          <tbody>
            @for (f of flags(); track f.vendorBillLineId) {
              <tr>
                <td>{{ f.lineNumber }}</td>
                <td translate="no">{{ f.partNumber }}</td>
                <td class="spa__num">{{ rupees(f.billedUnitPriceInPaise) }}</td>
                <td class="spa__num">{{ rupees(f.specialBuyInPaise) }}</td>
                <td class="spa__num spa__bad">{{ rupees(f.overchargedInPaise) }}</td>
                <td>
                  <a [routerLink]="['/oem/spa', f.spaId]">{{ f.spaReference }}</a>
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
export class ArBillSpaPanel {
  private readonly api = inject(SpaReportService);
  private readonly permissions = inject(PermissionService);

  readonly billId = input.required<string>();

  private readonly canSee = grantedPolicy('AutoReach.Spa', this.permissions);
  protected readonly flags = signal<SpaBillCheckDto[]>([]);
  protected readonly total = signal(0);
  protected readonly rupees = rupees;

  constructor() {
    effect(() => {
      const id = this.billId();
      if (!environment.useMockData && this.canSee()) void this.load(id);
    });
  }

  private async load(id: string): Promise<void> {
    try {
      const flags = await firstValueFrom(this.api.checkVendorBill(id));
      this.flags.set(flags);
      this.total.set(flags.reduce((n, f) => n + f.overchargedInPaise, 0));
    } catch {
      this.flags.set([]);
    }
  }
}
