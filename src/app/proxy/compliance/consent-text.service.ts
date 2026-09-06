import type {
  ConsentTextVersionDto,
  CreateConsentTextVersionDto,
  UpdateConsentTextVersionDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConsentTextService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateConsentTextVersionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/consent-text',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/consent-text/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getCurrent = (key: string, languageCode: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/consent-text/current',
        params: { key, languageCode },
      },
      { apiName: this.apiName, ...config },
    );

  getList = (key: string, onlyCurrent: boolean, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ConsentTextVersionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/consent-text',
        params: { key, onlyCurrent },
      },
      { apiName: this.apiName, ...config },
    );

  publish = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/consent-text/${id}/publish`,
      },
      { apiName: this.apiName, ...config },
    );

  retire = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/consent-text/${id}/retire`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: UpdateConsentTextVersionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsentTextVersionDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/consent-text/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
