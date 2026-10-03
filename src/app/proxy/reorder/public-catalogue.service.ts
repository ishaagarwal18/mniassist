import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { PublicReorderSubmittedDto, StockBand } from './reorder-public.service';

export interface PublicCatalogueDto {
  heading?: string | null;
  intro?: string | null;
  showsPrices: boolean;
  showsStock: boolean;
  categories: string[];
}

export interface PublicCatalogueItemDto {
  partNumber: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit: string;
  /** The list price before GST; null for "price on request". */
  priceInPaise?: number | null;
  taxRateBasisPoints: number;
  availability?: StockBand | null;
}

export interface PublicCataloguePageDto {
  total: number;
  pageSize: number;
  items: PublicCatalogueItemDto[];
}

export interface PublicCatalogueEnquiryInput {
  name: string;
  company?: string | null;
  phone: string;
  email?: string | null;
  city?: string | null;
  pincode?: string | null;
  lines: { partNumber: string; quantity: number }[];
  note?: string | null;
  consent: boolean;
  /** Left empty by people. */
  website?: string | null;
}

/** What a visitor's browser calls on a workspace's public catalogue. Anonymous; the page handles its own errors. */
@Injectable({ providedIn: 'root' })
export class PublicCatalogueService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  private readonly own: Partial<Rest.Config> = { skipHandleError: true };

  private url = (code: string, tail = '') => `/api/catalogue/public/${code}${tail}`;

  open = (code: string) =>
    this.restService.request<any, PublicCatalogueDto>(
      { method: 'GET', url: this.url(code) },
      { apiName: this.apiName, ...this.own },
    );

  browse = (code: string, q: string, category: string, page: number) =>
    this.restService.request<any, PublicCataloguePageDto>(
      {
        method: 'GET',
        url: this.url(code, '/items'),
        params: { q: q || undefined, category: category || undefined, page },
      },
      { apiName: this.apiName, ...this.own },
    );

  submit = (code: string, input: PublicCatalogueEnquiryInput) =>
    this.restService.request<any, PublicReorderSubmittedDto>(
      { method: 'POST', url: this.url(code, '/enquiry'), body: input },
      { apiName: this.apiName, ...this.own },
    );
}
