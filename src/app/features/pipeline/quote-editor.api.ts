import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PipelineStore } from '../../core/services/pipeline.service';
import { environment } from '../../../environments/environment';
import { PriceListDto, PriceListService } from '../../proxy/library';
import {
  CatalogueMatchDto,
  CreateUpdateQuotationDto,
  QuotationDto,
  QuotationService,
  QuotationState,
  RepriceQuotationInput,
  RepriceResultDto,
  ResolvedPriceDto,
} from '../../proxy/pipeline';
import {
  DEMO_DEFAULT_LIST,
  demoPriceLists,
  demoReprice,
  demoResolve,
  demoSearch,
  demoWrite,
} from './quote-mock';

const STATE: Record<string, QuotationState> = {
  draft: QuotationState.Draft,
  issued: QuotationState.Issued,
  revised: QuotationState.Revised,
  won: QuotationState.Won,
  lost: QuotationState.Lost,
  expired: QuotationState.Expired,
};

/** Whose prices a part is looked up at: a saved quotation's, or (before it is saved) the customer's. */
export interface QuoteContext {
  quotationId?: string | null;
  contactId?: string | null;
}

/**
 * What the quote line editor talks to. Live, it is the quotation and price list APIs. On mock data it is a small in-memory
 * catalogue and quote writer (see quote-mock.ts), so the editor can be tried without a backend; nothing is saved beyond the
 * session, and the quotation list keeps its demo totals.
 */
@Injectable({ providedIn: 'root' })
export class QuoteEditorApi {
  private readonly quotes = inject(QuotationService);
  private readonly lists = inject(PriceListService);
  private readonly store = inject(PipelineStore);

  /** Demo quotations as written so far this session. */
  private readonly demo = new Map<string, QuotationDto>();

  private get mock(): boolean {
    return environment.useMockData;
  }

  async get(id: string): Promise<QuotationDto> {
    if (!this.mock) return firstValueFrom(this.quotes.get(id));

    const known = this.demo.get(id);
    if (known) return known;
    const q = this.store.quotes().find((x) => x.id === id);
    const base: QuotationDto = {
      id,
      reference: q?.reference,
      state: STATE[q?.state ?? 'draft'],
      revisionNumber: q?.revision ?? 0,
      priceListId: DEMO_DEFAULT_LIST,
      taxRateBasisPoints: 1800,
      lines: [],
    };
    // Something to look at: a listed part at the list price, and a service typed in by hand.
    return this.remember(
      demoWrite(base, {
        taxRateBasisPoints: 1800,
        lines: [
          {
            order: 1,
            partNumber: 'VFD-15KW',
            description: '15 kW variable frequency drive',
            quantity: 2,
            unit: 'no',
            unitPriceInPaise: 0,
            useCataloguePrice: true,
          },
          {
            order: 2,
            partNumber: null,
            description: 'Site survey and layout drawing',
            quantity: 1,
            unit: 'lot',
            unitPriceInPaise: 8_000_00,
            useCataloguePrice: false,
            taxRateBasisPoints: 1800,
          },
        ],
      }),
    );
  }

  async priceLists(): Promise<PriceListDto[]> {
    if (this.mock) return demoPriceLists();
    const page = await firstValueFrom(
      this.lists.getList({ activeOnly: true, skipCount: 0, maxResultCount: 100 }),
    );
    return page.items ?? [];
  }

  async resolve(
    ctx: QuoteContext,
    priceListId: string | null,
    partNumber: string,
    quantity: number,
  ): Promise<ResolvedPriceDto> {
    if (this.mock) return demoResolve(partNumber, quantity, priceListId);
    return firstValueFrom(this.quotes.resolvePrice({ ...ctx, priceListId, partNumber, quantity }));
  }

  async search(
    ctx: QuoteContext,
    priceListId: string | null,
    query: string | null,
  ): Promise<CatalogueMatchDto[]> {
    if (this.mock) return demoSearch(query, priceListId, 15);
    return firstValueFrom(
      this.quotes.searchCatalogue({ ...ctx, query, priceListId, maxResultCount: 15 }),
    );
  }

  /** A new quotation: against an enquiry, or a manual one for a customer (the API opens the enquiry). */
  async create(input: CreateUpdateQuotationDto): Promise<QuotationDto> {
    const created = await this.store.createQuotation(input);
    return this.mock ? this.remember(demoWrite(created, input)) : created;
  }

  async update(id: string, input: CreateUpdateQuotationDto): Promise<QuotationDto> {
    if (!this.mock) return firstValueFrom(this.quotes.update(id, input));
    return this.remember(demoWrite(await this.get(id), input));
  }

  async reprice(id: string, input: RepriceQuotationInput): Promise<RepriceResultDto> {
    if (!this.mock) return firstValueFrom(this.quotes.reprice(id, input));
    const { result, quote } = demoReprice(await this.get(id), input);
    if (input.apply) this.remember(quote);
    return result;
  }

  private remember(q: QuotationDto): QuotationDto {
    this.demo.set(q.id!, q);
    return q;
  }
}
