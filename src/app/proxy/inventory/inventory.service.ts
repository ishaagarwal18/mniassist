import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export type StockKeptIn = 'NotTracked' | 'AutoReach' | 'Erp';
export type StockMovementKind = 'Opening' | 'Receipt' | 'Issue' | 'Adjustment' | 'Count';

export interface InventorySettingsDto {
  keptIn: StockKeptIn;
  defaultLocationId?: string | null;
  issueOnWin: boolean;
  /** Read-only: an ERP connection is syncing, so keeping stock here too means two records. */
  erpSyncOn?: boolean;
  /** Read-only: the workspace has the re-order portal add-on. */
  included?: boolean;
}

export interface StockLocationDto {
  id: string;
  name: string;
  isActive: boolean;
}

export interface StockLevelDto {
  locationId: string;
  locationName: string;
  onHand: number;
  reserved: number;
  available: number;
  minLevel?: number | null;
  isLow: boolean;
}

export interface StockItemDto {
  productId: string;
  partNumber: string;
  name: string;
  unit: string;
  onHand: number;
  reserved: number;
  available: number;
  isLow: boolean;
  /** None, Batch or Serial. */
  tracking?: StockTracking;
  /** Still to arrive on sent purchase orders. */
  onOrder?: number;
  /** Moving average cost per unit, in paise. */
  averageCostInPaise?: number | null;
  /** On hand at the average cost. */
  valueInPaise?: number | null;
  locations: StockLevelDto[];
}

export type StockTracking = 'None' | 'Batch' | 'Serial';

export interface StockLotDto {
  id: string;
  productId: string;
  partNumber: string;
  locationId: string;
  locationName: string;
  kind: 'Batch' | 'Serial';
  number: string;
  expiresOn?: string | null;
  expired: boolean;
  onHand: number;
  receivedAtUtc: string;
}

export interface ErpStockDto {
  itemCode: string;
  itemName?: string | null;
  warehouse?: string | null;
  onHand: number;
  committed: number;
  available: number;
  /** The catalogue part with this part number; null when the item isn't in the catalogue. */
  productId?: string | null;
  productName?: string | null;
  syncedAtUtc: string;
}

export interface ErpStockReadDto {
  rows: number;
  matched: number;
  error?: string | null;
  anyConnection: boolean;
}

export interface StockLotLine {
  number: string;
  /** For a batch; a serial is always 1. */
  quantity: number;
  expiresOn?: string | null;
}

export interface StockMovementDto {
  id: string;
  productId: string;
  partNumber: string;
  locationId: string;
  locationName: string;
  kind: StockMovementKind;
  quantity: number;
  onHandAfter: number;
  reason?: string | null;
  quotationId?: string | null;
  occurredAtUtc: string;
  creatorId?: string | null;
  /** The batch or serial number moved, for a tracked part. */
  lotNumber?: string | null;
  /** What each unit was worth when it moved, in paise. */
  unitCostInPaise?: number | null;
  purchaseOrderId?: string | null;
}

export interface StockQuantityInput {
  productId: string;
  locationId: string;
  /** Signed for an adjustment; the counted figure for a count. */
  quantity: number;
  reason?: string | null;
  /** For a part tracked by batch or serial. */
  lots?: StockLotLine[] | null;
  /** Receiving: each unit's cost in paise before GST; moves the average cost. */
  unitCostInPaise?: number | null;
}

export interface StockImportLineDto {
  line: number;
  partNumber: string;
  location?: string | null;
  quantity: number;
  minLevel?: number | null;
  productName?: string | null;
  onHandNow?: number | null;
  error?: string | null;
  lot?: string | null;
  expiresOn?: string | null;
}

export interface StockImportCheckDto {
  usable: number;
  problems: number;
  lines: StockImportLineDto[];
}

/** Stock management, with the re-order portal add-on. */
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private restService = inject(RestService);
  apiName = 'AutoReach';
  private base = '/api/auto-reach/inventory';

  getSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventorySettingsDto>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/settings` },
      { apiName: this.apiName, ...config },
    );

  updateSettings = (
    input: { keptIn: StockKeptIn; defaultLocationId?: string | null; issueOnWin: boolean },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, InventorySettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `${this.base}/settings`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getLocations = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockLocationDto[]>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/locations` },
      { apiName: this.apiName, ...config },
    );

  createLocation = (input: { name: string; isActive: boolean }, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockLocationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/location`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateLocation = (
    id: string,
    input: { name: string; isActive: boolean },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, StockLocationDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/location`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getLevels = (filter?: string | null, lowOnly = false, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockItemDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/levels`,
        params: { filter: filter || undefined, lowOnly },
      },
      { apiName: this.apiName, ...config },
    );

  getMovements = (
    productId?: string | null,
    locationId?: string | null,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, StockMovementDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/movements`,
        params: { productId: productId || undefined, locationId: locationId || undefined },
      },
      { apiName: this.apiName, ...config },
    );

  receive = (input: StockQuantityInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/receive`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  issue = (input: StockQuantityInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/issue`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  /** A correction: signed quantity, and a reason is required. */
  adjust = (input: StockQuantityInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/adjust`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  /** Null when the count matched what was on hand. */
  count = (input: StockQuantityInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementDto | null>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/count`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setMinLevel = (
    input: { productId: string; locationId: string; minLevel?: number | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, StockItemDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/set-min-level`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  checkImport = (input: { csv: string; setToCount: boolean }, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockImportCheckDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/check-import`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  applyImport = (input: { csv: string; setToCount: boolean }, config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/apply-import`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setTracking = (
    input: { productId: string; tracking: StockTracking },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, StockItemDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/set-tracking`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getLots = (
    productId?: string | null,
    locationId?: string | null,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, StockLotDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/lots`,
        params: { productId: productId || undefined, locationId: locationId || undefined },
      },
      { apiName: this.apiName, ...config },
    );

  getErpStock = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ErpStockDto[]>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/erp-stock` },
      { apiName: this.apiName, ...config },
    );

  readErpStock = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ErpStockReadDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/read-erp-stock`,
      },
      { apiName: this.apiName, ...config },
    );

  getTrace = (number: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/trace`,
        params: { number },
      },
      { apiName: this.apiName, ...config },
    );
}
