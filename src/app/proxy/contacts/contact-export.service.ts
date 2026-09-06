import type { ContactExportRequestDto, ExportContactsDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ContactExportService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  download = (id: string, token: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'POST',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/contact-export/${id}/download`,
        params: { token },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactExportRequestDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/contact-export/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ContactExportRequestDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/contact-export',
      },
      { apiName: this.apiName, ...config },
    );

  request = (input: ExportContactsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactExportRequestDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/contact-export/request',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
