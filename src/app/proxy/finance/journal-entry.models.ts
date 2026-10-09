import { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { JournalVoucherStatus, JournalVoucherType } from './finance-enums';

export interface JournalEntryLineDto extends EntityDto<string> {
  journalEntryId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debitAmountInPaise: number;
  creditAmountInPaise: number;
  lineNarration?: string;
  costCenter?: string;
}

export interface JournalEntryDto extends FullAuditedEntityDto<string> {
  entryNumber: string;
  entryDateUtc: string;
  voucherType: JournalVoucherType;
  status: JournalVoucherStatus;
  referenceDocumentType?: string;
  referenceDocumentId?: string;
  referenceDocumentNumber?: string;
  narration: string;
  totalDebitInPaise: number;
  totalCreditInPaise: number;
  postedAtUtc?: string;
  postedBy?: string;
  lines: JournalEntryLineDto[];
}

export interface CreateJournalEntryLineDto {
  accountId: string;
  debitAmountInPaise: number;
  creditAmountInPaise: number;
  lineNarration?: string;
  costCenter?: string;
}

export interface CreateJournalEntryDto {
  entryNumber?: string;
  entryDateUtc: string;
  voucherType: JournalVoucherType;
  narration: string;
  referenceDocumentType?: string;
  referenceDocumentId?: string;
  referenceDocumentNumber?: string;
  lines: CreateJournalEntryLineDto[];
}

export interface GetJournalEntriesInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  voucherType?: JournalVoucherType;
  status?: JournalVoucherStatus;
  fromDateUtc?: string;
  toDateUtc?: string;
}
