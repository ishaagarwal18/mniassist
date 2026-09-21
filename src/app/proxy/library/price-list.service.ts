import type { PagedResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface PriceListItemDto {
  id?: string;
  sku?: string;
  description?: string | null;
  unitPriceInPaise?: number;
  uom?: string;
  minimumOrderQuantity?: number;
  /** The catalogue product this SKU names; null when it is not in the catalogue. */
  productId?: string | null;
}

export interface PriceListDto {
  id?: string;
  name?: string;
  region?: string | null;
  distributorTier?: string | null;
  currency?: string;
  effectiveFrom?: string;
  isActive?: boolean;
  items?: PriceListItemDto[];
}

export interface CreateUpdatePriceListItemDto {
  sku: string;
  description?: string | null;
  unitPriceInPaise: number;
  uom: string;
  minimumOrderQuantity: number;
}

export interface CreateUpdatePriceListDto {
  name: string;
  region?: string | null;
  distributorTier?: string | null;
  currency: string;
  effectiveFrom: string;
  isActive: boolean;
  items: CreateUpdatePriceListItemDto[];
}

export interface GetPriceListsInput {
  region?: string | null;
  distributorTier?: string | null;
  activeOnly?: boolean | null;
  skipCount?: number;
  maxResultCount?: number;
}

@Injectable({ providedIn: 'root' })
export class PriceListService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetPriceListsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<PriceListDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/price-list',
        params: {
          region: input.region,
          distributorTier: input.distributorTier,
          activeOnly: input.activeOnly,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PriceListDto>(
      { method: 'GET', url: `/api/auto-reach/price-list/${id}` },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdatePriceListDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PriceListDto>(
      { method: 'POST', url: '/api/auto-reach/price-list', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdatePriceListDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PriceListDto>(
      { method: 'PUT', url: `/api/auto-reach/price-list/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/price-list/${id}` },
      { apiName: this.apiName, ...config },
    );

  resolveForContact = (contactId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PriceListDto>(
      { method: 'GET', url: `/api/auto-reach/price-list/resolve-for-contact/${contactId}` },
      { apiName: this.apiName, ...config },
    );
}
