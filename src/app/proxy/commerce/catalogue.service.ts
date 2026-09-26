import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** M09-6: WhatsApp commerce catalogue sync. */
export enum CatalogueProductAvailability {
  InStock = 0,
  OutOfStock = 1,
}

export enum CatalogueSyncState {
  Draft = 0,
  Synced = 1,
  Failed = 2,
  PendingDelete = 3,
}

export interface CatalogueProductDto {
  id: string;
  channelId: string;
  retailerId: string;
  name: string;
  description?: string | null;
  priceInPaise: number;
  currency: string;
  imageUrl?: string | null;
  availability: CatalogueProductAvailability;
  metaProductId?: string | null;
  syncState: CatalogueSyncState;
  lastSyncedAtUtc?: string | null;
  syncError?: string | null;
  /** The product in the product catalogue this listing comes from. While set, name, description and price are the product's. */
  productId?: string | null;
}

export interface CreateUpdateCatalogueProductDto {
  channelId: string;
  retailerId: string;
  name: string;
  description?: string | null;
  priceInPaise: number;
  currency: string;
  imageUrl?: string | null;
  availability: CatalogueProductAvailability;
}

export interface AddCatalogueFromProductsResultDto {
  added: number;
  skipped: string[];
}

export interface LinkExistingResultDto {
  linked: number;
}

export interface CatalogueSyncResultDto {
  pushed: number;
  deleted: number;
  failed: number;
  catalogueId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (channelId: string | undefined, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<CatalogueProductDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/catalogue',
        params: { channelId, skipCount: 0, maxResultCount: 500 },
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateCatalogueProductDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CatalogueProductDto>(
      { method: 'POST', url: '/api/auto-reach/catalogue', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateCatalogueProductDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CatalogueProductDto>(
      { method: 'PUT', url: `/api/auto-reach/catalogue/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/catalogue/${id}` },
      { apiName: this.apiName, ...config },
    );

  addFromProducts = (channelId: string, productIds: string[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, AddCatalogueFromProductsResultDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/catalogue/from-products',
        body: { channelId, productIds },
      },
      { apiName: this.apiName, ...config },
    );

  linkExisting = (channelId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LinkExistingResultDto>(
      { method: 'POST', url: `/api/auto-reach/catalogue/link-existing/${channelId}` },
      { apiName: this.apiName, ...config },
    );

  syncChannel = (channelId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CatalogueSyncResultDto>(
      { method: 'POST', url: `/api/auto-reach/catalogue/sync-channel/${channelId}` },
      { apiName: this.apiName, ...config },
    );
}
