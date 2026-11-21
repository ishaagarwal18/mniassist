import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ArTopbar } from '../../layout/topbar';
import { ArReorderBuyers } from '../reorder/reorder-buyers';

/**
 * Buyers and credit for a customer company (/contacts/accounts/credit, `?account=<id>` to open one):
 * Manages authorized buyers on the re-order portal, credit limits, payment schedules and manual approval hold.
 * Done returns to the Customer 360 it was opened from, otherwise to Accounts.
 */
@Component({
  selector: 'ar-account-credit',
  imports: [ArTopbar, ArReorderBuyers],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Buyers & credit"
      subtitle="Manage buyer permissions, credit limits and payment policies."
      help="Choose a customer company to configure its authorized buyer permissions on the re-order portal, set credit limits, payment terms and manual order review."
    />
    <div class="credit-page ar-scroll">
      <ar-reorder-buyers [initialAccountId]="accountId" (closed)="done()" />
    </div>
  `,
  styles: `
    .credit-page {
      padding: 1.5rem 1.75rem 3rem;
      background: #f1f5f9;
      min-height: calc(100vh - 64px);
    }
  `,
})
export class ArAccountCredit {
  private readonly router = inject(Router);
  private readonly origin = inject(CockpitOriginService);
  protected readonly accountId = inject(ActivatedRoute).snapshot.queryParamMap.get('account');

  protected done(): void {
    void this.router.navigateByUrl(this.origin.returnUrl('/contacts/accounts'));
  }
}
