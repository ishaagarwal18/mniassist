import type {
  ExportContactsDto,
  ImportDryRunDto,
  ImportFileDto,
  ImportPreviewDto,
  ImportResultDto,
  RunImportDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable } from '@angular/core';

/**
 * IContactImportAppService — CSV import (inspect → dry-run → import) and export.
 * The CSV travels as text, not a blob: the mapping step needs the header row
 * before anything is written.
 */
@Injectable({
  providedIn: 'root',
})
export class ContactImportService {
  apiName = 'AutoReach';

  inspect = (input: ImportFileDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ImportPreviewDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/contact-import/inspect',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  dryRun = (input: RunImportDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ImportDryRunDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/contact-import/dry-run',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  import = (input: RunImportDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ImportResultDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/contact-import/import',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  export = (input: ExportContactsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'POST',
        url: '/api/auto-reach/contact-import/export',
        body: input,
        responseType: 'blob' as 'json',
      },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
