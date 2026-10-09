import { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { AccountCategory, AccountSubCategory, BalanceNature } from './finance-enums';

export interface ChartOfAccountDto extends FullAuditedEntityDto<string> {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  subCategory: AccountSubCategory;
  normalBalance: BalanceNature;
  parentAccountId?: string;
  openingBalanceInPaise: number;
  currentBalanceInPaise: number;
  isActive: boolean;
  isSystemAccount: boolean;
  description?: string;
}

export interface CreateChartOfAccountDto {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  subCategory: AccountSubCategory;
  normalBalance: BalanceNature;
  parentAccountId?: string;
  openingBalanceInPaise: number;
  description?: string;
}

export interface UpdateChartOfAccountDto {
  accountName: string;
  category: AccountCategory;
  subCategory: AccountSubCategory;
  description?: string;
  isActive: boolean;
}

export interface GetChartOfAccountsInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  category?: AccountCategory;
  subCategory?: AccountSubCategory;
  isActive?: boolean;
}
