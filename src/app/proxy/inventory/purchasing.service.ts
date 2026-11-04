import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { StockLotLine, StockTracking } from './inventory.service';

export interface SupplierDto {
  id: string;
  name: string;
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  leadDays?: number | null;
  isActive: boolean;
  /** The person we deal with; phone and email reach them. */
  contactName?: string | null;
  contactDesignation?: string | null;
  /** Where goods are dispatched from; `address` is the billing address. */
  shippingAddress?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  remarks?: string | null;
  /** Not to be bought from: no new purchase orders, left out of supplier pickers. */
  isBlacklisted?: boolean;
  blacklistReason?: string | null;
}

export type SaveSupplierInput = Omit<SupplierDto, 'id'>;

export type PurchaseOrderState = 'Draft' | 'Sent' | 'PartlyReceived' | 'Received' | 'Cancelled';

export interface PurchaseOrderLineDto {
  id: string;
  productId: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitCostInPaise: number;
  receivedQuantity: number;
  outstanding: number;
  /** What receiving this line needs. */
  tracking: StockTracking;
}

export interface PurchaseOrderDto {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  locationId: string;
  locationName: string;
  state: PurchaseOrderState;
  expectedOn?: string | null;
  note?: string | null;
  sentAtUtc?: string | null;
  creationTime: string;
  subtotalInPaise: number;
  lines: PurchaseOrderLineDto[];
}

export interface SavePurchaseOrderInput {
  supplierId: string;
  locationId?: string | null;
  expectedOn?: string | null;
  note?: string | null;
  lines: { productId: string; quantity: number; unitCostInPaise: number }[];
}

export interface ReceivePurchaseOrderInput {
  lines: { lineId: string; quantity: number; lots?: StockLotLine[] | null }[];
  /** The supplier's invoice or delivery note number. */
  note?: string | null;
}

export interface ReorderSuggestionDto {
  productId: string;
  partNumber: string;
  name: string;
  available: number;
  onOrder: number;
  minLevel: number;
  suggested: number;
  lastCostInPaise?: number | null;
  lastSupplierId?: string | null;
  lastSupplierName?: string | null;
}

/** Suppliers, purchase orders and reorder suggestions (re-order portal add-on). */
@Injectable({ providedIn: 'root' })
export class PurchasingService {
  private restService = inject(RestService);
  apiName = 'AutoReach';
  private base = '/api/auto-reach/purchasing';

  getSuppliers = (activeOnly = false, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SupplierDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/suppliers`,
        params: { activeOnly },
      },
      { apiName: this.apiName, ...config },
    );

  createSupplier = (input: SaveSupplierInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SupplierDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/supplier`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateSupplier = (id: string, input: SaveSupplierInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SupplierDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/supplier`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getOrders = (openOnly = false, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PurchaseOrderDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/orders`,
        params: { openOnly },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PurchaseOrderDto>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/${id}` },
      { apiName: this.apiName, ...config },
    );

  create = (input: SavePurchaseOrderInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PurchaseOrderDto>(
      { method: 'POST', headers: { Accept: 'application/json' }, url: this.base, body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: SavePurchaseOrderInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PurchaseOrderDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  markSent = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PurchaseOrderDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/mark-sent`,
      },
      { apiName: this.apiName, ...config },
    );

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PurchaseOrderDto>(
      { method: 'POST', headers: { Accept: 'application/json' }, url: `${this.base}/${id}/cancel` },
      { apiName: this.apiName, ...config },
    );

  receive = (id: string, input: ReceivePurchaseOrderInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PurchaseOrderDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/receive`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getSuggestions = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReorderSuggestionDto[]>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/suggestions` },
      { apiName: this.apiName, ...config },
    );
}
