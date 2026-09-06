import type { CustomFieldEntity } from './custom-field-entity.enum';
import type { CreateUpdateCustomFieldDto, CustomFieldDefinitionDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CustomFieldService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateCustomFieldDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomFieldDefinitionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/custom-field',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/custom-field/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomFieldDefinitionDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/custom-field/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getFor = (appliesTo: CustomFieldEntity, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<CustomFieldDefinitionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/custom-field/for',
        params: { appliesTo },
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<CustomFieldDefinitionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/custom-field',
        params: {
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  installIndustrialPack = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<CustomFieldDefinitionDto>>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/custom-field/install-industrial-pack',
      },
      { apiName: this.apiName, ...config },
    );

  normalise = (fieldId: string, rawValue: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, string>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/custom-field/normalise/${fieldId}`,
        params: { rawValue },
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateCustomFieldDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomFieldDefinitionDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/custom-field/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
