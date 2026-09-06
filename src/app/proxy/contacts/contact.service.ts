import type {
  ConsentRecordDto,
  ContactDto,
  CreateUpdateContactDto,
  GetContactListInput,
  GrantConsentInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateContactDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/contact',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/contact/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/contact/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getConsentHistory = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ConsentRecordDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/contact/${id}/consent-history`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetContactListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ContactDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/contact',
        params: {
          filter: input.filter,
          tag: input.tag,
          consentScope: input.consentScope,
          suppression: input.suppression,
          minScore: input.minScore,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  grantConsent = (id: string, input: GrantConsentInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/contact/${id}/grant-consent`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateContactDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/contact/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  recomputeScore = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/contact/${id}/recompute-score`,
      },
      { apiName: this.apiName, ...config },
    );

  withdrawMarketingConsent = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/contact/${id}/withdraw-marketing-consent`,
      },
      { apiName: this.apiName, ...config },
    );
}
