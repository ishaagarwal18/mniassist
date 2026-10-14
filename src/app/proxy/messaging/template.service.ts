import type {
  CreateUpdateTemplateDto,
  DraftTemplateInput,
  DraftedTemplateDto,
  GetTemplateListInput,
  RenderTemplateInput,
  RenderedTemplateDto,
  TemplateDto,
  SubmitDraftsResultDto,
  TemplateLanguageGroupDto,
  TemplateLintResultDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TemplateService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateTemplateDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TemplateDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
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

  draft = (input: DraftTemplateInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DraftedTemplateDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/template/draft',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TemplateDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/template/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetTemplateListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<TemplateDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
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

  getLanguageGroups = (channelId: string | undefined, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<TemplateLanguageGroupDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/template/language-groups/${channelId ?? ''}`,
      },
      { apiName: this.apiName, ...config },
    );

  resolveForLocale = (
    channelId: string,
    name: string,
    languageCode: string,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, TemplateDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/template/resolve-for-locale/${channelId}`,
        params: { name, languageCode },
      },
      { apiName: this.apiName, ...config },
    );

  lint = (input: CreateUpdateTemplateDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TemplateLintResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/template/lint',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  render = (id: string, input: RenderTemplateInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RenderedTemplateDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/template/${id}/render`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  submit = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TemplateDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/template/${id}/submit`,
      },
      { apiName: this.apiName, ...config },
    );

  /** Submits every draft on the channel to Meta; refusals are reported and the rest still go. */
  submitDrafts = (channelId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SubmitDraftsResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/template/submit-drafts/${channelId}`,
      },
      { apiName: this.apiName, ...config },
    );

  syncFromMeta = (channelId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/template/sync-from-meta/${channelId}`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateTemplateDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TemplateDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/template/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
