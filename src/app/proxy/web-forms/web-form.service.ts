import type { PagedResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type {
  CreateUpdateWebFormDto,
  PublicWebFormDto,
  SubmitWebFormInput,
  SubmitWebFormResultDto,
  WebFormDto,
  WebFormEmbedDto,
  WebFormSubmissionDto,
} from './web-form.models';

/** Building and managing lead-capture forms. Routes follow ABP's conventional-controller naming for WebFormAppService. */
@Injectable({ providedIn: 'root' })
export class WebFormService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebFormDto[]>({ method: 'GET', url: '/api/auto-reach/web-form' }, { apiName: this.apiName, ...config });

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebFormDto>({ method: 'GET', url: `/api/auto-reach/web-form/${id}` }, { apiName: this.apiName, ...config });

  create = (input: CreateUpdateWebFormDto, config?: Partial<Rest.Config>) =>
    this.restService.request<CreateUpdateWebFormDto, WebFormDto>(
      { method: 'POST', url: '/api/auto-reach/web-form', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateWebFormDto, config?: Partial<Rest.Config>) =>
    this.restService.request<CreateUpdateWebFormDto, WebFormDto>(
      { method: 'PUT', url: `/api/auto-reach/web-form/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({ method: 'DELETE', url: `/api/auto-reach/web-form/${id}` }, { apiName: this.apiName, ...config });

  setActive = (id: string, active: boolean, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebFormDto>(
      { method: 'POST', url: `/api/auto-reach/web-form/${id}/set-active`, params: { active } },
      { apiName: this.apiName, ...config },
    );

  getEmbed = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WebFormEmbedDto>(
      { method: 'GET', url: `/api/auto-reach/web-form/${id}/embed` },
      { apiName: this.apiName, ...config },
    );

  getSubmissions = (id: string, skipCount = 0, maxResultCount = 50, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<WebFormSubmissionDto>>(
      { method: 'GET', url: `/api/auto-reach/web-form/${id}/submissions`, params: { skipCount, maxResultCount } },
      { apiName: this.apiName, ...config },
    );
}

/**
 * What a visitor's browser calls. Anonymous: the form's address is the only thing they hold. Errors are handled by the page itself, so the
 * app-wide handler (which would talk about sessions) is skipped.
 */
@Injectable({ providedIn: 'root' })
export class WebFormPublicService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  private readonly own: Partial<Rest.Config> = { skipHandleError: true };

  get = (code: string) =>
    this.restService.request<any, PublicWebFormDto>(
      { method: 'GET', url: `/api/webforms/public/${code}` },
      { apiName: this.apiName, ...this.own },
    );

  submit = (code: string, input: SubmitWebFormInput) =>
    this.restService.request<SubmitWebFormInput, SubmitWebFormResultDto>(
      { method: 'POST', url: `/api/webforms/public/${code}`, body: input },
      { apiName: this.apiName, ...this.own },
    );
}
