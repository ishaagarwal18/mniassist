import type {
  EmailTemplateDto,
  EmailTemplatePreviewDto,
  EmailTemplateSummaryDto,
  UpdateEmailTemplateInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TextTemplateService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<EmailTemplateSummaryDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/text-template',
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailTemplateDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/text-template/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: UpdateEmailTemplateInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailTemplateDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/text-template/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  restoreDefault = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailTemplateDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/text-template/${id}/restore-default`,
      },
      { apiName: this.apiName, ...config },
    );

  preview = (id: string, input: UpdateEmailTemplateInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailTemplatePreviewDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/text-template/${id}/preview`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
