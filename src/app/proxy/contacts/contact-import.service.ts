import type {
  ContactImportJobDto,
  ExportContactsDto,
  ImportDryRunDto,
  ImportFileDto,
  ImportPreviewDto,
  ImportResultDto,
  RunImportDto,
  StartImportDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
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

  getImportJob = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactImportJobDto>(
      {
        method: 'GET',
        url: `/api/auto-reach/contact-import/${id}/import-job`,
      },
      { apiName: this.apiName, ...config },
    );

  getImportJobs = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ContactImportJobDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/contact-import/import-jobs',
      },
      { apiName: this.apiName, ...config },
    );

  startImport = (input: StartImportDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactImportJobDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/contact-import/start-import',
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
