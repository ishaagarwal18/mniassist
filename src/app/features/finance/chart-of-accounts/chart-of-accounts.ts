import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  AccountCategory,
  AccountSubCategory,
  BalanceNature,
  ChartOfAccountDto,
  ChartOfAccountService,
  CreateChartOfAccountDto,
} from '../../../proxy/finance';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

const MOCK_COA: ChartOfAccountDto[] = [
  // Assets
  {
    id: 'coa-1010',
    accountCode: '1010',
    accountName: 'HDFC Bank Current Account',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.BankAndCash,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 50_00_000_00,
    currentBalanceInPaise: 68_45_200_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Primary operating disbursement & collections current a/c #50200012345',
  },
  {
    id: 'coa-1020',
    accountCode: '1020',
    accountName: 'Petty Cash Account',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.BankAndCash,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 50_000_00,
    currentBalanceInPaise: 42_500_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Factory workshop petty cash imprest',
  },
  {
    id: 'coa-1200',
    accountCode: '1200',
    accountName: 'Accounts Receivable (Sundry Debtors)',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.AccountsReceivable,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 85_40_000_00,
    currentBalanceInPaise: 92_15_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Customer trade receivables control ledger',
  },
  {
    id: 'coa-1300',
    accountCode: '1300',
    accountName: 'Raw Material Inventory',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.Inventory,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 1_20_00_000_00,
    currentBalanceInPaise: 1_35_60_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Steel round bars, ductile castings, Viton seal kits store',
  },
  {
    id: 'coa-1310',
    accountCode: '1310',
    accountName: 'Work-in-Progress (WIP) Inventory',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.Inventory,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 45_00_000_00,
    currentBalanceInPaise: 52_80_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Shop floor batches under active machining & testing',
  },
  {
    id: 'coa-1320',
    accountCode: '1320',
    accountName: 'Finished Goods Inventory',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.Inventory,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 78_00_000_00,
    currentBalanceInPaise: 84_50_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Completed hydraulic valves, cylinders & power packs ready for dispatch',
  },
  {
    id: 'coa-1400',
    accountCode: '1400',
    accountName: 'Plant & Heavy Machinery',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.NonCurrentAsset,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 3_50_00_000_00,
    currentBalanceInPaise: 3_50_00_000_00,
    isActive: true,
    isSystemAccount: true,
    description: '5-Axis CNC machining centers, hydrostatic pressure test pits, gantry cranes',
  },
  {
    id: 'coa-1500',
    accountCode: '1500',
    accountName: 'Input Tax Credit (ITC) - CGST',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.CurrentAsset,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 4_80_000_00,
    currentBalanceInPaise: 6_24_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Central GST ITC ledger under GSTR-2B reconciliation',
  },
  {
    id: 'coa-1510',
    accountCode: '1510',
    accountName: 'Input Tax Credit (ITC) - SGST',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.CurrentAsset,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 4_80_000_00,
    currentBalanceInPaise: 6_24_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'State GST ITC ledger under GSTR-2B reconciliation',
  },
  {
    id: 'coa-1520',
    accountCode: '1520',
    accountName: 'Input Tax Credit (ITC) - IGST',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.CurrentAsset,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 9_60_000_00,
    currentBalanceInPaise: 12_40_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Integrated GST ITC on interstate vendor purchases',
  },

  // Liabilities
  {
    id: 'coa-2010',
    accountCode: '2010',
    accountName: 'Accounts Payable (Sundry Creditors)',
    category: AccountCategory.Liability,
    subCategory: AccountSubCategory.AccountsPayable,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 64_20_000_00,
    currentBalanceInPaise: 71_50_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Vendor trade liabilities control ledger (MSME Section 15 aging compliant)',
  },
  {
    id: 'coa-2020',
    accountCode: '2020',
    accountName: 'Output GST Payable - CGST',
    category: AccountCategory.Liability,
    subCategory: AccountSubCategory.DutiesAndTaxes,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 5_40_000_00,
    currentBalanceInPaise: 7_15_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Central GST output liability on sales invoices',
  },
  {
    id: 'coa-2021',
    accountCode: '2021',
    accountName: 'Output GST Payable - SGST',
    category: AccountCategory.Liability,
    subCategory: AccountSubCategory.DutiesAndTaxes,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 5_40_000_00,
    currentBalanceInPaise: 7_15_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'State GST output liability on sales invoices',
  },
  {
    id: 'coa-2022',
    accountCode: '2022',
    accountName: 'Output GST Payable - IGST',
    category: AccountCategory.Liability,
    subCategory: AccountSubCategory.DutiesAndTaxes,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 11_20_000_00,
    currentBalanceInPaise: 14_80_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Interstate GST output liability',
  },
  {
    id: 'coa-2030',
    accountCode: '2030',
    accountName: 'TDS Payable u/s 194Q & 194C',
    category: AccountCategory.Liability,
    subCategory: AccountSubCategory.DutiesAndTaxes,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 1_80_000_00,
    currentBalanceInPaise: 2_45_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Statutory TDS deducted on vendor bills above ₹50L threshold',
  },
  {
    id: 'coa-2100',
    accountCode: '2100',
    accountName: 'Working Capital Bank Loan',
    category: AccountCategory.Liability,
    subCategory: AccountSubCategory.NonCurrentLiability,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 1_50_00_000_00,
    currentBalanceInPaise: 1_40_00_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Secured term facility with SBI Industrial Branch',
  },

  // Equity
  {
    id: 'coa-3010',
    accountCode: '3010',
    accountName: 'Paid-Up Share Capital',
    category: AccountCategory.Equity,
    subCategory: AccountSubCategory.ShareCapital,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 2_00_00_000_00,
    currentBalanceInPaise: 2_00_00_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Paid-up equity shares of ₹10 each',
  },
  {
    id: 'coa-3020',
    accountCode: '3020',
    accountName: 'Retained Earnings & Reserves',
    category: AccountCategory.Equity,
    subCategory: AccountSubCategory.RetainedEarnings,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 1_22_30_000_00,
    currentBalanceInPaise: 1_65_89_200_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Accumulated surplus reserves',
  },

  // Revenue
  {
    id: 'coa-4010',
    accountCode: '4010',
    accountName: 'Sales Revenue - Manufactured Systems',
    category: AccountCategory.Revenue,
    subCategory: AccountSubCategory.OperatingRevenue,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 2_80_00_000_00,
    currentBalanceInPaise: 3_45_00_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Commercial sales of hydraulic valves, cylinders and automation panels',
  },
  {
    id: 'coa-4020',
    accountCode: '4020',
    accountName: 'Service Revenue - AMC Contracts',
    category: AccountCategory.Revenue,
    subCategory: AccountSubCategory.OperatingRevenue,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 45_00_000_00,
    currentBalanceInPaise: 54_80_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Annual Maintenance Contracts on installed machine base',
  },
  {
    id: 'coa-4030',
    accountCode: '4030',
    accountName: 'Service Revenue - Field Breakdown & Spares',
    category: AccountCategory.Revenue,
    subCategory: AccountSubCategory.OperatingRevenue,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 22_50_000_00,
    currentBalanceInPaise: 28_40_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Emergency repair callouts and billable replacement spares',
  },
  {
    id: 'coa-4100',
    accountCode: '4100',
    accountName: 'Other Income & Metal Scrap Sales',
    category: AccountCategory.Revenue,
    subCategory: AccountSubCategory.OtherIncome,
    normalBalance: BalanceNature.Credit,
    openingBalanceInPaise: 4_10_000_00,
    currentBalanceInPaise: 5_30_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Steel shavings, ductile turnings scrap disposal',
  },

  // Expenses & COGS
  {
    id: 'coa-5010',
    accountCode: '5010',
    accountName: 'Cost of Goods Sold - Raw Materials Consumed',
    category: AccountCategory.Expense,
    subCategory: AccountSubCategory.CostOfGoodsSold,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 1_45_00_000_00,
    currentBalanceInPaise: 1_78_20_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Direct material allocation to production work orders',
  },
  {
    id: 'coa-5020',
    accountCode: '5020',
    accountName: 'Direct Shop Floor Machinist Wages',
    category: AccountCategory.Expense,
    subCategory: AccountSubCategory.CostOfGoodsSold,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 38_00_000_00,
    currentBalanceInPaise: 46_50_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Direct labor cost of CNC operators, welders and assemblers',
  },
  {
    id: 'coa-6010',
    accountCode: '6010',
    accountName: 'Factory Power, Fuel & Industrial Gases',
    category: AccountCategory.Expense,
    subCategory: AccountSubCategory.OperatingExpense,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 14_50_000_00,
    currentBalanceInPaise: 18_20_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'High-tension power bill and welding argon/CO2 gases',
  },
  {
    id: 'coa-6020',
    accountCode: '6020',
    accountName: 'Machine Tooling & Plant Maintenance',
    category: AccountCategory.Expense,
    subCategory: AccountSubCategory.OperatingExpense,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 8_90_000_00,
    currentBalanceInPaise: 11_10_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'Carbide inserts, hydraulic oil ISO VG 68, seals replacement',
  },
  {
    id: 'coa-6030',
    accountCode: '6030',
    accountName: 'Field Service Travel & Site Expenses',
    category: AccountCategory.Expense,
    subCategory: AccountSubCategory.OperatingExpense,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 6_20_000_00,
    currentBalanceInPaise: 7_90_000_00,
    isActive: true,
    isSystemAccount: true,
    description: 'On-site engineer transit, lodging, and client plant site expenses',
  },
];

@Component({
  selector: 'app-chart-of-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, ArTopbar, ArButton, ArChip, ArDialog],
  template: `
    <ar-topbar title="Chart of Accounts (General Ledger)">
      <div actions class="topbar-actions">
        <button ar-button="ghost" (click)="seedStandardAccounts()">
          &#9881; Bootstrap Standard COA
        </button>
        <button ar-button="primary" (click)="openCreate()">
          + Add Account
        </button>
      </div>
    </ar-topbar>

    <div class="page-content">
      <!-- KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Total Accounts</span>
          <strong class="value">{{ accounts().length }}</strong>
          <span class="sub">5-Tier financial hierarchy</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Total Assets (Debit)</span>
          <strong class="value">₹{{ (stats().totalAssets / 100) | number:'1.2-2' }}</strong>
          <span class="sub">Bank, receivables, inventory, plant</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Total Liabilities (Credit)</span>
          <strong class="value">₹{{ (stats().totalLiabilities / 100) | number:'1.2-2' }}</strong>
          <span class="sub">Payables, GST/TDS, loans</span>
        </div>
        <div class="kpi-card">
          <span class="label">Operating Revenue</span>
          <strong class="value">₹{{ (stats().totalRevenue / 100) | number:'1.2-2' }}</strong>
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
        <table class="data-table">
          <thead>
            <tr>
              <th>Account Code</th>
              <th>Account Title & Description</th>
              <th>Category</th>
              <th>Sub-Category</th>
              <th>Nature</th>
              <th class="text-right">Current Ledger Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let acc of filteredAccounts()">
              <td>
                <span class="code-badge">{{ acc.accountCode }}</span>
              </td>
              <td>
                <div class="acc-desc-block">
                  <span class="acc-name">{{ acc.accountName }}</span>
                  <span class="acc-sub" *ngIf="acc.description">{{ acc.description }}</span>
                </div>
              </td>
              <td>
                <ar-chip [tone]="getCategoryTone(acc.category)">
                  {{ getCategoryLabel(acc.category) }}
                </ar-chip>
              </td>
              <td>
                <span class="subcat-tag">{{ getSubCategoryLabel(acc.subCategory) }}</span>
              </td>
              <td>
                <span class="nature-tag" [class.nature-dr]="acc.normalBalance === BalanceNature.Debit">
                  {{ acc.normalBalance === BalanceNature.Debit ? 'Dr (Debit)' : 'Cr (Credit)' }}
                </span>
              </td>
              <td class="text-right">
                <span
                  class="balance-value"
                  [class.text-debit]="acc.normalBalance === BalanceNature.Debit"
                  [class.text-credit]="acc.normalBalance === BalanceNature.Credit"
                >
                  ₹{{ (acc.currentBalanceInPaise / 100) | number:'1.2-2' }}
                </span>
              </td>
              <td>
                <ar-chip [tone]="acc.isActive ? 'good' : 'neutral'">
                  {{ acc.isActive ? 'Active' : 'Inactive' }}
                </ar-chip>
              </td>
            </tr>
            <tr *ngIf="filteredAccounts().length === 0">
              <td colspan="7" class="empty-cell">No accounts found matching your criteria.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- Create Account Dialog -->
    <ar-dialog
      *ngIf="isCreateOpen()"
      title="Add General Ledger Account"
      (dismiss)="isCreateOpen.set(false)"
    >
      <div class="modal-body-container">
        <div class="form-grid">
          <div class="form-group">
            <label>Account Code</label>
            <input type="text" class="form-control" [(ngModel)]="newAccount.accountCode" placeholder="e.g. 1015, 6050" />
          </div>
          <div class="form-group">
            <label>Account Name</label>
            <input type="text" class="form-control" [(ngModel)]="newAccount.accountName" placeholder="Account Title" />
          </div>
          <div class="form-group">
            <label>Category</label>
            <select class="form-control" [(ngModel)]="newAccount.category" (change)="onCategoryChange()">
              <option [ngValue]="AccountCategory.Asset">Asset (1xxx)</option>
              <option [ngValue]="AccountCategory.Liability">Liability (2xxx)</option>
              <option [ngValue]="AccountCategory.Equity">Equity (3xxx)</option>
              <option [ngValue]="AccountCategory.Revenue">Revenue (4xxx)</option>
              <option [ngValue]="AccountCategory.Expense">Expense (5/6xxx)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Sub-Category</label>
            <select class="form-control" [(ngModel)]="newAccount.subCategory">
              <option [ngValue]="AccountSubCategory.BankAndCash">Bank and Cash</option>
              <option [ngValue]="AccountSubCategory.AccountsReceivable">Accounts Receivable</option>
              <option [ngValue]="AccountSubCategory.Inventory">Inventory</option>
              <option [ngValue]="AccountSubCategory.CurrentAsset">Current Asset</option>
              <option [ngValue]="AccountSubCategory.NonCurrentAsset">Non-Current / Fixed Asset</option>
              <option [ngValue]="AccountSubCategory.AccountsPayable">Accounts Payable</option>
              <option [ngValue]="AccountSubCategory.DutiesAndTaxes">Duties and Taxes</option>
              <option [ngValue]="AccountSubCategory.CurrentLiability">Current Liability</option>
              <option [ngValue]="AccountSubCategory.NonCurrentLiability">Non-Current Liability</option>
              <option [ngValue]="AccountSubCategory.ShareCapital">Share Capital</option>
              <option [ngValue]="AccountSubCategory.RetainedEarnings">Retained Earnings</option>
              <option [ngValue]="AccountSubCategory.OperatingRevenue">Operating Revenue</option>
              <option [ngValue]="AccountSubCategory.OtherIncome">Other Income</option>
              <option [ngValue]="AccountSubCategory.CostOfGoodsSold">Cost of Goods Sold (COGS)</option>
              <option [ngValue]="AccountSubCategory.OperatingExpense">Operating Expense</option>
              <option [ngValue]="AccountSubCategory.DepreciationAndAmortization">Depreciation & Amortization</option>
            </select>
          </div>
          <div class="form-group">
            <label>Normal Balance Nature</label>
            <select class="form-control" [(ngModel)]="newAccount.normalBalance">
              <option [ngValue]="BalanceNature.Debit">Debit (Dr)</option>
              <option [ngValue]="BalanceNature.Credit">Credit (Cr)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Opening Balance (INR)</label>
            <input type="number" class="form-control" [ngModel]="newAccount.openingBalanceInPaise / 100" (ngModelChange)="newAccount.openingBalanceInPaise = $event * 100" />
          </div>
        </div>

        <div class="form-group full-width mt-3">
          <label>Account Description & Purpose</label>
          <textarea class="form-control" rows="2" [(ngModel)]="newAccount.description"></textarea>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" (click)="createAccount()">Add Account</button>
          <button ar-button="ghost" (click)="isCreateOpen.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>
  `,
  styles: [
    `
      :host {
        display: block;
        padding-bottom: 3rem;
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

        &.teal { border-left: 4px solid #0d9488; }
        &.amber { border-left: 4px solid #f59e0b; }

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
        background: #f1f5f9;
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
        background: #f8fafc;
        border: 1px solid #e2e8f0;
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

        &.text-debit { color: #0284c7; }
        &.text-credit { color: #16a34a; }
      }

      .text-right { text-align: right; }
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
          border: 1px solid #cbd5e1;
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

      .mt-3 { margin-top: 0.75rem; }
      .mt-4 { margin-top: 1rem; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartOfAccountsComponent {
  private readonly coaService = inject(ChartOfAccountService);

  readonly accounts = signal<ChartOfAccountDto[]>(MOCK_COA);
  readonly isLoading = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly categoryFilter = signal<string>('ALL');

  // Dialog
  readonly isCreateOpen = signal<boolean>(false);

  newAccount: CreateChartOfAccountDto = {
    accountCode: '',
    accountName: '',
    category: AccountCategory.Asset,
    subCategory: AccountSubCategory.CurrentAsset,
    normalBalance: BalanceNature.Debit,
    openingBalanceInPaise: 0,
    description: '',
  };

  readonly filteredAccounts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cf = this.categoryFilter();

    return this.accounts().filter(a => {
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
    const totalAssets = list.filter(a => a.category === AccountCategory.Asset).reduce((acc, a) => acc + a.currentBalanceInPaise, 0);
    const totalLiabilities = list.filter(a => a.category === AccountCategory.Liability).reduce((acc, a) => acc + a.currentBalanceInPaise, 0);
    const totalRevenue = list.filter(a => a.category === AccountCategory.Revenue).reduce((acc, a) => acc + a.currentBalanceInPaise, 0);

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
    if (environment.useMockData) return;

    this.isLoading.set(true);
    this.coaService.getList({ maxResultCount: 200 }).subscribe({
      next: res => {
        if (res.items && res.items.length > 0) {
          this.accounts.set(res.items);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
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

  onCategoryChange(): void {
    if (this.newAccount.category === AccountCategory.Asset || this.newAccount.category === AccountCategory.Expense) {
      this.newAccount.normalBalance = BalanceNature.Debit;
    } else {
      this.newAccount.normalBalance = BalanceNature.Credit;
    }
  }

  openCreate(): void {
    this.newAccount = {
      accountCode: '',
      accountName: '',
      category: AccountCategory.Asset,
      subCategory: AccountSubCategory.CurrentAsset,
      normalBalance: BalanceNature.Debit,
      openingBalanceInPaise: 0,
      description: '',
    };
    this.isCreateOpen.set(true);
  }

  createAccount(): void {
    if (!this.newAccount.accountCode || !this.newAccount.accountName) return;

    if (!environment.useMockData) {
      this.coaService.create(this.newAccount).subscribe({
        next: created => {
          this.accounts.update(list => [...list, created]);
          this.isCreateOpen.set(false);
        },
      });
      return;
    }

    const created: ChartOfAccountDto = {
      id: `coa-${this.newAccount.accountCode}`,
      accountCode: this.newAccount.accountCode,
      accountName: this.newAccount.accountName,
      category: this.newAccount.category,
      subCategory: this.newAccount.subCategory,
      normalBalance: this.newAccount.normalBalance,
      openingBalanceInPaise: Number(this.newAccount.openingBalanceInPaise),
      currentBalanceInPaise: Number(this.newAccount.openingBalanceInPaise),
      isActive: true,
      isSystemAccount: false,
      description: this.newAccount.description,
    };

    this.accounts.update(list => [...list, created]);
    this.isCreateOpen.set(false);
  }

  seedStandardAccounts(): void {
    if (!environment.useMockData) {
      this.coaService.seedStandardCoa().subscribe({
        next: () => this.loadAccounts(),
      });
      return;
    }

    this.accounts.set(MOCK_COA);
  }
}
