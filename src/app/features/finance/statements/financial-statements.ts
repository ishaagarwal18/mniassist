import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArTopbar } from '../../../layout/topbar';
import {
  BalanceSheetResultDto,
  FinancialStatementService,
  ProfitAndLossResultDto,
  TrialBalanceResultDto,
} from '../../../proxy/finance';
import { ArBanner, ArButton } from '../../../ui';
import { readApiError } from '../../../core/util/api-error';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../../ui/grid';

const EMPTY_TRIAL_BALANCE: TrialBalanceResultDto = {
  items: [],
  totalOpeningDebitInPaise: 0,
  totalOpeningCreditInPaise: 0,
  totalPeriodDebitInPaise: 0,
  totalPeriodCreditInPaise: 0,
  totalClosingDebitInPaise: 0,
  totalClosingCreditInPaise: 0,
  isBalanced: false,
};

const EMPTY_PNL: ProfitAndLossResultDto = {
  operatingRevenue: [],
  totalOperatingRevenueInPaise: 0,
  otherIncome: [],
  totalOtherIncomeInPaise: 0,
  totalGrossRevenueInPaise: 0,
  costOfGoodsSold: [],
  totalCogsInPaise: 0,
  grossProfitInPaise: 0,
  operatingExpenses: [],
  totalOperatingExpensesInPaise: 0,
  operatingProfitEbitdaInPaise: 0,
  taxAndDepreciation: [],
  totalTaxAndDepreciationInPaise: 0,
  netProfitInPaise: 0,
};

const EMPTY_BALANCE_SHEET: BalanceSheetResultDto = {
  assets: [],
  totalAssetsInPaise: 0,
  liabilities: [],
  totalLiabilitiesInPaise: 0,
  equity: [],
  totalEquityInPaise: 0,
  totalLiabilitiesAndEquityInPaise: 0,
  isBalanced: false,
};

@Component({
  selector: 'app-financial-statements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    ArTopbar,
    ArBanner,
    ArButton,
    ArGrid,
    GridModule,
  ],
  template: `
    <ar-topbar title="Financial Statements (Statutory Ledger)">
      <div actions class="topbar-actions">
        <button ar-button="ghost" (click)="exportToExcel()">📊 Export to Excel</button>
        <button ar-button="ghost" (click)="exportToPdf()">📄 Export to PDF</button>
        <button ar-button="ghost" (click)="printStatement()">🖨 Print</button>
      </div>
    </ar-topbar>

    <div class="page-content">
      @if (loadError(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
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
            <e-column
              field="closingDebitInPaise"
              headerText="Debit Balance (₹)"
              width="160"
              [textAlign]="'Right'"
            >
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
            <e-column
              field="closingCreditInPaise"
              headerText="Credit Balance (₹)"
              width="160"
              [textAlign]="'Right'"
            >
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

        <ejs-grid
          arGrid="pnl-statement"
          [dataSource]="pnlStatementRows()"
          aria-label="Profit & Loss Statement"
          [arGridSearch]="false"
          [arGridTools]="false"
        >
          <e-columns>
            <e-column
              field="schedule"
              headerText="Financial Schedule / Ledger Account"
              minWidth="320"
            >
              <ng-template #template let-r>
                @switch (r.type) {
                  @case ('section') {
                    <strong class="font-bold text-ink-900">{{ r.schedule }}</strong>
                  }
                  @case ('item') {
                    <span class="indent-1 text-ink-700">{{ r.schedule }}</span>
                  }
                  @case ('subtotal') {
                    <span class="fw-bold">{{ r.schedule }}</span>
                  }
                  @case ('highlight') {
                    <span class="fw-bold text-debit">{{ r.schedule }}</span>
                  }
                  @case ('net-profit') {
                    <span class="fw-bold text-profit">{{ r.schedule }}</span>
                  }
                }
              </ng-template>
            </e-column>
            <e-column field="amount" headerText="Amount (₹)" width="200" [textAlign]="'Right'">
              <ng-template #template let-r>
                @if (r.amount !== null) {
                  <span
                    class="font-mono"
                    [class.fw-bold]="r.type !== 'item'"
                    [class.text-profit]="r.type === 'net-profit'"
                    [class.text-success]="r.type === 'highlight'"
                  >
                    ₹{{ r.amount | number: '1.2-2' }}
                  </span>
                }
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
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

  // The workspace's own ledger; zeros until it loads.
  readonly trialBalance = signal<TrialBalanceResultDto>(EMPTY_TRIAL_BALANCE);
  readonly pnl = signal<ProfitAndLossResultDto>(EMPTY_PNL);
  readonly balanceSheet = signal<BalanceSheetResultDto>(EMPTY_BALANCE_SHEET);
  readonly loadError = signal<string | null>(null);

  readonly pnlStatementRows = computed(() => {
    const p = this.pnl();
    if (!p) return [];
    return [
      { schedule: 'I. Operating Revenue', amount: null, type: 'section' },
      ...p.operatingRevenue.map((r) => ({
        schedule: `${r.accountCode} - ${r.accountName}`,
        amount: r.amountInPaise / 100,
        type: 'item',
      })),
      ...p.otherIncome.map((oi) => ({
        schedule: `${oi.accountCode} - ${oi.accountName}`,
        amount: oi.amountInPaise / 100,
        type: 'item',
      })),
      {
        schedule: 'Total Gross Revenue (A)',
        amount: p.totalGrossRevenueInPaise / 100,
        type: 'subtotal',
      },
      { schedule: 'II. Cost of Goods Sold (COGS)', amount: null, type: 'section' },
      ...p.costOfGoodsSold.map((c) => ({
        schedule: `${c.accountCode} - ${c.accountName}`,
        amount: c.amountInPaise / 100,
        type: 'item',
      })),
      {
        schedule: 'Total Cost of Goods Sold (B)',
        amount: p.totalCogsInPaise / 100,
        type: 'subtotal',
      },
      {
        schedule: 'GROSS PROFIT (A - B)',
        amount: p.grossProfitInPaise / 100,
        type: 'highlight',
      },
      { schedule: 'III. Operating Expenses & Overheads', amount: null, type: 'section' },
      ...p.operatingExpenses.map((oe) => ({
        schedule: `${oe.accountCode} - ${oe.accountName}`,
        amount: oe.amountInPaise / 100,
        type: 'item',
      })),
      {
        schedule: 'Total Operating Overheads (C)',
        amount: p.totalOperatingExpensesInPaise / 100,
        type: 'subtotal',
      },
      {
        schedule: 'OPERATING PROFIT (EBITDA)',
        amount: p.operatingProfitEbitdaInPaise / 100,
        type: 'highlight',
      },
      { schedule: 'IV. Depreciation & Provisions', amount: null, type: 'section' },
      ...p.taxAndDepreciation.map((dt) => ({
        schedule: `${dt.accountCode} - ${dt.accountName}`,
        amount: dt.amountInPaise / 100,
        type: 'item',
      })),
      {
        schedule: 'NET PROFIT AFTER TAX (PAT)',
        amount: p.netProfitInPaise / 100,
        type: 'net-profit',
      },
    ];
  });

  constructor() {
    this.loadStatements();
  }

  loadStatements(): void {
    const failed = (e: unknown) =>
      this.loadError.set(readApiError(e, 'The financial statements could not be loaded.'));
    this.statementService.getTrialBalance({}).subscribe({
      next: (res) => this.trialBalance.set(res),
      error: failed,
    });

    this.statementService.getProfitAndLoss({}).subscribe({
      next: (res) => this.pnl.set(res),
      error: failed,
    });

    this.statementService.getBalanceSheet({}).subscribe({
      next: (res) => this.balanceSheet.set(res),
      error: failed,
    });
  }

  printStatement(): void {
    window.print();
  }

  exportToExcel(): void {
    const tab = this.activeTab();
    let csvContent = '';
    let fileName = '';

    if (tab === 'trial-balance') {
      fileName = 'Trial_Balance_Report';
      csvContent += 'AutoReach MNI Assist - Financial Statements: Trial Balance\r\n';
      csvContent += `Generated At: ${new Date().toLocaleString()}\r\n\r\n`;
      csvContent +=
        'Account Code,Account Name,Opening Debit (INR),Period Debit (INR),Period Credit (INR),Closing Debit (INR),Closing Credit (INR)\r\n';
      const tb = this.trialBalance();
      for (const item of tb.items) {
        csvContent += `"${item.accountCode}","${item.accountName.replace(/"/g, '""')}",${(item.openingBalanceInPaise / 100).toFixed(2)},${(item.periodDebitInPaise / 100).toFixed(2)},${(item.periodCreditInPaise / 100).toFixed(2)},${(item.closingDebitInPaise / 100).toFixed(2)},${(item.closingCreditInPaise / 100).toFixed(2)}\r\n`;
      }
      csvContent += `"TOTAL","Grand Total",${(tb.totalOpeningDebitInPaise / 100).toFixed(2)},${(tb.totalPeriodDebitInPaise / 100).toFixed(2)},${(tb.totalPeriodCreditInPaise / 100).toFixed(2)},${(tb.totalClosingDebitInPaise / 100).toFixed(2)},${(tb.totalClosingCreditInPaise / 100).toFixed(2)}\r\n`;
    } else if (tab === 'pnl') {
      fileName = 'Profit_and_Loss_Statement';
      csvContent += 'AutoReach MNI Assist - Financial Statements: Profit & Loss Statement\r\n';
      csvContent += `Generated At: ${new Date().toLocaleString()}\r\n\r\n`;
      csvContent += 'Schedule / Account Line Item,Amount (INR)\r\n';
      for (const row of this.pnlStatementRows()) {
        const amt = row.amount !== null ? row.amount.toFixed(2) : '';
        csvContent += `"${row.schedule.replace(/"/g, '""')}",${amt}\r\n`;
      }
    } else {
      fileName = 'Balance_Sheet_Report';
      const bs = this.balanceSheet();
      csvContent += 'AutoReach MNI Assist - Financial Statements: Balance Sheet\r\n';
      csvContent += `Generated At: ${new Date().toLocaleString()}\r\n\r\n`;
      csvContent += 'Classification,Account Code & Name,Amount (INR)\r\n';

      csvContent += '"ASSETS","",""\r\n';
      for (const sec of bs.assets) {
        csvContent += `"${sec.title}","",""\r\n`;
        for (const item of sec.items) {
          csvContent += `"${sec.title}","${item.accountCode} - ${item.accountName.replace(/"/g, '""')}",${(item.amountInPaise / 100).toFixed(2)}\r\n`;
        }
        csvContent += `"${sec.title} - Subtotal","Subtotal",${(sec.totalInPaise / 100).toFixed(2)}\r\n`;
      }
      csvContent += `"TOTAL ASSETS","Grand Total",${(bs.totalAssetsInPaise / 100).toFixed(2)}\r\n\r\n`;

      csvContent += '"LIABILITIES & EQUITY","",""\r\n';
      for (const sec of bs.liabilities) {
        csvContent += `"${sec.title}","",""\r\n`;
        for (const item of sec.items) {
          csvContent += `"${sec.title}","${item.accountCode} - ${item.accountName.replace(/"/g, '""')}",${(item.amountInPaise / 100).toFixed(2)}\r\n`;
        }
        csvContent += `"${sec.title} - Subtotal","Subtotal",${(sec.totalInPaise / 100).toFixed(2)}\r\n`;
      }
      for (const sec of bs.equity) {
        csvContent += `"${sec.title}","",""\r\n`;
        for (const item of sec.items) {
          csvContent += `"${sec.title}","${item.accountCode} - ${item.accountName.replace(/"/g, '""')}",${(item.amountInPaise / 100).toFixed(2)}\r\n`;
        }
        csvContent += `"${sec.title} - Subtotal","Subtotal",${(sec.totalInPaise / 100).toFixed(2)}\r\n`;
      }
      csvContent += `"TOTAL LIABILITIES & EQUITY","Grand Total",${(bs.totalLiabilitiesAndEquityInPaise / 100).toFixed(2)}\r\n`;
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportToPdf(): void {
    const tab = this.activeTab();
    let title = 'Trial Balance';
    let bodyHtml = '';

    if (tab === 'trial-balance') {
      title = 'Trial Balance';
      const tb = this.trialBalance();
      const rows = tb.items
        .map(
          (item) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:7px 8px; font-weight:600; font-family:monospace;">${item.accountCode}</td>
          <td style="padding:7px 8px;">${item.accountName}</td>
          <td style="padding:7px 8px; text-align:right; font-family:monospace;">₹${(item.openingBalanceInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding:7px 8px; text-align:right; font-family:monospace;">₹${(item.periodDebitInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding:7px 8px; text-align:right; font-family:monospace;">₹${(item.periodCreditInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding:7px 8px; text-align:right; font-family:monospace; font-weight:600; color:#0284c7;">₹${(item.closingDebitInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding:7px 8px; text-align:right; font-family:monospace; font-weight:600; color:#16a34a;">₹${(item.closingCreditInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `,
        )
        .join('');

      bodyHtml = `
        <table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:16px;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
              <th style="padding:8px; text-align:left;">Code</th>
              <th style="padding:8px; text-align:left;">Account Name</th>
              <th style="padding:8px; text-align:right;">Opening</th>
              <th style="padding:8px; text-align:right;">Period Debit</th>
              <th style="padding:8px; text-align:right;">Period Credit</th>
              <th style="padding:8px; text-align:right;">Closing Debit</th>
              <th style="padding:8px; text-align:right;">Closing Credit</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#f8fafc; font-weight:bold; border-top:2px solid #0f172a; font-family:monospace;">
              <td colspan="2" style="padding:9px 8px; font-family:sans-serif;">TOTAL</td>
              <td style="padding:9px 8px; text-align:right;">₹${(tb.totalOpeningDebitInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="padding:9px 8px; text-align:right;">₹${(tb.totalPeriodDebitInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="padding:9px 8px; text-align:right;">₹${(tb.totalPeriodCreditInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="padding:9px 8px; text-align:right; color:#0284c7;">₹${(tb.totalClosingDebitInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="padding:9px 8px; text-align:right; color:#16a34a;">₹${(tb.totalClosingCreditInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (tab === 'pnl') {
      title = 'Profit & Loss Statement';
      const rows = this.pnlStatementRows()
        .map((r) => {
          const isHeader = r.type === 'section';
          const isSubtotal = r.type === 'subtotal';
          const isHighlight = r.type === 'highlight' || r.type === 'net-profit';
          const bg = isHeader
            ? 'background:#e2e8f0; font-weight:bold;'
            : isHighlight
              ? 'background:#f0fdf4; font-weight:bold; color:#15803d;'
              : isSubtotal
                ? 'background:#f8fafc; font-weight:bold;'
                : '';
          return `
          <tr style="${bg} border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 10px; ${isHeader ? 'font-size:13px; text-transform:uppercase;' : ''}">${r.schedule}</td>
            <td style="padding:8px 10px; text-align:right; font-family:monospace; font-weight:600;">
              ${r.amount !== null ? '₹' + r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </td>
          </tr>
        `;
        })
        .join('');

      bodyHtml = `
        <table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:16px;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
              <th style="padding:8px 10px; text-align:left;">Schedule / Particulars</th>
              <th style="padding:8px 10px; text-align:right;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    } else {
      title = 'Balance Sheet';
      const bs = this.balanceSheet();
      let sectionsHtml = '';

      sectionsHtml += `<tr style="background:#0284c7; color:#fff; font-weight:bold;"><td colspan="2" style="padding:8px 10px; text-transform:uppercase;">ASSETS</td></tr>`;
      for (const sec of bs.assets) {
        sectionsHtml += `<tr style="background:#f8fafc; font-weight:600;"><td colspan="2" style="padding:7px 10px; color:#334155;">${sec.title}</td></tr>`;
        for (const item of sec.items) {
          sectionsHtml += `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px 20px;">${item.accountCode} - ${item.accountName}</td><td style="padding:6px 10px; text-align:right; font-family:monospace;">₹${(item.amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
        }
        sectionsHtml += `<tr style="border-top:1px dashed #cbd5e1; font-weight:bold; background:#fafafa;"><td style="padding:6px 20px;">Subtotal: ${sec.title}</td><td style="padding:6px 10px; text-align:right; font-family:monospace;">₹${(sec.totalInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
      }
      sectionsHtml += `<tr style="background:#0369a1; color:#fff; font-weight:bold;"><td style="padding:8px 10px;">TOTAL ASSETS</td><td style="padding:8px 10px; text-align:right; font-family:monospace;">₹${(bs.totalAssetsInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;

      sectionsHtml += `<tr style="background:#d97706; color:#fff; font-weight:bold;"><td colspan="2" style="padding:8px 10px; margin-top:15px; text-transform:uppercase;">LIABILITIES & EQUITY</td></tr>`;
      for (const sec of bs.liabilities) {
        sectionsHtml += `<tr style="background:#f8fafc; font-weight:600;"><td colspan="2" style="padding:7px 10px; color:#334155;">${sec.title}</td></tr>`;
        for (const item of sec.items) {
          sectionsHtml += `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px 20px;">${item.accountCode} - ${item.accountName}</td><td style="padding:6px 10px; text-align:right; font-family:monospace;">₹${(item.amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
        }
        sectionsHtml += `<tr style="border-top:1px dashed #cbd5e1; font-weight:bold; background:#fafafa;"><td style="padding:6px 20px;">Subtotal: ${sec.title}</td><td style="padding:6px 10px; text-align:right; font-family:monospace;">₹${(sec.totalInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
      }
      for (const sec of bs.equity) {
        sectionsHtml += `<tr style="background:#f8fafc; font-weight:600;"><td colspan="2" style="padding:7px 10px; color:#334155;">${sec.title}</td></tr>`;
        for (const item of sec.items) {
          sectionsHtml += `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px 20px;">${item.accountCode} - ${item.accountName}</td><td style="padding:6px 10px; text-align:right; font-family:monospace;">₹${(item.amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
        }
        sectionsHtml += `<tr style="border-top:1px dashed #cbd5e1; font-weight:bold; background:#fafafa;"><td style="padding:6px 20px;">Subtotal: ${sec.title}</td><td style="padding:6px 10px; text-align:right; font-family:monospace;">₹${(sec.totalInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
      }
      sectionsHtml += `<tr style="background:#15803d; color:#fff; font-weight:bold;"><td style="padding:8px 10px;">TOTAL LIABILITIES & EQUITY</td><td style="padding:8px 10px; text-align:right; font-family:monospace;">₹${(bs.totalLiabilitiesAndEquityInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;

      bodyHtml = `
        <table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:16px;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
              <th style="padding:8px 10px; text-align:left;">Category / Line Item</th>
              <th style="padding:8px 10px; text-align:right;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${sectionsHtml}
          </tbody>
        </table>
      `;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - AutoReach MNI Assist</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 24px; margin: 0; }
            .report-header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
            .report-title { font-size: 20px; font-weight: bold; margin: 0 0 4px 0; color: #0f172a; }
            .report-meta { font-size: 12px; color: #64748b; margin: 0; }
            @media print {
              body { padding: 0; }
              @page { size: auto; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1 class="report-title">AutoReach MNI Assist - ${title}</h1>
            <p class="report-meta">Statutory Industrial Accounting Ledger &bull; Generated on ${new Date().toLocaleString()}</p>
          </div>
          ${bodyHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
}
