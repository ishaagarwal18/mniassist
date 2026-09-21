import type { QuotePriceSource } from './quote-price-source.enum';

export interface ResolvedPriceDto {
  found?: boolean;
  partNumber?: string;
  description?: string | null;
  unit?: string;
  unitPriceInPaise?: number;
  source?: QuotePriceSource;
  priceListId?: string | null;
  priceListName?: string | null;
  productId?: string | null;
  minimumOrderQuantity?: number;
  belowMinimumOrder?: boolean;
  missingFromRequestedList?: boolean;
  taxRateBasisPoints?: number | null;
}

export interface ResolveQuotePriceInput {
  quotationId?: string | null;
  contactId?: string | null;
  priceListId?: string | null;
  partNumber: string;
  quantity?: number;
}

export interface SearchQuoteCatalogueInput {
  query?: string | null;
  quotationId?: string | null;
  contactId?: string | null;
  priceListId?: string | null;
  maxResultCount?: number;
}

export interface CatalogueMatchDto {
  partNumber?: string;
  name?: string;
  unit?: string;
  unitPriceInPaise?: number;
  source?: QuotePriceSource;
  priceListName?: string | null;
  productId?: string | null;
  minimumOrderQuantity?: number;
  taxRateBasisPoints?: number | null;
  onlyInPriceList?: boolean;
}

export interface RepriceQuotationInput {
  priceListId?: string | null;
  keepManualPrices?: boolean;
  apply?: boolean;
}

export interface RepriceLineDto {
  lineId?: string;
  partNumber?: string | null;
  description?: string;
  oldUnitPriceInPaise?: number;
  newUnitPriceInPaise?: number;
  newSource?: QuotePriceSource;
  priceListName?: string | null;
  skipped?: string | null;
  changed?: boolean;
}

export interface RepriceResultDto {
  applied?: boolean;
  lines?: RepriceLineDto[];
  oldSubtotalInPaise?: number;
  newSubtotalInPaise?: number;
}
