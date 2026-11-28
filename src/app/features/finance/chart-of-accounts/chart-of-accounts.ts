import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  AccountCategory,
  AccountSubCategory,
  BalanceNature,
  ChartOfAccountDto,
  ChartOfAccountService,
} from '../../../proxy/finance';
import { ArBanner, ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';
import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { readApiError } from '../../../core/util/api-error';
import { ArGrid } from '../../../ui/grid';

@Component({
  selector: 'app-chart-of-accounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    ArTopbar,
    ArBanner,
    ArButton,
    ArChip,
    ArDialog,
    ArGrid,
    GridModule,
    RouterLink,
  ],
  template: `
    <ar-topbar
      help="The ledger accounts every voucher, invoice and statement posts to, grouped as assets, liabilities, income and expenses."
      title="Chart of Accounts (General Ledger)">
      <div actions class="topbar-actions">
        @if (canCreate()) {
          <button ar-button="ghost" (click)="seedStandardAccounts()">
            &#9881; Bootstrap Standard COA
          </button>
          <a ar-button="primary" routerLink="/finance/chart-of-accounts/new">+ Add Account</a>
        }
      </div>
    </ar-topbar>

    <div class="page-content">
      @if (loadError(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      } @else if (!isLoading() && accounts().length === 0) {
        <ar-banner tone="teal">
          No ledger accounts yet. Use “Bootstrap Standard COA” to add the standard Indian
          manufacturing and service ledgers, or add your own accounts.
        </ar-banner>
      }
      <!-- KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Total Accounts</span>
          <strong class="value">{{ accounts().length }}</strong>
          <span class="sub">5-Tier financial hierarchy</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Total Assets (Debit)</span>
          <strong class="value">₹{{ stats().totalAssets / 100 | number: '1.2-2' }}</strong>
          <span class="sub">Bank, receivables, inventory, plant</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Total Liabilities (Credit)</span>
          <strong class="value">₹{{ stats().totalLiabilities / 100 | number: '1.2-2' }}</strong>
          <span class="sub">Payables, GST/TDS, loans</span>
        </div>
        <div class="kpi-card">
          <span class="label">Operating Revenue</span>
          <strong class="value">₹{{ stats().totalRevenue / 100 | number: '1.2-2' }}</strong>
          <span class="sub">Product sales, AMC & service</span>
        </div>
      </section>

      <!-- Filter bar -->
      <section class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="input-search"
            placeholder="Search Account Code, Name, or Subcategory..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>
        <div class="filter-chips">
          <button
            class="chip-filter"
            [class.active]="categoryFilter() === 'ALL'"
            (click)="categoryFilter.set('ALL')"
          >
            All Accounts ({{ accounts().length }})
          </button>
          <button
            class="chip-filter"
            [class.active]="categoryFilter() === AccountCategory.Asset.toString()"
            (click)="categoryFilter.set(AccountCategory.Asset.toString())"
          >
            Assets (1xxx)
          </button>
          <button
            class="chip-filter"
            [class.active]="categoryFilter() === AccountCategory.Liability.toString()"
            (click)="categoryFilter.set(AccountCategory.Liability.toString())"
          >
            Liabilities (2xxx)
          </button>
          <button
            class="chip-filter"
            [class.active]="categoryFilter() === AccountCategory.Equity.toString()"
            (click)="categoryFilter.set(AccountCategory.Equity.toString())"
          >
            Equity (3xxx)
          </button>
          <button
            class="chip-filter"
            [class.active]="categoryFilter() === AccountCategory.Revenue.toString()"
            (click)="categoryFilter.set(AccountCategory.Revenue.toString())"
          >
            Revenue (4xxx)
          </button>
          <button
            class="chip-filter"
            [class.active]="categoryFilter() === AccountCategory.Expense.toString()"
            (click)="categoryFilter.set(AccountCategory.Expense.toString())"
          >
            Expenses (5/6xxx)
          </button>
        </div>
      </section>

      <!-- Accounts Table -->
      <section class="table-card">
        <ejs-grid
          arGrid="chart-of-accounts"
          [dataSource]="filteredAccounts()"
          aria-label="Chart of Accounts"
        >
          <e-columns>
            <e-column field="accountCode" headerText="Account Code" width="140">
              <ng-template #template let-acc>
                <span class="code-badge">{{ acc.accountCode }}</span>
              </ng-template>
            </e-column>
            <e-column field="accountName" headerText="Account Title & Description" width="260">
              <ng-template #template let-acc>
                <div class="acc-desc-block">
                  <span class="acc-name">{{ acc.accountName }}</span>
                  <span class="acc-sub" *ngIf="acc.description">{{ acc.description }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="category" headerText="Category" width="140">
              <ng-template #template let-acc>
                <ar-chip [tone]="getCategoryTone(acc.category)">
                  {{ getCategoryLabel(acc.category) }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column field="subCategory" headerText="Sub-Category" width="160">
              <ng-template #template let-acc>
                <span class="subcat-tag">{{ getSubCategoryLabel(acc.subCategory) }}</span>
              </ng-template>
            </e-column>
            <e-column field="normalBalance" headerText="Nature" width="130">
              <ng-template #template let-acc>
                <span
                  class="nature-tag"
                  [class.nature-dr]="acc.normalBalance === BalanceNature.Debit"
                >
                  {{ acc.normalBalance === BalanceNature.Debit ? 'Dr (Debit)' : 'Cr (Credit)' }}
                </span>
              </ng-template>
            </e-column>
            <e-column
              field="currentBalanceInPaise"
              headerText="Current Ledger Balance"
              textAlign="Right"
              width="180"
            >
              <ng-template #template let-acc>
                <span
                  class="balance-value"
                  [class.text-debit]="acc.normalBalance === BalanceNature.Debit"
                  [class.text-credit]="acc.normalBalance === BalanceNature.Credit"
                >
                  ₹{{ acc.currentBalanceInPaise / 100 | number: '1.2-2' }}
                </span>
              </ng-template>
            </e-column>
            <e-column field="isActive" headerText="Status" width="120">
              <ng-template #template let-acc>
                <ar-chip [tone]="acc.isActive ? 'good' : 'neutral'">
                  {{ acc.isActive ? 'Active' : 'Inactive' }}
                </ar-chip>
              </ng-template>
            </e-column>
            @if (canUpdate() || canDelete()) {
              <e-column headerText="" width="150" [allowSorting]="false" [allowFiltering]="false">
                <ng-template #template let-acc>
                  <span class="coa-actions">
                    @if (canUpdate()) {
                      <button
                        type="button"
                        class="coa-link"
                        [attr.aria-label]="'Edit ' + acc.accountName"
                        (click)="openEdit(acc)"
                      >
                        Edit
                      </button>
                    }
                    @if (canDelete() && !acc.isSystemAccount) {
                      <button
                        type="button"
                        class="coa-link"
                        [attr.aria-label]="'Delete ' + acc.accountName"
                        (click)="remove(acc)"
                      >
                        Delete
                      </button>
                    }
                  </span>
                </ng-template>
              </e-column>
            }
          </e-columns>
        </ejs-grid>
      </section>
    </div>

    @if (editing(); as e) {
      <ar-dialog [title]="'Edit ' + e.code" (dismiss)="editing.set(null)">
        <div class="coa-form">
          <label class="ar-field" for="coa-name">
            <span class="ar-field__label">Account name</span>
            <input
              id="coa-name"
              class="ar-field__input"
              maxlength="200"
              [value]="e.name"
              (input)="patchEdit({ name: $any($event.target).value })"
            />
          </label>
          <label class="ar-field" for="coa-desc">
            <span class="ar-field__label"
              >Description <span class="ar-field__opt">optional</span></span
            >
            <input
              id="coa-desc"
              class="ar-field__input"
              maxlength="500"
              [value]="e.description"
              (input)="patchEdit({ description: $any($event.target).value })"
            />
          </label>
          <label class="coa-check">
            <input
              type="checkbox"
              [checked]="e.active"
              (change)="patchEdit({ active: $any($event.target).checked })"
            />
            Active (can be used in new entries)
          </label>
          <p class="coa-note">
            The code, category and normal balance are fixed: past entries are reported by them.
          </p>
          @if (editError(); as err) {
            <p class="coa-err" role="alert">{{ err }}</p>
          }
        </div>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="editing.set(null)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="saving()"
            (click)="saveEdit()"
          >
            {{ saving() ? 'Saving…' : 'Save account' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        padding-bottom: 3rem;
      }
      .coa-actions {
        display: inline-flex;
        gap: 10px;
      }
      .coa-link {
        border: 0;
        background: transparent;
        color: var(--ar-primary);
        font: 500 13px var(--ar-font-sans);
        cursor: pointer;
        padding: 0;
      }
      .coa-link:focus-visible {
        outline: 2px solid var(--ar-primary);
        outline-offset: 2px;
      }
      .coa-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .coa-check {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        font: 400 13px var(--ar-font-sans);
      }
      .coa-note {
        margin: 0;
        font: 400 12px/1.5 var(--ar-font-sans);
        color: var(--ar-ink-500);
      }
      .coa-err {
        margin: 0;
        color: var(--ar-bad-600);
        font: 500 12.5px var(--ar-font-sans);
      }

      .page-content {
        padding: 1.5rem 2rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .topbar-actions {
        display: flex;
        gap: 0.75rem;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 1rem;
      }

      .kpi-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        padding: 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);

        &.teal {
          border-left: 4px solid #0d9488;
        }
        &.amber {
          border-left: 4px solid #f59e0b;
        }

        .label {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--ar-text-muted, #64748b);
          font-weight: 600;
        }

        .value {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--ar-text-primary, #0f172a);
        }

        .sub {
          font-size: 0.75rem;
          color: var(--ar-text-secondary, #94a3b8);
        }
      }

      .filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .search-box {
        flex: 1;
        min-width: 280px;

        .input-search {
          width: 100%;
          padding: 0.5rem 0.85rem;
          border: 1px solid var(--ar-border, #cbd5e1);
          border-radius: 6px;
          font-size: 0.875rem;
          background: var(--ar-surface, #ffffff);
        }
      }

      .filter-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;

        .chip-filter {
          padding: 0.35rem 0.85rem;
          font-size: 0.8rem;
          border-radius: 20px;
          border: 1px solid var(--ar-border, #cbd5e1);
          background: var(--ar-surface, #ffffff);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.15s ease;

          &.active {
            background: var(--ar-primary, #1e293b);
            color: #ffffff;
            border-color: var(--ar-primary, #1e293b);
          }
        }
      }

      .table-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;

        th {
          background: var(--ar-bg-subtle, #f8fafc);
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: var(--ar-text-secondary, #475569);
          border-bottom: 1px solid var(--ar-border, #e2e8f0);
        }

        td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--ar-border, #f1f5f9);
          vertical-align: middle;
        }
      }

      .code-badge {
        font-family: monospace;
        font-weight: 700;
        background: var(--ar-bg-100);
        color: #0f172a;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.85rem;
      }

      .acc-desc-block {
        display: flex;
        flex-direction: column;

        .acc-name {
          font-weight: 600;
          color: #0f172a;
        }

        .acc-sub {
          font-size: 0.75rem;
          color: #64748b;
        }
      }

      .subcat-tag {
        font-size: 0.75rem;
        color: #475569;
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-200);
        padding: 2px 6px;
        border-radius: 3px;
      }

      .nature-tag {
        font-size: 0.72rem;
        font-weight: 600;
        padding: 2px 5px;
        border-radius: 3px;
        background: #fef3c7;
        color: #b45309;

        &.nature-dr {
          background: #e0f2fe;
          color: #0369a1;
        }
      }

      .balance-value {
        font-family: monospace;
        font-size: 0.9rem;
        font-weight: 700;

        &.text-debit {
          color: #0284c7;
        }
        &.text-credit {
          color: #16a34a;
        }
      }

      .text-right {
        text-align: right;
      }
      .empty-cell {
        text-align: center;
        padding: 2.5rem 1rem;
        color: #94a3b8;
      }

      .modal-body-container {
        padding: 1.25rem;
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        &.full-width {
          grid-column: 1 / -1;
        }

        label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
        }

        .form-control {
          padding: 0.45rem 0.75rem;
          border: 1px solid var(--ar-line-300);
          border-radius: 5px;
          font-size: 0.875rem;

          &:focus {
            outline: none;
            border-color: #0284c7;
          }
        }
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }

      .mt-3 {
        margin-top: 0.75rem;
      }
      .mt-4 {
        margin-top: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartOfAccountsComponent {
  private readonly coaService = inject(ChartOfAccountService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);
  protected readonly canCreate = grantedPolicy(
    'AutoReach.ChartOfAccounts.Create',
    this.permissions,
  );
  protected readonly canUpdate = grantedPolicy(
    'AutoReach.ChartOfAccounts.Update',
    this.permissions,
  );
  protected readonly canDelete = grantedPolicy(
    'AutoReach.ChartOfAccounts.Delete',
    this.permissions,
  );
  protected readonly editing = signal<{
    acc: ChartOfAccountDto;
    code: string;
    name: string;
    description: string;
    active: boolean;
  } | null>(null);
  protected readonly editError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected openEdit(acc: ChartOfAccountDto): void {
    this.editError.set(null);
    this.editing.set({
      acc,
      code: `${acc.accountCode} · ${acc.accountName}`,
      name: acc.accountName,
      description: acc.description ?? '',
      active: acc.isActive,
    });
  }

  protected patchEdit(
    change: Partial<{ name: string; description: string; active: boolean }>,
  ): void {
    this.editing.update((e) => (e ? { ...e, ...change } : e));
    this.editError.set(null);
  }

  protected saveEdit(): void {
    const e = this.editing();
    if (!e) return;
    if (!e.name.trim()) {
      this.editError.set('Give the account a name.');
      return;
    }
    this.saving.set(true);
    this.coaService
      .update(
        e.acc.id!,
        {
          accountName: e.name.trim(),
          category: e.acc.category,
          subCategory: e.acc.subCategory,
          description: e.description.trim() || undefined,
          isActive: e.active,
        },
        { skipHandleError: true },
      )
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          this.accounts.update((list) => list.map((a) => (a.id === saved.id ? saved : a)));
          this.editing.set(null);
          this.toasts.success('Account saved.', 'Chart of accounts');
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.editError.set(readApiError(err, 'The account could not be saved.'));
        },
      });
  }

  protected async remove(acc: ChartOfAccountDto): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'account',
        `${acc.accountCode} · ${acc.accountName}`,
        'An account with journal postings cannot be deleted; make it inactive instead.',
      ))
    )
      return;
    this.coaService.delete(acc.id!, { skipHandleError: true }).subscribe({
      next: () => {
        this.accounts.update((list) => list.filter((a) => a.id !== acc.id));
        this.toasts.success('Account deleted.', 'Chart of accounts');
      },
      error: (err: unknown) =>
        this.toasts.error(
          readApiError(err, 'The account could not be deleted.'),
          'Chart of accounts',
        ),
    });
  }

  readonly accounts = signal<ChartOfAccountDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly categoryFilter = signal<string>('ALL');

  readonly filteredAccounts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cf = this.categoryFilter();

    return this.accounts().filter((a) => {
      if (cf !== 'ALL' && a.category.toString() !== cf) return false;
      if (!q) return true;

      return (
        a.accountCode.toLowerCase().includes(q) ||
        a.accountName.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
      );
    });
  });

  readonly stats = computed(() => {
    const list = this.accounts();
    const totalAssets = list
      .filter((a) => a.category === AccountCategory.Asset)
      .reduce((acc, a) => acc + a.currentBalanceInPaise, 0);
    const totalLiabilities = list
      .filter((a) => a.category === AccountCategory.Liability)
      .reduce((acc, a) => acc + a.currentBalanceInPaise, 0);
    const totalRevenue = list
      .filter((a) => a.category === AccountCategory.Revenue)
      .reduce((acc, a) => acc + a.currentBalanceInPaise, 0);

    return {
      totalAssets,
      totalLiabilities,
      totalRevenue,
    };
  });

  readonly AccountCategory = AccountCategory;
  readonly AccountSubCategory = AccountSubCategory;
  readonly BalanceNature = BalanceNature;

  constructor() {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.coaService.getList({ maxResultCount: 1000 }).subscribe({
      next: (res) => {
        this.accounts.set(res.items ?? []);
        this.isLoading.set(false);
      },
      error: (e: unknown) => {
        this.loadError.set(readApiError(e, 'The chart of accounts could not be loaded.'));
        this.isLoading.set(false);
      },
    });
  }

  getCategoryTone(category: AccountCategory): ChipTone {
    switch (category) {
      case AccountCategory.Asset:
        return 'teal';
      case AccountCategory.Liability:
        return 'amber';
      case AccountCategory.Equity:
        return 'neutral';
      case AccountCategory.Revenue:
        return 'good';
      case AccountCategory.Expense:
        return 'warn';
      default:
        return 'neutral';
    }
  }

  getCategoryLabel(category: AccountCategory): string {
    switch (category) {
      case AccountCategory.Asset:
        return 'Asset';
      case AccountCategory.Liability:
        return 'Liability';
      case AccountCategory.Equity:
        return 'Equity';
      case AccountCategory.Revenue:
        return 'Revenue';
      case AccountCategory.Expense:
        return 'Expense';
      default:
        return 'Unknown';
    }
  }

  getSubCategoryLabel(sub: AccountSubCategory): string {
    switch (sub) {
      case AccountSubCategory.BankAndCash:
        return 'Bank & Cash';
      case AccountSubCategory.AccountsReceivable:
        return 'Accounts Receivable';
      case AccountSubCategory.Inventory:
        return 'Inventory';
      case AccountSubCategory.CurrentAsset:
        return 'Current Asset';
      case AccountSubCategory.NonCurrentAsset:
        return 'Fixed / Plant Asset';
      case AccountSubCategory.AccountsPayable:
        return 'Accounts Payable';
      case AccountSubCategory.DutiesAndTaxes:
        return 'Duties & Taxes (GST/TDS)';
      case AccountSubCategory.CurrentLiability:
        return 'Current Liability';
      case AccountSubCategory.NonCurrentLiability:
        return 'Term Borrowing';
      case AccountSubCategory.ShareCapital:
        return 'Share Capital';
      case AccountSubCategory.RetainedEarnings:
        return 'Retained Earnings';
      case AccountSubCategory.OperatingRevenue:
        return 'Operating Revenue';
      case AccountSubCategory.OtherIncome:
        return 'Other Income';
      case AccountSubCategory.CostOfGoodsSold:
        return 'Cost of Goods Sold';
      case AccountSubCategory.OperatingExpense:
        return 'Operating Expense';
      case AccountSubCategory.DepreciationAndAmortization:
        return 'Depreciation';
      case AccountSubCategory.TaxExpense:
        return 'Tax Expense';
      default:
        return 'General';
    }
  }

  seedStandardAccounts(): void {
    this.coaService.seedStandardCoa().subscribe({
      next: (count) => {
        this.loadAccounts();
        this.toasts.success(
          count
            ? `Standard Chart of Accounts bootstrapped with ${count} accounts.`
            : 'The standard accounts are already in your chart of accounts.',
        );
      },
      // The API's reason is shown by the app-wide error toast.
    });
    return;
  }
}
