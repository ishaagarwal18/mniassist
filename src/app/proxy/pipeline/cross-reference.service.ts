import { PagedResultDto, Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum CrossReferenceRelation {
  Equivalent = 0,
  Functional = 1,
  Upgrade = 2,
}

export enum CrossReferenceSource {
  Imported = 0,
  Learned = 1,
  Manual = 2,
}

export interface GetCrossReferenceListInput {
  filter?: string | null;
  /** False lists only the ones awaiting approval. */
  approved?: boolean | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface CreateUpdateCrossReferenceDto {
  otherMake?: string | null;
  otherPartNumber: string;
  ourPartNumber: string;
  relation: CrossReferenceRelation;
  note?: string | null;
}

export interface CrossReferenceImportResultDto {
  added: number;
  updated: number;
  problems: string[];
}

export interface CrossReferenceDto {
  id: string;
  otherMake?: string | null;
  otherPartNumber: string;
  /** The customer's side is a line's wording rather than a part number. */
  byDescription: boolean;
  ourPartNumber: string;
  ourItemName?: string | null;
  relation: CrossReferenceRelation;
  source: CrossReferenceSource;
  isApproved: boolean;
  timesUsed: number;
  lastUsedAtUtc?: string | null;
  note?: string | null;
  creationTime: string;
}

/** Another make's part number (or a customer's wording) and the part we quote for it, for BOQ matching. */
@Injectable({ providedIn: 'root' })
export class CrossReferenceService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetCrossReferenceListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<CrossReferenceDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/cross-reference',
        params: {
          filter: input.filter,
          approved: input.approved,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateCrossReferenceDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrossReferenceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/cross-reference',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateCrossReferenceDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrossReferenceDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/cross-reference/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/cross-reference/${id}` },
      { apiName: this.apiName, ...config },
    );

  /** A CSV file, as a multipart form with a `file` field. */
  import = (body: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CrossReferenceImportResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/cross-reference/import',
        body,
      },
      { apiName: this.apiName, ...config },
    );

  approve = (ids: string[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/cross-reference/approve',
        body: { ids },
      },
      { apiName: this.apiName, ...config },
    );
}
