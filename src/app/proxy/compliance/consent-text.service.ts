import type {
  ConsentTextVersionDto,
  CreateConsentTextVersionDto,
  UpdateConsentTextVersionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

/**
 * Versioned consent notices.
 *
 * A published version is evidence and is never edited — updating one is refused
 * server-side. Changing the wording means creating a new version, and every consent
 * already collected stays attached to the text those people actually saw.
 */
@Injectable({
  providedIn: 'root',
})
export class ConsentTextService {
  apiName = 'AutoReach';

  getList = (key: string | undefined, onlyCurrent: boolean, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ConsentTextVersionDto>>(
      { method: 'GET', url: '/api/auto-reach/consent-text', params: { key, onlyCurrent } },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      { method: 'GET', url: `/api/auto-reach/consent-text/${id}` },
      { apiName: this.apiName, ...config },
    );

  getCurrent = (key: string, languageCode: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      { method: 'GET', url: '/api/auto-reach/consent-text/current', params: { key, languageCode } },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateConsentTextVersionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      { method: 'POST', url: '/api/auto-reach/consent-text', body: input },
      { apiName: this.apiName, ...config },
    );

  /** Drafts only. A published version cannot be edited. */
  update = (id: string, input: UpdateConsentTextVersionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      { method: 'PUT', url: `/api/auto-reach/consent-text/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  publish = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      { method: 'POST', url: `/api/auto-reach/consent-text/${id}/publish` },
      { apiName: this.apiName, ...config },
    );

  retire = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      { method: 'POST', url: `/api/auto-reach/consent-text/${id}/retire` },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
