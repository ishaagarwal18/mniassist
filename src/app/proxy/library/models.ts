import type { IRemoteStreamContent } from '../volo/abp/content/models';
import type { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface CreateLibraryDocumentDto {
  title: string;
  description?: string | null;
  category?: string | null;
  partNumbers?: string[];
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
  lastSentAtUtc?: string | null;
  partNumbers?: string[];
}

export interface UpdateLibraryDocumentDto {
  title: string;
  description?: string | null;
  category?: string | null;
  partNumbers?: string[];
}
