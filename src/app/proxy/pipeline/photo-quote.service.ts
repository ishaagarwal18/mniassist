import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { QuotationDto } from './models';
import type { CatalogueMatchDto } from './quote-pricing.models';

export interface ReadPhotoInput {
  conversationId: string;
  messageId: string;
}

export interface DraftQuoteFromPhotoInput extends ReadPhotoInput {
  /** Null opens a new enquiry for the conversation's customer. */
  enquiryId?: string | null;
  /** Other files from the same conversation to read into the same draft (up to 4 more). */
  moreMessageIds?: string[] | null;
}

/** exact = priced from the catalogue or a price list; similar = a suggestion only; none = nothing found. */
export type PhotoMatch = 'exact' | 'similar' | 'none';

export interface PhotoLineDto {
  description: string;
  partNumber?: string | null;
  quantity: number;
  match: PhotoMatch;
  catalogue?: CatalogueMatchDto | null;
}

export interface PhotoReadingDto {
  kind: 'nameplate' | 'rfq' | 'other';
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  ratings?: string | null;
  note?: string | null;
  lines: PhotoLineDto[];
}

export interface PhotoDraftDto {
  reading: PhotoReadingDto;
  quotation: QuotationDto;
  enquiryId: string;
  unpriced: number;
}

/** S2: a nameplate or RFQ photo from WhatsApp, read by the model and matched to the catalogue. */
@Injectable({ providedIn: 'root' })
export class PhotoQuoteService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  /** Whether photos can be read here (an AI model is configured). */
  getAvailable = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, boolean>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/photo-quote/available',
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  read = (input: ReadPhotoInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PhotoReadingDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/photo-quote/read',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  draft = (input: DraftQuoteFromPhotoInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PhotoDraftDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/photo-quote/draft',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
