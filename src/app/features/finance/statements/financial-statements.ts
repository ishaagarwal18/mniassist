import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  BalanceSheetResultDto,
  FinancialStatementService,
  ProfitAndLossResultDto,
  TrialBalanceResultDto,
} from '../../../proxy/finance';
import { ArButton } from '../../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../../ui/grid';

const MOCK_TRIAL_BALANCE: TrialBalanceResultDto = {
  items: [
    {
      accountId: '1',
      accountCode: '1010',
      accountName: 'HDFC Bank Current Account',
      category: 0,
      subCategory: 2,
      normalBalance: 0,
      openingBalanceInPaise: 50_00_000_00,
      periodDebitInPaise: 68_45_200_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 68_45_200_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '2',
      accountCode: '1020',
      accountName: 'Petty Cash Account',
      category: 0,
      subCategory: 2,
      normalBalance: 0,
      openingBalanceInPaise: 50_000_00,
      periodDebitInPaise: 42_500_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 42_500_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '3',
      accountCode: '1200',
      accountName: 'Accounts Receivable (Sundry Debtors)',
      category: 0,
      subCategory: 3,
      normalBalance: 0,
      openingBalanceInPaise: 85_40_000_00,
      periodDebitInPaise: 92_15_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 92_15_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '4',
      accountCode: '1300',
      accountName: 'Raw Material Inventory',
      category: 0,
      subCategory: 4,
      normalBalance: 0,
      openingBalanceInPaise: 1_20_00_000_00,
      periodDebitInPaise: 1_35_60_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 1_35_60_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '5',
      accountCode: '1310',
      accountName: 'Work-In-Progress (WIP) Inventory',
      category: 0,
      subCategory: 4,
      normalBalance: 0,
      openingBalanceInPaise: 45_00_000_00,
      periodDebitInPaise: 52_80_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 52_80_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '6',
      accountCode: '1320',
      accountName: 'Finished Goods Inventory',
      category: 0,
      subCategory: 4,
      normalBalance: 0,
      openingBalanceInPaise: 78_00_000_00,
      periodDebitInPaise: 84_50_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 84_50_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '7',
      accountCode: '1400',
      accountName: 'Plant & Heavy CNC Machinery',
      category: 0,
      subCategory: 1,
      normalBalance: 0,
      openingBalanceInPaise: 3_50_00_000_00,
      periodDebitInPaise: 3_50_00_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 3_50_00_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '8',
      accountCode: '1500',
      accountName: 'Input Tax Credit (ITC) - CGST',
      category: 0,
      subCategory: 0,
      normalBalance: 0,
      openingBalanceInPaise: 4_80_000_00,
      periodDebitInPaise: 6_24_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 6_24_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '9',
      accountCode: '1510',
      accountName: 'Input Tax Credit (ITC) - SGST',
      category: 0,
      subCategory: 0,
      normalBalance: 0,
      openingBalanceInPaise: 4_80_000_00,
      periodDebitInPaise: 6_24_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 6_24_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '10',
      accountCode: '1520',
      accountName: 'Input Tax Credit (ITC) - IGST',
      category: 0,
      subCategory: 0,
      normalBalance: 0,
      openingBalanceInPaise: 9_60_000_00,
      periodDebitInPaise: 12_40_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 12_40_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '11',
      accountCode: '2010',
      accountName: 'Accounts Payable (Sundry Creditors)',
      category: 1,
      subCategory: 12,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 71_50_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 71_50_000_00,
    },
    {
      accountId: '12',
      accountCode: '2020',
      accountName: 'Output GST Payable - CGST',
      category: 1,
      subCategory: 13,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 7_15_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 7_15_000_00,
    },
    {
      accountId: '13',
      accountCode: '2021',
      accountName: 'Output GST Payable - SGST',
      category: 1,
      subCategory: 13,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 7_15_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 7_15_000_00,
    },
    {
      accountId: '14',
      accountCode: '2022',
      accountName: 'Output GST Payable - IGST',
      category: 1,
      subCategory: 13,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 14_80_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 14_80_000_00,
    },
    {
      accountId: '15',
      accountCode: '2030',
      accountName: 'TDS Payable u/s 194Q/194C',
      category: 1,
      subCategory: 13,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 2_45_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 2_45_000_00,
    },
    {
      accountId: '16',
      accountCode: '2100',
      accountName: 'Working Capital Bank Loan',
      category: 1,
      subCategory: 11,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 1_40_00_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 1_40_00_000_00,
    },
    {
      accountId: '17',
      accountCode: '3010',
      accountName: 'Paid-Up Share Capital',
      category: 2,
      subCategory: 20,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 2_00_00_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 2_00_00_000_00,
    },
    {
      accountId: '18',
      accountCode: '3020',
      accountName: 'Retained Earnings & Surplus',
      category: 2,
      subCategory: 21,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 1_65_89_200_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 1_65_89_200_00,
    },
    {
      accountId: '19',
      accountCode: '4010',
      accountName: 'Sales Revenue - Manufactured Systems',
      category: 3,
      subCategory: 30,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 3_45_00_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 3_45_00_000_00,
    },
    {
      accountId: '20',
      accountCode: '4020',
      accountName: 'Service Revenue - AMC Contracts',
      category: 3,
      subCategory: 30,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 54_80_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 54_80_000_00,
    },
    {
      accountId: '21',
      accountCode: '4030',
      accountName: 'Service Revenue - Field Breakdown & Spares',
      category: 3,
      subCategory: 30,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 28_40_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 28_40_000_00,
    },
    {
      accountId: '22',
      accountCode: '4100',
      accountName: 'Other Income & Metal Scrap Sales',
      category: 3,
      subCategory: 31,
      normalBalance: 1,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 0,
      periodCreditInPaise: 5_30_000_00,
      closingDebitInPaise: 0,
      closingCreditInPaise: 5_30_000_00,
    },
    {
      accountId: '23',
      accountCode: '5010',
      accountName: 'Cost of Goods Sold - Raw Materials',
      category: 4,
      subCategory: 40,
      normalBalance: 0,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 1_78_20_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 1_78_20_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '24',
      accountCode: '5020',
      accountName: 'Direct Shop Floor Wages',
      category: 4,
      subCategory: 40,
      normalBalance: 0,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 46_50_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 46_50_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '25',
      accountCode: '6010',
      accountName: 'Factory Power & Industrial Fuel',
      category: 4,
      subCategory: 41,
      normalBalance: 0,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 18_20_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 18_20_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '26',
      accountCode: '6020',
      accountName: 'Machine Tooling & Plant Maintenance',
      category: 4,
      subCategory: 41,
      normalBalance: 0,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 11_10_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 11_10_000_00,
      closingCreditInPaise: 0,
    },
    {
      accountId: '27',
      accountCode: '6030',
      accountName: 'Field Service Travel & Transit',
      category: 4,
      subCategory: 41,
      normalBalance: 0,
      openingBalanceInPaise: 0,
      periodDebitInPaise: 7_90_000_00,
      periodCreditInPaise: 0,
      closingDebitInPaise: 7_90_000_00,
      closingCreditInPaise: 0,
    },
  ],
  totalOpeningDebitInPaise: 8_08_80_000_00,
  totalOpeningCreditInPaise: 8_08_80_000_00,
  totalPeriodDebitInPaise: 10_50_74_200_00,
  totalPeriodCreditInPaise: 10_50_74_200_00,
  totalClosingDebitInPaise: 10_50_74_200_00,
  totalClosingCreditInPaise: 10_50_74_200_00,
  isBalanced: true,
};

const MOCK_PNL: ProfitAndLossResultDto = {
  operatingRevenue: [
    {
      accountCode: '4010',
      accountName: 'Sales Revenue - Manufactured Systems',
      amountInPaise: 3_45_00_000_00,
    },
    {
      accountCode: '4020',
      accountName: 'Service Revenue - AMC Contracts',
      amountInPaise: 54_80_000_00,
    },
    {
      accountCode: '4030',
      accountName: 'Service Revenue - Field Breakdown & Spares',
      amountInPaise: 28_40_000_00,
    },
  ],
  totalOperatingRevenueInPaise: 4_28_20_000_00,
  otherIncome: [
    {
      accountCode: '4100',
      accountName: 'Other Income & Metal Scrap Sales',
      amountInPaise: 5_30_000_00,
    },
  ],
  totalOtherIncomeInPaise: 5_30_000_00,
  totalGrossRevenueInPaise: 4_33_50_000_00,
  costOfGoodsSold: [
    {
      accountCode: '5010',
      accountName: 'Cost of Goods Sold - Raw Materials',
      amountInPaise: 1_78_20_000_00,
    },
    { accountCode: '5020', accountName: 'Direct Shop Floor Wages', amountInPaise: 46_50_000_00 },
  ],
  totalCogsInPaise: 2_24_70_000_00,
  grossProfitInPaise: 2_08_80_000_00,
  operatingExpenses: [
    {
      accountCode: '6010',
      accountName: 'Factory Power & Industrial Fuel',
      amountInPaise: 18_20_000_00,
    },
    {
      accountCode: '6020',
      accountName: 'Machine Tooling & Plant Maintenance',
      amountInPaise: 11_10_000_00,
    },
    {
      accountCode: '6030',
      accountName: 'Field Service Travel & Transit',
      amountInPaise: 7_90_000_00,
    },
  ],
  totalOperatingExpensesInPaise: 37_20_000_00,
  operatingProfitEbitdaInPaise: 1_71_60_000_00,
  taxAndDepreciation: [
    {
      accountCode: '6100',
      accountName: 'Depreciation on CNC Machinery (Straight-Line)',
      amountInPaise: 28_00_000_00,
    },
  ],
  totalTaxAndDepreciationInPaise: 28_00_000_00,
  netProfitInPaise: 1_43_60_000_00,
};

const MOCK_BALANCE_SHEET: BalanceSheetResultDto = {
  assets: [
    {
      title: 'Current Assets & Inventory',
      items: [
        {
          accountCode: '1010',
          accountName: 'HDFC Bank Current Account',
          amountInPaise: 68_45_200_00,
        },
        { accountCode: '1020', accountName: 'Petty Cash Account', amountInPaise: 42_500_00 },
        {
          accountCode: '1200',
          accountName: 'Accounts Receivable (Sundry Debtors)',
          amountInPaise: 92_15_000_00,
        },
        {
          accountCode: '1300',
          accountName: 'Raw Material Inventory',
          amountInPaise: 1_35_60_000_00,
        },
        {
          accountCode: '1310',
          accountName: 'Work-In-Progress (WIP) Inventory',
          amountInPaise: 52_80_000_00,
        },
        {
          accountCode: '1320',
          accountName: 'Finished Goods Inventory',
          amountInPaise: 84_50_000_00,
        },
        {
          accountCode: '1500',
          accountName: 'Input Tax Credit (ITC) - CGST',
          amountInPaise: 6_24_000_00,
        },
        {
          accountCode: '1510',
          accountName: 'Input Tax Credit (ITC) - SGST',
          amountInPaise: 6_24_000_00,
        },
        {
          accountCode: '1520',
          accountName: 'Input Tax Credit (ITC) - IGST',
          amountInPaise: 12_40_000_00,
        },
      ],
      totalInPaise: 4_58_80_700_00,
    },
    {
      title: 'Fixed & Non-Current Assets',
      items: [
        {
          accountCode: '1400',
          accountName: 'Plant & Heavy CNC Machinery',
          amountInPaise: 3_50_00_000_00,
        },
      ],
      totalInPaise: 3_50_00_000_00,
    },
  ],
  totalAssetsInPaise: 8_08_80_700_00,
  liabilities: [
    {
      title: 'Current Liabilities & Statutory Provisions',
      items: [
        {
          accountCode: '2010',
          accountName: 'Accounts Payable (Sundry Creditors)',
          amountInPaise: 71_50_000_00,
        },
        {
          accountCode: '2020',
          accountName: 'Output GST Payable - CGST',
          amountInPaise: 7_15_000_00,
        },
        {
          accountCode: '2021',
          accountName: 'Output GST Payable - SGST',
          amountInPaise: 7_15_000_00,
        },
        {
          accountCode: '2022',
          accountName: 'Output GST Payable - IGST',
          amountInPaise: 14_80_000_00,
        },
        {
          accountCode: '2030',
          accountName: 'TDS Payable u/s 194Q & 194C',
          amountInPaise: 2_45_000_00,
        },
      ],
      totalInPaise: 1_03_05_000_00,
    },
    {
      title: 'Long-Term Bank Borrowings',
      items: [
        {
          accountCode: '2100',
          accountName: 'Working Capital Bank Loan',
          amountInPaise: 1_40_00_000_00,
        },
      ],
      totalInPaise: 1_40_00_000_00,
    },
  ],
  totalLiabilitiesInPaise: 2_43_05_000_00,
  equity: [
    {
      title: 'Shareholders’ Equity & Reserves',
      items: [
        {
          accountCode: '3010',
          accountName: 'Paid-Up Share Capital',
          amountInPaise: 2_00_00_000_00,
        },
        {
          accountCode: '3020',
          accountName: 'Retained Earnings & Reserves',
          amountInPaise: 2_22_15_700_00,
        },
        {
          accountCode: '3999',
          accountName: 'Current Period Net Profit (Transferred from P&L)',
          amountInPaise: 1_43_60_000_00,
        },
      ],
      totalInPaise: 5_65_75_700_00,
    },
  ],
  totalEquityInPaise: 5_65_75_700_00,
  totalLiabilitiesAndEquityInPaise: 8_08_80_700_00,
  isBalanced: true,
};

@Component({
  selector: 'app-financial-statements',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, ArTopbar, ArButton, ArGrid, GridModule],
  template: `
    <ar-topbar title="Financial Statements (Statutory Ledger)">
      <div actions class="topbar-actions">
        <button ar-button="ghost" (click)="printStatement()">&#128424; Print Statement</button>
      </div>
    </ar-topbar>

    <div class="page-content">
      <!-- Statements Tab Bar -->
      <section class="statements-tabs-card">
        <div class="tabs-group">
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'trial-balance'"
            (click)="activeTab.set('trial-balance')"
          >
            Trial Balance
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'pnl'"
            (click)="activeTab.set('pnl')"
          >
            Profit & Loss (P&L) Statement
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'balance-sheet'"
            (click)="activeTab.set('balance-sheet')"
          >
            Balance Sheet
          </button>
        </div>
      </section>

      <!-- TAB 1: TRIAL BALANCE -->
      <section *ngIf="activeTab() === 'trial-balance'" class="statement-container">
        <div class="statement-header-box">
          <div>
            <h3>Trial Balance</h3>
            <p>Comprehensive ledger debit/credit balances as of current period close.</p>
          </div>
          <div>
            <span class="badge-balanced" *ngIf="trialBalance().isBalanced">
              &#10003; Trial Balance Balanced (₹0.00 Variance)
            </span>
          </div>
        </div>

        <ejs-grid
          arGrid="trial-balance-grid"
          [dataSource]="trialBalance().items"
          aria-label="Trial Balance"
        >
          <e-columns>
            <e-column field="accountCode" headerText="Account Code" width="130">
              <ng-template #template let-item>
                <span class="code-pill">{{ item.accountCode }}</span>
              </ng-template>
            </e-column>
            <e-column field="accountName" headerText="Account Description" width="260"></e-column>
            <e-column field="closingDebitInPaise" headerText="Debit Balance (₹)" width="160" [textAlign]="'Right'">
              <ng-template #template let-item>
                <span class="font-mono" [class.text-debit]="item.closingDebitInPaise > 0">
                  {{
                    item.closingDebitInPaise > 0
                      ? '₹' + (item.closingDebitInPaise / 100 | number: '1.2-2')
                      : '-'
                  }}
                </span>
              </ng-template>
            </e-column>
            <e-column field="closingCreditInPaise" headerText="Credit Balance (₹)" width="160" [textAlign]="'Right'">
              <ng-template #template let-item>
                <span class="font-mono" [class.text-credit]="item.closingCreditInPaise > 0">
                  {{
                    item.closingCreditInPaise > 0
                      ? '₹' + (item.closingCreditInPaise / 100 | number: '1.2-2')
                      : '-'
                  }}
                </span>
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
      </section>

      <!-- TAB 2: PROFIT & LOSS -->
      <section *ngIf="activeTab() === 'pnl'" class="statement-container">
        <div class="statement-header-box">
          <div>
            <h3>Profit & Loss Statement (Income Statement)</h3>
            <p>Operating revenue, Cost of Goods Sold, and Net Profit Margin (PAT).</p>
          </div>
          <div class="kpi-mini">
            <span class="lbl">Net Profit Margin</span>
            <strong class="val-profit">
              {{ ((pnl().netProfitInPaise / pnl().totalGrossRevenueInPaise) * 100).toFixed(1) }}%
            </strong>
          </div>
        </div>

        <div class="table-card">
          <table class="statement-table">
            <thead>
              <tr>
                <th>Financial Schedule / Ledger Account</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <!-- Revenue Section -->
              <tr class="section-heading-row">
                <td colspan="2">I. Operating Revenue</td>
              </tr>
              <tr *ngFor="let r of pnl().operatingRevenue">
                <td class="indent-1">{{ r.accountCode }} - {{ r.accountName }}</td>
                <td class="text-right font-mono">₹{{ r.amountInPaise / 100 | number: '1.2-2' }}</td>
              </tr>
              <tr *ngFor="let oi of pnl().otherIncome">
                <td class="indent-1">{{ oi.accountCode }} - {{ oi.accountName }}</td>
                <td class="text-right font-mono">
                  ₹{{ oi.amountInPaise / 100 | number: '1.2-2' }}
                </td>
              </tr>
              <tr class="subtotal-row">
                <td class="fw-bold">Total Gross Revenue (A)</td>
                <td class="text-right font-mono fw-bold">
                  ₹{{ pnl().totalGrossRevenueInPaise / 100 | number: '1.2-2' }}
                </td>
              </tr>

              <!-- COGS Section -->
              <tr class="section-heading-row">
                <td colspan="2">II. Cost of Goods Sold (COGS)</td>
              </tr>
              <tr *ngFor="let c of pnl().costOfGoodsSold">
                <td class="indent-1">{{ c.accountCode }} - {{ c.accountName }}</td>
                <td class="text-right font-mono">₹{{ c.amountInPaise / 100 | number: '1.2-2' }}</td>
              </tr>
              <tr class="subtotal-row">
                <td class="fw-bold">Total Cost of Goods Sold (B)</td>
                <td class="text-right font-mono fw-bold">
                  ₹{{ pnl().totalCogsInPaise / 100 | number: '1.2-2' }}
                </td>
              </tr>

              <!-- Gross Profit -->
              <tr class="highlight-row">
                <td class="fw-bold">GROSS PROFIT (A - B)</td>
                <td class="text-right font-mono fw-bold text-success">
                  ₹{{ pnl().grossProfitInPaise / 100 | number: '1.2-2' }}
                </td>
              </tr>

              <!-- Operating Expenses Section -->
              <tr class="section-heading-row">
                <td colspan="2">III. Operating Expenses & Overheads</td>
              </tr>
              <tr *ngFor="let oe of pnl().operatingExpenses">
                <td class="indent-1">{{ oe.accountCode }} - {{ oe.accountName }}</td>
                <td class="text-right font-mono">
                  ₹{{ oe.amountInPaise / 100 | number: '1.2-2' }}
                </td>
              </tr>
              <tr class="subtotal-row">
                <td class="fw-bold">Total Operating Overheads (C)</td>
                <td class="text-right font-mono fw-bold">
                  ₹{{ pnl().totalOperatingExpensesInPaise / 100 | number: '1.2-2' }}
                </td>
              </tr>

              <!-- EBITDA -->
              <tr class="highlight-row">
                <td class="fw-bold">OPERATING PROFIT (EBITDA)</td>
                <td class="text-right font-mono fw-bold text-debit">
                  ₹{{ pnl().operatingProfitEbitdaInPaise / 100 | number: '1.2-2' }}
                </td>
              </tr>

              <!-- Depreciation & Taxes -->
              <tr class="section-heading-row">
                <td colspan="2">IV. Depreciation & Provisions</td>
              </tr>
              <tr *ngFor="let dt of pnl().taxAndDepreciation">
                <td class="indent-1">{{ dt.accountCode }} - {{ dt.accountName }}</td>
                <td class="text-right font-mono">
                  ₹{{ dt.amountInPaise / 100 | number: '1.2-2' }}
                </td>
              </tr>

              <!-- Net Profit -->
              <tr class="net-profit-row">
                <td class="fw-bold">NET PROFIT AFTER TAX (PAT)</td>
                <td class="text-right font-mono fw-bold text-profit">
                  ₹{{ pnl().netProfitInPaise / 100 | number: '1.2-2' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 3: BALANCE SHEET -->
      <section *ngIf="activeTab() === 'balance-sheet'" class="statement-container">
        <div class="statement-header-box">
          <div>
            <h3>Balance Sheet (Financial Position)</h3>
            <p>Assets vs Liabilities & Shareholders' Equity as of period closing.</p>
          </div>
          <div>
            <span class="badge-balanced" *ngIf="balanceSheet().isBalanced">
              &#10003; Balance Sheet Balanced: Assets = Liabilities + Equity
            </span>
          </div>
        </div>

        <div class="balance-sheet-grid">
          <!-- Assets Column -->
          <div class="bs-column">
            <h4>Assets</h4>
            <div *ngFor="let sec of balanceSheet().assets" class="bs-section-box">
              <div class="bs-sec-title">{{ sec.title }}</div>
              <div *ngFor="let item of sec.items" class="bs-line-item">
                <span>{{ item.accountCode }} - {{ item.accountName }}</span>
                <span class="font-mono">₹{{ item.amountInPaise / 100 | number: '1.2-2' }}</span>
              </div>
              <div class="bs-sec-total">
                <span>Section Subtotal</span>
                <span class="font-mono fw-bold"
                  >₹{{ sec.totalInPaise / 100 | number: '1.2-2' }}</span
                >
              </div>
            </div>

            <div class="bs-grand-total">
              <span class="fw-bold">TOTAL ASSETS</span>
              <span class="font-mono fw-bold text-debit">
                ₹{{ balanceSheet().totalAssetsInPaise / 100 | number: '1.2-2' }}
              </span>
            </div>
          </div>

          <!-- Liabilities & Equity Column -->
          <div class="bs-column">
            <h4>Liabilities & Equity</h4>
            <!-- Liabilities -->
            <div *ngFor="let sec of balanceSheet().liabilities" class="bs-section-box">
              <div class="bs-sec-title">{{ sec.title }}</div>
              <div *ngFor="let item of sec.items" class="bs-line-item">
                <span>{{ item.accountCode }} - {{ item.accountName }}</span>
                <span class="font-mono">₹{{ item.amountInPaise / 100 | number: '1.2-2' }}</span>
              </div>
              <div class="bs-sec-total">
                <span>Section Subtotal</span>
                <span class="font-mono fw-bold"
                  >₹{{ sec.totalInPaise / 100 | number: '1.2-2' }}</span
                >
              </div>
            </div>

            <!-- Equity -->
            <div *ngFor="let sec of balanceSheet().equity" class="bs-section-box">
              <div class="bs-sec-title">{{ sec.title }}</div>
              <div *ngFor="let item of sec.items" class="bs-line-item">
                <span>{{ item.accountCode }} - {{ item.accountName }}</span>
                <span class="font-mono">₹{{ item.amountInPaise / 100 | number: '1.2-2' }}</span>
              </div>
              <div class="bs-sec-total">
                <span>Section Subtotal</span>
                <span class="font-mono fw-bold"
                  >₹{{ sec.totalInPaise / 100 | number: '1.2-2' }}</span
                >
              </div>
            </div>

            <div class="bs-grand-total">
              <span class="fw-bold">TOTAL LIABILITIES & EQUITY</span>
              <span class="font-mono fw-bold text-credit">
                ₹{{ balanceSheet().totalLiabilitiesAndEquityInPaise / 100 | number: '1.2-2' }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
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

      .statements-tabs-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        padding: 0.5rem;
      }

      .tabs-group {
        display: flex;
        gap: 0.5rem;

        .tab-btn {
          padding: 0.6rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;

          &.active {
            background: var(--ar-primary, #1e293b);
            color: #ffffff;
          }
        }
      }

      .statement-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .statement-header-box {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        padding: 1.25rem 1.5rem;

        h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #0f172a;
        }

        p {
          margin: 0.25rem 0 0 0;
          font-size: 0.85rem;
          color: #64748b;
        }

        .badge-balanced {
          background: #dcfce7;
          color: #15803d;
          font-weight: 600;
          font-size: 0.85rem;
          padding: 0.4rem 0.85rem;
          border-radius: 20px;
          border: 1px solid #bbf7d0;
        }

        .kpi-mini {
          display: flex;
          flex-direction: column;
          align-items: flex-end;

          .lbl {
            font-size: 0.75rem;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
          }

          .val-profit {
            font-size: 1.4rem;
            color: #16a34a;
            font-weight: 700;
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

      .statement-table {
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
          padding: 0.65rem 1rem;
          border-bottom: 1px solid var(--ar-border, #f1f5f9);
          vertical-align: middle;
        }

        .section-heading-row td {
          background: #f8fafc;
          font-weight: 700;
          color: #0f172a;
          padding-top: 1rem;
          font-size: 0.9rem;
        }

        .subtotal-row td {
          border-top: 1px solid #cbd5e1;
          background: #fdfdfd;
          font-weight: 600;
        }

        .highlight-row td {
          background: #f0fdf4;
          font-weight: 700;
          font-size: 0.9rem;
          border-top: 1px solid #bbf7d0;
          border-bottom: 1px solid #bbf7d0;
        }

        .net-profit-row td {
          background: #ecfdf5;
          font-weight: 800;
          font-size: 1.05rem;
          border-top: 2px solid #10b981;
          border-bottom: 2px solid #10b981;
        }

        .statement-total-row td {
          background: #f8fafc;
          border-top: 2px solid #cbd5e1;
          font-size: 0.95rem;
        }
      }

      .code-pill {
        font-family: monospace;
        font-weight: 600;
        background: #f1f5f9;
        padding: 1px 5px;
        border-radius: 3px;
      }

      .indent-1 {
        padding-left: 2rem !important;
      }

      .balance-sheet-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;

        @media (max-width: 1024px) {
          grid-template-columns: 1fr;
        }
      }

      .bs-column {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;

        h4 {
          margin: 0;
          font-size: 1.1rem;
          color: #0f172a;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #e2e8f0;
        }
      }

      .bs-section-box {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 1rem;

        .bs-sec-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .bs-line-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
          color: #475569;
          padding: 0.2rem 0;
          border-bottom: 1px dashed #e2e8f0;
        }

        .bs-sec-total {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          padding-top: 0.4rem;
          color: #0f172a;
        }
      }

      .bs-grand-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f1f5f9;
        padding: 1rem;
        border-radius: 6px;
        font-size: 1.05rem;
      }

      .fw-bold {
        font-weight: 700;
      }
      .font-mono {
        font-family: monospace;
      }
      .text-debit {
        color: #0284c7;
      }
      .text-credit {
        color: #16a34a;
      }
      .text-success {
        color: #16a34a;
      }
      .text-profit {
        color: #059669;
      }
      .text-right {
        text-align: right;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialStatementsComponent {
  private readonly statementService = inject(FinancialStatementService);

  readonly activeTab = signal<'trial-balance' | 'pnl' | 'balance-sheet'>('trial-balance');

  readonly trialBalance = signal<TrialBalanceResultDto>(MOCK_TRIAL_BALANCE);
  readonly pnl = signal<ProfitAndLossResultDto>(MOCK_PNL);
  readonly balanceSheet = signal<BalanceSheetResultDto>(MOCK_BALANCE_SHEET);

  constructor() {
    this.loadStatements();
  }

  loadStatements(): void {
    if (environment.useMockData) return;

    this.statementService.getTrialBalance({}).subscribe({
      next: (res) => this.trialBalance.set(res),
    });

    this.statementService.getProfitAndLoss({}).subscribe({
      next: (res) => this.pnl.set(res),
    });

    this.statementService.getBalanceSheet({}).subscribe({
      next: (res) => this.balanceSheet.set(res),
    });
  }

  printStatement(): void {
    window.print();
  }
}
