import type {
  CreateUpdateQuotationDto,
  GetQuotationListInput,
  IssueQuotationInput,
  QuotationDto,
} from './models';
import type {
  CatalogueMatchDto,
  RepriceQuotationInput,
  RepriceResultDto,
  ResolvedPriceDto,
  ResolveQuotePriceInput,
  SearchQuoteCatalogueInput,
} from './quote-pricing.models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** A quotation as it was issued: R0 is the first issue, R1 the next. */
export interface QuotationRevisionDto {
  revisionNumber: number;
  issuedAtUtc: string;
  issuedByUserId?: string | null;
  issuedByName?: string | null;
  subtotalInPaise: number;
  taxInPaise: number;
  totalInPaise: number;
  lineCount: number;
  hasPdf: boolean;
}

export interface QuotationRevisionLineDiffDto {
  /** Added, Removed or Changed. */
  change: 'Added' | 'Removed' | 'Changed';
  partNumber?: string | null;
  description: string;
  fromQuantity?: number | null;
  toQuantity?: number | null;
  fromUnitPriceInPaise?: number | null;
  toUnitPriceInPaise?: number | null;
  fromDiscountBasisPoints?: number | null;
  toDiscountBasisPoints?: number | null;
}

export interface QuotationRevisionDiffDto {
  fromRevision: number;
  toRevision: number;
  fromTotalInPaise: number;
  toTotalInPaise: number;
  summary: string;
  /** The changes as a plain list, for the message that sends the new revision. */
  changeNote: string;
  lines: QuotationRevisionLineDiffDto[];
}

@Injectable({
  providedIn: 'root',
})
export class QuotationService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  create = (input: CreateUpdateQuotationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, QuotationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/quotation',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/quotation/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  downloadPdf = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'POST',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/quotation/${id}/download-pdf`,
      },
      { apiName: this.apiName, ...config },
    );

  getRevisions = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, QuotationRevisionDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/quotation/${id}/revisions`,
      },
      { apiName: this.apiName, ...config },
    );

  compareRevisions = (id: string, from: number, to: number, config?: Partial<Rest.Config>) =>
    this.restService.request<any, QuotationRevisionDiffDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/quotation/${id}/compare-revisions`,
        body: { from, to },
      },
      { apiName: this.apiName, ...config },
    );

  downloadRevisionPdf = (id: string, revision: number, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'POST',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/quotation/${id}/download-revision-pdf`,
        params: { revision },
      },
      { apiName: this.apiName, ...config },
    );

  generatePdf = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, string>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/quotation/${id}/generate-pdf`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, QuotationDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/quotation/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetQuotationListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<QuotationDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/quotation',
        params: {
          state: input.state,
          enquiryId: input.enquiryId,
          filter: input.filter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  issue = (id: string, input: IssueQuotationInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, QuotationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/quotation/${id}/issue`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  markLost = (id: string, reason: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, QuotationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/quotation/${id}/mark-lost`,
        params: { reason },
      },
      { apiName: this.apiName, ...config },
    );

  markWon = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, QuotationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/quotation/${id}/mark-won`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateQuotationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, QuotationDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/quotation/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  resolvePrice = (input: ResolveQuotePriceInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResolvedPriceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/quotation/resolve-price',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  searchCatalogue = (input: SearchQuoteCatalogueInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CatalogueMatchDto[]>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/quotation/search-catalogue',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  reprice = (id: string, input: RepriceQuotationInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RepriceResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/quotation/${id}/reprice`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
