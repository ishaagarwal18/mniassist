import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { grantedPolicy } from '../../core/auth/permission';
import { AccountStore } from '../../core/services/account.store';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  AccountContactDto,
  CustomerAccountDto,
  CustomerAccountRollupDto,
} from '../../proxy/contacts/models';
import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';
import { ArAvatar, ArButton, ArIcon } from '../../ui';
import { ArErpLedger } from './erp-ledger';

/**
 * An account's roll-up (/contacts/accounts/:accountId/rollup):
 * Comprehensive Account Intelligence Dashboard aggregating contacts, open and won enquiries,
 * pipeline value, deal stage breakdowns, key decision makers, ERP ledger, and activity tracking.
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
  protected readonly account = signal<CustomerAccountDto | null>(null);
  protected readonly name = signal('');
  protected readonly rollup = signal<CustomerAccountRollupDto | null>(null);
  protected readonly includeSubsidiaries = signal(false);
  protected readonly loadingRollup = signal(false);
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
          next: (a) => {
            this.account.set(a);
            this.name.set(a.name ?? '');
          },
          error: () => {
            this.account.set(null);
            this.name.set('');
          },
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
    this.loadingRollup.set(true);
    this.error.set(null);
    try {
      this.rollup.set(await this.store.rollup(id, this.includeSubsidiaries()));
    } catch (e) {
      this.error.set(readApiError(e, 'The roll-up could not be loaded.'));
    } finally {
      this.loadingRollup.set(false);
    }
  }

  protected locationOf(acc: CustomerAccountDto): string {
    return [acc.city, acc.state].filter((s): s is string => !!s).join(', ');
  }

  protected inr(paise?: number): string {
    return '₹' + Math.round((paise ?? 0) / 100).toLocaleString('en-IN');
  }

  protected breakdownRows(r: CustomerAccountRollupDto): { stage: string; count: number }[] {
    return Object.entries(r.lifecycleBreakdown ?? {}).map(([stage, count]) => ({ stage, count }));
  }

  protected totalDeals(r: CustomerAccountRollupDto): number {
    return Object.values(r.lifecycleBreakdown ?? {}).reduce((sum, count) => sum + count, 0);
  }

  protected stagePercentage(count: number, total: number): number {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  protected stageColor(stage: string): string {
    const s = stage.toLowerCase();
    if (s.includes('won') || s.includes('closed won')) return '#0D9488'; // teal
    if (s.includes('lost') || s.includes('dropped')) return '#EF4444'; // red
    if (s.includes('negotiat') || s.includes('proposal')) return '#7C3AED'; // purple
    if (s.includes('qualif') || s.includes('contacted') || s.includes('meeting')) return '#2563EB'; // blue
    if (s.includes('enquiry') || s.includes('lead') || s.includes('new')) return '#D97706'; // amber
    return '#64748B'; // slate
  }

  protected activeContacts(r: CustomerAccountRollupDto): AccountContactDto[] {
    return (r.contacts ?? []).filter((c) => !!c.lastInboundAtUtc);
  }

  protected when(iso?: string | null): string {
    if (!iso) return 'No recorded activity';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatDateTime(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
