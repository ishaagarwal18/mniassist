import type {
  CreateUpdateTemplateDto,
  GetTemplateListInput,
  RenderTemplateInput,
  RenderedTemplateDto,
  TemplateDto,
  TemplateLintResultDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TemplateService {
  apiName = 'AutoReach';

  create = (input: CreateUpdateTemplateDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TemplateDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/template',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/template/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TemplateDto>(
      {
        method: 'GET',
        url: `/api/auto-reach/template/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetTemplateListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<TemplateDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/template',
        params: {
          channelId: input.channelId,
          category: input.category,
          status: input.status,
          filter: input.filter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  lint = (input: CreateUpdateTemplateDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TemplateLintResultDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/template/lint',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  render = (id: string, input: RenderTemplateInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RenderedTemplateDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/template/${id}/render`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  submit = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TemplateDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/template/${id}/submit`,
      },
      { apiName: this.apiName, ...config },
    );

  syncFromMeta = (channelId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        url: '/api/auto-reach/template/sync-from-meta',
        params: { channelId },
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateTemplateDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TemplateDto>(
      {
        method: 'PUT',
        url: `/api/auto-reach/template/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
