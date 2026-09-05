import type {
  FullAuditedEntityDto,
  ListResultDto,
  PagedAndSortedResultRequestDto,
  PagedResultDto,
} from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable } from '@angular/core';

export interface LibraryDocumentDto extends FullAuditedEntityDto<string> {
  title: string;
  description?: string;
  mimeType: string;
  sizeBytes: number;
  category?: string;
  sendCount: number;
  lastSentAtUtc?: string;
  partNumbers: string[];
}

export interface UpdateLibraryDocumentDto {
  title: string;
  description?: string;
  category?: string;
  partNumbers: string[];
}

export interface GetLibraryListInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  category?: string;
}

@Injectable({ providedIn: 'root' })
export class LibraryService {
  apiName = 'AutoReach';
  private c = (config?: Partial<Rest.Config>) => ({ apiName: this.apiName, ...config });

  getList = (input: GetLibraryListInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, PagedResultDto<LibraryDocumentDto>>(
      { method: 'GET', url: '/api/auto-reach/library', params: { ...input } },
      this.c(config),
    );

  searchByPartNumber = (partNumber: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, ListResultDto<LibraryDocumentDto>>(
      { method: 'GET', url: '/api/auto-reach/library/by-part-number', params: { partNumber } },
      this.c(config),
    );

  create = (formData: FormData, config?: Partial<Rest.Config>) =>
    this.rest.request<any, LibraryDocumentDto>(
      { method: 'POST', url: '/api/auto-reach/library', body: formData },
      this.c(config),
    );

  update = (id: string, input: UpdateLibraryDocumentDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, LibraryDocumentDto>(
      { method: 'PUT', url: `/api/auto-reach/library/${id}`, body: input },
      this.c(config),
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/library/${id}` },
      this.c(config),
    );

  constructor(private rest: RestService) {}
}
