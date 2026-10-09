import { AccountCategory, AccountSubCategory, BalanceNature } from './finance-enums';

export interface TrialBalanceItemDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  subCategory: AccountSubCategory;
  normalBalance: BalanceNature;
  openingBalanceInPaise: number;
  periodDebitInPaise: number;
  periodCreditInPaise: number;
  closingDebitInPaise: number;
  closingCreditInPaise: number;
}

export interface TrialBalanceResultDto {
  items: TrialBalanceItemDto[];
  totalOpeningDebitInPaise: number;
  totalOpeningCreditInPaise: number;
  totalPeriodDebitInPaise: number;
  totalPeriodCreditInPaise: number;
  totalClosingDebitInPaise: number;
  totalClosingCreditInPaise: number;
  isBalanced: boolean;
}

export interface FinancialStatementLineDto {
  accountCode: string;
  accountName: string;
  amountInPaise: number;
}

export interface ProfitAndLossResultDto {
  operatingRevenue: FinancialStatementLineDto[];
  totalOperatingRevenueInPaise: number;
  otherIncome: FinancialStatementLineDto[];
  totalOtherIncomeInPaise: number;
  totalGrossRevenueInPaise: number;
  costOfGoodsSold: FinancialStatementLineDto[];
  totalCogsInPaise: number;
  grossProfitInPaise: number;
  operatingExpenses: FinancialStatementLineDto[];
  totalOperatingExpensesInPaise: number;
  operatingProfitEbitdaInPaise: number;
  taxAndDepreciation: FinancialStatementLineDto[];
  totalTaxAndDepreciationInPaise: number;
  netProfitInPaise: number;
}

export interface BalanceSheetSectionDto {
  title: string;
  items: FinancialStatementLineDto[];
  totalInPaise: number;
}

export interface BalanceSheetResultDto {
  assets: BalanceSheetSectionDto[];
  totalAssetsInPaise: number;
  liabilities: BalanceSheetSectionDto[];
  totalLiabilitiesInPaise: number;
  equity: BalanceSheetSectionDto[];
  totalEquityInPaise: number;
  totalLiabilitiesAndEquityInPaise: number;
  isBalanced: boolean;
}

export interface GetFinancialStatementInput {
  fromDateUtc?: string;
  toDateUtc?: string;
}
