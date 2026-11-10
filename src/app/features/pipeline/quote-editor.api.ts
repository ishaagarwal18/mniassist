import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PipelineStore } from '../../core/services/pipeline.service';
import { PriceListDto, PriceListService } from '../../proxy/library';
import {
  CatalogueMatchDto,
  CreateUpdateQuotationDto,
  QuotationDto,
  QuotationService,
  RepriceQuotationInput,
  RepriceResultDto,
  ResolvedPriceDto,
} from '../../proxy/pipeline';

/** Whose prices a part is looked up at: a saved quotation's, or (before it is saved) the customer's. */
export interface QuoteContext {
  quotationId?: string | null;
  contactId?: string | null;
}

/** What the quote line editor talks to: the quotation and price list APIs. */
@Injectable({ providedIn: 'root' })
export class QuoteEditorApi {
  private readonly quotes = inject(QuotationService);
  private readonly lists = inject(PriceListService);
  private readonly store = inject(PipelineStore);

  get(id: string): Promise<QuotationDto> {
    return firstValueFrom(this.quotes.get(id));
  }

  async priceLists(): Promise<PriceListDto[]> {
    const page = await firstValueFrom(
      this.lists.getList({ activeOnly: true, skipCount: 0, maxResultCount: 100 }),
    );
    return page.items ?? [];
  }

  resolve(
    ctx: QuoteContext,
    priceListId: string | null,
    partNumber: string,
    quantity: number,
  ): Promise<ResolvedPriceDto> {
    return firstValueFrom(this.quotes.resolvePrice({ ...ctx, priceListId, partNumber, quantity }));
  }

  search(
    ctx: QuoteContext,
    priceListId: string | null,
    query: string | null,
  ): Promise<CatalogueMatchDto[]> {
    return firstValueFrom(
      this.quotes.searchCatalogue({ ...ctx, query, priceListId, maxResultCount: 15 }),
    );
  }

  /** A new quotation: against an enquiry, or a manual one for a customer (the API opens the enquiry). */
  create(input: CreateUpdateQuotationDto): Promise<QuotationDto> {
    return this.store.createQuotation(input);
  }

  update(id: string, input: CreateUpdateQuotationDto): Promise<QuotationDto> {
    return firstValueFrom(this.quotes.update(id, input));
  }

  reprice(id: string, input: RepriceQuotationInput): Promise<RepriceResultDto> {
    return firstValueFrom(this.quotes.reprice(id, input));
  }
}
