import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { grantedPolicy } from '../../core/auth/permission';
import { AccountStore } from '../../core/services/account.store';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { CustomerAccountRollupDto } from '../../proxy/contacts';
import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';
import { ArAvatar, ArButton, ArIcon } from '../../ui';
import { ArErpLedger } from './erp-ledger';

/**
 * An account's roll-up (/contacts/accounts/:accountId/rollup): its contacts, open and won enquiries, pipeline value, stages and
 * key contacts, with or without its subsidiaries, and its ERP ledger. Opened from Accounts.
 */
@Component({
  selector: 'ar-account-rollup',
  imports: [RouterLink, ArTopbar, ArAvatar, ArButton, ArIcon, ArErpLedger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-rollup.html',
  styleUrl: './account-rollup.scss',
})
export class ArAccountRollup {
  private readonly store = inject(AccountStore);
  private readonly accounts = inject(CustomerAccountService);
  private readonly permissions = inject(PermissionService);

  protected readonly canView360 = grantedPolicy('AutoReach.Customer360', this.permissions);
  protected readonly accountId = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly rollup = signal<CustomerAccountRollupDto | null>(null);
  protected readonly includeSubsidiaries = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const id = params.get('accountId');
        this.accountId.set(id);
        this.includeSubsidiaries.set(false);
        if (!id) return;
        this.accounts.get(id).subscribe({
          next: (a) => this.name.set(a.name ?? ''),
          error: () => this.name.set(''),
        });
        void this.load();
      });
  }

  protected async toggleSubsidiaries(on: boolean): Promise<void> {
    this.includeSubsidiaries.set(on);
    await this.load();
  }

  private async load(): Promise<void> {
    const id = this.accountId();
    if (!id) return;
    this.rollup.set(null);
    this.error.set(null);
    try {
      this.rollup.set(await this.store.rollup(id, this.includeSubsidiaries()));
    } catch (e) {
      this.error.set(readApiError(e, 'The roll-up could not be loaded.'));
    }
  }

  protected inr(paise?: number): string {
    return '₹' + Math.round((paise ?? 0) / 100).toLocaleString('en-IN');
  }

  protected breakdownRows(r: CustomerAccountRollupDto): { stage: string; count: number }[] {
    return Object.entries(r.lifecycleBreakdown ?? {}).map(([stage, count]) => ({ stage, count }));
  }

  protected when(iso?: string | null): string {
    if (!iso) return 'no activity';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
