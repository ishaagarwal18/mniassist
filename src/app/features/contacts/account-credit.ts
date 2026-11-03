import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ArTopbar } from '../../layout/topbar';
import { AR_DIALOG_INLINE } from '../../ui';
import { ArReorderBuyers } from '../reorder/reorder-buyers';

/**
 * Buyers and credit for a customer company (/contacts/accounts/credit, `?account=<id>` to open one): who may order on the
 * re-order portal and its credit limit, terms and hold. The same panel the dialog showed, as the page (AR_DIALOG_INLINE). Done
 * returns to the Customer 360 it was opened from, otherwise to Accounts.
 */
@Component({
  selector: 'ar-account-credit',
  imports: [ArTopbar, ArReorderBuyers],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Buyers & credit"
      help="Choose a customer company to set who may order for it on the re-order portal, and its credit limit, payment terms and hold."
    />
    <div class="credit-page ar-scroll">
      <ar-reorder-buyers [initialAccountId]="accountId" (closed)="done()" />
    </div>
  `,
  styles: `
    .credit-page {
      padding: 1.25rem 1.5rem 2rem;
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
