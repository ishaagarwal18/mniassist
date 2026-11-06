import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  AccountCategory,
  AccountSubCategory,
  BalanceNature,
  ChartOfAccountService,
  CreateChartOfAccountDto,
} from '../../../proxy/finance';
import { ArButton, ArCard } from '../../../ui';

/**
 * Add a new General Ledger account to the Chart of Accounts.
 * Route: /finance/chart-of-accounts/new
 */
@Component({
  selector: 'ar-new-account-page',
  standalone: true,
  imports: [FormsModule, ArTopbar, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Add General Ledger Account"
      subtitle="Register an account ledger in the 5-tier financial hierarchy"
    >
      <button ar-button type="button" variant="ghost" (click)="cancel()">
        Back to Chart of Accounts
      </button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <form class="account-form" (submit)="$event.preventDefault(); submit()">
        <ar-card heading="Account Classification & Identity">
          <div class="form-grid">
            <label class="ar-field">
              <span class="ar-field__label">Account Code <span class="required">*</span></span>
              <input
                type="text"
                class="ar-field__input ar-mono"
                required
                placeholder="e.g. 1015, 2040, 5030"
                [(ngModel)]="accountCode"
                name="accountCode"
              />
              <span class="ar-field__hint">Unique 4-digit numeric ledger code (1xxx Asset, 2xxx Liability, 3xxx Equity, 4xxx Revenue, 5/6xxx Expense).</span>
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Account Name <span class="required">*</span></span>
              <input
                type="text"
                class="ar-field__input"
                required
                placeholder="e.g. ICICI Bank Operating Account, Factory Power & Gas"
                [(ngModel)]="accountName"
                name="accountName"
              />
              <span class="ar-field__hint">Full ledger title as shown in financial statements and audit trail.</span>
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Category <span class="required">*</span></span>
              <select
                class="ar-field__input"
                [(ngModel)]="category"
                name="category"
                (change)="onCategoryChange()"
              >
                <option [ngValue]="AccountCategory.Asset">Asset (1xxx)</option>
                <option [ngValue]="AccountCategory.Liability">Liability (2xxx)</option>
                <option [ngValue]="AccountCategory.Equity">Equity (3xxx)</option>
                <option [ngValue]="AccountCategory.Revenue">Revenue (4xxx)</option>
                <option [ngValue]="AccountCategory.Expense">Expense (5/6xxx)</option>
              </select>
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Sub-Category <span class="required">*</span></span>
              <select class="ar-field__input" [(ngModel)]="subCategory" name="subCategory">
                <option [ngValue]="AccountSubCategory.BankAndCash">Bank and Cash</option>
                <option [ngValue]="AccountSubCategory.AccountsReceivable">Accounts Receivable (Sundry Debtors)</option>
                <option [ngValue]="AccountSubCategory.Inventory">Inventory (Raw, WIP, Finished)</option>
                <option [ngValue]="AccountSubCategory.CurrentAsset">Current Asset</option>
                <option [ngValue]="AccountSubCategory.NonCurrentAsset">Non-Current / Fixed Plant Asset</option>
                <option [ngValue]="AccountSubCategory.AccountsPayable">Accounts Payable (Sundry Creditors)</option>
                <option [ngValue]="AccountSubCategory.DutiesAndTaxes">Duties and Taxes (GST / TDS)</option>
                <option [ngValue]="AccountSubCategory.CurrentLiability">Current Liability</option>
                <option [ngValue]="AccountSubCategory.NonCurrentLiability">Term Borrowing / Loan</option>
                <option [ngValue]="AccountSubCategory.ShareCapital">Share Capital</option>
                <option [ngValue]="AccountSubCategory.RetainedEarnings">Retained Earnings & Reserves</option>
                <option [ngValue]="AccountSubCategory.OperatingRevenue">Operating Revenue</option>
                <option [ngValue]="AccountSubCategory.OtherIncome">Other Income</option>
                <option [ngValue]="AccountSubCategory.CostOfGoodsSold">Cost of Goods Sold (COGS)</option>
                <option [ngValue]="AccountSubCategory.OperatingExpense">Operating Expense</option>
                <option [ngValue]="AccountSubCategory.DepreciationAndAmortization">Depreciation & Amortization</option>
                <option [ngValue]="AccountSubCategory.TaxExpense">Tax Expense</option>
              </select>
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Normal Balance Nature <span class="required">*</span></span>
              <select class="ar-field__input" [(ngModel)]="normalBalance" name="normalBalance">
                <option [ngValue]="BalanceNature.Debit">Debit (Dr) — Increases with debits</option>
                <option [ngValue]="BalanceNature.Credit">Credit (Cr) — Increases with credits</option>
              </select>
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Opening Balance (₹)</span>
              <input
                type="number"
                step="0.01"
                class="ar-field__input ar-mono"
                [(ngModel)]="openingBalanceInRupees"
                name="openingBalance"
              />
              <span class="ar-field__hint">Carried-forward opening ledger balance at fiscal year start.</span>
            </label>

            <label class="ar-field full-width">
              <span class="ar-field__label">Account Description & Purpose</span>
              <textarea
                class="ar-field__input"
                rows="3"
                placeholder="Specify the operational purpose, statutory requirements (e.g. MSME, GST Section), or banking details..."
                [(ngModel)]="description"
                name="description"
              ></textarea>
            </label>
          </div>
        </ar-card>

        @if (error(); as err) {
          <p class="error-msg" role="alert">{{ err }}</p>
        }

        <div class="form-actions">
          <button ar-button type="button" variant="ghost" (click)="cancel()">Cancel</button>
          <button
            ar-button
            type="submit"
            variant="primary"
            [disabled]="busy() || !accountCode.trim() || !accountName.trim()"
          >
            {{ busy() ? 'Saving…' : 'Create Ledger Account' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .page-container {
      padding: 1.5rem 2rem 3rem;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .account-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-top: 10px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .required {
      color: var(--ar-bad-600, #b42318);
    }
    .error-msg {
      margin: 0;
      padding: 0.75rem 1rem;
      border: 1px solid var(--ar-red-200, #fecaca);
      border-radius: var(--ar-radius-control, 6px);
      background: var(--ar-red-100, #fee2e2);
      color: var(--ar-bad-600, #b42318);
      font: 500 13px var(--ar-font-sans);
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ArNewAccountPage {
  private readonly router = inject(Router);
  private readonly coaService = inject(ChartOfAccountService);
  private readonly toasts = inject(ToastService);

  protected readonly AccountCategory = AccountCategory;
  protected readonly AccountSubCategory = AccountSubCategory;
  protected readonly BalanceNature = BalanceNature;

  protected accountCode = '';
  protected accountName = '';
  protected category = AccountCategory.Asset;
  protected subCategory = AccountSubCategory.CurrentAsset;
  protected normalBalance = BalanceNature.Debit;
  protected openingBalanceInRupees = 0;
  protected description = '';

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  onCategoryChange(): void {
    if (
      this.category === AccountCategory.Asset ||
      this.category === AccountCategory.Expense
    ) {
      this.normalBalance = BalanceNature.Debit;
    } else {
      this.normalBalance = BalanceNature.Credit;
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/finance/chart-of-accounts');
  }

  submit(): void {
    if (this.busy() || !this.accountCode.trim() || !this.accountName.trim()) return;

    this.busy.set(true);
    this.error.set(null);

    const input: CreateChartOfAccountDto = {
      accountCode: this.accountCode.trim(),
      accountName: this.accountName.trim(),
      category: this.category,
      subCategory: this.subCategory,
      normalBalance: this.normalBalance,
      openingBalanceInPaise: Math.round((Number(this.openingBalanceInRupees) || 0) * 100),
      description: this.description.trim() || undefined,
    };

    if (environment.useMockData) {
      this.busy.set(false);
      this.toasts.success(`Account ${input.accountCode} (${input.accountName}) added.`);
      void this.router.navigateByUrl('/finance/chart-of-accounts');
      return;
    }

    this.coaService.create(input).subscribe({
      next: (created) => {
        this.busy.set(false);
        this.toasts.success(`Account ${created.accountCode} (${created.accountName}) added.`);
        void this.router.navigateByUrl('/finance/chart-of-accounts');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error?.message ?? 'Could not create the ledger account.');
      },
    });
  }
}
