import type { DocumentDeliveryDto } from './models';
import type {
  CreateLibraryDocumentDto,
  GetLibraryListInput,
  LibraryDocumentDto,
  UpdateLibraryDocumentDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateLibraryDocumentDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LibraryDocumentDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/library',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/library/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  /** A new version of the file (M09-1); FormData with a `file` field. */
  replaceFile = (id: string, body: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LibraryDocumentDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/library/${id}/replace-file`,
        body,
      },
      { apiName: this.apiName, ...config },
    );

  /** Who received the document, which version, whether they read it (M09-3). */
  getDeliveries = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, { items: DocumentDeliveryDto[] }>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/library/${id}/deliveries`,
      },
      { apiName: this.apiName, ...config },
    );

  download = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'POST',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/library/${id}/download`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LibraryDocumentDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/library/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetLibraryListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<LibraryDocumentDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/library',
        params: {
          filter: input.filter,
          category: input.category,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  searchByPartNumber = (partNumber: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<LibraryDocumentDto>>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/library/search-by-part-number',
        params: { partNumber },
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: UpdateLibraryDocumentDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LibraryDocumentDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/library/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
