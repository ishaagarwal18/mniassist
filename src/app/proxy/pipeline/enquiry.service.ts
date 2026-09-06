import type {
  CreateUpdateEnquiryDto,
  EnquiryBoardColumnDto,
  EnquiryDetailDto,
  EnquiryDto,
  GetEnquiryBoardInput,
  GetEnquiryListInput,
  MoveEnquiryInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EnquiryService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  addNote = (id: string, note: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EnquiryDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/enquiry/${id}/note`,
        params: { note },
      },
      { apiName: this.apiName, ...config },
    );

  assign = (id: string, ownerUserId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EnquiryDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/enquiry/${id}/assign/${ownerUserId}`,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateEnquiryDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EnquiryDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/enquiry',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/enquiry/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EnquiryDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/enquiry/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getBoard = (input: GetEnquiryBoardInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<EnquiryBoardColumnDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/enquiry/board',
        params: { ownerUserId: input.ownerUserId, source: input.source, openOnly: input.openOnly },
      },
      { apiName: this.apiName, ...config },
    );

  getDetail = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EnquiryDetailDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/enquiry/${id}/detail`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetEnquiryListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<EnquiryDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/enquiry',
        params: {
          stage: input.stage,
          ownerUserId: input.ownerUserId,
          filter: input.filter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  move = (id: string, input: MoveEnquiryInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EnquiryDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/enquiry/${id}/move`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateEnquiryDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EnquiryDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/enquiry/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
