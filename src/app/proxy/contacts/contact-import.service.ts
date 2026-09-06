import type {
  ExportContactsDto,
  ImportDryRunDto,
  ImportFileDto,
  ImportPreviewDto,
  ImportResultDto,
  RunImportDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ContactImportService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  dryRun = (input: RunImportDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ImportDryRunDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/contact-import/dry-run',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  export = (input: ExportContactsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'POST',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: '/api/auto-reach/contact-import/export',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  import = (input: RunImportDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ImportResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/contact-import/import',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  inspect = (input: ImportFileDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ImportPreviewDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/contact-import/inspect',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
