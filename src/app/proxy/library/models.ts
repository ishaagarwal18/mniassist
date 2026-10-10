import type { IRemoteStreamContent } from '../volo/abp/content/models';
import type { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { DocumentVisibility } from './document-visibility.enum';

export interface CreateLibraryDocumentDto {
  title: string;
  description?: string | null;
  category?: string | null;
  partNumbers?: string[];
  visibility?: DocumentVisibility;
  allowedAccountIds?: string[];
  file: IRemoteStreamContent;
}

export interface GetLibraryListInput extends PagedAndSortedResultRequestDto {
  filter?: string | null;
  category?: string | null;
}

export interface LibraryDocumentDto extends FullAuditedEntityDto<string> {
  title?: string;
  description?: string | null;
  mimeType?: string;
  sizeBytes?: number;
  category?: string | null;
  sendCount?: number;
  /** Goes up each time the file is replaced (M09-1). */
  version?: number;
  lastSentAtUtc?: string | null;
  visibility?: DocumentVisibility;
  allowedAccountIds?: string[];
  partNumbers?: string[];
}

export interface UpdateLibraryDocumentDto {
  title: string;
  description?: string | null;
  category?: string | null;
  partNumbers?: string[];
  visibility?: DocumentVisibility;
  allowedAccountIds?: string[];
}

/** One send of a document to a contact (M09-3), with the message's receipts. */
export interface DocumentDeliveryDto {
  contactId: string;
  contactName: string;
  version: number;
  sentAtUtc: string;
  deliveredAtUtc?: string | null;
  readAtUtc?: string | null;
  failed: boolean;
}
