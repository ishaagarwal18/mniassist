import type { PagedResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface ProductDto {
  id?: string;
  partNumber?: string;
  name?: string;
  description?: string | null;
  unit?: string;
  /** The sales price. */
  listPriceInPaise?: number;
  /** The purchase (cost) price; null when not recorded. */
  purchasePriceInPaise?: number | null;
  hsnCode?: string | null;
  category?: string | null;
  taxRateBasisPoints?: number | null;
  isActive?: boolean;
}

export interface CreateUpdateProductDto {
  partNumber: string;
  name: string;
  description?: string | null;
  unit?: string;
  /** The sales price. */
  listPriceInPaise: number;
  purchasePriceInPaise?: number | null;
  hsnCode?: string | null;
  category?: string | null;
  taxRateBasisPoints?: number | null;
  isActive: boolean;
}

export interface GetProductListInput {
  filter?: string | null;
  category?: string | null;
  activeOnly?: boolean | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface ImportProductRow {
  partNumber?: string | null;
  name?: string | null;
  description?: string | null;
  unit?: string | null;
  listPriceInPaise: number;
  purchasePriceInPaise?: number | null;
  hsnCode?: string | null;
  category?: string | null;
  taxRateBasisPoints?: number | null;
  isActive?: boolean;
}

/** A unit of measure products can be sold in, and how many products use it. */
export interface ProductUnitDto {
  name: string;
  productCount: number;
}

export interface ImportProductsResultDto {
  created?: number;
  updated?: number;
  skipped?: string[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetProductListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ProductDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/product',
        params: {
          filter: input.filter,
          category: input.category,
          activeOnly: input.activeOnly,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProductDto>(
      { method: 'GET', url: `/api/auto-reach/product/${id}` },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateProductDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProductDto>(
      { method: 'POST', url: '/api/auto-reach/product', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateProductDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProductDto>(
      { method: 'PUT', url: `/api/auto-reach/product/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/product/${id}` },
      { apiName: this.apiName, ...config },
    );

  import = (products: ImportProductRow[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, ImportProductsResultDto>(
      { method: 'POST', url: '/api/auto-reach/product/import', body: { products } },
      { apiName: this.apiName, ...config },
    );

  /** The workspace's units of measure, plus any a product already uses. */
  getUnits = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProductUnitDto[]>(
      { method: 'GET', url: '/api/auto-reach/product/units' },
      { apiName: this.apiName, ...config },
    );

  addUnit = (name: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProductUnitDto>(
      { method: 'POST', url: '/api/auto-reach/product/unit', body: { name } },
      { apiName: this.apiName, ...config },
    );

  /** Refused while products still use the unit. */
  deleteUnit = (name: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: '/api/auto-reach/product/unit', params: { name } },
      { apiName: this.apiName, ...config },
    );

  getCategories = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, string[]>(
      { method: 'GET', url: '/api/auto-reach/product/categories' },
      { apiName: this.apiName, ...config },
    );
}
